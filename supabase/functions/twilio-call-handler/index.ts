import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import twilio, { validateRequest } from 'https://esm.sh/twilio@5.3.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
}

interface InitiateCallRequest {
  user_id: string;
  to_phone_number: string;
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
  call_sid?: string;
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
  message: string,
  requestId: string,
  callSid?: string
): Response {
  const successResponse: SuccessResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    ...(callSid && { call_sid: callSid })
  };

  logWithContext('INFO', `Success response created: ${message}`, requestId);

  return new Response(JSON.stringify(successResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { 
  supabaseUrl: string; 
  supabaseServiceKey: string; 
  supabaseAnonKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
} {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAnonKey = Deno.env.get('VITE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const twilioFromNumber = Deno.env.get('TWILIO_FROM_NUMBER');
  
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  if (!twilioAccountSid) missing.push('TWILIO_ACCOUNT_SID');
  if (!twilioAuthToken) missing.push('TWILIO_AUTH_TOKEN');
  if (!twilioFromNumber) missing.push('TWILIO_FROM_NUMBER');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { supabaseUrl, supabaseServiceKey, supabaseAnonKey, twilioAccountSid, twilioAuthToken, twilioFromNumber };
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

// Get user's voice preference from database
async function getUserVoicePreference(
  supabase: any,
  userId: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Fetching user voice preference', requestId, { userId });

  try {
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('voice_preference')
      .eq('user_id', userId)
      .single();

    if (error) {
      logWithContext('ERROR', 'Error fetching user voice preference', requestId, {
        error: error.message,
        code: error.code,
        userId
      });
      throw new Error(`Failed to fetch user voice preference: ${error.message}`);
    }

    if (!userProfile?.voice_preference) {
      logWithContext('WARN', 'No voice preference found for user, using default', requestId, { userId });
      return 'friendly_mentor'; // Default voice
    }

    logWithContext('INFO', 'User voice preference retrieved', requestId, { 
      userId, 
      voicePreference: userProfile.voice_preference 
    });

    return userProfile.voice_preference;

  } catch (error) {
    logWithContext('ERROR', 'Error in getUserVoicePreference', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// Call OpenAI chat completion Edge Function
async function getAIResponse(
  userId: string,
  context: string,
  supabaseUrl: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Calling OpenAI chat completion Edge Function', requestId, { userId, context });

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/openai-chat-completion`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        user_id: userId,
        context: context
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logWithContext('ERROR', 'OpenAI Edge Function error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.error || `OpenAI Edge Function failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'OpenAI Edge Function returned failure');
    }

    logWithContext('INFO', 'AI response generated successfully', requestId, { 
      messageLength: result.message.length 
    });

    return result.message;

  } catch (error) {
    logWithContext('ERROR', 'Error calling OpenAI Edge Function', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// Call ElevenLabs TTS Edge Function and upload to storage
async function generateSpeech(
  text: string,
  voiceId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Calling ElevenLabs TTS Edge Function', requestId, { 
    textLength: text.length, 
    voiceId 
  });

  try {
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/elevenlabs-proxy/tts`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        voiceId: voiceId,
        text: text
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logWithContext('ERROR', 'ElevenLabs TTS Edge Function error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.error || `ElevenLabs TTS failed: ${response.status}`);
    }

    const audioBlob = await response.blob();
    
    // Upload audio to Supabase Storage and return public URL
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    
    const filename = `tts-${requestId}-${Date.now()}.mp3`;
    const filePath = `temp/${filename}`; // Store in a 'temp' folder within the bucket

    logWithContext('INFO', 'Uploading generated audio to Supabase Storage', requestId, { filePath, audioSize: audioBlob.size });

    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('twilio-audio-cache')
      .upload(filePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true // Overwrite if file with same name exists (unlikely with timestamp)
      });

    if (uploadError) {
      logWithContext('ERROR', 'Failed to upload audio to Supabase Storage', requestId, { error: uploadError.message });
      throw new Error(`Failed to upload audio to storage: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('twilio-audio-cache')
      .getPublicUrl(filePath);

    const publicAudioUrl = publicUrlData.publicUrl;

    logWithContext('INFO', 'Speech uploaded and public URL generated successfully', requestId, { 
      publicAudioUrl,
      audioSize: audioBlob.size 
    });

    return publicAudioUrl;

  } catch (error) {
    logWithContext('ERROR', 'Error calling ElevenLabs TTS Edge Function or uploading audio', requestId, {
      error: error instanceof Error ? error.message : String(error),
      voiceId
    });
    throw error;
  }
}

// Generate TwiML response using Twilio VoiceResponse
function generateTwiML(audioUrl: string, webhookUrl: string, userId: string): string {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Play the AI-generated audio
  twiml.play({}, audioUrl);
  
  // Gather speech input from the user
  const gather = twiml.gather({
    input: 'speech',
    timeout: 10,
    speechTimeout: 'auto',
    action: `${webhookUrl}?user_id=${userId}`,
    method: 'POST'
  });
  gather.say({ voice: 'alice' }, 'Please respond when you\'re ready.');
  
  // Fallback if no response
  twiml.say({ voice: 'alice' }, 'I didn\'t hear a response. Have a great day!');
  twiml.hangup();
  
  return twiml.toString();
}

// Initiate outbound call using Twilio
async function initiateCall(
  toNumber: string,
  fromNumber: string,
  webhookUrl: string,
  userId: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Initiating Twilio call', requestId, { 
    toNumber: toNumber.substring(0, 6) + '***', // Mask phone number for privacy
    fromNumber,
    userId 
  });

  try {
    // Create Twilio client using basic auth
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: toNumber,
        From: fromNumber,
        Url: `${webhookUrl}?user_id=${userId}`,
        Method: 'POST'
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      logWithContext('ERROR', 'Twilio API error', requestId, {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Twilio API error (${response.status}): ${errorData}`);
    }

    const callData = await response.json();
    
    logWithContext('INFO', 'Twilio call initiated successfully', requestId, { 
      callSid: callData.sid,
      status: callData.status 
    });

    return callData.sid;

  } catch (error) {
    logWithContext('ERROR', 'Error initiating Twilio call', requestId, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  const url = new URL(req.url);
  const pathname = url.pathname;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logWithContext('INFO', 'CORS preflight request handled', requestId);
    return new Response('ok', { headers: corsHeaders });
  }

  logWithContext('INFO', 'Twilio call handler function invoked', requestId, {
    method: req.method,
    pathname,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseServiceKey, supabaseAnonKey, twilioAccountSid, twilioAuthToken, twilioFromNumber } = validateEnvironment(requestId);

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Route handling
    if (pathname.endsWith('/initiate-call')) {
      // Handle call initiation - requires JWT authentication
      logWithContext('INFO', 'Processing call initiation request', requestId);

      // Extract user ID from JWT
      const authHeader = req.headers.get('authorization');
      const userId = extractUserIdFromJWT(authHeader, requestId);

      // Parse request body
      const requestBody: InitiateCallRequest = await req.json();
      
      if (!requestBody.user_id || !requestBody.to_phone_number) {
        return createErrorResponse('Missing required fields: user_id and to_phone_number', requestId, 400);
      }

      // Verify the requesting user matches the user_id in the request
      if (userId !== requestBody.user_id) {
        logWithContext('ERROR', 'User ID mismatch', requestId, { 
          jwtUserId: userId, 
          requestUserId: requestBody.user_id 
        });
        return createErrorResponse('Unauthorized: User ID mismatch', requestId, 403);
      }

      // Construct webhook URL for TwiML responses
      const webhookUrl = `${supabaseUrl}/functions/v1/twilio-call-handler/twiml-webhook`;

      // Initiate the call
      const callSid = await initiateCall(
        requestBody.to_phone_number,
        twilioFromNumber,
        webhookUrl,
        requestBody.user_id,
        twilioAccountSid,
        twilioAuthToken,
        requestId
      );

      return createSuccessResponse(
        'Call initiated successfully',
        requestId,
        callSid
      );

    } else if (pathname.endsWith('/twiml-webhook')) {
      // Handle TwiML webhook requests from Twilio - requires signature validation
      logWithContext('INFO', 'Processing TwiML webhook request', requestId);

      // Get Twilio signature from headers
      const twilioSignature = req.headers.get('x-twilio-signature');
      if (!twilioSignature) {
        logWithContext('ERROR', 'Missing Twilio signature header', requestId);
        return new Response('Missing Twilio signature', { 
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      // Get the raw body as text for signature validation
      const rawBody = await req.text();
      
      // Parse the raw URL-encoded body into a params object
      const params = Object.fromEntries(new URLSearchParams(rawBody));

      // Reconstruct the exact HTTPS URL that Twilio called
      const host = req.headers.get('host');
      if (!host) {
        logWithContext('ERROR', 'Missing host header for URL reconstruction', requestId);
        return new Response('Missing host header', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      
      const { pathname, search } = new URL(req.url);
      const fullUrl = `https://${host}${pathname}${search}`;

      logWithContext('INFO', 'Validating Twilio signature', requestId, {
        url: fullUrl,
        hasSignature: !!twilioSignature,
        paramsCount: Object.keys(params).length
      });

      // Validate Twilio signature using the official library
      const isValidSignature = validateRequest(
        twilioAuthToken,
        twilioSignature,
        fullUrl,
        params
      );

      if (!isValidSignature) {
        logWithContext('ERROR', 'Invalid Twilio signature', requestId, {
          providedSignature: twilioSignature.substring(0, 20) + '...',
          url: fullUrl,
          paramsCount: Object.keys(params).length
        });
        return new Response('Invalid Twilio signature', { 
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      logWithContext('INFO', 'Twilio signature validated successfully', requestId);

      // Extract user_id from query parameters
      const userId = url.searchParams.get('user_id');
      if (!userId) {
        logWithContext('ERROR', 'Missing user_id in webhook request', requestId);
        return new Response('Missing user_id parameter', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      logWithContext('INFO', 'TwiML webhook data received', requestId, {
        callSid: params.CallSid,
        callStatus: params.CallStatus,
        hasSpeechResult: !!params.SpeechResult,
        userId
      });

      let aiResponseText: string;
      let context: string;

      if (params.SpeechResult) {
        // User has spoken - this is a follow-up interaction
        context = `The user just said: "${params.SpeechResult}". Please respond appropriately and continue the conversation about their goals.`;
        logWithContext('INFO', 'Processing user speech input', requestId, { 
          speechResult: params.SpeechResult,
          confidence: params.Confidence 
        });
      } else {
        // Initial call - generate greeting
        context = 'This is the beginning of a motivational call. Greet the user warmly and ask how they are doing with their goals.';
        logWithContext('INFO', 'Generating initial greeting', requestId);
      }

      // Get AI response
      aiResponseText = await getAIResponse(userId, context, supabaseUrl, requestId);

      // Get user's voice preference
      const voicePreference = await getUserVoicePreference(supabase, userId, requestId);

      // Generate speech from AI response
      const audioUrl = await generateSpeech(aiResponseText, voicePreference, supabaseUrl, supabaseAnonKey, requestId);

      // Generate TwiML response
      const webhookUrl = `${supabaseUrl}/functions/v1/twilio-call-handler/twiml-webhook`;
      const twimlResponse = generateTwiML(audioUrl, webhookUrl, userId);

      logWithContext('INFO', 'TwiML response generated successfully', requestId, {
        twimlLength: twimlResponse.length
      });

      return new Response(twimlResponse, {
        headers: {
          'Content-Type': 'text/xml',
          ...corsHeaders
        }
      });

    } else {
      return createErrorResponse('Invalid endpoint', requestId, 404);
    }

  } catch (error) {
    logWithContext('ERROR', 'Unexpected error in twilio-call-handler', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred while processing the call',
      requestId,
      500
    );
  }
});