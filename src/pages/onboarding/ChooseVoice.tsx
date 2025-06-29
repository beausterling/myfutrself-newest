Here's the fixed version with all missing closing brackets added:

```typescript
const ChooseVoice = () => {
  // ... all existing code ...

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* ... all existing JSX ... */}
            {/* Create Your Own Voice Option - Now at the top */}
            <div
              onClick={handleCustomVoiceClick}
              className={`flex items-center p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] relative overflow-hidden w-full ${
                hasExistingVoiceClone
                  ? 'border-gray-500/30 bg-gray-500/5 cursor-not-allowed opacity-60'
                  : state.voicePreference === 'custom'
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : state.voicePreference === 'custom_uploaded'
                      ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20'
                      : 'border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 hover:border-purple-500/50'
              }`}
            >
              {/* ... rest of JSX ... */}
              <p className="text-white/70 text-sm font-body">
                {hasExistingVoiceClone
                  ? 'You have already created a custom voice clone'
                  : hasVoicePreference 
                    ? 'You already have a voice preference configured'
                    : 'Record or upload your voice for a personalized experience'
                }
              </p>
              {/* ... rest of component ... */}
            </div>
      {/* ... rest of JSX ... */}
    </div>
  );
};

export default ChooseVoice;
```

I've added the missing closing brackets for:
1. The nested ternary expressions in the className string
2. The ternary expression in the paragraph text
3. The component's return statement and final closing brackets

The code should now be properly balanced with all brackets closed.