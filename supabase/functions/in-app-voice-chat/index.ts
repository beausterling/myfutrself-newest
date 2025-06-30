import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  audioData: string; // Base64 audio data
  userId: string;
  messageText?: string; // Optional pre-transcribed text
}

interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  requestId: string;
}

interface SuccessResponse {
  success: true;
  audioResponse: string; // Base64 audio data
  textResponse: string;
  userText: string;
  timestamp: string;
  requestId: string;
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
  audioResponse: string,
  textResponse: string,
  userText: string,
  requestId: string
): Response {
  const successResponse: SuccessResponse = {
    success: true,
    audioResponse,
    textResponse,
    userText,
    timestamp: new Date().toISOString(),
    requestId
  };

  logWithContext('INFO', `Success response created`, requestId, {
    audioResponseLength: audioResponse.length,
    textResponseLength: textResponse.length,
    userTextLength: userText.length
  });

  return new Response(JSON.stringify(successResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { 
  supabaseUrl: string; 
  supabaseServiceKey: string; 
  openaiApiKey: string;
  elevenLabsApiKey: string;
} {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const elevenLabsApiKey = Deno.env.get('VITE_ELEVENLABS_API_KEY');
  
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');
  if (!elevenLabsApiKey) missing.push('VITE_ELEVENLABS_API_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { supabaseUrl, supabaseServiceKey, openaiApiKey, elevenLabsApiKey };
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

// Transcribe audio using OpenAI Whisper API
async function transcribeAudio(
  audioData: string,
  openaiApiKey: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Transcribing audio with OpenAI Whisper API', requestId, {
    audioDataLength: audioData.length
  });

  try {
    // Extract the base64 audio data (remove the data URL prefix)
    const base64Data = audioData.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid audio data format');
    }

    // Convert base64 to binary
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const audioBlob = new Blob([binaryData], { type: 'audio/webm' });

    // Create form data for the API request
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logWithContext('ERROR', 'OpenAI Whisper API error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`OpenAI Whisper API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const transcription = result.text?.trim();
    
    if (!transcription) {
      throw new Error('No transcription returned from OpenAI Whisper API');
    }

    logWithContext('INFO', 'Audio transcribed successfully', requestId, {
      transcription
    });

    return transcription;

  } catch (error) {
    logWithContext('ERROR', 'Error transcribing audio', requestId, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Get user's voice preference and goals from database
async function getUserData(
  supabase: any,
  userId: string,
  requestId: string
): Promise<{ voicePreference: string; userGoals: any[] }> {
  logWithContext('INFO', 'Fetching user data from database', requestId, { userId });

  try {
    // Get user's voice preference
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('voice_preference')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      logWithContext('ERROR', 'Error fetching user profile', requestId, {
        error: profileError.message,
        code: profileError.code,
        userId
      });
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    const voicePreference = userProfile?.voice_preference || 'friendly_mentor'; // Default voice

    // Get user's goals with motivations
    const { data: userGoals, error: goalsError } = await supabase
      .from('goals')
      .select(`
        id,
        title,
        deadline,
        frequency,
        categories(name),
        motivations(motivation_text, obstacles)
      `)
      .eq('user_id', userId);

    if (goalsError) {
      logWithContext('ERROR', 'Error fetching user goals', requestId, {
        error: goalsError.message,
        code: goalsError.code,
        userId
      });
      throw new Error(`Failed to fetch user goals: ${goalsError.message}`);
    }

    logWithContext('INFO', 'User data fetched successfully', requestId, {
      userId,
      voicePreference,
      goalsCount: userGoals?.length || 0
    });

    return { voicePreference, userGoals: userGoals || [] };

  } catch (error) {
    logWithContext('ERROR', 'Error in getUserData', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// Format user goals for AI prompt
function formatUserGoalsForPrompt(userGoals: any[], requestId: string): string {
  logWithContext('INFO', 'Formatting user goals for AI prompt', requestId, { goalsCount: userGoals.length });

  if (userGoals.length === 0) {
    return "The user hasn't set up any goals yet, but they're just getting started on their journey.";
  }

  let formattedData = `Here are the user's current goals and progress:\n\n`;

  userGoals.forEach((goal, index) => {
    formattedData += `Goal ${index + 1}: ${goal.title}\n`;
    formattedData += `Category: ${goal.categories?.name || 'Unknown'}\n`;
    
    if (goal.deadline) {
      formattedData += `Deadline: ${goal.deadline}\n`;
    }
    
    if (goal.frequency) {
      formattedData += `Check-in Frequency: ${goal.frequency}\n`;
    }
    
    if (goal.motivations && goal.motivations.length > 0) {
      const motivation = goal.motivations[0];
      
      if (motivation.motivation_text) {
        formattedData += `Motivation: ${motivation.motivation_text}\n`;
      }
      
      if (motivation.obstacles && motivation.obstacles.length > 0) {
        formattedData += `Obstacles: ${motivation.obstacles.join(', ')}\n`;
      }
    }
    
    formattedData += '\n';
  });

  logWithContext('INFO', 'User goals formatted for prompt', requestId, { 
    formattedDataLength: formattedData.length
  });

  return formattedData;
}

// Generate AI response using OpenAI
async function generateAIResponse(
  userMessage: string,
  userGoalsData: string,
  openaiApiKey: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Generating AI response with OpenAI', requestId, {
    userMessageLength: userMessage.length,
    userGoalsDataLength: userGoalsData.length
  });

  try {
    const systemPrompt = `You are the user's future self, speaking to them from several years in the future. You have achieved the goals they're currently working on. Your role is to provide guidance, motivation, and wisdom based on your "experience" of having gone through what they're facing now.

Speak in first person, as if you are truly their future self. Be warm, encouraging, and authentic. Draw on the specific goals, motivations, and obstacles they've shared to make your responses personal and relevant.

Keep your responses concise (1-3 paragraphs) but impactful. Focus on being supportive while also gently challenging them to overcome obstacles and stay committed to their goals.`;

    const userPrompt = `Here's what I'm currently working on:\n\n${userGoalsData}\n\nI just said: "${userMessage}"`;

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
        max_tokens: 300,
        temperature: 0.7
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

    const aiMessage = completion.choices[0].message?.content?.trim();
    
    if (!aiMessage) {
      throw new Error('Empty message returned from OpenAI');
    }

    logWithContext('INFO', 'AI response generated successfully', requestId, {
      aiMessageLength: aiMessage.length,
      tokensUsed: completion.usage?.total_tokens || 0
    });

    return aiMessage;

  } catch (error) {
    logWithContext('ERROR', 'Error generating AI response', requestId, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Convert text to speech using ElevenLabs
async function textToSpeech(
  text: string,
  voiceId: string,
  elevenLabsApiKey: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Converting text to speech with ElevenLabs', requestId, {
    textLength: text.length,
    voiceId
  });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logWithContext('ERROR', 'ElevenLabs API error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    // Convert response to base64
    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < audioBytes.length; i++) {
      binary += String.fromCharCode(audioBytes[i]);
    }
    const base64String = btoa(binary);
    const base64Audio = `data:audio/mpeg;base64,${base64String}`;

    logWithContext('INFO', 'Text-to-speech conversion successful', requestId, {
      base64AudioLength: base64Audio.length
    });

    return base64Audio;

  } catch (error) {
    logWithContext('ERROR', 'Error converting text to speech', requestId, {
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

  logWithContext('INFO', 'In-app voice chat function invoked', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseServiceKey, openaiApiKey, elevenLabsApiKey } = validateEnvironment(requestId);

    // Extract user ID from JWT
    const authHeader = req.headers.get('authorization');
    const userId = extractUserIdFromJWT(authHeader, requestId);

    // Parse request body
    const requestBody: RequestBody = await req.json();
    
    if (!requestBody.audioData || !requestBody.userId) {
      return createErrorResponse('Missing required fields: audioData and userId', requestId, 400);
    }

    // Verify the requesting user matches the user_id in the request
    if (userId !== requestBody.userId) {
      logWithContext('ERROR', 'User ID mismatch', requestId, { 
        jwtUserId: userId, 
        requestUserId: requestBody.userId 
      });
      return createErrorResponse('Unauthorized: User ID mismatch', requestId, 403);
    }

    logWithContext('INFO', 'Processing voice chat request', requestId, {
      userId: requestBody.userId,
      audioDataLength: requestBody.audioData.length,
      hasMessageText: !!requestBody.messageText
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created successfully', requestId);

    // Get user data (voice preference and goals)
    const { voicePreference, userGoals } = await getUserData(supabase, requestBody.userId, requestId);

    // Transcribe audio if messageText not provided
    let userMessage: string;
    if (requestBody.messageText) {
      userMessage = requestBody.messageText;
      logWithContext('INFO', 'Using provided message text', requestId, { userMessage });
    } else {
      userMessage = await transcribeAudio(requestBody.audioData, openaiApiKey, requestId);
      logWithContext('INFO', 'Audio transcribed successfully', requestId, { userMessage });
    }

    // Format user goals for AI prompt
    const userGoalsData = formatUserGoalsForPrompt(userGoals, requestId);

    // Generate AI response
    const aiResponse = await generateAIResponse(userMessage, userGoalsData, openaiApiKey, requestId);
    logWithContext('INFO', 'AI response generated successfully', requestId, { aiResponse });

    // Convert AI response to speech
    const audioResponse = await textToSpeech(aiResponse, voicePreference, elevenLabsApiKey, requestId);
    logWithContext('INFO', 'Text-to-speech conversion successful', requestId, { audioResponseLength: audioResponse.length });

    // Return success response
    return createSuccessResponse(audioResponse, aiResponse, userMessage, requestId);

  } catch (error) {
    logWithContext('ERROR', 'Unexpected error in in-app-voice-chat', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred during voice chat processing',
      requestId,
      500
    );
  }
});