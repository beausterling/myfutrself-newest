import { useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

interface VoiceUploadResult {
  success: boolean;
  url?: string;
  filePath?: string;
  error?: string;
}

export const useVoiceStorage = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadVoiceRecording = async (audioBlob: Blob): Promise<VoiceUploadResult> => {
    if (!user?.id) {
      const error = 'User authentication required';
      console.error('❌ Upload failed:', error);
      setUploadError(error);
      return { success: false, error };
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      console.log('🎤 Starting voice recording upload for user:', user.id);
      console.log('📊 Audio blob size:', audioBlob.size, 'bytes');

      // Get authentication token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Get user's supabase_uuid for folder structure
      console.log('🔍 Fetching user profile for supabase_uuid');
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('supabase_uuid')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile:', profileError);
        throw new Error(`Failed to fetch user profile: ${profileError.message}`);
      }

      if (!userProfile?.supabase_uuid) {
        console.error('❌ No supabase_uuid found for user');
        throw new Error('User profile incomplete - missing storage UUID');
      }

      console.log('✅ User supabase_uuid found:', userProfile.supabase_uuid);

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `voice-recording-${timestamp}.wav`;
      const filePath = `${userProfile.supabase_uuid}/${filename}`;

      console.log('📁 Uploading to path:', filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice_recordings')
        .upload(filePath, audioBlob, {
          contentType: 'audio/wav',
          upsert: false // Don't overwrite existing files
        });

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        throw new Error(`Failed to upload recording: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', uploadData);

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('voice_recordings')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL generated:', publicUrl);

      // Update user profile with voice recording path and set voice preference
      console.log('📝 Updating user profile with voice recording path');
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          custom_voice_audio_path: filePath,
          voice_preference: 'custom_uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('❌ Failed to update user profile with voice recording path:', updateError);
        // Try to clean up the uploaded file
        await supabase.storage
          .from('voice_recordings')
          .remove([filePath]);
        throw new Error(`Failed to save voice recording reference: ${updateError.message}`);
      }

      console.log('✅ Voice recording upload and profile update completed successfully');
      return {
        success: true,
        url: publicUrl,
        filePath: filePath
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload voice recording';
      console.error('❌ Voice recording upload failed:', error);
      setUploadError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVoiceRecording = async (filePath: string): Promise<boolean> => {
    if (!user?.id) {
      console.error('❌ Delete failed: User authentication required');
      return false;
    }

    try {
      console.log('🗑️ Deleting voice recording:', filePath);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('voice_recordings')
        .remove([filePath]);

      if (storageError) {
        console.error('❌ Storage delete error:', storageError);
        throw new Error(`Failed to delete recording: ${storageError.message}`);
      }

      // Clear the custom_voice_audio_path from user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          custom_voice_audio_path: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.warn('⚠️ Warning: Failed to clear voice recording path from profile:', updateError);
        // Don't fail the entire operation for this
      }

      console.log('✅ Voice recording deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Voice recording deletion failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to delete voice recording');
      return false;
    }
  };

  const getVoiceRecordingPath = async (): Promise<string | null> => {
    if (!user?.id) {
      console.error('❌ Get path failed: User authentication required');
      return null;
    }

    try {
      console.log('📋 Getting voice recording path for user:', user.id);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Get user's custom_voice_audio_path
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('custom_voice_audio_path')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching user profile for voice path:', profileError);
        return null;
      }

      console.log('✅ Voice recording path retrieved:', userProfile?.custom_voice_audio_path || 'none');
      return userProfile?.custom_voice_audio_path || null;

    } catch (error) {
      console.error('❌ Voice recording path retrieval failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to get voice recording path');
      return null;
    }
  };

  const listVoiceRecordings = async (): Promise<string[]> => {
    if (!user?.id) {
      console.error('❌ List failed: User authentication required');
      return [];
    }

    try {
      console.log('📋 Listing voice recordings for user:', user.id);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Get user's supabase_uuid
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('supabase_uuid')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile?.supabase_uuid) {
        console.error('❌ Error fetching user profile for listing');
        return [];
      }

      // List files in user's folder
      const { data: files, error: listError } = await supabase.storage
        .from('voice_recordings')
        .list(userProfile.supabase_uuid);

      if (listError) {
        console.error('❌ List error:', listError);
        throw new Error(`Failed to list recordings: ${listError.message}`);
      }

      const filePaths = files?.map(file => `${userProfile.supabase_uuid}/${file.name}`) || [];
      console.log('✅ Found voice recordings:', filePaths.length);
      return filePaths;

    } catch (error) {
      console.error('❌ Voice recording listing failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to list voice recordings');
      return [];
    }
  };

  return {
    uploadVoiceRecording,
    deleteVoiceRecording,
    getVoiceRecordingPath,
    listVoiceRecordings,
    isUploading,
    uploadError,
    clearError: () => setUploadError(null)
  };
};