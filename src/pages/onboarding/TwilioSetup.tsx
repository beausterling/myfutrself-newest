import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Phone, CheckCircle, AlertCircle } from 'lucide-react';
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
    
    try {
      // Simulate test call - replace with actual Twilio integration later
      console.log('🔄 Testing phone call functionality...');
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, simulate success
      setTestCallStatus('success');
      console.log('✅ Test call completed successfully');
      
    } catch (error) {
      console.error('❌ Test call failed:', error);
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
            <h3 className="text-xl font-semibold mb-4 font-heading">Test Your Connection</h3>
            <p className="text-white/70 mb-6 font-body">
              Let's make sure everything is working by testing a quick call. This will verify that your future self can reach you successfully.
            </p>

            {/* Test Call Status */}
            {testCallStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 font-medium font-heading">Test Call Successful!</p>
                    <p className="text-green-300 text-sm mt-1 font-body">
                      Your phone connection is working perfectly. You're ready to receive calls from your future self.
                    </p>
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
                      There was an issue with the test call. Please try again or contact support if the problem persists.
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
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                  Testing Connection...
                </>
              ) : testCallStatus === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-3" />
                  Test Completed Successfully
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-3" />
                  Start Test Call
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
                <span>You'll receive a brief call from your assigned number</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>The call will last about 10 seconds to verify connectivity</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>You'll hear a brief message confirming the setup is complete</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>No action is required from you during the test</span>
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