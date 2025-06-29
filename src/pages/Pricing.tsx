import { useState, useEffect } from 'react';
import { PricingTable } from '@clerk/clerk-react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const Pricing = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = {
    free: [
      'Basic goal tracking',
      'Up to 3 goals',
      'Weekly check-ins',
      'Basic voice interactions',
      'Email support'
    ],
    starter: [
      'Everything in Free',
      'Unlimited goals',
      'Daily check-ins',
      'Custom voice creation',
      'Advanced scheduling',
      'Priority support',
      'Progress analytics'
    ],
    premium: [
      'Everything in Starter',
      'AI-powered insights',
      'Custom coaching sessions',
      'Advanced future self visualization',
      'Team collaboration features',
      'White-label options',
      'Dedicated account manager'
    ]
  };

  const planIcons = {
    free: <Star className="w-6 h-6" />,
    starter: <Zap className="w-6 h-6" />,
    premium: <Crown className="w-6 h-6" />
  };

  const planColors = {
    free: 'from-gray-500 to-gray-600',
    starter: 'from-blue-500 to-blue-600',
    premium: 'from-purple-500 to-purple-600'
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

      {/* Features Comparison Section */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
            Compare Plans
          </h2>
          <p className="text-lg text-text-secondary font-body">
            Choose the plan that fits your transformation journey
          </p>
        </motion.div>

        {/* Feature Comparison Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {Object.entries(features).map(([plan, planFeatures], index) => (
            <motion.div
              key={plan}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
              className={`relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-8 ${
                plan === 'starter' ? 'ring-2 ring-primary-aqua shadow-lg shadow-primary-aqua/20' : ''
              }`}
            >
              {plan === 'starter' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-aqua to-primary-blue text-white px-4 py-1 rounded-full text-sm font-medium font-heading">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${planColors[plan as keyof typeof planColors]} text-white mb-4`}>
                  {planIcons[plan as keyof typeof planIcons]}
                </div>
                <h3 className="text-2xl font-bold capitalize mb-2 font-heading">
                  {plan}
                </h3>
                <div className="text-3xl font-bold font-heading">
                  {plan === 'free' ? 'Free' : plan === 'starter' ? '$12' : '$29'}
                  {plan !== 'free' && <span className="text-lg text-white/60">/month</span>}
                </div>
              </div>

              <ul className="space-y-4">
                {planFeatures.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/90 font-body">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Clerk Pricing Table */}
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Ready to Transform?
            </h2>
            <p className="text-lg text-text-secondary font-body">
              Choose your plan and start your journey today
            </p>
          </div>

          {/* Clerk Pricing Table Container */}
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8">
            <PricingTable />
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

          <div className="grid md:grid-cols-2 gap-8">
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
                  Is there a free trial?
                </h3>
                <p className="text-white/80 font-body">
                  Yes! All paid plans come with a 14-day free trial. No credit card required to start your free account.
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
          className="text-center bg-gradient-to-r from-primary-aqua/10 to-primary-blue/10 rounded-2xl border border-white/10 p-12"
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