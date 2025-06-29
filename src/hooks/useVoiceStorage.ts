import { useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

interface VoiceUploadResult {
  success: boolean;
  url?: string;
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

      // Update user profile with voice recording URL
      console.log('📝 Updating user profile with voice recording URL');
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          voice_preference: 'custom_uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.warn('⚠️ Warning: Failed to update user profile with voice preference:', updateError);
        // Don't fail the entire operation for this
      }

      console.log('✅ Voice recording upload completed successfully');
      return {
        success: true,
        url: publicUrl
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

      const { error } = await supabase.storage
        .from('voice_recordings')
        .remove([filePath]);

      if (error) {
        console.error('❌ Delete error:', error);
        throw new Error(`Failed to delete recording: ${error.message}`);
      }

      console.log('✅ Voice recording deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Voice recording deletion failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to delete voice recording');
      return false;
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
    listVoiceRecordings,
    isUploading,
    uploadError,
    clearError: () => setUploadError(null)
  };
};