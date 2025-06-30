import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface UserGoalData {
  id: string;
  title: string;
  category_name: string;
  deadline: string | null;
  frequency: string | null;
  start_date: string | null;
  motivation_text: string | null;
  obstacles: string[] | null;
}

interface ChatCompletionRequest {
  user_id: string;
  context?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  requestId: string;
}

interface SuccessResponse {
  success: true;
  message: string;
  timestamp: string;
  requestId: string;
  user_id: string;
}

// Generate unique request ID for tracking
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Enhanced logging function
function logWithContext(level: 'INFO' | 'WARN' | 'ERROR', message: string, requestId: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    requestId,
    message,
    ...(data && { data })
  };
  console.log(`[${level}] ${JSON.stringify(logEntry)}`);
}

// Create standardized error response
function createErrorResponse(
  error: string,
  requestId: string,
  statusCode: number = 500
): Response {
  const errorResponse: ErrorResponse = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId
  };

  logWithContext('ERROR', `Error response created: ${error}`, requestId);

  return new Response(JSON.stringify(errorResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: statusCode,
  });
}

// Create standardized success response
function createSuccessResponse(
  message: string,
  requestId: string,
  userId: string
): Response {
  const successResponse: SuccessResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    user_id: userId
  };

  logWithContext('INFO', `Success response created`, requestId, { messageLength: message.length });

  return new Response(JSON.stringify(successResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { supabaseUrl: string; supabaseServiceKey: string; openaiApiKey: string } {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { supabaseUrl, supabaseServiceKey, openaiApiKey };
}

// Extract user ID from Clerk JWT
function extractUserIdFromJWT(authHeader: string | null, requestId: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  try {
    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;
    
    if (!userId) {
      throw new Error('No user ID found in JWT');
    }
    
    logWithContext('INFO', 'User ID extracted from JWT', requestId, { userId });
    return userId;
  } catch (error) {
    logWithContext('ERROR', 'Failed to extract user ID from JWT', requestId, { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Invalid JWT token');
  }
}

// Fetch user's goals, motivations, and obstacles from database
async function fetchUserGoalData(
  supabase: any,
  userId: string,
  requestId: string
): Promise<UserGoalData[]> {
  logWithContext('INFO', 'Fetching user goal data from database', requestId, { userId });

  try {
    // Fetch goals with their categories, motivations, and obstacles
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select(`
        id,
        title,
        deadline,
        frequency,
        start_date,
        categories!inner(name),
        motivations(motivation_text, obstacles)
      `)
      .eq('user_id', userId);

    if (goalsError) {
      logWithContext('ERROR', 'Error fetching goals from database', requestId, {
        error: goalsError.message,
        code: goalsError.code,
        userId
      });
      throw new Error(`Failed to fetch goals: ${goalsError.message}`);
    }

    if (!goals || goals.length === 0) {
      logWithContext('WARN', 'No goals found for user', requestId, { userId });
      return [];
    }

    // Transform the data into a more structured format
    const goalData: UserGoalData[] = goals.map(goal => ({
      id: goal.id,
      title: goal.title,
      category_name: goal.categories?.name || 'Unknown',
      deadline: goal.deadline,
      frequency: goal.frequency,
      start_date: goal.start_date,
      motivation_text: goal.motivations?.[0]?.motivation_text || null,
      obstacles: goal.motivations?.[0]?.obstacles || null
    }));

    logWithContext('INFO', 'Successfully fetched user goal data', requestId, {
      userId,
      goalsCount: goalData.length,
      goalsWithMotivations: goalData.filter(g => g.motivation_text).length,
      goalsWithObstacles: goalData.filter(g => g.obstacles && g.obstacles.length > 0).length
    });

    return goalData;

  } catch (error) {
    logWithContext('ERROR', 'Error in fetchUserGoalData', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// Format user data for OpenAI prompt
function formatUserDataForPrompt(goalData: UserGoalData[], requestId: string): string {
  logWithContext('INFO', 'Formatting user data for OpenAI prompt', requestId, { goalsCount: goalData.length });

  if (goalData.length === 0) {
    return "The user hasn't set up any goals yet, but they're just getting started on their journey.";
  }

  let formattedData = `Here are the user's current goals and progress:\n\n`;

  goalData.forEach((goal, index) => {
    formattedData += `Goal ${index + 1}: ${goal.title}\n`;
    formattedData += `Category: ${goal.category_name}\n`;
    
    if (goal.deadline) {
      formattedData += `Deadline: ${goal.deadline}\n`;
    }
    
    if (goal.motivation_text) {
      formattedData += `Motivation: ${goal.motivation_text}\n`;
    }
    
    if (goal.obstacles && goal.obstacles.length > 0) {
      formattedData += `Obstacles: ${goal.obstacles.join(', ')}\n`;
    }
    
    formattedData += '\n';
  });

  logWithContext('INFO', 'User data formatted for prompt', requestId, { 
    formattedDataLength: formattedData.length,
    goalsCount: goalData.length 
  });

  return formattedData;
}

// Generate OpenAI chat completion
async function generateChatCompletion(
  userData: string,
  context: string,
  openaiApiKey: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Generating OpenAI chat completion', requestId, { 
    userDataLength: userData.length,
    context 
  });

  try {
    const systemPrompt = `you are conversational agent designed to be my future self. i am giving you my goals, motivations, deadlines, and obstacles. your task is to motivate me and keep me accountable to these goals.`;

    const userPrompt = `Here's what I'm currently working on:\n\n${userData}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logWithContext('ERROR', 'OpenAI API error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const completion = await response.json();
    
    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No completion choices returned from OpenAI');
    }

    const message = completion.choices[0].message?.content?.trim();
    
    if (!message) {
      throw new Error('Empty message returned from OpenAI');
    }

    logWithContext('INFO', 'OpenAI chat completion generated successfully', requestId, {
      messageLength: message.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    return message;

  } catch (error) {
    logWithContext('ERROR', 'Error generating OpenAI chat completion', requestId, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logWithContext('INFO', 'CORS preflight request handled', requestId);
    return new Response('ok', { headers: corsHeaders });
  }

  logWithContext('INFO', 'OpenAI chat completion function invoked', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseServiceKey, openaiApiKey } = validateEnvironment(requestId);

    // Extract user ID from JWT
    const authHeader = req.headers.get('authorization');
    const userId = extractUserIdFromJWT(authHeader, requestId);

    // Parse request body
    const requestBody: ChatCompletionRequest = await req.json();
    
    if (!requestBody.user_id) {
      return createErrorResponse('Missing required field: user_id', requestId, 400);
    }

    // Verify the requesting user matches the user_id in the request
    if (userId !== requestBody.user_id) {
      logWithContext('ERROR', 'User ID mismatch', requestId, { 
        jwtUserId: userId, 
        requestUserId: requestBody.user_id 
      });
      return createErrorResponse('Unauthorized: User ID mismatch', requestId, 403);
    }

    logWithContext('INFO', 'Processing chat completion request', requestId, {
      userId: requestBody.user_id,
      context: requestBody.context || 'test_call'
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created successfully', requestId);

    // Fetch user's goal data
    const goalData = await fetchUserGoalData(supabase, requestBody.user_id, requestId);

    // Format data for OpenAI prompt
    const formattedUserData = formatUserDataForPrompt(goalData, requestId);

    // Generate chat completion
    const context = requestBody.context || 'This is a test call to verify the system is working properly.';
    const aiMessage = await generateChatCompletion(
      formattedUserData,
      context,
      openaiApiKey,
      requestId
    );

    // Return success response
    return createSuccessResponse(aiMessage, requestId, requestBody.user_id);

  } catch (error) {
    logWithContext('ERROR', 'Unexpected error in openai-chat-completion', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred while generating the chat completion',
      requestId,
      500
    );
  }
});