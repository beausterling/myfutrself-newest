import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Phone, CheckCircle, AlertCircle, Speech, X, Mic, Headphones, Volume2, Loader2 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const TwilioSetup = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testCallStatus, setTestCallStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [testCallCompleted, setTestCallCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showVoiceChatModal, setShowVoiceChatModal] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [aiResponseAudio, setAiResponseAudio] = useState<string | null>(null);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Array<{role: 'user' | 'ai', text: string, audio?: string}>>([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (showPhoneModal) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      const scrollY = window.scrollY;
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showPhoneModal]);

  // Disable background scrolling when voice chat modal is open
  useEffect(() => {
    if (showVoiceChatModal) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      const scrollY = window.scrollY;
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showVoiceChatModal]);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isValidPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const getE164PhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `+1${digits}`;
  };

  const handleTestCall = async () => {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number first.');
      return;
    }

    setIsTestingCall(true);
    setTestCallStatus('idle');
    setError(null);
    setCallSid(null);
    setShowPhoneModal(false);
    
    try {
      console.log('🔄 Starting test call...');
      
      if (!user?.id) {
        throw new Error('User authentication required');
      }

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

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/twilio-call-handler/initiate-call`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);

      // Prepare request body
      const requestBody = {
        user_id: user.id,
        to_phone_number: getE164PhoneNumber(phoneNumber)
      };

      console.log('📤 Sending call initiation request:', requestBody);

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
        throw new Error(errorData.error || `Call initiation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI chat completion successful:', result);

      if (!result.success) {
        throw new Error(result.error || 'Call initiation failed');
      }

      console.log('🎯 Call initiated with SID:', result.call_sid);
      setCallSid(result.call_sid);
      
      setTestCallStatus('success'); 
      setTestCallCompleted(true);
      console.log('✅ Test call initiated successfully');
      
    } catch (error) {
      console.error('❌ Test call failed:', error);
      setError(error instanceof Error ? error.message : 'Test call failed. Please try again.');
      setTestCallStatus('error');
    } finally {
      setIsTestingCall(false);
    }
  };

  // Start recording audio for voice chat
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
      
      // Clear previous audio blob
      setAudioBlob(null);
      setRecordingTime(0);
      
      console.log('🎤 Requesting microphone access');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use audio/webm for better browser compatibility and smaller file sizes
      const options = { mimeType: 'audio/webm' };
      
      // Fallback to default if webm is not supported
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported('audio/webm') ? options : undefined);
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
        
        // Stop stream tracks
        stream.getTracks().forEach(track => {
          track.stop();
          console.log(`📡 Stopped track: ${track.kind}`);
        });
        
        // Clear media recorder reference
        setMediaRecorder(null);
        console.log('✅ Recording cleanup completed');
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        
        // Clean up on error
        stream.getTracks().forEach(track => track.stop());
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
          if (prev >= 30) {
            console.log('⏰ Recording time limit reached, stopping');
            recorder.stop();
            setIsRecording(false);
            clearInterval(interval);
            setRecordingInterval(null);
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      setRecordingInterval(interval);

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Stop recording
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
      
      console.log('✅ Stop recording initiated');
    } else {
      console.log('⚠️ No active recording to stop');
    }
  };

  // Process audio and get AI response
  const processAudio = async () => {
    if (!audioBlob || !user?.id) {
      console.error('❌ No audio blob or user ID available');
      setError('No audio recording available. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🔄 Processing audio and getting AI response...');

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        console.log('✅ Audio converted to base64:', base64Audio.substring(0, 50) + '...');

        // Get token for authentication
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        // Call the in-app-voice-chat Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL not found in environment variables');
        }

        console.log('🔄 Calling in-app-voice-chat Edge Function...');
        const response = await fetch(`${supabaseUrl}/functions/v1/in-app-voice-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            audioData: base64Audio,
            userId: user.id
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Edge Function error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || `Voice chat failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Voice chat response received:', {
          success: result.success,
          hasAudioResponse: !!result.audioResponse,
          hasTextResponse: !!result.textResponse,
          audioResponseLength: result.audioResponse?.length || 0
        });

        if (!result.success) {
          throw new Error(result.error || 'Voice chat failed');
        }

        // Update conversation history
        const userText = result.userText || 'You said something...';
        const aiText = result.textResponse || 'AI response unavailable';
        
        setConversation(prev => [
          ...prev,
          { role: 'user', text: userText },
          { role: 'ai', text: aiText, audio: result.audioResponse }
        ]);

        // Set AI response for immediate playback
        setAiResponseText(aiText);
        setAiResponseAudio(result.audioResponse);

        // Auto-play the response
        if (result.audioResponse) {
          playAudioResponse(result.audioResponse);
        }
      };

    } catch (error) {
      console.error('❌ Error processing audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
      setAudioBlob(null); // Clear the audio blob for next recording
    }
  };

  // Play audio response
  const playAudioResponse = async (base64Audio: string) => {
    try {
      setIsPlaying(true);
      console.log('🔊 Playing AI response audio...');

      // Convert base64 to ArrayBuffer
      const base64Data = base64Audio.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create AudioContext if it doesn't exist
      if (!audioContext) {
        const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(newAudioContext);
      }

      const context = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Decode audio data
      const audioBuffer = await context.decodeAudioData(bytes.buffer);
      
      // Create source node
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      
      // Set up event handlers
      source.onended = () => {
        console.log('✅ Audio playback ended');
        setIsPlaying(false);
        setAudioSource(null);
      };
      
      // Store source for potential stopping
      setAudioSource(source);
      
      // Start playback
      source.start(0);
      console.log('✅ Audio playback started');

    } catch (error) {
      console.error('❌ Error playing audio:', error);
      setError('Failed to play audio response. Please try again.');
      setIsPlaying(false);
    }
  };

  // Stop audio playback
  const stopAudioPlayback = () => {
    if (audioSource) {
      console.log('⏹️ Stopping audio playback');
      audioSource.stop();
      setAudioSource(null);
      setIsPlaying(false);
    }
  };

  // Open voice chat modal
  const handleStartVoiceChat = () => {
    setShowVoiceChatModal(true);
    setConversation([]);
    setAiResponseAudio(null);
    setAiResponseText(null);
    setAudioBlob(null);
    setError(null);
  };

  // Close voice chat modal
  const handleVoiceChatModalClose = () => {
    // Stop any active recording
    if (isRecording && mediaRecorder) {
      mediaRecorder.stop();
    }
    
    // Stop any active audio playback
    if (audioSource) {
      audioSource.stop();
    }
    
    // Clear intervals
    if (recordingInterval) {
      clearInterval(recordingInterval);
    }
    
    // Reset states
    setIsRecording(false);
    setIsPlaying(false);
    setIsProcessing(false);
    setShowVoiceChatModal(false);
    setAudioBlob(null);
    setRecordingTime(0);
    setMediaRecorder(null);
    setRecordingInterval(null);
  };

  const handleStartTestCall = () => {
    setShowPhoneModal(true);
    setError(null);
  };

  const handleModalClose = () => {
    setShowPhoneModal(false);
    setPhoneNumber('');
    setError(null);
  };

  const handleCreateNewNumber = () => {
    console.log('🔄 Navigating to pricing page for phone number setup');
    navigate('/pricing');
  };
  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/choose-voice');
  };

  const handleNext = () => {
    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/consent');
  };

  const saveTwilioSetupCompletion = async () => {
    if (!user?.id) {
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      setError(null);
      console.log('💾 Saving Twilio setup completion to database...');
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Update user profile to mark Twilio setup as completed
      const { data: updateData, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          twilio_setup_completed: true,
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
        console.error('❌ No user profile was updated - profile may not exist');
        console.error('📊 User ID:', user.id);
        setError('Your profile could not be updated. Please refresh and try again.');
        throw new Error('User profile update failed - no rows affected');
      }

      console.log('✅ Twilio setup completion saved successfully');
    } catch (error) {
      console.error('❌ Error saving Twilio setup completion:', error);
      setError(error instanceof Error ? error.message : 'Failed to save Twilio setup completion');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const canContinue = testCallStatus === 'success';

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/20 rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-aqua/20 mb-4">
                <Phone className="w-8 h-8 text-primary-aqua" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-heading">Enter Your Phone Number</h3>
              <p className="text-white/70 mb-6 text-sm font-body">
                We'll call this number to test your future self's voice and AI responses.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body"
                  maxLength={14}
                />
                {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                  <p className="text-red-400 text-sm mt-2 font-body">
                    Please enter a valid 10-digit phone number
                  </p>
                )}
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">ℹ️</span>
                  </div>
                  <div className="text-left">
                    <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">What to Expect</h4>
                    <ul className="text-blue-300 text-xs space-y-1 font-body">
                      <li>• You'll receive a call within 30 seconds</li>
                      <li>• Your future self will greet you personally</li>
                      <li>• You can have a real conversation about your goals</li>
                      <li>• The call will last about 2-3 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleModalClose}
                  className="flex-1 btn btn-outline font-heading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestCall}
                  disabled={!phoneNumber || !isValidPhoneNumber(phoneNumber)}
                  className={`flex-1 btn font-heading transition-all duration-300 ${
                    phoneNumber && isValidPhoneNumber(phoneNumber)
                      ? 'btn-primary' 
                      : 'bg-transparent text-gray-400 border border-gray-600 cursor-not-allowed hover:bg-transparent'
                  }`}
                >
                  Call Me Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Chat Modal */}
      {showVoiceChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/20 rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={handleVoiceChatModalClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-aqua/20 mb-4">
                <Headphones className="w-8 h-8 text-primary-aqua" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-heading">Talk to Your Future Self</h3>
              <p className="text-white/70 mb-6 text-sm font-body">
                {isRecording ? 'Recording in progress...' : 
                 isProcessing ? 'Processing your message...' : 
                 isPlaying ? 'Your future self is speaking...' :
                 audioBlob ? 'Ready to send your message' :
                 'Click the microphone to start speaking'}
              </p>
              
              {/* Conversation History */}
              {conversation.length > 0 && (
                <div className="mb-6 max-h-60 overflow-y-auto bg-white/5 rounded-xl p-4 border border-white/10">
                  {conversation.map((message, index) => (
                    <div key={index} className={`mb-3 text-left ${message.role === 'user' ? 'pl-2' : 'pl-4'}`}>
                      <div className={`flex items-start gap-2 ${message.role === 'user' ? '' : 'border-l-2 border-primary-aqua'}`}>
                        <div className={`p-2 rounded-lg ${message.role === 'user' ? 'bg-white/10' : 'bg-primary-aqua/10'} max-w-[90%]`}>
                          <p className={`text-sm font-body ${message.role === 'user' ? 'text-white/80' : 'text-white'}`}>
                            {message.text}
                          </p>
                        </div>
                        {message.role === 'ai' && message.audio && (
                          <button
                            onClick={() => playAudioResponse(message.audio!)}
                            className="p-1 rounded-full bg-primary-aqua/20 hover:bg-primary-aqua/30 transition-colors"
                            title="Play response"
                          >
                            <Volume2 className="w-3 h-3 text-primary-aqua" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Recording UI */}
              <div className="mb-6">
                {isRecording ? (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <Mic className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-xl font-bold">{recordingTime}s / 30s</p>
                      <button
                        onClick={stopRecording}
                        className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Stop Recording
                      </button>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    </div>
                    <p className="text-blue-400 text-lg font-bold mt-4">
                      Processing your message...
                    </p>
                  </div>
                ) : isPlaying ? (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <Volume2 className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <p className="text-green-400 text-lg font-bold mt-4">
                      Your future self is speaking...
                    </p>
                    <button
                      onClick={stopAudioPlayback}
                      className="mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Stop Playback
                    </button>
                  </div>
                ) : audioBlob ? (
                  <div className="text-center">
                    <div className="w-24 h-24 bg-primary-aqua rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-primary-aqua text-lg font-bold mt-4">
                      Ready to send your message
                    </p>
                    <button
                      onClick={processAudio}
                      className="mt-2 px-4 py-2 bg-primary-aqua hover:bg-primary-aqua/80 text-white rounded-lg transition-colors"
                    >
                      Send to Future Self
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 bg-gradient-to-br from-primary-aqua to-primary-blue rounded-full flex items-center justify-center mx-auto hover:scale-105 transition-transform"
                  >
                    <Mic className="w-10 h-10 text-white" />
                  </button>
                )}
              </div>
              
              {/* Instructions */}
              {!isRecording && !isProcessing && !isPlaying && !audioBlob && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">ℹ️</span>
                    </div>
                    <div className="text-left">
                      <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">How to use voice chat</h4>
                      <ul className="text-blue-300 text-xs space-y-1 font-body">
                        <li>• Click the microphone button to start recording</li>
                        <li>• Speak clearly about your goals and aspirations</li>
                        <li>• Click "Stop Recording" when you're done</li>
                        <li>• Send your message to your future self</li>
                        <li>• Listen to your future self's response</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Close Button */}
              <button
                onClick={handleVoiceChatModalClose}
                className="w-full btn btn-outline font-heading"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-aqua/20 mb-8">
            <Phone className="w-10 h-10 text-primary-aqua" />
          </div>
          <h1 className="text-4xl font-bold mb-6 font-heading">Set Up Your Phone Connection</h1>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            We'll set up a dedicated phone number for your future self to call you.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium font-heading">Error</p>
                <p className="text-red-300 text-sm mt-1 font-body">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 text-xs underline mt-2 hover:text-red-200 font-body"
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
              <p className="text-blue-400 font-medium font-heading">Saving your setup...</p>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Phone Number Setup Card */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 font-heading flex items-center gap-3">
              <Phone className="w-6 h-6 text-primary-aqua" />
              Phone Number Assignment
            </h3>
            <p className="text-white/70 mb-6 font-body">
              Get a dedicated phone number that your future self will use to contact you. This ensures a consistent and personalized experience.
            </p>
            
            <button
              onClick={handleCreateNewNumber}
              className="btn btn-primary w-full text-lg py-4 font-heading"
            >
              Create New Number
            </button>
            
            {/* Coming Soon indicator */}
            <div className="text-center mt-4">
              <p className="text-white/50 text-sm italic font-body">
                Coming Soon
              </p>
            </div>
          </div>

          {/* Test Call Card */}
          <div className="card">
            <h3 className="text-xl font-semibold mb-4 font-heading flex items-center gap-3">
              <Speech className="w-6 h-6 text-primary-aqua" />
              Test MyFutrSelf
            </h3>
            <p className="text-white/70 mb-6 font-body">
              This will be a 30 second phone call with your future self. They will be using the voice that you selected earlier.
            </p>

            {/* Test Call Status */}
            {testCallStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium font-heading">Test Call Successful!</p>
                    <p className="text-green-300 text-sm mt-1 font-body">
                      Your future self successfully called you! The AI voice system is working perfectly.
                    </p>
                    {callSid && (
                      <div className="mt-3 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                        <p className="text-green-200 text-xs font-body">
                          Call ID: {callSid}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {testCallStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-red-400 font-medium font-heading">Test Call Failed</p>
                    <p className="text-red-300 text-sm mt-1 font-body">
                      {error || 'There was an issue with the test call. Please try again or contact support if the problem persists.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleStartTestCall}
              disabled={isTestingCall || testCallCompleted}
              className={`btn w-full text-lg py-4 font-heading transition-all duration-300 opacity-50 cursor-not-allowed ${
                testCallCompleted
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed'
                  : isTestingCall
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isTestingCall ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Calling You Now...</span>
                  </div>
                </>
              ) : testCallCompleted ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <span>Call Completed</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <Phone className="w-5 h-5" />
                    <span>Test Call with AI</span>
                  </div>
                </>
              )}
            </button>
            
            <div className="text-center mt-4">
              <p className="text-white/50 text-sm italic font-body">
                Phone calls are temporarily disabled
              </p>
            </div>
          </div>

          {/* In-App Voice Chat Card */}
          <div className="card mt-8">
            <h3 className="text-xl font-semibold mb-4 font-heading flex items-center gap-3">
              <Headphones className="w-6 h-6 text-primary-aqua" />
              Test Voice Chat (In-App)
            </h3>
            <p className="text-white/70 mb-6 font-body">
              Try a voice conversation with your future self directly in the app. This uses your selected voice and AI to provide personalized guidance.
            </p>

            <button
              onClick={handleStartVoiceChat}
              className="btn btn-primary w-full text-lg py-4 font-heading"
            >
              <div className="flex items-center justify-center gap-3">
                <Mic className="w-5 h-5" />
                <span>Start Voice Chat</span>
              </div>
            </button>
          </div>

          {/* Information Card */}
          <div className="card bg-white/5 border-white/10">
            <h4 className="text-lg font-semibold mb-4 font-heading">What happens during the test?</h4>
            <ul className="space-y-3 text-sm font-body text-white/80">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>You'll receive a real phone call from your future self</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>The AI will speak using your selected voice</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>You can have a real conversation about your goals</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>The AI will provide personalized motivation and accountability</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex justify-between max-w-md mx-auto"> 
          <button 
            onClick={handleBack} 
            className="btn btn-outline text-lg px-8 py-4 font-heading"
            disabled={isTestingCall}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              !isTestingCall
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={isTestingCall}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwilioSetup;