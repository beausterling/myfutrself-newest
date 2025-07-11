import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useUser, useAuth, SignUpButton } from '@clerk/clerk-react';
import { Check, Star, Zap, Crown, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check onboarding status for signed-in users
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setIsOnboardingComplete(null);
        return;
      }

      try {
        setIsCheckingOnboarding(true);
        console.log('🔄 Checking onboarding status for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.warn('No Clerk token available for onboarding check');
          setIsOnboardingComplete(null);
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        const { data: userProfile, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking onboarding status:', error);
          setIsOnboardingComplete(null);
          return;
        }

        const onboardingCompleted = userProfile?.onboarding_completed ?? false;
        console.log('✅ Onboarding status:', onboardingCompleted);
        setIsOnboardingComplete(onboardingCompleted);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(null);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, getToken]);

  const plans = {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      icon: <Star className="w-6 h-6" />,
      color: 'from-gray-500 to-gray-600',
      features: [
        'Unlimited goals',
        'Weekly check-ins',
        'Instant voice clone',
        'Limited FutrSelf chat'
      ]
    },
    starter: {
      name: 'Starter',
      monthlyPrice: 7,
      annualPrice: 69.96, // Based on $5.83/mo fee, billed annually
      annualMonthlyEquivalent: 5.83,
      icon: <Zap className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
      popular: true,
      features: [
        'Everything in Free',
        'Daily check-ins',
        'Dedicated phone number',
        'Professional voice clone',
        'Priority support',
        'Progress analytics'
      ]
    },
    premium: {
      name: 'Premium',
      monthlyPrice: 19,
      annualPrice: 189.96, // Based on $15.83/mo fee, billed annually
      annualMonthlyEquivalent: 15.83,
      icon: <Crown className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
      features: [
        'Everything in Starter',
        'More FutrSelf minutes',
        'More FutrSelf messages',
        'Advanced future self visualization'
      ]
    }
  };

  const getPrice = (plan: typeof plans[keyof typeof plans]) => {
    if (plan.monthlyPrice === 0) return '$0';
    
    if (billingCycle === 'monthly') {
      return `$${plan.monthlyPrice}`;
    } else {
      // For annual, show the monthly equivalent
      return `$${plan.annualMonthlyEquivalent}`;
    }
  };

  const getDiscountPercentage = (plan: typeof plans[keyof typeof plans]) => {
    if (plan.monthlyPrice === 0) return 0;
    
    const monthlyCost = plan.monthlyPrice * 12;
    const annualCost = plan.annualPrice;
    const savings = monthlyCost - annualCost;
    const percentage = Math.round((savings / monthlyCost) * 100);
    
    return percentage;
  };

  const getSavings = (plan: typeof plans[keyof typeof plans]) => {
    if (plan.monthlyPrice === 0 || billingCycle === 'monthly') return null;
    
    // For annual billing, show "2 months FREE" instead of dollar savings
    return '2 months FREE';
  };

  const handleCtaClick = () => {
    if (!user) {
      // Not signed in - this will be handled by SignUpButton
      return;
    } else if (isOnboardingComplete === false) {
      // Signed in but onboarding not complete - redirect to dashboard (which will redirect to onboarding)
      navigate('/dashboard');
    } else if (isOnboardingComplete === true) {
      // Signed in and onboarding complete - redirect to dashboard
      navigate('/dashboard');
    } else {
      // Unknown state - default to waitlist
      navigate('/');
    }
  };

  const getCtaButtonText = () => {
    if (!user) {
      return 'Get Started Free';
    } else if (isOnboardingComplete === false) {
      return 'Finish Onboarding';
    } else if (isOnboardingComplete === true) {
      return 'Go to Dashboard';
    } else {
      return 'Get Started Free';
    }
  };

  const handleChoosePlan = () => {
    console.log('🎯 Plan selection:', selectedPlan, 'Billing:', billingCycle);
    
    // For all plans, direct to dashboard or onboarding
    handleCtaClick();
  };

  // Check if the button text matches the actual onboarding status
  useEffect(() => {
    if (user && isOnboardingComplete === false) {
      console.log('🔄 User has incomplete onboarding, button should say "Finish Onboarding"');
    }
  }, [user, isOnboardingComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-aqua/10 to-primary-blue/10" />
        
        <div className="relative container mx-auto px-4 pt-20 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 font-heading">
              Choose Your{' '}
              <span className="gradient-text">Future</span>
            </h1>
            <p className="text-xl md:text-2xl text-text-secondary mb-8 font-body leading-relaxed">
              Unlock your potential with personal accountability from your future self. 
              Start free, upgrade when you're ready to accelerate your growth.
            </p>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-white/60 text-sm font-body">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Gradient Blur Transition */}
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-aqua/5 via-primary-blue/3 to-transparent" />
        <div className="absolute inset-0 backdrop-blur-sm bg-gradient-to-b from-transparent via-bg-primary/20 to-bg-primary/40" />
      </div>

      {/* Compact Pricing Cards */}
      <div className="container mx-auto px-4 pt-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            Paid Plans
          </h2>
          <p className="text-lg text-text-secondary font-body">
            <em>Coming Soon</em>
          </p>
        </motion.div>

        {/* Compact Plan Cards - Side by Side */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-12 max-w-4xl mx-auto">
          {Object.entries(plans).map(([planKey, plan], index) => (
            <motion.div
              key={`${planKey}-${billingCycle}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
              onClick={() => setSelectedPlan(planKey)}
              className={`relative rounded-xl border-2 bg-white/5 backdrop-blur-lg p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedPlan === planKey 
                  ? 'border-primary-aqua shadow-lg shadow-primary-aqua/20' 
                  : 'border-white/10 hover:border-white/20'
              } ${plan.popular ? 'ring-1 ring-primary-aqua/50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-aqua to-primary-blue text-white px-2 py-1 rounded-full text-xs font-medium font-heading mb-2">
                    Popular
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${plan.color} text-white mb-3 ${plan.popular ? 'mt-4' : ''}`}>
                  {plan.icon}
                </div>
                <h3 className="text-sm sm:text-lg font-bold mb-2 font-heading">
                  {plan.name}
                </h3>
                <div className="text-lg sm:text-2xl font-bold font-heading">
                  {getPrice(plan)}
                  <span className="text-xs sm:text-sm text-white/60">
                    {plan.monthlyPrice === 0 ? '' : '/mo'}
                  </span>
                </div>
                {getSavings(plan) && (
                  <div className="text-xs text-green-400 mt-1">
                    {getSavings(plan)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Billing Toggle - Moved below plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex justify-center mb-12"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-1 flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-primary-aqua to-primary-blue text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 relative ${
                billingCycle === 'annual'
                  ? 'bg-gradient-to-r from-primary-aqua to-primary-blue text-white shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual
              <span className="absolute -top-3 -right-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                2 months FREE
              </span>
            </button>
          </div>
        </motion.div>
        {/* Selected Plan Features */}
        <motion.div
          key={`${selectedPlan}-${billingCycle}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${plans[selectedPlan as keyof typeof plans].color} text-white mb-4`}>
                {plans[selectedPlan as keyof typeof plans].icon}
              </div>
              <h3 className="text-2xl font-bold mb-2 font-heading">
                {plans[selectedPlan as keyof typeof plans].name} Plan
              </h3>
              <div className="text-3xl font-bold font-heading mb-2">
                {getPrice(plans[selectedPlan as keyof typeof plans])}
                <span className="text-lg text-white/60">
                  {plans[selectedPlan as keyof typeof plans].monthlyPrice === 0 ? '' : billingCycle === 'monthly' ? '/month' : '/month'}
                </span>
              </div>
              {getSavings(plans[selectedPlan as keyof typeof plans]) && (
                <div className="text-green-400 font-medium mb-2">
                  {getSavings(plans[selectedPlan as keyof typeof plans])}
                </div>
              )}
              {billingCycle === 'annual' && plans[selectedPlan as keyof typeof plans].monthlyPrice > 0 && (
                <div className="text-white/60 text-sm mb-4">
                  Billed annually as ${plans[selectedPlan as keyof typeof plans].annualPrice}/year
                </div>
              )}
              <p className="text-white/70 font-body">
                {selectedPlan === 'free' && 'Perfect for getting started with basic goal tracking'}
                {selectedPlan === 'starter' && 'Ideal for serious goal achievers who want personalized accountability'}
                {selectedPlan === 'premium' && 'For power users who want the complete transformation experience'}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="text-lg font-semibold font-heading text-center mb-4">What's Included:</h4>
              <ul className="space-y-3">
                {plans[selectedPlan as keyof typeof plans].features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/90 font-body">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Not Included section - only show for Free plan */}
              {selectedPlan === 'free' && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-lg font-semibold font-heading text-center mb-4 text-red-400">Not Included:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70 font-body">Dedicated phone number</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/70 font-body">Professional Voice Clone</span>
                    </li>
                  </ul>
                </div>
              )}
              
              {/* Coming Soon section - only show for paid plans */}
              {(selectedPlan === 'starter' || selectedPlan === 'premium') && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-lg font-semibold font-heading text-center mb-4 text-purple-400">Coming Soon:</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <span className="text-white text-xs">✨</span>
                      </div>
                      <span className="text-white/70 font-body">AI-triggered check-ins</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <span className="text-white text-xs">✨</span>
                      </div>
                      <span className="text-white/70 font-body">Video calls with your future self</span>
                    </li>
                    {selectedPlan === 'premium' && (
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <span className="text-white text-xs">✨</span>
                        </div>
                        <span className="text-white/70 font-body">Advanced AI insights & coaching</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="text-center">
              <SignedIn>
                <button 
                  onClick={handleChoosePlan}
                  className="btn btn-primary text-lg px-8 py-4 font-heading w-full sm:w-auto"
                >
                  {getCtaButtonText()}
                </button>
              </SignedIn>
              <SignedOut>
                {selectedPlan === 'free' ? (
                  <SignUpButton mode="modal">
                    <button className="btn btn-primary text-lg px-8 py-4 font-heading w-full sm:w-auto">
                      Get Started Free
                    </button>
                  </SignUpButton>
                ) : (
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="btn btn-primary text-lg px-8 py-4 font-heading w-full sm:w-auto"
                  >
                    {selectedPlan === 'free' ? 'Get Started Free' : `Choose ${plans[selectedPlan as keyof typeof plans].name}`}
                  </button>
                )}
              </SignedOut>
            </div>
          </div>
        </motion.div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  Can I change plans anytime?
                </h3>
                <p className="text-white/80 font-body">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing differences.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  How does billing work?
                </h3>
                <p className="text-white/80 font-body">
                  You'll be charged monthly or annually based on your selected plan. All payments are processed securely through Stripe.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  What's the difference between monthly and annual billing?
                </h3>
                <p className="text-white/80 font-body">
                 Annual billing gives you 2 months FREE. You can switch between billing cycles at any time.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  What payment methods do you accept?
                </h3>
                <p className="text-white/80 font-body">
                  We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through Stripe.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  Can I cancel my subscription?
                </h3>
                <p className="text-white/80 font-body">
                  Absolutely. You can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.
                </p>
              </div>

              <div className="bg-white/5 backdrop-blur-lg rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold mb-3 font-heading">
                  What if I'm not satisfied?
                </h3>
                <p className="text-white/80 font-body">
                  You can cancel your subscription at any time. For annual subscriptions, we offer prorated refunds within 30 days of purchase.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="text-center bg-gradient-to-r from-primary-aqua/10 to-primary-blue/10 rounded-2xl border border-white/10 p-8 sm:p-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            Start Your Transformation Today
          </h2>
          <p className="text-lg text-text-secondary mb-8 font-body max-w-2xl mx-auto">
            Join thousands of people who are already transforming their lives with personalized guidance from their future selves.
          </p>
          <SignedIn>
            <button 
              onClick={handleCtaClick}
              disabled={isCheckingOnboarding}
              className="btn btn-primary text-lg px-8 py-4 font-heading"
            >
              {isCheckingOnboarding ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Loading...
                </>
              ) : (
                getCtaButtonText()
              )}
            </button>
          </SignedIn>
          <SignedOut>
            <SignUpButton mode="modal">
              <button className="btn btn-primary text-lg px-8 py-4 font-heading">
                Get Started Free
              </button>
            </SignUpButton>
          </SignedOut>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;