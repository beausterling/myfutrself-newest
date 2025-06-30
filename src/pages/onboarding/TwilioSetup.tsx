import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Phone, CheckCircle, AlertCircle, Speech } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTestCall = async () => {
    setIsTestingCall(true);
    setTestCallStatus('idle');
    setError(null);
    setAiMessage(null);
    
    try {
      console.log('🔄 Starting AI chat completion test...');
      
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

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/openai-chat-completion`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);

      // Prepare request body
      const requestBody = {
        user_id: user.id,
        context: 'This is a test call to verify that your future self can successfully reach you and provide personalized guidance based on your goals.'
      };

      console.log('📤 Sending chat completion request:', requestBody);

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
        throw new Error(errorData.error || `AI chat completion failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI chat completion successful:', result);

      if (!result.success) {
        throw new Error(result.error || 'AI chat completion failed');
      }

      console.log('🎯 AI message generated:', result.message);
      setAiMessage(result.message);
      
      setTestCallStatus('success');
      console.log('✅ Test call simulation completed successfully');
      
    } catch (error) {
      console.error('❌ Test call failed:', error);
      setError(error instanceof Error ? error.message : 'Test call failed. Please try again.');
      setTestCallStatus('error');
    } finally {
      setIsTestingCall(false);
    }
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
                      Your future self is ready to guide you. Here's what they would say:
                    </p>
                    {aiMessage && (
                      <div className="mt-3 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                        <p className="text-green-200 italic font-body">
                          "{aiMessage}"
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
              onClick={handleTestCall}
              disabled={isTestingCall || testCallStatus === 'success'}
              className={`btn w-full text-lg py-4 font-heading transition-all duration-300 ${
                testCallStatus === 'success'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed'
                  : isTestingCall
                  ? 'bg-white/10 text-white/40 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {isTestingCall ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Testing Connection...</span>
                  </div>
                </>
              ) : testCallStatus === 'success' ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <span>Test Completed</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <Phone className="w-5 h-5" />
                    <span>Start Test Call</span>
                  </div>
                </>
              )}
            </button>
          </div>

          {/* Information Card */}
          <div className="card bg-white/5 border-white/10">
            <h4 className="text-lg font-semibold mb-4 font-heading">What happens during the test?</h4>
            <ul className="space-y-3 text-sm font-body text-white/80">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>Your future self will analyze your current goals and progress</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>They'll generate a personalized message based on your motivations and obstacles</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>You'll see exactly what they would say during a real call</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>This verifies that the AI system understands your goals and can provide relevant guidance</span>
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
              canContinue && !isTestingCall
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!canContinue || isTestingCall}
          >
            {canContinue ? 'Continue' : 'Complete Test First'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwilioSetup;