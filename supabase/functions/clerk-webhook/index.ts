import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Webhook } from 'https://esm.sh/svix@1.15.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUser;
  object: string;
  timestamp: number;
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
  userId?: string;
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
  userId?: string
): Response {
  const successResponse: SuccessResponse = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    requestId,
    ...(userId && { userId })
  };

  logWithContext('INFO', `Success response created: ${message}`, requestId);

  return new Response(JSON.stringify(successResponse), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
}

// Validate environment variables
function validateEnvironment(requestId: string): { supabaseUrl: string; supabaseServiceKey: string; webhookSecret: string } {
  logWithContext('INFO', 'Validating environment variables', requestId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET');
  
  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!webhookSecret) missing.push('CLERK_WEBHOOK_SECRET');
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  logWithContext('INFO', 'Environment variables validated successfully', requestId);
  return { supabaseUrl, supabaseServiceKey, webhookSecret };
}

// Verify webhook signature using svix
async function verifyWebhookSignature(
  payload: string,
  headers: Headers,
  webhookSecret: string,
  requestId: string
): Promise<ClerkWebhookEvent> {
  logWithContext('INFO', 'Verifying webhook signature', requestId);
  
  const svixId = headers.get('svix-id');
  const svixTimestamp = headers.get('svix-timestamp');
  const svixSignature = headers.get('svix-signature');
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing required svix headers for webhook verification');
  }
  
  const webhook = new Webhook(webhookSecret);
  
  try {
    const event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;
    
    logWithContext('INFO', 'Webhook signature verified successfully', requestId, {
      eventType: event.type,
      userId: event.data?.id
    });
    
    return event;
  } catch (error) {
    logWithContext('ERROR', 'Webhook signature verification failed', requestId, {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Invalid webhook signature');
  }
}

// Handle user creation
async function handleUserCreated(
  userData: ClerkUser,
  supabase: any,
  requestId: string
): Promise<void> {
  logWithContext('INFO', 'Handling user creation', requestId, {
    userId: userData.id,
    email: userData.email_addresses?.[0]?.email_address,
    firstName: userData.first_name
  });
  
  try {
    // Check if user profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userData.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      logWithContext('ERROR', 'Error checking existing user profile', requestId, {
        error: checkError.message,
        code: checkError.code
      });
      throw new Error(`Failed to check existing user profile: ${checkError.message}`);
    }

    if (existingProfile) {
      logWithContext('WARN', 'User profile already exists, skipping creation', requestId, {
        userId: userData.id
      });
      return;
    }

    // Create new user profile
    const { error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userData.id,
        avatar_url: userData.image_url || null,
        voice_preference: 'friendly_mentor', // Default voice
        call_mode: 'user_initiated', // Default call mode
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      logWithContext('ERROR', 'Error creating user profile', requestId, {
        error: insertError.message,
        code: insertError.code,
        userId: userData.id
      });
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }

    logWithContext('INFO', 'User profile created successfully', requestId, {
      userId: userData.id
    });

  } catch (error) {
    logWithContext('ERROR', 'Error in handleUserCreated', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId: userData.id
    });
    throw error;
  }
}

