import { useState, useEffect, useRef } from 'react';

interface VoiceLabels {
  gender?: string;
  accent?: string;
  description?: string;
  age?: string;
  use_case?: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  labels: VoiceLabels;
  description?: string;
  preview_url?: string;
  available_for_tiers?: string[];
  settings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export const useElevenLabsVoices = () => {
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Fetch voices from Supabase Edge Function
  const fetchVoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Fetching voices from Supabase Edge Function...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not found. Please check your environment variables.');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-proxy/voices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Edge function error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to fetch voices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Voices fetched successfully from Edge Function:', data.voices?.length || 0);

      setVoices(data.voices || []);
    } catch (error) {
      console.error('❌ Error fetching voices:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch voices');
    } finally {
      setIsLoading(false);
    }
  };

  // Play voice sample using pre-recorded audio or fallback to TTS
  const playVoice = async (voiceId: string, previewUrl?: string) => {
    try {
      // Stop any currently playing audio
      stopVoice();

      setIsPlaying(voiceId);
      setIsBuffering(voiceId);
      setError(null);
      console.log('🔊 Playing voice sample for:', voiceId);

      let audioUrl: string;

      if (previewUrl) {
        // Use pre-recorded audio from Supabase Storage
        console.log('🎵 Using pre-recorded audio:', previewUrl);
        audioUrl = previewUrl;
      } else {
        // Fallback to TTS generation
        console.log('🔄 Fallback to TTS generation for voice:', voiceId);
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('Supabase URL not found');
        }

        const previewText = "Hello! This is a preview of my voice. I'm excited to help guide you on your journey to becoming your future self.";

        const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-proxy/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            voiceId,
            text: previewText
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ TTS Edge function error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          throw new Error(errorData.error || `Failed to generate speech: ${response.status} ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        audioUrl = URL.createObjectURL(audioBlob);
      }

      // Clean up existing audio for this voice
      if (audioRefs.current[voiceId]) {
        audioRefs.current[voiceId].pause();
        audioRefs.current[voiceId].src = '';
        delete audioRefs.current[voiceId];
      }

      const audio = new Audio(audioUrl);
      audioRefs.current[voiceId] = audio;

      // Set up event listeners
      const cleanup = () => {
        if (!previewUrl) {
          // Only revoke object URL if it was created for TTS
          URL.revokeObjectURL(audioUrl);
        }
        setIsPlaying(null);
        setIsBuffering(null);
        setAudioProgress(prev => ({ ...prev, [voiceId]: 0 }));
        if (audioRefs.current[voiceId]) {
          delete audioRefs.current[voiceId];
        }
      };

      audio.addEventListener('loadedmetadata', () => {
        console.log('📊 Audio metadata loaded for voice:', voiceId, 'Duration:', audio.duration);
        setAudioDuration(prev => ({ ...prev, [voiceId]: audio.duration }));
        setIsBuffering(null);
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration > 0) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setAudioProgress(prev => ({ ...prev, [voiceId]: progress }));
        }
      });

      audio.addEventListener('ended', () => {
        console.log('✅ Audio playback ended for voice:', voiceId);
        cleanup();
      });

      audio.addEventListener('error', (e) => {
        console.error('❌ Audio playback error for voice:', voiceId, e);
        cleanup();
        setError('Failed to play audio');
      });

      await audio.play();
      console.log('✅ Voice sample playing successfully for:', voiceId);

    } catch (error) {
      console.error('❌ Error playing voice:', error);
      setError(error instanceof Error ? error.message : 'Failed to play voice sample');
      setIsPlaying(null);
      setIsBuffering(null);
    }
  };

  // Stop currently playing audio
  const stopVoice = () => {
    if (isPlaying && audioRefs.current[isPlaying]) {
      console.log('⏹️ Stopping voice playback for:', isPlaying);
      audioRefs.current[isPlaying].pause();
      audioRefs.current[isPlaying].currentTime = 0;
      delete audioRefs.current[isPlaying];
    }
    setIsPlaying(null);
    setIsBuffering(null);
    setAudioProgress({});
  };

  // Load voices on mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current = {};
    };
  }, []);

  return {
    voices,
    isLoading,
    error,
    isPlaying,
    isBuffering,
    audioProgress,
    audioDuration,
    playVoice,
    stopVoice,
    refetchVoices: fetchVoices
  };
};