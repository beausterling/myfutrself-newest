import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Mic, Loader2, Volume2, CheckCircle, Headphones, AlertCircle } from 'lucide-react';
import { useUser, useAuth } from '@clerk/clerk-react';

interface VoiceChatModalProps {
  onClose: () => void;
  futurePhotoUrl?: string | null;
}

interface ConversationMessage {
  role: 'user' | 'ai';
  text: string;
  audio?: string;
}

const VoiceChatModal = ({ onClose, futurePhotoUrl }: VoiceChatModalProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialGreetingPlayed, setInitialGreetingPlayed] = useState(false);
  
  // Refs for audio recording and playback
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scroll to bottom of conversation when new messages are added
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Stop any active recording
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      // Clear recording interval
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      // Stop any active audio playback
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }

      // Stop any active media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  // Play initial greeting when modal opens
  useEffect(() => {
    if (!initialGreetingPlayed) {
      playInitialGreeting();
    }
  }, [initialGreetingPlayed]);

  // Play initial greeting
  const playInitialGreeting = async () => {
    if (!user?.id || initialGreetingPlayed) return;
    
    try {
      setIsProcessing(true);
      console.log('🔄 Getting initial greeting...');

      // Get token for authentication
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the in-app-voice-chat Edge Function with a special flag for initial greeting
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not found in environment variables');
      }

      console.log('🔄 Calling in-app-voice-chat Edge Function for initial greeting...');
      const response = await fetch(`${supabaseUrl}/functions/v1/in-app-voice-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          messageText: "Hello, I'd like to talk to my future self."
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
      console.log('✅ Initial greeting received:', {
        success: result.success,
        hasAudioResponse: !!result.audioResponse,
        hasTextResponse: !!result.textResponse
      });

      if (!result.success) {
        throw new Error(result.error || 'Voice chat failed');
      }

      // Update conversation history
      const userText = "Hello, I'd like to talk to my future self.";
      const aiText = result.textResponse || 'Hello! I am your future self. How can I help you today?';
      
      setConversation([
        { role: 'user', text: userText },
        { role: 'ai', text: aiText, audio: result.audioResponse }
      ]);

      // Auto-play the response
      if (result.audioResponse) {
        await playAudioResponse(result.audioResponse);
      }

      setInitialGreetingPlayed(true);
    } catch (error) {
      console.error('❌ Error getting initial greeting:', error);
      setError(error instanceof Error ? error.message : 'Failed to start conversation. Please try again.');
      setInitialGreetingPlayed(true); // Mark as played even on error to avoid infinite retries
    } finally {
      setIsProcessing(false);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording process');
      
      // Clean up any existing recording session first
      if (mediaRecorderRef.current && isRecording) {
        console.log('⏹️ Stopping existing recording before starting new one');
        mediaRecorderRef.current.stop();
      }
      
      if (recordingIntervalRef.current) {
        console.log('⏰ Clearing existing recording interval');
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log(`📡 Stopped track: ${track.kind}`);
          });
          streamRef.current = null;
        }
        
        // Clear media recorder reference
        mediaRecorderRef.current = null;
        setIsRecording(false);
        console.log('✅ Recording cleanup completed');
        
        // Automatically process the audio when recording stops
        processAudio(blob);
      };

      recorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        
        // Clean up on error
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        mediaRecorderRef.current = null;
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };

      console.log('▶️ Starting MediaRecorder');
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            console.log('⏰ Recording time limit reached, stopping');
            recorder.stop();
            setIsRecording(false);
            clearInterval(interval);
            recordingIntervalRef.current = null;
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      recordingIntervalRef.current = interval;

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to access microphone. Please check permissions.');
      
      setIsRecording(false);
      mediaRecorderRef.current = null;
    }
  };

  // Stop recording
  const stopRecording = () => {
    console.log('⏹️ Manual stop recording requested');
    
    if (mediaRecorderRef.current && isRecording) {
      console.log('⏹️ Stopping MediaRecorder');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        console.log('⏰ Clearing recording interval');
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      
      console.log('✅ Stop recording initiated');
    } else {
      console.log('⚠️ No active recording to stop');
    }
  };

  // Process audio and get AI response
  const processAudio = async (blob?: Blob) => {
    const audioToProcess = blob || audioBlob;
    
    if (!audioToProcess || !user?.id) {
      console.error('❌ No audio blob or user ID available');
      setError('No audio recording available. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🔄 Processing audio and getting AI response...');

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioToProcess);
      
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

        // Auto-play the response
        if (result.audioResponse) {
          await playAudioResponse(result.audioResponse);
        }
        
        // Clear the audio blob for next recording
        setAudioBlob(null);
      };

    } catch (error) {
      console.error('❌ Error processing audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Play audio response
  const playAudioResponse = async (base64Audio: string): Promise<void> => {
    return new Promise((resolve, reject) => {
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
        if (!audioContextRef.current) {
          const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = newAudioContext;
        }

        const context = audioContextRef.current;
        
        // Decode audio data
        context.decodeAudioData(bytes.buffer, (audioBuffer) => {
          // Create source node
          const source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(context.destination);
          
          // Set up event handlers
          source.onended = () => {
            console.log('✅ Audio playback ended');
            setIsPlaying(false);
            audioSourceRef.current = null;
            resolve();
          };
          
          // Store source for potential stopping
          audioSourceRef.current = source;
          
          // Start playback
          source.start(0);
          console.log('✅ Audio playback started');
        }, (error) => {
          console.error('❌ Error decoding audio data:', error);
          setError('Failed to play audio response. Please try again.');
          setIsPlaying(false);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error playing audio:', error);
        setError('Failed to play audio response. Please try again.');
        setIsPlaying(false);
        reject(error);
      }
    });
  };

  // Stop audio playback
  const stopAudioPlayback = () => {
    if (audioSourceRef.current) {
      console.log('⏹️ Stopping audio playback');
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
      setIsPlaying(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-bg-primary border border-white/20 rounded-2xl p-6 max-w-md w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          {/* Header with Future Self Image */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-4 flex flex-col items-center"
          >
            {futurePhotoUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary-aqua mb-2">
                <img 
                  src={futurePhotoUrl} 
                  alt="Your future self" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-aqua/20 mb-2">
                <Headphones className="w-8 h-8 text-primary-aqua" />
              </div>
            )}
            <h3 className="text-2xl font-bold mb-1 font-heading">Talk to Your Future Self</h3>
            <p className="text-white/70 text-sm font-body">
              {isRecording ? 'I\'m listening...' : 
               isProcessing ? 'Processing your message...' : 
               isPlaying ? 'Your future self is speaking...' :
               'Click the microphone to start speaking'}
            </p>
          </motion.div>
          
          {/* Error Display */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-red-400 text-sm font-body">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 text-xs underline hover:text-red-200 font-body ml-auto"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
          
          {/* Conversation History */}
          {conversation.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6 max-h-60 overflow-y-auto bg-white/5 rounded-xl p-4 border border-white/10 text-left"
            >
              {conversation.map((message, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`mb-3 ${message.role === 'user' ? 'pl-2' : 'pl-4'}`}
                >
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
                </motion.div>
              ))}
              <div ref={conversationEndRef} />
            </motion.div>
          )}
          
          {/* Recording UI */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
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
              </div>
            ) : (
              <button
                onClick={startRecording}
                disabled={isPlaying}
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                  isPlaying 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-br from-primary-aqua to-primary-blue hover:scale-105'
                }`}
              >
                <Mic className="w-10 h-10 text-white" />
              </button>
            )}
          </motion.div>
          
          {/* Instructions */}
          {!isRecording && !isProcessing && !isPlaying && conversation.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">ℹ️</span>
                </div>
                <div className="text-left">
                  <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">How to use voice chat</h4>
                  <ul className="text-blue-300 text-xs space-y-1 font-body">
                    <li>• Click the microphone button to start recording</li>
                    <li>• Speak clearly about your goals and challenges</li>
                    <li>• Recording will automatically process when you stop</li>
                    <li>• Your future self will respond with guidance</li>
                    <li>• Continue the conversation by clicking the mic again</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Close Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onClose}
            className="w-full btn btn-outline font-heading"
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default VoiceChatModal;