// Handle user deletion
async function handleUserDeleted(
  userData: ClerkUser,
  supabase: any,
  requestId: string
): Promise<void> {
  logWithContext('INFO', 'Handling user deletion', requestId, {
    userId: userData.id
  });
  
  try {
    // Get user profile to find supabase_uuid for storage cleanup
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('supabase_uuid')
      .eq('user_id', userData.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      logWithContext('ERROR', 'Error fetching user profile for deletion', requestId, {
        error: profileError.message,
        code: profileError.code,
        userId: userData.id
      });
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (!userProfile) {
      logWithContext('WARN', 'User profile not found for deletion, may have been already deleted', requestId, {
        userId: userData.id
      });
      return;
    }

    const supabaseUuid = userProfile.supabase_uuid;
    
    if (supabaseUuid) {
      logWithContext('INFO', 'Cleaning up user storage files', requestId, {
        userId: userData.id,
        supabaseUuid
      });

      // Delete files from current-self-images bucket
      try {
        const { data: currentSelfFiles, error: listCurrentError } = await supabase.storage
          .from('current-self-images')
          .list(supabaseUuid);

        if (listCurrentError) {
          logWithContext('WARN', 'Error listing current-self-images files', requestId, {
            error: listCurrentError.message,
            supabaseUuid
          });
        } else if (currentSelfFiles && currentSelfFiles.length > 0) {
          const filePaths = currentSelfFiles.map(file => `${supabaseUuid}/${file.name}`);
          const { error: deleteCurrentError } = await supabase.storage
            .from('current-self-images')
            .remove(filePaths);

          if (deleteCurrentError) {
            logWithContext('WARN', 'Error deleting current-self-images files', requestId, {
              error: deleteCurrentError.message,
              filePaths
            });
          } else {
            logWithContext('INFO', 'Successfully deleted current-self-images files', requestId, {
              fileCount: filePaths.length
            });
          }
        }
      } catch (error) {
        logWithContext('WARN', 'Error during current-self-images cleanup', requestId, {
          error: error instanceof Error ? error.message : String(error)
        });
      }

      // Delete files from future-self-images bucket
      try {
        const { data: futureSelfFiles, error: listFutureError } = await supabase.storage
          .from('future-self-images')
          .list(supabaseUuid);

        if (listFutureError) {
          logWithContext('WARN', 'Error listing future-self-images files', requestId, {
            error: listFutureError.message,
            supabaseUuid
          });
        } else if (futureSelfFiles && futureSelfFiles.length > 0) {
          const filePaths = futureSelfFiles.map(file => `${supabaseUuid}/${file.name}`);
          const { error: deleteFutureError } = await supabase.storage
            .from('future-self-images')
            .remove(filePaths);

          if (deleteFutureError) {
            logWithContext('WARN', 'Error deleting future-self-images files', requestId, {
              error: deleteFutureError.message,
              filePaths
            });
          } else {
            logWithContext('INFO', 'Successfully deleted future-self-images files', requestId, {
              fileCount: filePaths.length
            });
          }
        }
      } catch (error) {
        logWithContext('WARN', 'Error during future-self-images cleanup', requestId, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // Delete user profile (this will cascade delete all related data due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userData.id);

    if (deleteError) {
      logWithContext('ERROR', 'Error deleting user profile', requestId, {
        error: deleteError.message,
        code: deleteError.code,
        userId: userData.id
      });
      throw new Error(`Failed to delete user profile: ${deleteError.message}`);
    }

    logWithContext('INFO', 'User profile and related data deleted successfully', requestId, {
      userId: userData.id
    });

  } catch (error) {
    logWithContext('ERROR', 'Error in handleUserDeleted', requestId, {
      error: error instanceof Error ? error.message : String(error),
      userId: userData.id
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

  logWithContext('INFO', 'Clerk webhook invoked', requestId, {
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent')
  });

  try {
    // Validate environment variables
    const { supabaseUrl, supabaseServiceKey, webhookSecret } = validateEnvironment(requestId);

    // Get request body
    const payload = await req.text();
    
    if (!payload) {
      return createErrorResponse('Request body is required', requestId, 400);
    }

    // Verify webhook signature
    let event: ClerkWebhookEvent;
    try {
      event = await verifyWebhookSignature(payload, req.headers, webhookSecret, requestId);
    } catch (error) {
      return createErrorResponse(
        error instanceof Error ? error.message : 'Webhook verification failed',
        requestId,
        401
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logWithContext('INFO', 'Supabase admin client created successfully', requestId);

    // Handle different event types
    switch (event.type) {
      case 'user.created':
        logWithContext('INFO', 'Processing user.created event', requestId, {
          userId: event.data.id
        });
        await handleUserCreated(event.data, supabase, requestId);
        return createSuccessResponse(
          'User profile created successfully',
          requestId,
          event.data.id
        );

      case 'user.deleted':
        logWithContext('INFO', 'Processing user.deleted event', requestId, {
          userId: event.data.id
        });
        await handleUserDeleted(event.data, supabase, requestId);
        return createSuccessResponse(
          'User data deleted successfully',
          requestId,
          event.data.id
        );

      case 'user.updated':
        logWithContext('INFO', 'Processing user.updated event (no action required)', requestId, {
          userId: event.data.id
        });
        return createSuccessResponse(
          'User update event received (no action required)',
          requestId,
          event.data.id
        );

      default:
        logWithContext('WARN', 'Unhandled webhook event type', requestId, {
          eventType: event.type,
          userId: event.data?.id
        });
        return createSuccessResponse(
          `Event type ${event.type} received but not handled`,
          requestId,
          event.data?.id
        );
    }

  } catch (error) {
    logWithContext('ERROR', 'Unexpected error in clerk-webhook', requestId, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return createErrorResponse(
      'An unexpected error occurred while processing the webhook',
      requestId,
      500
    );
  }
});