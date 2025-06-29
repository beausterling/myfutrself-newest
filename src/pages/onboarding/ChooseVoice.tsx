import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Play, Pause, Upload, Check, AlertCircle, Info } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useVoiceStorage } from '../../hooks/useVoiceStorage';
import { useElevenLabsVoices } from '../../hooks/useElevenLabsVoices';

const ChooseVoice: React.FC = () => {
  const navigate = useNavigate();
  const { updateOnboardingData, onboardingData } = useOnboarding();
  const { uploadVoiceRecording, isUploading, uploadError } = useVoiceStorage();
  const { voices, isLoading: voicesLoading, error: voicesError, createVoiceClone, isCreatingClone, cloneError } = useElevenLabsVoices();
  
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showUploadOption, setShowUploadOption] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [hasFinalVoiceId, setHasFinalVoiceId] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Check if user already has a custom voice
    if (onboardingData?.custom_voice_audio_path) {
      setHasFinalVoiceId(true);
    }
  }, [onboardingData]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setAudioBlob(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNext = async () => {
    try {
      let voicePreference = selectedVoice;
      
      // If user recorded/uploaded audio and doesn't already have a voice clone
      if ((audioBlob || uploadedFile) && !hasFinalVoiceId) {
        // Upload the audio file first
        const audioFile = uploadedFile || new File([audioBlob!], 'voice-recording.wav', { type: 'audio/wav' });
        const audioPath = await uploadVoiceRecording(audioFile);
        
        if (audioPath) {
          // Create voice clone
          const voiceId = await createVoiceClone(audioPath);
          if (voiceId) {
            voicePreference = voiceId;
            // Update user profile with custom voice path
            await updateOnboardingData({ 
              voice_preference: voiceId,
              custom_voice_audio_path: audioPath 
            });
          }
        }
      } else {
        // Just update voice preference
        await updateOnboardingData({ voice_preference: voicePreference });
      }
      
      navigate('/onboarding/call-prefs');
    } catch (error) {
      console.error('Error in handleNext:', error);
    }
  };

  const canProceed = selectedVoice || audioBlob || uploadedFile || hasFinalVoiceId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 font-heading">Choose Your Voice</h1>
          <p className="text-xl text-gray-300 font-body">
            Select a voice for your AI companion or create a custom one
          </p>
        </div>

        {/* Voice Selection */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-6 font-heading">Pre-built Voices</h2>
          
          {voicesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-gray-300 mt-2 font-body">Loading voices...</p>
            </div>
          ) : voicesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-body">Error loading voices</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {voices.map((voice) => (
                <button
                  key={voice.voice_id}
                  onClick={() => setSelectedVoice(voice.voice_id)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedVoice === voice.voice_id
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold font-heading">{voice.name}</h3>
                      <p className="text-gray-300 text-sm font-body">{voice.category}</p>
                    </div>
                    {selectedVoice === voice.voice_id && (
                      <Check className="w-5 h-5 text-purple-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Voice Section */}
        {!hasFinalVoiceId && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 mb-6">
            <h2 className="text-2xl font-semibold text-white mb-6 font-heading">Create Custom Voice</h2>
            
            <div className="space-y-6">
              {/* Recording Option */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 font-heading">Record Your Voice</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  
                  {isRecording && (
                    <div className="text-white font-mono">
                      {formatTime(recordingTime)}
                    </div>
                  )}
                </div>
                
                {audioUrl && !uploadedFile && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={playAudio}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        {isPlaying ? 'Pause' : 'Play'}
                      </button>
                      <span className="text-gray-300 font-body">Recording ready</span>
                    </div>
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Upload Option */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white font-heading">Upload Audio File</h3>
                  <button
                    onClick={() => setShowUploadOption(!showUploadOption)}
                    className="text-purple-400 hover:text-purple-300 text-sm font-body"
                  >
                    {showUploadOption ? 'Hide' : 'Show'} Upload Option
                  </button>
                </div>
                
                {showUploadOption && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      Choose Audio File
                    </button>
                    
                    {uploadedFile && (
                      <div className="mt-4 p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={playAudio}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {isPlaying ? 'Pause' : 'Play'}
                          </button>
                          <span className="text-gray-300 font-body">{uploadedFile.name}</span>
                        </div>
                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          onEnded={() => setIsPlaying(false)}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Error Messages */}
              {(uploadError || cloneError) && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 font-body">
                      {uploadError || cloneError}
                    </span>
                  </div>
                </div>
              )}

              {/* Information message when voice clone already exists */}
              {hasFinalVoiceId && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">Custom Voice Already Created</h4>
                      <p className="text-blue-300 text-sm font-body">
                        You already have a personalized voice clone set up for your account. 
                        Only one custom voice is allowed per account to ensure the best quality and consistency.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate('/onboarding/current-self')}
            className="px-6 py-3 text-gray-300 hover:text-white transition-colors font-body"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed || isUploading || isCreatingClone}
            className="px-8 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors font-body"
          >
            {isUploading || isCreatingClone ? 'Processing...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChooseVoice;