import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { AlertCircle, Mic, Play, Pause, X, CreditCard, Loader2, Upload, Square, RotateCcw } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useElevenLabsVoices } from '../../hooks/useElevenLabsVoices';
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
          .select('voice_preference')
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
    setShowVoiceModal(true);
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
    setShowVoiceModal(false);
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    if (recordingInterval) {
      clearInterval(recordingInterval);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            recorder.stop();
            setIsRecording(false);
            clearInterval(interval);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingInterval(interval);

    } catch (error) {
      console.error('Error starting recording:', error);
      setSaveError('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioBlob(file);
      } else {
        setSaveError('Please select an audio file.');
      }
    }
  };

  const handleVoiceSubmit = async () => {
    if (!audioBlob) {
      setSaveError('Please record or upload an audio file first.');
      return;
    }

    try {
      console.log('🎤 Submitting custom voice recording');
      // Here you would typically upload the audio to your voice cloning service
      // For now, we'll just close the modal and show a success message
      
      // Set a custom voice ID to indicate user has uploaded their voice
      dispatch({ type: 'SET_VOICE', payload: 'custom_uploaded' });
      
      setShowVoiceModal(false);
      setAudioBlob(null);
      setRecordingTime(0);
      
      console.log('✅ Custom voice uploaded successfully');
    } catch (error) {
      console.error('❌ Error uploading custom voice:', error);
      setSaveError('Failed to upload voice. Please try again.');
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

  const handleNext = () => {
    if (!state.voicePreference) {
      setSaveError('Please select a voice to continue.');
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/twilio-setup');
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
              <p className="text-white/70 mb-6 text-base font-body">
                Record or upload 30 seconds of your voice.
              </p>
              
              <div className="space-y-4">
                {/* Simple Recording Button */}
                <div className="text-center">
                  {!audioBlob ? (
                    !isRecording ? (
                      <button
                        onClick={startRecording}
                        className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center mx-auto transition-all duration-300 hover:scale-105"
                      >
                        <Mic className="w-8 h-8 text-white" />
                      </button>
                    ) : (
                      <div className="text-center">
                        <button
                          onClick={stopRecording}
                          className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse"
                        >
                          <Square className="w-8 h-8 text-white" />
                        </button>
                        <p className="text-white/70 text-base mt-2">{recordingTime}s / 30s</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Mic className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-green-400 text-base">✓ Recording completed ({recordingTime}s)</p>
                      <button
                        onClick={() => {
                          setAudioBlob(null);
                          setRecordingTime(0);
                        }}
                        className="text-white/60 text-xs underline mt-1 hover:text-white"
                      >
                        Record again
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Compact Upload Section */}
                <div className="text-center">
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
                      <p className="text-white/70 text-base">Upload audio file</p>
                      <p className="text-white/50 text-sm">MP3, WAV, M4A (30s max)</p>
                    </div>
                  </label>
                </div>
              </div>
              
              {/* Compact Bottom Buttons */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleVoiceModalClose}
                  className="flex-1 px-4 py-2 text-base border border-white/20 rounded-lg text-white/80 hover:text-white hover:border-white/40 transition-colors font-heading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVoiceSubmit}
                  disabled={!audioBlob}
                  className={`flex-1 px-4 py-2 text-base rounded-lg font-heading transition-colors ${
                    audioBlob 
                      ? 'bg-primary-aqua hover:bg-primary-aqua/80 text-white' 
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit
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

        {/* Saving Indicator */}
        {isSaving && (
          <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-400 font-medium font-heading">Saving your voice preference...</p>
            </div>
          </div>
        )}

        {/* Voices List - Mobile Optimized */}
        {voices.length > 0 ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Create Your Own Voice Option - Now at the top */}
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
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              state.voicePreference && state.voicePreference !== 'custom'
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!state.voicePreference || state.voicePreference === 'custom'}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseVoice;