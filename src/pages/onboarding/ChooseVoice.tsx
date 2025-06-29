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
  const clerk = useClerk();
  const { state, updateState } = useOnboarding();
  const { voices, loading: voicesLoading, error: voicesError } = useElevenLabsVoices();

  const [isScrolled, setIsScrolled] = useState(false);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  const handleVoiceSelect = (voiceId: string) => {
    updateState({ voicePreference: voiceId });
  };

  const handlePlayVoice = async (voiceId: string, previewUrl: string) => {
    if (playingVoice === voiceId) {
      const audio = audioElements[voiceId];
      if (audio) {
        audio.pause();
        setPlayingVoice(null);
      }
      return;
    }

    if (playingVoice) {
      const currentAudio = audioElements[playingVoice];
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    let audio = audioElements[voiceId];
    if (!audio) {
      audio = new Audio(previewUrl);
      audio.preload = 'metadata';
      setAudioElements(prev => ({ ...prev, [voiceId]: audio }));
    }

    audio.onended = () => setPlayingVoice(null);
    audio.onerror = () => setPlayingVoice(null);

    try {
      await audio.play();
      setPlayingVoice(voiceId);
    } catch (error) {
      console.error('Error playing audio:', error);
      setPlayingVoice(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
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
      alert('Unable to access microphone. Please check your permissions.');
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

  const resetRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioBlob(file);
      } else {
        alert('Please select an audio file.');
      }
    }
  };

  const uploadVoiceClone = async () => {
    if (!audioBlob || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const supabase = createAuthenticatedSupabaseClient(token);
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-sample.wav');
      formData.append('name', `${user.firstName || 'User'}'s Voice`);
      formData.append('description', 'Custom voice clone');

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Here you would implement the actual voice cloning API call
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Update user preference to custom voice
      updateState({ voicePreference: 'custom' });
      
      setTimeout(() => {
        setShowVoiceModal(false);
        setIsUploading(false);
        setUploadProgress(0);
        setAudioBlob(null);
      }, 1000);

    } catch (error) {
      console.error('Error uploading voice:', error);
      alert('Failed to upload voice. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    navigate('/onboarding/current-self');
  };

  const handleNext = () => {
    if (state.voicePreference && state.voicePreference !== 'custom') {
      navigate('/onboarding/call-prefs');
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

            {!audioBlob ? (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-300 mb-4 font-body">
                    Record a 30-second sample or upload an audio file to create your custom voice.
                  </p>
                </div>

                {/* Recording Section */}
                <div className="space-y-4">
                  <div className="flex justify-center">
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
                  </div>

                  {isRecording && (
                    <div className="text-center">
                      <p className="text-white font-mono text-lg">
                        {formatTime(recordingTime)}
                      </p>
                      <p className="text-gray-400 text-sm">Recording...</p>
                    </div>
                  )}
                </div>

                {/* Upload Section */}
                <div className="relative">
                  <div className="border-t border-gray-700 pt-4">
                    <label className="block w-full">
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors cursor-pointer">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-300 font-body">
                          Or upload an audio file
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          MP3, WAV, M4A up to 10MB
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <p className="text-white font-heading">Audio Ready!</p>
                  <p className="text-gray-400 font-body">
                    {recordingTime > 0 ? `${formatTime(recordingTime)} recording` : 'Audio file uploaded'}
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={resetRecording}
                    className="flex-1 btn btn-outline"
                    disabled={isUploading}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </button>
                  <button
                    onClick={uploadVoiceClone}
                    disabled={isUploading}
                    className="flex-1 btn btn-primary"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploadProgress}%
                      </>
                    ) : (
                      'Create Voice'
                    )}
                  </button>
                </div>

                {isUploading && (
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-heading text-white mb-6 leading-tight">
            Choose Your Voice
          </h1>
          <p className="text-xl text-white/80 font-body leading-relaxed max-w-xl mx-auto">
            Select the voice that will guide and motivate you on your journey to becoming your future self.
          </p>
        </div>

        {voicesLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-white/60 mx-auto mb-4 animate-spin" />
            <p className="text-white/60 font-body">Loading voices...</p>
          </div>
        )}

        {voicesError && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 font-body mb-2">Failed to load voices</p>
            <p className="text-white/60 text-sm font-body">{voicesError}</p>
          </div>
        )}

        {/* Voices List - Mobile Optimized */}
        {voices.length > 0 ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* Create Your Own Voice Option */}
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-xl p-4 hover:border-purple-400/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-heading text-lg">Create Your Own Voice</h3>
                      <p className="text-purple-300 text-sm font-body">Clone your voice for a personal touch</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center text-yellow-400">
                    <CreditCard className="w-4 h-4 mr-1" />
                    <span className="text-sm font-body">Premium</span>
                  </div>
                  <button
                    onClick={() => setShowVoiceModal(true)}
                    className="btn btn-primary text-sm px-4 py-2"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>

            {/* Regular Voices */}
            {voices.map((voice) => (
              <div
                key={voice.voice_id}
                className={`voice-option border rounded-xl p-4 transition-all duration-300 cursor-pointer ${
                  state.voicePreference === voice.voice_id
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-700/30'
                }`}
                onClick={() => handleVoiceSelect(voice.voice_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        state.voicePreference === voice.voice_id
                          ? 'bg-blue-500'
                          : 'bg-gray-600'
                      }`}>
                        <span className="text-white font-heading text-sm">
                          {voice.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-heading text-lg">{voice.name}</h3>
                        <p className="text-gray-400 text-sm font-body capitalize">
                          {voice.labels?.gender || 'Unknown'} • {voice.labels?.age || 'Unknown age'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {voice.preview_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayVoice(voice.voice_id, voice.preview_url);
                        }}
                        className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                      >
                        {playingVoice === voice.voice_id ? (
                          <Pause className="w-4 h-4 text-white" />
                        ) : (
                          <Play className="w-4 h-4 text-white" />
                        )}
                      </button>
                    )}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      state.voicePreference === voice.voice_id
                        ? 'border-blue-400 bg-blue-400'
                        : 'border-gray-500'
                    }`}>
                      {state.voicePreference === voice.voice_id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
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