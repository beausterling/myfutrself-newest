import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RequestBody {
  photoData: string;
  userId: string;
}

interface SuccessResponse {
  success: true;
  base64Url: string;
  storageUrl: string;
  message: string;
  fileSize: number;
  timestamp: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
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

// Extract MIME type from base64 data URL
function extractMimeType(photoData: string): string {
  const mimeTypeMatch = photoData.match(/^data:([^;]+);base64,/);
  if (!mimeTypeMatch) {
    console.warn('⚠️ Could not extract MIME type from photoData, defaulting to image/jpeg');
    return 'image/jpeg';
  }
  
  const mimeType = mimeTypeMatch[1];
  console.log('📋 Extracted MIME type:', mimeType);
  return mimeType;
}

// Get file extension from MIME type
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      console.warn('⚠️ Unknown MIME type, defaulting to .png extension for storage');
      return '.png';
  }
}

serve(async (req) => {
  const requestId = generateRequestId();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logWithContext('INFO', 'CORS preflight request handled', requestId);
    return new Response('ok', { headers: corsHeaders });
  }

  logWithContext('INFO', 'Upload current photo edge function invoked', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    logWithContext('INFO', 'Environment variables validated', requestId);

    // Parse and validate request body
    let requestBody: RequestBody;
    try {
      requestBody = await req.json();
    } catch (error) {
      logWithContext('ERROR', 'Failed to parse request body', requestId, { error });
      throw new Error('Invalid JSON in request body');
    }
    
    const { photoData, userId } = requestBody;
    
    if (!photoData || !userId) {
      logWithContext('ERROR', 'Missing required fields in request body', requestId, {
        hasPhotoData: !!photoData,
        hasUserId: !!userId
      });
      throw new Error('Missing photoData or userId in request body');
    }

    if (typeof photoData !== 'string' || typeof userId !== 'string') {
      throw new Error('photoData and userId must be strings');
    }

    if (!photoData.startsWith('data:image/')) {
      throw new Error('photoData must be a valid base64 data URL starting with "data:image/"');
    }

    logWithContext('INFO', 'Request validated successfully', requestId, { 
      userId, 
      photoDataLength: photoData.length,
      photoDataPrefix: photoData.substring(0, 50) + '...'
    });

    // Extract MIME type and prepare file info
    const mimeType = extractMimeType(photoData);
    const fileExtension = getFileExtension(mimeType);
    
    logWithContext('INFO', 'File type determined', requestId, { 
      mimeType, 
      fileExtension 
    });

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created', requestId);

    // Check if user profile exists
    logWithContext('INFO', 'Checking user profile existence', requestId, { userId });
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      logWithContext('ERROR', 'Error checking user profile', requestId, {
        error: profileCheckError.message,
        code: profileCheckError.code,
        userId
      });
      throw new Error(`Failed to check user profile: ${profileCheckError.message}`);
    }

    if (!existingProfile) {
      logWithContext('ERROR', 'User profile not found', requestId, { userId });
      throw new Error('User profile not found. Please complete user setup first.');
    }

    logWithContext('INFO', 'User profile exists', requestId, { userId });

    // Convert base64 to binary for storage
    const base64Data = photoData.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data format');
    }

    let binaryData: Uint8Array;
    try {
      binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    } catch (error) {
      logWithContext('ERROR', 'Failed to decode base64 data', requestId, { error });
      throw new Error('Failed to decode base64 image data');
    }
    
    logWithContext('INFO', 'Image data processed successfully', requestId, {
      originalSizeBytes: photoData.length,
      binarySizeBytes: binaryData.length,
      binarySizeMB: (binaryData.length / 1024 / 1024).toFixed(2)
    });

    // Upload PNG file to storage (for edge function use)
    const fileName = `${userId}/current-self-${Date.now()}${fileExtension}`;
    logWithContext('INFO', 'Uploading image to storage', requestId, { 
      fileName, 
      mimeType,
      bucketName: 'current-self-images'
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('current-self-images')
      .upload(fileName, binaryData, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      logWithContext('ERROR', 'Storage upload failed', requestId, {
        error: uploadError.message,
        code: uploadError.statusCode,
        fileName
      });
      throw new Error(`Failed to upload image to storage: ${uploadError.message}`);
    }

    logWithContext('INFO', 'Image uploaded to storage successfully', requestId, {
      uploadPath: uploadData.path,
      fileName
    });

    // Get public URL for the storage file
    const { data: publicUrlData } = supabase.storage
      .from('current-self-images')
      .getPublicUrl(fileName);

    const storageUrl = publicUrlData.publicUrl;
    
    logWithContext('INFO', 'Storage public URL generated', requestId, { storageUrl });

    // Store base64 in database (for preview display)
    logWithContext('INFO', 'Updating user profile with base64 data', requestId, { userId });
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        photo_url: photoData, // Store the full base64 data URL
        photo_updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      logWithContext('ERROR', 'Failed to update user profile', requestId, {
        error: updateError.message,
        code: updateError.code,
        userId
      });
      throw new Error(`Failed to update user profile: ${updateError.message}`);
    }

    logWithContext('INFO', 'User profile updated successfully', requestId, { userId });

    // Prepare success response
    const successResponse: SuccessResponse = {
      success: true,
      base64Url: photoData, // The base64 data URL for preview
      storageUrl: storageUrl, // The storage URL for edge function processing
      message: 'Photo uploaded and stored successfully',
      fileSize: binaryData.length,
      timestamp: new Date().toISOString()
    };

    logWithContext('INFO', 'Upload process completed successfully', requestId, {
      base64Length: photoData.length,
      storageUrl,
      fileSize: binaryData.length,
      processingTimeMs: Date.now() - parseInt(requestId.split('_')[1])
    });

    return new Response(JSON.stringify(successResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logWithContext('ERROR', 'Upload process failed', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    };
    
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});