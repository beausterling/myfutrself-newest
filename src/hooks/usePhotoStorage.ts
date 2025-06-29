import { useState, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

interface PhotoStorageState {
  photoPreview: string | null;
  isLoadingPhoto: boolean;
  futurePhotoError: string | null;
  imageLoadError: string | null;
  isPhotoNewlySet: boolean;
}

interface PhotoStorageActions {
  setPhotoPreview: (photo: string | null) => void;
  loadExistingPhoto: () => Promise<void>;
  savePhotoToDatabase: (photoData: string) => Promise<{ base64Url: string }>;
  removePhoto: () => Promise<void>;
  initiateFuturePhotoGeneration: (currentPhotoData: string, userId: string) => Promise<void>;
  handleImageError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  handleImageLoad: () => void;
  clearErrors: () => void;
}

interface UsePhotoStorageReturn extends PhotoStorageState, PhotoStorageActions {}

// Check if Edge Functions are available
const checkEdgeFunctionAvailability = async (functionName: string): Promise<boolean> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠️ Supabase configuration not found');
      return false;
    }

    // Test if the edge function endpoint is reachable with a simple OPTIONS request
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    return response.ok || response.status === 405; // 405 Method Not Allowed is also acceptable for OPTIONS
  } catch (error) {
    console.warn(`⚠️ Edge function ${functionName} not available:`, error);
    return false;
  }
};

