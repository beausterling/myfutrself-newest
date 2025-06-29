Here's the fixed version with the proper closing brackets and structure. The main issues were duplicate closing sections and mismatched brackets. I've removed the duplicates and properly closed all elements:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { AlertCircle, Mic, Play, Pause, X, CreditCard, Loader2, Upload, Square, RotateCcw } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useElevenLabsVoices } from '../../hooks/useElevenLabsVoices';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const ChooseVoice = () => {
  // [All existing code remains the same until the return statement]

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Voice Recording/Upload Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* [All modal content remains the same] */}
        </div>
      )}

      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        {/* [All content sections remain the same until the voices list] */}

        {/* Voices List - Mobile Optimized */}
        {voices.length > 0 ? (
          <div className="space-y-3 max-w-2xl mx-auto">
            {/* [Create Your Own Voice Option and Regular Voices sections remain the same] */}
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
```