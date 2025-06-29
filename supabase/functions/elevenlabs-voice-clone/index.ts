import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CloneVoiceRequest {
  user_id: string;
  custom_voice_audio_path: string;
  voice_name?: string;
  voice_description?: string;
}

interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  category: string;
  fine_tuning: {
    is_allowed_to_fine_tune: boolean;
    finetuning_state: string;
    verification_failures: string[];
    verification_attempts_count: number;
    manual_verification_requested: boolean;
  };
  labels: Record<string, string>;
  description: string;
  preview_url: string;
  available_for_tiers: string[];
  settings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  sharing: {
    status: string;
    history_item_sample_id: string;
    original_voice_id: string;
    public_owner_id: string;
    liked_by_count: number;
    cloned_by_count: number;
    name: string;
    description: string;
    labels: Record<string, string>;
    created_at: string;
    category: string;
  };
  high_quality_base_model_ids: string[];
}

interface ErrorResponse {
  success: false;
  error: string;
  timestamp: string;
  requestId: string;
}

interface SuccessResponse {
  success: true;
  voice_id: string;
  voice_name: string;
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
  voice_id: string,
  voice_name: string,
  requestId: string
): Response {
  const successResponse: SuccessResponse = {
    success: true,
    voice_id,
    voice_name,
    timestamp: new Date().toISOString(),
    requestId
  };

  logWithContext('INFO', `Success response created: voice cloned successfully`, requestId, { voice_id, voice_name });

  return new Response(JSON.stringify(successResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { supabaseUrl: string; supabaseServiceKey: string; elevenLabsApiKey: string } {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const elevenLabsApiKey = Deno.env.get('VITE_ELEVENLABS_API_KEY');
  
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!elevenLabsApiKey) missing.push('VITE_ELEVENLABS_API_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { supabaseUrl, supabaseServiceKey, elevenLabsApiKey };
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

// Download audio file from Supabase Storage
async function downloadAudioFile(
  supabase: any,
  filePath: string,
  requestId: string
): Promise<Blob> {
  logWithContext('INFO', 'Downloading audio file from storage', requestId, { filePath });
  
  try {
    const { data, error } = await supabase.storage
      .from('voice_recordings')
      .download(filePath);

    if (error) {
      logWithContext('ERROR', 'Failed to download audio file', requestId, { error: error.message, filePath });
      throw new Error(`Failed to download audio file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No audio data received from storage');
    }

    logWithContext('INFO', 'Audio file downloaded successfully', requestId, { 
      filePath, 
      size: data.size,
      type: data.type 
    });

    return data;
  } catch (error) {
    logWithContext('ERROR', 'Error downloading audio file', requestId, { 
      error: error instanceof Error ? error.message : String(error),
      filePath 
    });
    throw error;
  }
}

// Clone voice using ElevenLabs API
async function cloneVoiceWithElevenLabs(
  audioBlob: Blob,
  voiceName: string,
  voiceDescription: string,
  elevenLabsApiKey: string,
  originalFilename: string,
  requestId: string
): Promise<ElevenLabsVoiceResponse> {
  logWithContext('INFO', 'Starting voice cloning with ElevenLabs', requestId, { 
    voiceName, 
    voiceDescription,
    audioSize: audioBlob.size,
    originalFilename
  });

  try {
    // Create FormData for the API request
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('description', voiceDescription);
    formData.append('files', audioBlob, originalFilename);

    // Optional: Add labels for better organization
    formData.append('labels', JSON.stringify({
      'source': 'MyFutrSelf',
      'type': 'custom_clone',
      'created_at': new Date().toISOString()
    }));

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        // Don't set Content-Type header - let the browser set it with boundary for FormData
      },
      body: formData
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

    const voiceData: ElevenLabsVoiceResponse = await response.json();
    
    logWithContext('INFO', 'Voice cloning successful', requestId, { 
      voice_id: voiceData.voice_id,
      voice_name: voiceData.name 
    });

    return voiceData;
  } catch (error) {
    logWithContext('ERROR', 'Voice cloning failed', requestId, { 
      error: error instanceof Error ? error.message : String(error) 
    });
    throw error;
  }
}

// Extract filename from file path
function extractFilename(filePath: string, requestId: string): string {
  logWithContext('INFO', 'Extracting filename from path', requestId, { filePath });
  
  try {
    // Handle both forward slashes and backslashes
    const filename = filePath.split(/[/\\]/).pop();
    
    if (!filename) {
      throw new Error('Could not extract filename from path');
    }
    
    // Keep the original filename as-is since it may be .webm or other formats
    logWithContext('INFO', 'Using original filename', requestId, { filename });
    
    return filename;
  } catch (error) {
    logWithContext('ERROR', 'Failed to extract filename', requestId, { 
      error: error instanceof Error ? error.message : String(error),
      filePath 
    });
    throw new Error(`Failed to extract filename from path: ${filePath}`);
  }
}

// Update user profile with cloned voice ID
async function updateUserProfileWithVoiceId(
  supabase: any,
  userId: string,
  voiceId: string,
  requestId: string
): Promise<void> {
  logWithContext('INFO', 'Updating user profile with cloned voice ID', requestId, { userId, voiceId });

  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        voice_preference: voiceId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      logWithContext('ERROR', 'Failed to update user profile with voice ID', requestId, { 
        error: error.message,
        userId,
        voiceId 
      });
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    logWithContext('INFO', 'User profile updated successfully', requestId, { userId, voiceId });
  } catch (error) {
    logWithContext('ERROR', 'Error updating user profile', requestId, { 
      error: error instanceof Error ? error.message : String(error),
      userId,
      voiceId 
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

  logWithContext('INFO', 'ElevenLabs voice clone function invoked', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseServiceKey, elevenLabsApiKey } = validateEnvironment(requestId);

    // Extract user ID from JWT
    const authHeader = req.headers.get('authorization');
    const userId = extractUserIdFromJWT(authHeader, requestId);

    // Parse request body
    const requestBody: CloneVoiceRequest = await req.json();
    
    if (!requestBody.user_id || !requestBody.custom_voice_audio_path) {
      return createErrorResponse('Missing required fields: user_id and custom_voice_audio_path', requestId, 400);
    }

    // Verify the requesting user matches the user_id in the request
    if (userId !== requestBody.user_id) {
      logWithContext('ERROR', 'User ID mismatch', requestId, { 
        jwtUserId: userId, 
        requestUserId: requestBody.user_id 
      });
      return createErrorResponse('Unauthorized: User ID mismatch', requestId, 403);
    }

    logWithContext('INFO', 'Processing voice clone request', requestId, {
      userId: requestBody.user_id,
      audioPath: requestBody.custom_voice_audio_path,
      voiceName: requestBody.voice_name || `${userId}_custom_voice`,
      voiceDescription: requestBody.voice_description || 'Custom voice clone created by MyFutrSelf'
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created successfully', requestId);

    // Download the audio file from Supabase Storage
    const audioBlob = await downloadAudioFile(supabase, requestBody.custom_voice_audio_path, requestId);

    // Extract the original filename from the file path
    const originalFilename = extractFilename(requestBody.custom_voice_audio_path, requestId);

    // Clone the voice using ElevenLabs
    const voiceName = requestBody.voice_name || `${userId}_custom_voice`;
    const voiceDescription = requestBody.voice_description || 'Custom voice clone created by MyFutrSelf';
    
    const clonedVoice = await cloneVoiceWithElevenLabs(
      audioBlob,
      voiceName,
      voiceDescription,
      elevenLabsApiKey,
      originalFilename,
      requestId
    );

    // Update user profile with the new voice ID
    await updateUserProfileWithVoiceId(supabase, requestBody.user_id, clonedVoice.voice_id, requestId);

    // Return success response
    return createSuccessResponse(clonedVoice.voice_id, clonedVoice.name, requestId);

  } catch (error) {
    logWithContext('ERROR', 'Unexpected error in elevenlabs-voice-clone', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred while cloning the voice',
      requestId,
      500
    );
  }
});