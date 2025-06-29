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
  const { state, updateState } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  const { voices, loading, error, playingVoiceId, playVoice, stopVoice } = useElevenLabsVoices();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    navigate('/onboarding/current-self');
  };

  const handleNext = async () => {
    if (!state.voicePreference || state.voicePreference === 'custom') return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          voice_preference: state.voicePreference,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating voice preference:', error);
        return;
      }

      navigate('/onboarding/call-prefs');
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  };

  const handleVoiceSelect = (voiceId: string) => {
    updateState({ voicePreference: voiceId });
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
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  };

  const playRecording = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
      setIsPlaying(true);
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
    }
  };

  const stopPlayback = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setUploadedFile(null);
    setRecordingTime(0);
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
    setIsPlaying(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file);
      setAudioBlob(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCreateCustomVoice = async () => {
    if (!audioBlob && !uploadedFile) return;

    setIsUploading(true);
    try {
      // Here you would implement the actual voice creation logic
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Set a custom voice ID and close modal
      updateState({ voicePreference: 'custom_voice_created' });
      setShowVoiceModal(false);
      
    } catch (error) {
      console.error('Error creating custom voice:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Voice Recording/Upload Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-heading text-white">Create Your Voice</h3>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Recording Section */}
              <div className="text-center">
                <p className="text-gray-300 mb-4 font-body">
                  Record at least 30 seconds of clear speech
                </p>
                
                {!audioBlob && !uploadedFile && (
                  <div className="space-y-4">
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8 text-white" />
                      ) : (
                        <Mic className="w-8 h-8 text-white" />
                      )}
                    </button>
                    
                    {isRecording && (
                      <p className="text-white font-mono text-lg">
                        {formatTime(recordingTime)}
                      </p>
                    )}
                  </div>
                )}

                {(audioBlob || uploadedFile) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-4">
                      <button
                        onClick={isPlaying ? stopPlayback : playRecording}
                        className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-6 h-6 text-white" />
                        ) : (
                          <Play className="w-6 h-6 text-white ml-1" />
                        )}
                      </button>
                      
                      <button
                        onClick={resetRecording}
                        className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors"
                      >
                        <RotateCcw className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    
                    <p className="text-green-400 font-body">
                      {uploadedFile ? `File: ${uploadedFile.name}` : 'Recording ready'}
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="border-t border-gray-700 pt-6">
                <p className="text-gray-300 mb-4 text-center font-body">
                  Or upload an audio file
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400 font-body">Click to upload audio file</p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVoiceModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors font-heading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomVoice}
                  disabled={(!audioBlob && !uploadedFile) || isUploading}
                  className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors font-heading flex items-center justify-center"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Voice'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 font-heading">
            Choose Your Voice
          </h1>
          <p className="text-xl text-white/80 font-body leading-relaxed">
            Select the voice that will guide and motivate you on your journey
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-4 animate-spin" />
            <p className="text-white/60 font-body">Loading voices...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-body">
              Error loading voices: {error}
            </p>
          </div>
        )}

        {/* Voices List - Mobile Optimized */}
        {voices.length > 0 ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Create Your Own Voice Option */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-white font-heading">
                      Create Your Own Voice
                    </h3>
                    <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full font-body">
                      Premium
                    </span>
                  </div>
                  <p className="text-white/70 text-sm font-body">
                    Upload your own voice recording for a personalized experience
                  </p>
                </div>
                <button
                  onClick={() => setShowVoiceModal(true)}
                  className="ml-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-2 rounded-xl transition-all duration-300 font-heading flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Create</span>
                </button>
              </div>
            </div>

            {/* Regular Voices */}
            {voices.map((voice) => (
              <div
                key={voice.voice_id}
                className={`voice-option border rounded-2xl p-6 transition-all duration-300 cursor-pointer ${
                  state.voicePreference === voice.voice_id
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
                }`}
                onClick={() => handleVoiceSelect(voice.voice_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        state.voicePreference === voice.voice_id ? 'bg-blue-400' : 'bg-gray-500'
                      }`}></div>
                      <h3 className="text-lg font-semibold text-white font-heading">
                        {voice.name}
                      </h3>
                      {voice.labels?.gender && (
                        <span className="text-xs text-white/60 bg-gray-700 px-2 py-1 rounded-full font-body">
                          {voice.labels.gender}
                        </span>
                      )}
                    </div>
                    {voice.labels?.description && (
                      <p className="text-white/70 text-sm font-body">
                        {voice.labels.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingVoiceId === voice.voice_id) {
                        stopVoice();
                      } else {
                        playVoice(voice.voice_id);
                      }
                    }}
                    className="ml-4 w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                  >
                    {playingVoiceId === voice.voice_id ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-1" />
                    )}
                  </button>
                </div>
              </div>
            ))}
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