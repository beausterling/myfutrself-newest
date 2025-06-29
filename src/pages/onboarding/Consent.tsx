import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Check, Shield, AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const Consent = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { state } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [consent, setConsent] = useState({
    dataProcessing: false,
    communications: false,
    terms: false
  });

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    navigate('/onboarding/twilio-setup');
  };

  const handleComplete = async () => {
    if (!user?.id) {
      setError('User not found. Please try signing in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('🎉 Completing onboarding process for user:', user.id);
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Mark onboarding as completed
      console.log('✅ Marking onboarding as completed...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('❌ Profile update error:', profileError);
        throw new Error(`Failed to complete onboarding: ${profileError.message}`);
      }

      console.log('🎉 Onboarding completed successfully!');
      console.log('🔄 Redirecting to dashboard...');
      
      navigate('/dashboard', { replace: true });

    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allConsentsGiven = Object.values(consent).every(Boolean);

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-aqua/20 mb-8">
            <Shield className="w-10 h-10 text-primary-aqua" />
          </div>
          <h1 className="text-4xl font-bold mb-6 font-heading">Almost There!</h1>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            Please review and accept our terms to complete your onboarding.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 card bg-red-500/10 border-red-500/20">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-medium text-lg font-heading">Error</p>
                <p className="text-red-300 mt-2 font-body">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 underline mt-3 hover:text-red-200 font-body"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card space-y-8">
          <div className="flex items-start">
            <input
              type="checkbox"
              id="dataProcessing"
              checked={consent.dataProcessing}
              onChange={(e) => setConsent(prev => ({
                ...prev,
                dataProcessing: e.target.checked
              }))}
              className="mt-2 h-5 w-5 rounded border-border-light bg-bg-secondary text-primary-aqua focus:ring-primary-aqua"
              disabled={isSubmitting}
            />
            <label htmlFor="dataProcessing" className="ml-4">
              <span className="block font-medium text-lg font-heading">Data Processing</span>
              <span className="text-text-secondary mt-1 block font-body">
                I consent to the processing of my personal data as described in the Privacy Policy.
              </span>
            </label>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="communications"
              checked={consent.communications}
              onChange={(e) => setConsent(prev => ({
                ...prev,
                communications: e.target.checked
              }))}
              className="mt-2 h-5 w-5 rounded border-border-light bg-bg-secondary text-primary-aqua focus:ring-primary-aqua"
              disabled={isSubmitting}
            />
            <label htmlFor="communications" className="ml-4">
              <span className="block font-medium text-lg font-heading">Communications</span>
              <span className="text-text-secondary mt-1 block font-body">
                I agree to receive important updates and notifications about my journey.
              </span>
            </label>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={consent.terms}
              onChange={(e) => setConsent(prev => ({
                ...prev,
                terms: e.target.checked
              }))}
              className="mt-2 h-5 w-5 rounded border-border-light bg-bg-secondary text-primary-aqua focus:ring-primary-aqua"
              disabled={isSubmitting}
            />
            <label htmlFor="terms" className="ml-4">
              <span className="block font-medium text-lg font-heading">Terms of Service</span>
              <span className="text-text-secondary mt-1 block font-body">
                I have read and agree to the Terms of Service and Privacy Policy.
              </span>
            </label>
          </div>
        </div>

        <div className="mt-16 flex justify-between max-w-md mx-auto">
          <button 
            onClick={handleBack} 
            className="btn btn-outline text-lg px-8 py-4 font-heading"
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            onClick={handleComplete}
            className={`flex items-center text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              allConsentsGiven && !isSubmitting
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!allConsentsGiven || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                Completing Setup...
              </>
            ) : (
              <>
                <Check className="w-6 h-6 mr-3" />
                Complete Setup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Consent;