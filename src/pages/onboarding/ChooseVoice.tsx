import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { AlertCircle, Mic, Play, Pause, X, CreditCard, Loader2, Upload, Square, RotateCcw, Check } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useElevenLabsVoices } from '../../hooks/useElevenLabsVoices';
import { useVoiceStorage } from '../../hooks/useVoiceStorage';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const ChooseVoice = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [playbackAudio, setPlaybackAudio] = useState<HTMLAudioElement | null>(null);
  const [existingVoiceRecording, setExistingVoiceRecording] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [hasExistingVoicePreference, setHasExistingVoicePreference] = useState<boolean>(false);
  const { uploadVoiceRecording, isUploading: isUploadingVoice } = useVoiceStorage();

  // Disable ALL background scrolling when modal is open
  useEffect(() => {
    if (showVoiceModal) {
      // Store original overflow values
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      // Disable scrolling on both html and body elements
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      
      // Prevent touch scrolling on mobile
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      // Store scroll position
      const scrollY = window.scrollY;
      
      // Cleanup function
      return () => {
        // Restore original overflow values
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        
        // Restore body position and scroll
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    } else {
      // Re-enable scrolling when modal is closed
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }
  }, [showVoiceModal]);

  const {
    voices,
    isLoading,
    error: voicesError,
    isPlaying,
    isBuffering,
    audioProgress,
    playVoice,
    stopVoice,
    refetchVoices
  } = useElevenLabsVoices();

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load existing voice preference from database
  useEffect(() => {
    const loadVoicePreference = async () => {
      if (!user?.id || hasLoadedFromDB) {
        return;
      }

      try {
        console.log('🔄 Loading voice preference for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('voice_preference, custom_voice_audio_path')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error loading voice preference:', error);
          setSaveError(`Failed to load existing voice preference: ${error.message}`);
          return;
        }

        if (userProfile?.voice_preference) {
          console.log('✅ Loaded existing voice preference:', userProfile.voice_preference);
          dispatch({ type: 'SET_VOICE', payload: userProfile.voice_preference });
          
          // Check if user has a non-null voice preference (excluding custom states)
          const hasVoiceSet = userProfile.voice_preference && 
                             userProfile.voice_preference !== 'custom' && 
                             userProfile.voice_preference !== 'custom_uploaded';
          setHasExistingVoicePreference(hasVoiceSet);
          console.log('🔍 Has existing voice preference:', hasVoiceSet, 'Voice:', userProfile.voice_preference);
        } else {
          setHasExistingVoicePreference(false);
        }
        
        if (userProfile?.custom_voice_audio_path) {
          console.log('✅ Found existing voice recording:', userProfile.custom_voice_audio_path);
          setExistingVoiceRecording(userProfile.custom_voice_audio_path);
        }
        
        setHasLoadedFromDB(true);
      } catch (error) {
        console.error('❌ Error loading voice preference:', error);
        setSaveError('Failed to load voice preference. Please refresh and try again.');
        setHasLoadedFromDB(true);
      }
    };

    loadVoicePreference();
  }, [user?.id, getToken, hasLoadedFromDB, dispatch]);

  const handleVoiceSelect = (voiceId: string) => {
    console.log('🎯 Voice selected:', voiceId);
    dispatch({ type: 'SET_VOICE', payload: voiceId });
  };

  const handleCustomVoiceClick = () => {
    console.log('🎯 Custom voice option clicked - showing voice modal');
    
    // If there's existing voice recording, show the completion state
    if (existingVoiceRecording) {
      console.log('📁 Existing voice recording found, showing completion state');
      setShowVoiceModal(true);
      // Simulate having a completed recording by setting a placeholder blob
      // This will trigger the "Recording Complete!" view
      setAudioBlob(new Blob(['placeholder'], { type: 'audio/wav' }));
      setRecordingTime(30); // Show as completed recording
    } else {
      requestMicrophonePermission();
    }
  };

  const handleUpgradeClick = () => {
    console.log('🔄 Redirecting to pricing page for voice upgrade');
    // Open pricing page in new tab
    window.open('/pricing', '_blank');
  };

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎤 Requesting microphone permission');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Permission granted, stop the stream and show modal
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermissionGranted(true);
      setShowVoiceModal(true);
      
      console.log('✅ Microphone permission granted');
    } catch (error) {
      console.error('❌ Microphone permission denied:', error);
      setSaveError('Microphone access is required to create a custom voice. Please allow microphone access and try again.');
    }
  };

  const handlePaywallClose = () => {
    setShowPaywallModal(false);
  };

  const handleSubscribe = () => {
    // TODO: Implement subscription logic
    console.log('🔄 Redirecting to subscription page...');
    // For now, just close the modal
    setShowPaywallModal(false);
    // In the future, this would redirect to a subscription page or open a payment modal
  };

  const handleVoiceModalClose = () => {
    console.log('🔄 Closing voice modal and cleaning up resources');
    
    // Stop any active recording
    if (isRecording && mediaRecorder) {
      console.log('⏹️ Stopping active recording during modal close');
      mediaRecorder.stop();
    }
    
    // Clear recording interval
    if (recordingInterval) {
      console.log('⏰ Clearing recording interval');
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
    
    // Stop all media stream tracks
    if (streamRef.current) {
      console.log('🎤 Stopping media stream tracks');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log(`📡 Stopped track: ${track.kind}`);
      });
      streamRef.current = null;
    }
    
    // Reset all recording-related state
    setIsRecording(false);
    
    // Only reset recording state if there's no existing recording
    if (!existingVoiceRecording) {
      setRecordingTime(0);
      setAudioBlob(null);
    }
    
    setMediaRecorder(null);
    setMicrophonePermissionGranted(false);
    
    // Close modal
    setShowVoiceModal(false);
    
    console.log('✅ Voice modal cleanup completed');
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording process');
      
      // Clean up any existing recording session first
      if (mediaRecorder && isRecording) {
        console.log('⏹️ Stopping existing recording before starting new one');
        mediaRecorder.stop();
      }
      
      if (recordingInterval) {
        console.log('⏰ Clearing existing recording interval');
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      if (streamRef.current) {
        console.log('🎤 Stopping existing media stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clear previous audio blob
      setAudioBlob(null);
      setRecordingTime(0);
      
      console.log('🎤 Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Use audio/webm for better browser compatibility and smaller file sizes
      const options = { mimeType: 'audio/webm' };
      
      // Fallback to default if webm is not supported
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.log('⚠️ audio/webm not supported, using default format');
        options.mimeType = '';
      }
      
      const recorder = new MediaRecorder(stream, options.mimeType ? options : undefined);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        console.log('📊 Recording data available:', event.data.size, 'bytes', 'type:', event.data.type);
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        console.log('⏹️ Recording stopped, creating blob from', chunks.length, 'chunks');
        
        // Use the same MIME type as the recorder
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        
        console.log('📊 Final blob created:', {
          size: blob.size,
          type: blob.type,
          chunksCount: chunks.length
        });
        
        setAudioBlob(blob);
        
        // Stop stream tracks and clear reference
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log(`📡 Stopped track: ${track.kind}`);
          });
          streamRef.current = null;
        }
        
        // Clear media recorder reference
        setMediaRecorder(null);
        console.log('✅ Recording cleanup completed');
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setSaveError('Recording failed. Please try again.');
        
        // Clean up on error
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        setMediaRecorder(null);
        if (recordingInterval) {
          clearInterval(recordingInterval);
          setRecordingInterval(null);
        }
      };

      console.log('▶️ Starting MediaRecorder');
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 120) {
            console.log('⏰ Recording time limit reached, stopping');
            recorder.stop();
            setIsRecording(false);
            clearInterval(interval);
            setRecordingInterval(null);
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingInterval(interval);

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setSaveError('Failed to access microphone. Please check permissions.');
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const stopRecording = () => {
    console.log('⏹️ Manual stop recording requested');
    
    if (mediaRecorder && isRecording) {
      console.log('⏹️ Stopping MediaRecorder');
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingInterval) {
        console.log('⏰ Clearing recording interval');
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
      
      // Note: MediaStream cleanup will happen in recorder.onstop event
      console.log('✅ Stop recording initiated');
    } else {
      console.log('⚠️ No active recording to stop');
    }
  };

  const playRecording = () => {
    if (!audioBlob) return;
    
    try {
      console.log('🔊 Playing back recorded audio');
      
      // Stop any existing playback
      if (playbackAudio) {
        playbackAudio.pause();
        playbackAudio.currentTime = 0;
        setPlaybackAudio(null);
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        console.log('▶️ Playback started');
        setIsPlayingRecording(true);
      };
      
      audio.onended = () => {
        console.log('⏹️ Playback ended');
        setIsPlayingRecording(false);
        URL.revokeObjectURL(audioUrl);
        setPlaybackAudio(null);
      };
      
      audio.onerror = (error) => {
        console.error('❌ Playback error:', error);
        setIsPlayingRecording(false);
        URL.revokeObjectURL(audioUrl);
        setPlaybackAudio(null);
        setSaveError('Failed to play recording. Please try recording again.');
      };
      
      setPlaybackAudio(audio);
      audio.play();
      
    } catch (error) {
      console.error('❌ Error playing recording:', error);
      setSaveError('Failed to play recording. Please try recording again.');
    }
  };

  const stopPlayback = () => {
    if (playbackAudio) {
      console.log('⏹️ Stopping playback');
      playbackAudio.pause();
      playbackAudio.currentTime = 0;
      setIsPlayingRecording(false);
      setPlaybackAudio(null);
    }
  };

  const startNewRecording = () => {
    console.log('🔄 Starting new recording');
    
    // Stop any playback
    stopPlayback();
    
    // Clear existing recording
    setAudioBlob(null);
    setRecordingTime(0);
    setExistingVoiceRecording(null); // Clear existing recording reference
    
    // Start recording after a brief delay
    setTimeout(() => startRecording(), 300);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up resources');
      
      // Stop any active recording
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      
      // Clear interval
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop any playback
      if (playbackAudio) {
        playbackAudio.pause();
        setPlaybackAudio(null);
      }
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        console.log('📁 Audio file uploaded:', file.name, file.size, 'bytes');
        setAudioBlob(file);
      } else {
        console.error('❌ Invalid file type:', file.type);
        setSaveError('Please select an audio file.');
      }
    } else {
      console.log('📁 No file selected');
    }
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) {
      console.error('❌ No audio blob available for submission');
      setSaveError('Please record or upload an audio file first.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      console.log('🎤 Submitting custom voice recording:', audioBlob.size, 'bytes');
      
      // Upload the voice recording to Supabase Storage
      const uploadResult = await uploadVoiceRecording(audioBlob);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload voice recording');
      }
      
      console.log('✅ Voice recording uploaded successfully:', uploadResult.url);
      
      // Update existing recording reference
      setExistingVoiceRecording(uploadResult.filePath || null);
      
      // Set voice preference to indicate user has uploaded their voice
      dispatch({ type: 'SET_VOICE', payload: 'custom_uploaded' });
      
      // Clean up and close modal
      setAudioBlob(null);
      setRecordingTime(0);
      setShowVoiceModal(false);
      
      console.log('✅ Custom voice submission completed successfully');
    } catch (error) {
      console.error('❌ Error uploading custom voice:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to upload voice. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoicePreview = (voiceId: string, voiceName: string) => {
    if (isPlaying === voiceId) {
      stopVoice();
    } else {
      // Find the voice to get its preview URL
      const voice = voices.find(v => v.voice_id === voiceId);
      playVoice(voiceId, voice?.preview_url);
    }
  };

  const saveVoicePreference = async () => {
    if (!user?.id) {
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      console.log('💾 Saving voice preference to database...');
      console.log('📊 Voice preference to save:', state.voicePreference);
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Check if user profile exists, create if it doesn't
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking user profile:', checkError);
        throw new Error(`Failed to check user profile: ${checkError.message}`);
      }

      if (!existingProfile) {
        // User profile should have been created during Clerk authentication
        // If it doesn't exist, there's an issue with the initial setup
        console.error('❌ User profile not found during update - this should not happen');
        console.error('📊 User ID:', user.id);
        setSaveError('Your profile was not found. Please sign in again to complete setup.');
        
        // Sign out the user to force re-authentication
        setTimeout(() => {
          console.log('🔄 Signing out user due to missing profile');
          signOut();
        }, 3000); // Give user time to read the error message
        
        throw new Error('User profile not found - signed out for re-authentication');
      } else {
        // Update existing user profile
        console.log('📝 Updating existing user profile...');
        const { data: updateData, error: updateError } = await supabase
          .from('user_profiles')
          .update({
            voice_preference: state.voicePreference,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating user profile:', updateError);
          throw new Error(`Failed to update user profile: ${updateError.message}`);
        }

        // Check if any rows were actually updated
        if (!updateData || updateData.length === 0) {
          console.error('❌ No user profile was updated - profile may have been deleted');
          console.error('📊 User ID:', user.id);
          setSaveError('Your profile could not be updated. Please sign in again to complete setup.');
          
          // Sign out the user to force re-authentication
          setTimeout(() => {
            console.log('🔄 Signing out user due to failed profile update');
            signOut();
          }, 3000); // Give user time to read the error message
          
          throw new Error('User profile update failed - signed out for re-authentication');
        }

        console.log('✅ User profile updated successfully');
      }
      
      console.log('✅ Voice preference saved successfully');
    } catch (error) {
      console.error('❌ Error saving voice preference:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save voice preference');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const cloneCustomVoice = async (): Promise<boolean> => {
    if (!user?.id || !existingVoiceRecording) {
      console.error('❌ Missing user ID or voice recording path for cloning');
      setSaveError('Missing required information for voice cloning. Please try again.');
      return false;
    }

    try {
      setIsCloning(true);
      setSaveError(null);
      console.log('🎤 Starting voice cloning process for user:', user.id);
      console.log('📁 Voice recording path:', existingVoiceRecording);

      // Get authentication token
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Construct Edge Function URL
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not found in environment variables');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/elevenlabs-voice-clone`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);

      // Prepare request body
      const requestBody = {
        user_id: user.id,
        custom_voice_audio_path: existingVoiceRecording,
        voice_name: `${user.firstName || user.id}_custom_voice`,
        voice_description: 'Custom voice clone created by MyFutrSelf for personalized coaching'
      };

      console.log('📤 Sending voice cloning request:', requestBody);

      // Make request to Edge Function
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Edge Function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Voice cloning failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Voice cloning successful:', result);

      if (!result.success) {
        throw new Error(result.error || 'Voice cloning failed');
      }

      console.log('🎯 Voice cloned successfully with ID:', result.voice_id);
      console.log('📝 Voice name:', result.voice_name);

      // Update local state to reflect the new voice ID
      dispatch({ type: 'SET_VOICE', payload: result.voice_id });

      return true;

    } catch (error) {
      console.error('❌ Voice cloning failed:', error);
      setSaveError(error instanceof Error ? error.message : 'Voice cloning failed. Please try again.');
      return false;
    } finally {
      setIsCloning(false);
    }
  };

  const handleNext = async () => {
    if (!state.voicePreference) {
      setSaveError('Please select a voice to continue.');
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      
      // Handle custom voice cloning
      if (state.voicePreference === 'custom_uploaded' && existingVoiceRecording) {
        console.log('🎤 Custom voice selected, initiating voice cloning process');
        
        const cloneSuccess = await cloneCustomVoice();
        if (!cloneSuccess) {
          console.error('❌ Voice cloning failed, cannot proceed');
          return; // Don't proceed if cloning failed
        }
        
        console.log('✅ Voice cloning completed, proceeding to next step');
      } else if (state.voicePreference !== 'custom' && state.voicePreference !== 'custom_uploaded') {
        // Save voice preference for pre-defined voices
        console.log('🎯 Pre-defined voice selected, saving preference');
        await saveVoicePreference();
      }
      
      // Proceed to next step
      dispatch({ type: 'NEXT_STEP' });
      navigate('/onboarding/twilio-setup');
      
    } catch (error) {
      console.error('❌ Error in handleNext:', error);
      setSaveError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/call-prefs');
  };

  // Generate a color for each voice based on its name
  const getVoiceColor = (voiceName: string) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    ];
    
    // Simple hash function to get consistent color for each voice
    let hash = 0;
    for (let i = 0; i < voiceName.length; i++) {
      const char = voiceName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Extract first name from voice name
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  // Show loading state
  if (isLoading) {
    return null; // Let the main loading screen handle this
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Voice Recording/Upload Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/20 rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={handleVoiceModalClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-3 font-heading">Create Your Custom Voice</h3>
              <p className="text-white/70 mb-6 text-sm font-body">
                {isRecording ? 'Recording in progress...' : audioBlob ? 'Recording completed!' : 'Ready to record your voice'}
              </p>
              
              {/* Start Recording Button - Only show when not recording and no audio */}
              {!isRecording && !audioBlob && (
                <div className="text-center mb-6">
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform"
                  >
                    <Mic className="w-10 h-10 text-white" />
                  </button>
                  <p className="text-white font-medium">Click to start recording</p>
                  <p className="text-white/60 text-sm">Up to 2 minutes</p>
                </div>
              )}

              {/* Recording Status Display */}
              <div className="mb-6">
                {isRecording && (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-xl font-bold">{recordingTime}s / 120s</p>
                      <button
                        onClick={stopRecording}
                        className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Square className="w-4 h-4 inline mr-2" />
                        Stop Recording
                      </button>
                    </div>
                  </div>
                )}
                
                {audioBlob && (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-green-400 text-lg font-bold">
                      {existingVoiceRecording ? 'Voice Recording Ready!' : 'Recording Complete!'}
                    </p>
                    <p className="text-white/70 text-sm">
                      {existingVoiceRecording 
                        ? 'Your custom voice is saved and ready to use'
                        : `Duration: ${recordingTime} seconds`
                      }
                    </p>
                    
                    {/* Playback Controls */}
                    <div className="flex justify-center gap-3 mt-4">
                      {!existingVoiceRecording && (
                        <button
                          onClick={isPlayingRecording ? stopPlayback : playRecording}
                          className="btn btn-outline flex items-center gap-2"
                        >
                          {isPlayingRecording ? (
                            <>
                              <Pause className="w-4 h-4" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Play
                            </>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={startNewRecording}
                        disabled={isPlayingRecording && !existingVoiceRecording}
                        className={`btn transition-all duration-300 flex items-center gap-2 ${
                          (isPlayingRecording && !existingVoiceRecording)
                            ? 'bg-transparent text-gray-400 border border-gray-600 cursor-not-allowed hover:bg-transparent'
                            : 'btn-outline'
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Record Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Helpful Tips Section */}
              {!isRecording && !audioBlob && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">💡</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">Tips for Voice Cloning</h4>
                      <ul className="text-blue-300 text-xs space-y-1 font-body">
                        <li>• <strong>Use natural conversational speech</strong></li>
                        <li>• <strong>Vary your tone and pace</strong></li>
                        <li>• <strong>Record in a quiet environment</strong></li>
                        <li>• <strong>Maintain consistent distance from mic</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Recording Tips During Recording */}
              {isRecording && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">🎤</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-green-400 font-semibold text-sm mb-2 font-heading">Recording in Progress</h4>
                      <p className="text-green-300 text-xs font-body">
                        Speak naturally and vary your tone. Try saying something like: "Hi there! I'm excited to help you reach your goals. 
                        Sometimes the journey gets tough, but I believe in you. Let's work together to make your dreams a reality!"
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upload Option - Only show when not recording and no audio */}
              {!isRecording && !audioBlob && (
                <div className="text-center mb-6">
                  <p className="text-white/60 text-sm mb-3">or</p>
                  <label className="block">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border border-dashed border-white/30 rounded-lg p-3 text-center hover:border-white/50 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5 text-white/60 mx-auto mb-1" />
                      <p className="text-white/70 text-sm">Upload audio file</p>
                      <p className="text-white/50 text-xs">MP3, WAV, M4A, WEBM (2 min max)</p>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Upload Option - Show when recording is complete */}
              {audioBlob && !existingVoiceRecording && (
                <div className="text-center mb-6">
                  <p className="text-white/60 text-sm mb-3">or upload a different file</p>
                  <label className="block">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border border-dashed border-white/30 rounded-lg p-3 text-center hover:border-white/50 transition-colors cursor-pointer">
                      <Upload className="w-5 h-5 text-white/60 mx-auto mb-1" />
                      <p className="text-white/70 text-sm">Upload audio file</p>
                      <p className="text-white/50 text-xs">MP3, WAV, M4A, WEBM (2 min max)</p>
                    </div>
                  </label>
                </div>
              )}
              
              {/* Bottom Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleVoiceModalClose}
                  className="flex-1 btn btn-outline font-heading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoiceSubmit}
                  disabled={(!audioBlob && !existingVoiceRecording) || isRecording || isUploadingVoice || isSaving}
                  className={`flex-1 btn font-heading transition-all duration-300 ${
                    (audioBlob || existingVoiceRecording) && !isRecording && !isUploadingVoice && !isSaving
                      ? 'btn-primary' 
                      : 'bg-transparent text-gray-400 border border-gray-600 cursor-not-allowed hover:bg-transparent'
                  }`}
                >
                  {isRecording ? 'Recording...' : 
                   isUploadingVoice || isSaving ? (
                     <>
                       <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                       {existingVoiceRecording ? 'Processing...' : 'Uploading...'}
                     </>
                   ) : existingVoiceRecording ? 'Continue' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-6 font-heading">Choose Your Future Self's Voice</h1>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            Select the voice that will guide and motivate you on your journey.
          </p>
        </div>

        {/* Error Display */}
        {(voicesError || saveError) && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium font-heading">Error</p>
                <p className="text-red-300 text-sm mt-1 font-body">
                  {voicesError || saveError}
                </p>
                {voicesError && (
                  <button
                    onClick={refetchVoices}
                    className="text-red-300 text-sm underline mt-2 hover:text-red-200 font-body"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => {
                    setSaveError(null);
                  }}
                  className="text-red-300 text-sm underline mt-2 ml-4 hover:text-red-200 font-body"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saving/Cloning Indicator */}
        {(isSaving || isCloning) && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-400 font-medium font-heading">
                {isCloning ? 'Creating your custom voice clone...' : 'Saving your voice preference...'}
              </p>
            </div>
          </div>
        )}

        {/* Voices List - Mobile Optimized */}
        {voices.length > 0 ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Create Your Own Voice Option - Now at the top */}
            {hasExistingVoicePreference ? (
              // Upgrade to Starter Plan Option
              <div
                onClick={handleUpgradeClick}
                className="flex items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] relative overflow-hidden w-full border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 hover:border-blue-500/50"
              >
                {/* Gradient overlay for special effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-50" />
                
                {/* Upgrade Icon */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mr-4 flex-shrink-0 relative z-10">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>

                {/* Upgrade Info */}
                <div className="flex-grow min-w-0 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-white font-heading">
                      Upgrade to Create Custom Voice
                    </h3>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full font-medium flex-shrink-0">
                      Starter Plan
                    </span>
                  </div>
                  <p className="text-white/70 text-sm font-body">
                    Unlock custom voice creation with our Starter plan - create unlimited personalized voices
                  </p>
                </div>
              </div>
            ) : (
              // Original Create Your Own Voice Option
              <div
                onClick={handleCustomVoiceClick}
                className={`flex items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] relative overflow-hidden w-full ${
                  state.voicePreference === 'custom'
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : state.voicePreference === 'custom_uploaded'
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                    : 'border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 hover:border-purple-500/50'
                }`}
              >
                {/* Gradient overlay for special effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-50" />
                
                {/* Custom Voice Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-4 flex-shrink-0 relative z-10">
                  <Mic className="w-6 h-6 text-white" />
                </div>

                {/* Custom Voice Info */}
                <div className="flex-grow min-w-0 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-lg font-semibold text-white font-heading">
                      {state.voicePreference === 'custom_uploaded' ? 'Your Custom Voice' : 'Create Your Own'}
                    </h3>
                    {state.voicePreference === 'custom_uploaded' && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full font-medium flex-shrink-0">
                        ✓ Uploaded
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm font-body">
                    {state.voicePreference === 'custom_uploaded' 
                      ? 'Your personalized voice clone is ready'
                      : 'Record or upload your voice for a personalized experience'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Regular Voices from ElevenLabs - Compact Mobile Layout */}
            {voices.map((voice) => {
              const firstName = getFirstName(voice.name);
              const isCurrentlyPlaying = isPlaying === voice.voice_id;
              const isCurrentlyBuffering = isBuffering === voice.voice_id;
              const progress = audioProgress[voice.voice_id] || 0;

              return (
                <div
                  key={voice.voice_id}
                  onClick={() => handleVoiceSelect(voice.voice_id)}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                    state.voicePreference === voice.voice_id
                      ? 'border-primary-aqua bg-primary-aqua/10 shadow-lg shadow-primary-aqua/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {/* Voice Avatar */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mr-4 flex-shrink-0"
                    style={{ background: getVoiceColor(voice.name) }}
                  >
                    {firstName.charAt(0).toUpperCase()}
                  </div>

                  {/* Voice Info */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-lg font-semibold text-white font-heading truncate pr-2">
                        {firstName}
                      </h3>
                    </div>
                    
                    {/* Progress Bar - Only show when playing */}
                    {(isCurrentlyPlaying || isCurrentlyBuffering) && (
                      <div className="w-full bg-white/20 rounded-full h-1 mb-2">
                        <div 
                          className="bg-primary-aqua h-1 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Play Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoicePreview(voice.voice_id, voice.name);
                    }}
                    disabled={isBuffering && isBuffering !== voice.voice_id}
                    className={`ml-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                      isCurrentlyBuffering
                        ? 'bg-yellow-500 text-white'
                        : isCurrentlyPlaying
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-primary-aqua hover:bg-primary-aqua/80 text-white'
                    } ${isBuffering && isBuffering !== voice.voice_id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                  >
                    {isCurrentlyBuffering ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentlyPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 font-body">
              No voices available. Please check your configuration.
            </p>
          </div>
        )}

        <div className="mt-16 flex justify-between max-w-md mx-auto">
          <button 
            onClick={handleBack} 
            className="btn btn-outline text-lg px-8 py-4 font-heading"
            disabled={isSaving || isCloning}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              state.voicePreference && state.voicePreference !== 'custom' && !isSaving && !isCloning
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!state.voicePreference || state.voicePreference === 'custom' || isSaving || isCloning}
          >
            {isSaving || isCloning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isCloning ? 'Cloning...' : 'Saving...'}
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseVoice;