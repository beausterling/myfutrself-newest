import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Phone, CheckCircle, AlertCircle, Speech, X } from 'lucide-react';
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
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callSid, setCallSid] = useState<string | null>(null);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (showPhoneModal) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
      
      const scrollY = window.scrollY;
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showPhoneModal]);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const isValidPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10;
  };

  const getE164PhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return `+1${digits}`;
  };

  const handleTestCall = async () => {
    if (!phoneNumber || !isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number first.');
      return;
    }

    setIsTestingCall(true);
    setTestCallStatus('idle');
    setError(null);
    setCallSid(null);
    setShowPhoneModal(false);
    
    try {
      console.log('🔄 Starting test call...');
      
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

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/twilio-call-handler/initiate-call`;
      console.log('🔗 Edge Function URL:', edgeFunctionUrl);

      // Prepare request body
      const requestBody = {
        user_id: user.id,
        to_phone_number: getE164PhoneNumber(phoneNumber)
      };

      console.log('📤 Sending call initiation request:', requestBody);

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
        throw new Error(errorData.error || `Call initiation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ AI chat completion successful:', result);

      if (!result.success) {
        throw new Error(result.error || 'Call initiation failed');
      }

      console.log('🎯 Call initiated with SID:', result.call_sid);
      setCallSid(result.call_sid);
      
      setTestCallStatus('success');
      console.log('✅ Test call initiated successfully');
      
    } catch (error) {
      console.error('❌ Test call failed:', error);
      setError(error instanceof Error ? error.message : 'Test call failed. Please try again.');
      setTestCallStatus('error');
    } finally {
      setIsTestingCall(false);
    }
  };

  const handleStartTestCall = () => {
    setShowPhoneModal(true);
    setError(null);
  };

  const handleModalClose = () => {
    setShowPhoneModal(false);
    setPhoneNumber('');
    setError(null);
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
      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-primary border border-white/20 rounded-2xl p-6 max-w-md w-full relative">
            <button
              onClick={handleModalClose}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-aqua/20 mb-4">
                <Phone className="w-8 h-8 text-primary-aqua" />
              </div>
              <h3 className="text-2xl font-bold mb-3 font-heading">Enter Your Phone Number</h3>
              <p className="text-white/70 mb-6 text-sm font-body">
                We'll call this number to test your future self's voice and AI responses.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  placeholder="(555) 123-4567"
                  className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-base font-body"
                  maxLength={14}
                />
                {phoneNumber && !isValidPhoneNumber(phoneNumber) && (
                  <p className="text-red-400 text-sm mt-2 font-body">
                    Please enter a valid 10-digit phone number
                  </p>
                )}
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">ℹ️</span>
                  </div>
                  <div className="text-left">
                    <h4 className="text-blue-400 font-semibold text-sm mb-2 font-heading">What to Expect</h4>
                    <ul className="text-blue-300 text-xs space-y-1 font-body">
                      <li>• You'll receive a call within 30 seconds</li>
                      <li>• Your future self will greet you personally</li>
                      <li>• You can have a real conversation about your goals</li>
                      <li>• The call will last about 2-3 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleModalClose}
                  className="flex-1 btn btn-outline font-heading"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTestCall}
                  disabled={!phoneNumber || !isValidPhoneNumber(phoneNumber)}
                  className={`flex-1 btn font-heading transition-all duration-300 ${
                    phoneNumber && isValidPhoneNumber(phoneNumber)
                      ? 'btn-primary' 
                      : 'bg-transparent text-gray-400 border border-gray-600 cursor-not-allowed hover:bg-transparent'
                  }`}
                >
                  Call Me Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      Your future self successfully called you! The AI voice system is working perfectly.
                    </p>
                    {callSid && (
                      <div className="mt-3 p-3 bg-green-500/5 border border-green-500/10 rounded-lg">
                        <p className="text-green-200 text-xs font-body">
                          Call ID: {callSid}
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
              onClick={handleStartTestCall}
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
                    <span>Calling You Now...</span>
                  </div>
                </>
              ) : testCallStatus === 'success' ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <span>Call Completed</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <Phone className="w-5 h-5" />
                    <span>Test Call with AI</span>
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
                <span>You'll receive a real phone call from your future self</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>The AI will speak using your selected voice</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>You can have a real conversation about your goals</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary-aqua rounded-full mt-2 flex-shrink-0"></div>
                <span>The AI will provide personalized motivation and accountability</span>
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