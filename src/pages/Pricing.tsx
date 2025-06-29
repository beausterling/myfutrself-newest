import { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const Pricing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const plans = {
    free: {
      name: 'Free',
      monthlyPrice: 0,
      annualPrice: 0,
      icon: <Star className="w-6 h-6" />,
      color: 'from-gray-500 to-gray-600',
      features: [
        'Basic goal tracking',
        'Up to 3 goals',
        'Weekly check-ins',
        'Basic voice interactions',
        'Email support'
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
        'Unlimited goals',
        'Daily check-ins',
        'Custom voice creation',
        'Advanced scheduling',
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
        'AI-powered insights',
        'Custom coaching sessions',
        'Advanced future self visualization',
        'Team collaboration features',
        'White-label options',
        'Dedicated account manager'
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
    
    const monthlyCost = plan.monthlyPrice * 12;
    const annualCost = plan.annualPrice;
    const savings = monthlyCost - annualCost;
    
    return savings > 0 ? `Save $${savings}/year` : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-primary">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-aqua/10 to-primary-blue/10" />
        
        <div className="relative container mx-auto px-4 pt-20 pb-16">
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


      {/* Compact Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-text-secondary font-body">
            Choose the plan that fits your transformation journey
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
                  <span className="bg-gradient-to-r from-primary-aqua to-primary-blue text-white px-2 py-1 rounded-full text-xs font-medium font-heading">
                    Popular
                  </span>
                </div>
              )}
              
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${plan.color} text-white mb-3`}>
                  {plan.icon}
                </div>
                <h3 className="text-sm sm:text-lg font-bold mb-2 font-heading">
                  {plan.name}
                </h3>
                <div className="text-lg sm:text-2xl font-bold font-heading">
                  {getPrice(plan)}
                  <span className="text-xs sm:text-sm text-white/60">
                    {plan.monthlyPrice === 0 ? '' : billingCycle === 'monthly' ? '/month' : '/month'}
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
              <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save {getDiscountPercentage(plans.starter)}%
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
                {selectedPlan === 'starter' && 'Ideal for serious goal achievers who want personalized coaching'}
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
            </div>

            <div className="text-center">
              <button className="btn btn-primary text-lg px-8 py-4 font-heading w-full sm:w-auto">
                {selectedPlan === 'free' ? 'Get Started Free' : `Choose ${plans[selectedPlan as keyof typeof plans].name}`}
              </button>
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
                 Annual billing gives you a {getDiscountPercentage(plans.starter)}% discount. You can switch between billing cycles at any time.
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
          <button className="btn btn-primary text-lg px-8 py-4 font-heading">
            Get Started Free
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;