export const usePhotoStorage = (): UsePhotoStorageReturn => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const [photoPreview, setPhotoPreviewState] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [futurePhotoError, setFuturePhotoError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [isPhotoNewlySet, setIsPhotoNewlySet] = useState(false);

  const setPhotoPreview = useCallback((photo: string | null) => {
    console.log('📸 Setting photo preview:', photo ? 'New photo data' : 'Clearing photo');
    setPhotoPreviewState(photo);
    
    // Track whether this is a new photo or clearing
    if (photo) {
      console.log('✨ Photo newly set - marking for AI processing');
      setIsPhotoNewlySet(true);
    } else {
      console.log('🗑️ Photo cleared - resetting new photo flag');
      setIsPhotoNewlySet(false);
    }
  }, []);

  const loadExistingPhoto = useCallback(async () => {
    if (!user?.id) {
      console.log('❌ No user ID available, skipping photo load');
      return;
    }

    // If we already have a photo in preview, don't load from database
    if (photoPreview) {
      console.log('ℹ️ Photo already available in preview, skipping database load');
      return;
    }

    try {
      setIsLoadingPhoto(true);
      console.log('🔄 Loading existing photo for user:', user.id);

      // Get Clerk token and create authenticated Supabase client
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('❌ No Clerk token available');
        return;
      }

      console.log('✅ Clerk token obtained successfully');
      const supabase = createAuthenticatedSupabaseClient(token);

      // Query user profile for existing photo (now expects base64 data)
      console.log('📊 Querying user profile for existing photo...');
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('photo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Error loading user profile:', {
          error: profileError,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
          userId: user.id
        });
        return;
      }

      if (userProfile?.photo_url) {
        console.log('✅ Found existing photo data:', {
          isBase64: userProfile.photo_url.startsWith('data:'),
          dataLength: userProfile.photo_url.length,
          isPNG: userProfile.photo_url.startsWith('data:image/png')
        });
        
        // The photo_url now contains base64 data, perfect for preview
        setPhotoPreviewState(userProfile.photo_url);
        
        // This is an existing photo loaded from database, not newly set
        console.log('📂 Existing photo loaded - NOT marking for AI processing');
        setIsPhotoNewlySet(false);
      } else {
        console.log('ℹ️ No existing photo found for user');
      }
    } catch (error) {
      console.error('❌ Error loading existing photo:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsLoadingPhoto(false);
    }
  }, [user?.id, getToken, photoPreview]);

  const savePhotoToDatabase = useCallback(async (photoData: string): Promise<{ base64Url: string }> => {
    if (!user?.id) {
      console.warn('⚠️ No user ID available, skipping photo save to database');
      return { base64Url: photoData };
    }

    try {
      console.log('💾 Attempting to save photo via edge function...');
      console.log('🔍 Photo format validation:', {
        isBase64: photoData.startsWith('data:'),
        isPNG: photoData.startsWith('data:image/png'),
        dataLength: photoData.length
      });
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration not found');
      }

      // Check if the edge function is available
      const isEdgeFunctionAvailable = await checkEdgeFunctionAvailability('upload-current-photo');
      
      if (!isEdgeFunctionAvailable) {
        console.warn('⚠️ Edge function not available, saving directly to database...');
        
        // Fallback: Save directly to database using authenticated client
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Check if user profile exists first
        const { data: existingProfile, error: checkError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(`Failed to check user profile: ${checkError.message}`);
        }

        if (!existingProfile) {
          throw new Error('User profile not found. Please complete user setup first.');
        }

        // Update user profile with base64 data
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            photo_url: photoData,
            photo_updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) {
          throw new Error(`Failed to update user profile: ${updateError.message}`);
        }

        console.log('✅ Photo saved directly to database successfully');
        
        // Mark as newly set since we just saved it
        console.log('💾 Photo saved - marking as newly set for AI processing');
        setIsPhotoNewlySet(true);
        
        return { base64Url: photoData };
      }

      console.log('📞 Calling upload-current-photo edge function...');
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-current-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          photoData,
          userId: user.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Edge function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to upload photo: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Photo uploaded successfully via edge function:', {
        hasBase64Url: !!result.base64Url,
        hasStorageUrl: !!result.storageUrl,
        fileSize: result.fileSize,
        message: result.message
      });

      // Mark as newly set since we just saved it
      console.log('💾 Photo saved via edge function - marking as newly set for AI processing');
      setIsPhotoNewlySet(true);

      return {
        base64Url: result.base64Url
      };

    } catch (error) {
      console.error('❌ Error saving photo:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // If edge function fails, try direct database save as fallback
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        console.warn('⚠️ Edge function fetch failed, attempting direct database save...');
        
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            const supabase = createAuthenticatedSupabaseClient(token);
            
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                photo_url: photoData,
                photo_updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (!updateError) {
              console.log('✅ Photo saved via fallback method');
              
              // Mark as newly set since we just saved it
              console.log('💾 Photo saved via fallback - marking as newly set for AI processing');
              setIsPhotoNewlySet(true);
              
              return { base64Url: photoData };
            }
          }
        } catch (fallbackError) {
          console.error('❌ Fallback save also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }, [user?.id, getToken]);

  const removePhoto = useCallback(async () => {
    console.log('🗑️ Removing photo...');
    setPhotoPreviewState(null);
    setImageLoadError(null);
    setFuturePhotoError(null); // Clear any future photo errors
    
    // Reset the newly set flag when removing photo
    console.log('🗑️ Photo removed - resetting new photo flag');
    setIsPhotoNewlySet(false);
    
    // Also remove from database
    if (user?.id) {
      try {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          const supabase = createAuthenticatedSupabaseClient(token);
          
          // Check if user profile exists first
          const { data: existingProfile, error: checkError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('❌ Error checking user profile:', checkError);
            return; // Don't throw error for photo removal, just skip it
          }

          if (!existingProfile) {
            console.warn('⚠️ User profile not found during photo removal - skipping');
            return; // Don't throw error for photo removal, just skip it
          }

          const { data: updateData, error } = await supabase
            .from('user_profiles')
            .update({ 
              photo_url: null,
              photo_updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .select();

          if (error) {
            console.error('❌ Error removing photo from database:', error);
          } else if (!updateData || updateData.length === 0) {
            console.warn('⚠️ No user profile was updated during photo removal');
          } else {
            console.log('✅ Photo removed from database successfully');
          }
        }
      } catch (error) {
        console.error('❌ Error removing photo from database:', error);
      }
    }
  }, [user?.id, getToken]);

  const initiateFuturePhotoGeneration = useCallback(async (currentPhotoData: string, userId: string) => {
    try {
      console.log('🔮 Initiating future photo generation for user:', userId);
      console.log('📊 Photo data details:', {
        isBase64: currentPhotoData.startsWith('data:'),
        isPNG: currentPhotoData.startsWith('data:image/png'),
        dataLength: currentPhotoData.length
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration not found');
      }

      // Check if the edge function is available
      const isEdgeFunctionAvailable = await checkEdgeFunctionAvailability('ageify-user');
      
      if (!isEdgeFunctionAvailable) {
        console.warn('⚠️ Ageify-user edge function not available');
        setFuturePhotoError('The AI photo generation feature is not available in this development environment. The Edge Functions need to be deployed to Supabase. You can continue with your onboarding - this feature will be available once the functions are properly deployed.');
        return;
      }

      console.log('📞 Invoking ageify-user edge function...');
      const response = await fetch(`${supabaseUrl}/functions/v1/ageify-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          currentPhotoData: currentPhotoData, // Send base64 data directly
          userId: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Edge function error:', {
          error: errorData,
          errorMessage: errorData.error,
          errorName: errorData.errorType,
          fullError: JSON.stringify(errorData, null, 2)
        });
        
        // Extract detailed error information from edge function response
        let detailedErrorMessage = 'Unable to generate your future photo at this time.';
        
        // Check for 401 Unauthorized errors which indicate missing OpenAI API configuration
        if (response.status === 401 || 
            errorData.message?.includes('401') || 
            errorData.message?.includes('Unauthorized') ||
            errorData.message?.includes('Edge Function returned a non-2xx status code')) {
          detailedErrorMessage = 'The AI photo generation feature is not available in this development environment. The OpenAI API key needs to be configured in the Supabase project settings. You can continue with your onboarding - this feature will be available once properly configured.';
        } else if (errorData.error && typeof errorData.error === 'string') {
          // Use the specific error message from the edge function
          if (errorData.error.includes('Missing required environment variables') || 
              errorData.error.includes('OPENAI_API_KEY')) {
            detailedErrorMessage = 'The AI photo generation service is not properly configured. The OpenAI API key is missing.';
          } else if (errorData.error.includes('OpenAI API authentication failed') ||
                     errorData.error.includes('Check OPENAI_API_KEY')) {
            detailedErrorMessage = 'The AI service authentication failed. The OpenAI API key is invalid or expired.';
          } else if (errorData.error.includes('quota') || 
                     errorData.error.includes('rate limit') ||
                     errorData.error.includes('exceeded')) {
            detailedErrorMessage = 'The AI photo generation service has reached its usage limit. Please try again later.';
          } else {
            detailedErrorMessage = `AI service error: ${errorData.error}`;
          }
        }
        
        console.warn('⚠️ Setting user-friendly error message:', detailedErrorMessage);
        setFuturePhotoError(detailedErrorMessage);
        return; // Don't throw error, just log and continue
      }

      const data = await response.json();
      console.log('✅ Edge function response:', data);

      if (data?.futurePhotoBase64) {
        console.log('🎯 Future photo base64 data received:', {
          dataLength: data.futurePhotoBase64.length,
          isPNG: data.futurePhotoBase64.startsWith('data:image/png')
        });
      } else {
        console.warn('⚠️ No future photo data in edge function response');
        setFuturePhotoError('The AI service completed but did not return a future photo. This feature is still in development.');
      }

    } catch (error) {
      console.error('❌ Error in future photo generation:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        userId,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Handle fetch errors specifically
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        setFuturePhotoError('The AI photo generation feature is not available in this development environment. The Edge Functions need to be deployed to Supabase. You can continue with your onboarding - this feature will be available once the functions are properly deployed.');
        return;
      }
      
      // Only set error if it wasn't already set above
      if (!futurePhotoError) {
        let catchErrorMessage = 'An unexpected error occurred while generating your future photo. You can continue with the onboarding process.';
        
        if (error instanceof Error) {
          if (error.message.includes('Missing required environment variables') || 
              error.message.includes('OPENAI_API_KEY')) {
            catchErrorMessage = 'The AI photo generation service is not properly configured. Please contact support.';
          } else if (error.message.includes('Edge Function returned a non-2xx status code')) {
            catchErrorMessage = 'The AI photo generation service encountered an error. This feature is still in development.';
          }
        }
        
        setFuturePhotoError(catchErrorMessage);
      }
      
      // Don't throw the error - this is a background process that shouldn't block the user
    }
  }, [futurePhotoError]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.target as HTMLImageElement;
    console.error('❌ Error loading photo preview image:', {
      src: photoPreview,
      error: e,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });
    
    setImageLoadError('Failed to load image preview. The image data may be corrupted.');
  }, [photoPreview]);

  const handleImageLoad = useCallback(() => {
    console.log('✅ Photo preview image loaded successfully');
    setImageLoadError(null);
  }, []);

  const clearErrors = useCallback(() => {
    setFuturePhotoError(null);
    setImageLoadError(null);
  }, []);

  return {
    // State
    photoPreview,
    futurePhotoError,
    imageLoadError,
    isPhotoNewlySet,
    
    // Actions
    setPhotoPreview,
    loadExistingPhoto,
    savePhotoToDatabase,
    removePhoto,
    initiateFuturePhotoGeneration,
    handleImageError,
    handleImageLoad,
    clearErrors,
    
    // Internal state setter for hook usage  
    setFuturePhotoError
  };
};