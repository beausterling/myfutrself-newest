The script appears to have some duplicate code and missing closing brackets. Here's the corrected version with the proper closing structure:

[Previous code remains the same until the first complete component definition]

```typescript
const ChooseVoice = () => {
  // [All existing state and hooks remain the same]

  // [All existing functions remain the same until handleNext]

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

  // [Rest of the component implementation remains the same]

  return (
    // [Existing JSX remains the same]
  );
};

export default ChooseVoice;
```

The main issues fixed were:
1. Removed duplicate handleNext implementation
2. Removed duplicate component definition
3. Added proper closing brackets for the component
4. Removed redundant code after the component export

The component now has a single, complete implementation with proper structure and closure.