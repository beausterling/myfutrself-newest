import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  currentPhotoData: string; // Base64 PNG data
  userId: string;
}

interface OpenAIImageResponse {
  data: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorType: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'OPENAI_ERROR' | 'DATABASE_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  statusCode: number;
  timestamp: string;
  requestId: string;
  details?: any;
}

interface SuccessResponse {
  success: true;
  futurePhotoBase64: string;
  futurePhotoStorageUrl: string;
  message: string;
  requestId: string;
  timestamp: string;
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
  errorType: ErrorResponse['errorType'],
  statusCode: number,
  requestId: string,
  details?: any
): Response {
  const errorResponse: ErrorResponse = {
    success: false,
    error,
    errorType,
    statusCode,
    timestamp: new Date().toISOString(),
    requestId,
    ...(details && { details })
  };

  logWithContext('ERROR', `Error response created: ${error}`, requestId, {
    errorType,
    statusCode,
    details
  });

  return new Response(JSON.stringify(errorResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: statusCode,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { openaiApiKey: string; supabaseUrl: string; supabaseServiceKey: string } {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  const missing = [];
  if (!openaiApiKey) missing.push('OPENAI_API_KEY');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { openaiApiKey, supabaseUrl, supabaseServiceKey };
}

// Validate request body
function validateRequestBody(body: any, requestId: string): RequestBody {
  logWithContext('INFO', 'Validating request body', requestId, { hasBody: !!body });
  
  if (!body) {
    throw new Error('Request body is required');
  }
  
  if (!body.currentPhotoData) {
    throw new Error('currentPhotoData is required in request body');
  }
  
  if (!body.userId) {
    throw new Error('userId is required in request body');
  }
  
  if (typeof body.currentPhotoData !== 'string') {
    throw new Error('currentPhotoData must be a string');
  }
  
  if (typeof body.userId !== 'string') {
    throw new Error('userId must be a string');
  }

  if (!body.currentPhotoData.startsWith('data:image/png')) {
    throw new Error('currentPhotoData must be a valid PNG base64 data URL starting with "data:image/png"');
  }
  
  logWithContext('INFO', 'Request body validated successfully', requestId, {
    currentPhotoDataLength: body.currentPhotoData.length,
    currentPhotoDataPrefix: body.currentPhotoData.substring(0, 50) + '...',
    userId: body.userId
  });
  
  return body as RequestBody;
}

// Convert base64 data URL to Blob for FormData
function base64ToBlob(base64Data: string): Blob {
  logWithContext('INFO', 'Converting base64 data to Blob for FormData', '', {
    dataLength: base64Data.length,
    isPNG: base64Data.startsWith('data:image/png')
  });
  
  // Extract the base64 part and MIME type
  const [header, data] = base64Data.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/png';
  
  // Convert base64 to binary
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const blob = new Blob([bytes], { type: mimeType });
  
  logWithContext('INFO', 'Base64 to Blob conversion completed', '', {
    blobSize: blob.size,
    blobType: blob.type
  });
  
  return blob;
}

// Call OpenAI Images Edit API with gpt-image-1 model
async function callOpenAIImageEdit(currentPhotoData: string, openaiApiKey: string, requestId: string): Promise<string> {
  logWithContext('INFO', 'Calling OpenAI Images Edit API with gpt-image-1 model', requestId);
  
  try {
    // Convert base64 data to Blob for FormData
    const imageBlob = base64ToBlob(currentPhotoData);
    
    // Create FormData for multipart/form-data request
    const formData = new FormData();
    formData.append('image', imageBlob, 'current-self.png');
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', 'I have opted in and given explicit permission to edit this photo of me. make me look like an elderly person with a warm, friendly smile, realistic wrinkles, and subtle gray hair. The background, lighting, accesories, and clothing should match the original image.');
    formData.append('size', '1024x1024');
    
    logWithContext('INFO', 'FormData prepared for OpenAI Images Edit API', requestId, {
      imageSize: imageBlob.size,
      model: 'gpt-image-1',
      size: '1024x1024',
    });

    const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        // Note: Do not set Content-Type header - let fetch set it automatically for FormData
      },
      body: formData
    });

    logWithContext('INFO', 'OpenAI Images Edit API response received', requestId, {
      status: imageResponse.status,
      statusText: imageResponse.statusText,
      ok: imageResponse.ok,
      headers: Object.fromEntries(imageResponse.headers.entries())
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      logWithContext('ERROR', 'OpenAI Images Edit API error', requestId, {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        errorBody: errorText
      });
      
      if (imageResponse.status === 401) {
        throw new Error('OpenAI API authentication failed for gpt-image-1. Check OPENAI_API_KEY configuration.');
      } else if (imageResponse.status === 429) {
        throw new Error('OpenAI Images Edit API rate limit exceeded. Please try again later.');
      } else if (imageResponse.status === 400) {
        throw new Error(`OpenAI Images Edit API request error: ${errorText}`);
      } else {
        throw new Error(`OpenAI Images Edit API failed with status ${imageResponse.status}: ${errorText}`);
      }
    }

    const imageData: OpenAIImageResponse = await imageResponse.json();
    
    // 🔍 LOG THE ENTIRE RAW RESPONSE FROM OPENAI
    logWithContext('INFO', '🔍 RAW OPENAI RESPONSE - FULL JSON DUMP', requestId, {
      fullResponse: imageData,
      responseKeys: Object.keys(imageData),
      dataArray: imageData.data,
      dataArrayLength: imageData.data?.length,
      firstDataItem: imageData.data?.[0],
      firstDataItemKeys: imageData.data?.[0] ? Object.keys(imageData.data[0]) : 'No first item'
    });
    
    logWithContext('INFO', 'OpenAI Images Edit completed successfully', requestId);
    
    // Check for URL data first (gpt-image-1 returns URLs by default)
    const generatedImageUrl = imageData.data?.[0]?.url;
    const generatedImageBase64 = imageData.data?.[0]?.b64_json;
    
    logWithContext('INFO', 'Checking OpenAI response format', requestId, {
      hasUrl: !!generatedImageUrl,
      hasBase64: !!generatedImageBase64,
      urlValue: generatedImageUrl || 'Not present',
      base64Length: generatedImageBase64?.length || 'Not present'
    });

    if (generatedImageBase64) {
      // If we have base64 data, use it directly
      logWithContext('INFO', 'Using base64 data from OpenAI response', requestId, {
        base64Length: generatedImageBase64.length
      });
      
      const base64DataUrl = `data:image/png;base64,${generatedImageBase64}`;
      return base64DataUrl;
      
    } else if (generatedImageUrl) {
      // If we have URL, download and convert to base64
      logWithContext('INFO', 'Downloading image from OpenAI URL', requestId, {
        imageUrl: generatedImageUrl
      });

      const imageResponse2 = await fetch(generatedImageUrl);
      if (!imageResponse2.ok) {
        throw new Error(`Failed to download generated image from URL: ${imageResponse2.status} ${imageResponse2.statusText}`);
      }
      
      const imageBuffer = await imageResponse2.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);
      
      // Convert to base64
      let binary = '';
      for (let i = 0; i < imageBytes.length; i++) {
        binary += String.fromCharCode(imageBytes[i]);
      }
      const base64String = btoa(binary);
      const base64DataUrl = `data:image/png;base64,${base64String}`;

      logWithContext('INFO', 'Image converted to base64 successfully', requestId, {
        base64Length: base64DataUrl.length,
        mimeType: 'image/png'
      });

      return base64DataUrl;
      
    } else {
      logWithContext('ERROR', 'No image data received from OpenAI', requestId, {
        responseData: imageData.data?.[0] || 'No data array found',
        hasUrl: !!imageData.data?.[0]?.url,
        hasBase64: !!imageData.data?.[0]?.b64_json,
        availableKeys: imageData.data?.[0] ? Object.keys(imageData.data[0]) : 'No keys available'
      });
      throw new Error('No image URL or base64 data received from OpenAI Images Edit API. Response structure may be invalid.');
    }

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error in OpenAI Images Edit API call: ${String(error)}`);
  }
}

// Store future photo in Supabase Storage bucket
async function storeFuturePhotoInBucket(
  futurePhotoBase64: string, 
  userId: string, 
  supabase: any, 
  requestId: string
): Promise<string> {
  logWithContext('INFO', 'Storing future photo in Supabase Storage bucket', requestId, {
    userId,
    base64Length: futurePhotoBase64.length
  });
  
  try {
    // Get user's supabase_uuid for folder structure
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('supabase_uuid')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      logWithContext('ERROR', 'Failed to get user profile for storage', requestId, {
        error: profileError.message,
        userId
      });
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    if (!userProfile?.supabase_uuid) {
      logWithContext('ERROR', 'User profile missing supabase_uuid', requestId, {
        userId,
        userProfile
      });
      throw new Error('User profile missing supabase_uuid for storage');
    }

    const supabaseUuid = userProfile.supabase_uuid;
    logWithContext('INFO', 'Retrieved user supabase_uuid for storage', requestId, {
      userId,
      supabaseUuid
    });

    // Convert base64 to binary for storage
    const base64Data = futurePhotoBase64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data format for storage');
    }

    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    logWithContext('INFO', 'Converted base64 to binary for storage', requestId, {
      originalSizeBytes: futurePhotoBase64.length,
      binarySizeBytes: binaryData.length,
      binarySizeMB: (binaryData.length / 1024 / 1024).toFixed(2)
    });

    // Upload to future-self-images bucket under user's folder
    const fileName = `${supabaseUuid}/future-self-${Date.now()}.png`;
    logWithContext('INFO', 'Uploading future photo to storage', requestId, { 
      fileName, 
      bucketName: 'future-self-images',
      supabaseUuid
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('future-self-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      logWithContext('ERROR', 'Storage upload failed', requestId, {
        error: uploadError.message,
        code: uploadError.statusCode,
        fileName
      });
      throw new Error(`Failed to upload future photo to storage: ${uploadError.message}`);
    }

    logWithContext('INFO', 'Future photo uploaded to storage successfully', requestId, {
      uploadPath: uploadData.path,
      fileName
    });

    // Get public URL for the storage file
    const { data: publicUrlData } = supabase.storage
      .from('future-self-images')
      .getPublicUrl(fileName);

    const storageUrl = publicUrlData.publicUrl;
    
    logWithContext('INFO', 'Storage public URL generated for future photo', requestId, { 
      storageUrl,
      fileName 
    });

    return storageUrl;

  } catch (error) {
    logWithContext('ERROR', 'Error storing future photo in bucket', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId
    });
    throw error;
  }
}

// Update user profile with future photo base64 data and storage URL
async function updateUserProfile(
  userId: string, 
  futurePhotoBase64: string, 
  futurePhotoStorageUrl: string, 
  supabase: any, 
  requestId: string
): Promise<void> {
  logWithContext('INFO', 'Updating user profile with future photo base64 data', requestId, {
    userId,
    base64Length: futurePhotoBase64.length,
    storageUrl: futurePhotoStorageUrl
  });
  
  try {
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        future_photo_url: futurePhotoBase64, // Store base64 data directly
        future_photo_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      logWithContext('ERROR', 'Database update error', requestId, {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        userId
      });
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    logWithContext('INFO', 'User profile updated successfully with base64 data and storage URL', requestId, {
      userId,
      storageUrl: futurePhotoStorageUrl
    });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error in database update: ${String(error)}`);
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logWithContext('INFO', 'CORS preflight request handled', requestId);
    return new Response('ok', { headers: corsHeaders });
  }

  logWithContext('INFO',  'Ageify-user edge function invoked with gpt-image-1', requestId, {
  }
  )
  logWithContext('INFO',  'Ageify-user edge function invoked with gpt-image-1', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type')
  });

  try {
    // Validate environment variables
    const { openaiApiKey, supabaseUrl, supabaseServiceKey } = validateEnvironment(requestId);

    // Parse and validate request body
    let requestBody: RequestBody;
    try {
      const rawBody = await req.json();
      requestBody = validateRequestBody(rawBody, requestId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Invalid request body',
        'VALIDATION_ERROR',
        400,
        requestId,
        { receivedBody: 'Failed to parse' }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created successfully', requestId);

    // Call OpenAI Images Edit API with gpt-image-1 model
    let futurePhotoBase64: string;
    try {
      futurePhotoBase64 = await callOpenAIImageEdit(requestBody.currentPhotoData, openaiApiKey, requestId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'OpenAI Images Edit API failed',
        'OPENAI_ERROR',
        500,
        requestId
      );
    }

    // Store future photo in Supabase Storage bucket
    let futurePhotoStorageUrl: string;
    try {
      futurePhotoStorageUrl = await storeFuturePhotoInBucket(futurePhotoBase64, requestBody.userId, supabase, requestId);
    } catch (error) {
      logWithContext('WARN', 'Failed to store future photo in bucket, continuing with base64 only', requestId, {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue without storage URL - not critical for functionality
      futurePhotoStorageUrl = '';
    }

    // Update user profile with base64 data and storage URL
    try {
      await updateUserProfile(requestBody.userId, futurePhotoBase64, futurePhotoStorageUrl, supabase, requestId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Database update failed',
        'DATABASE_ERROR',
        500,
        requestId
      );
    }

    // Return success response
    const successResponse: SuccessResponse = {
      success: true,
      futurePhotoBase64: futurePhotoBase64,
      futurePhotoStorageUrl: futurePhotoStorageUrl,
      message: 'Future self image generated and saved successfully using gpt-image-1',
      requestId,
      timestamp: new Date().toISOString()
    };

    logWithContext('INFO', 'Ageify-user edge function completed successfully with gpt-image-1', requestId, {
      base64Length: futurePhotoBase64.length,
      storageUrl: futurePhotoStorageUrl,
      processingTimeMs: Date.now() - parseInt(requestId.split('_')[1])
    });
    
    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Catch any unexpected errors
    logWithContext('ERROR', 'Unexpected error in ageify-user edge function', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      'An unexpected error occurred while processing your request',
      'UNKNOWN_ERROR',
      500,
      requestId,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
});