import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { ArrowRight, Sparkles, Target, Users, TrendingUp, CheckCircle, Brain, Phone, Mic, Calendar, Bell, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';

const Landing = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  // Check onboarding status for signed-in users
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setIsOnboardingComplete(null);
        return;
      }

      try {
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

        setIsOnboardingComplete(userProfile?.onboarding_completed ?? false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setIsOnboardingComplete(null);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, getToken]);

  // Throttled scroll handler for better performance
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    setIsScrolled(scrollTop > 50);
  }, []);

  // Handle scroll effect with throttling
  useEffect(() => {
    let ticking = false;
    
    const throttledScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    return () => window.removeEventListener('scroll', throttledScrollHandler);
  }, [handleScroll]);

  // Memoized feature data to prevent re-creation on every render
  const features = useMemo(() => [
    {
      icon: Target,
      title: "Onboarding",
      description: "This is where you submit your Goals, Motivations, & Obstacles, so your future self knows where you're trying to go"
    },
    {
      icon: Phone,
      title: "Phone Calls",
      description: "You will be assigned a REAL phone number that you can call anytime you would like to speak to your future self and ask advice"
    },
    {
      icon: Mic,
      title: "Custom Voice",
      description: "You can choose a pre-configured voice or record your own voice and we will use AI to make you sound like an older version"
    },
    {
      icon: Calendar,
      title: "Commitment Schedule",
      description: "Depending on the goals, you will select a commitment timeline that makes sense whether there is a deadline or not"
    },
    {
      icon: Bell,
      title: "Call Triggers",
      description: "You can set specific triggers for your future self to call you, or you can set to receive calls periodically on a schedule"
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "There will be a live dashboard that displays your current goals and tracks your progress toward becoming your future self"
    }
  ], []);

  const whyItWorks = useMemo(() => [
    {
      title: "Identity Alignment",
      description: "Identity-driven goals stick better than checklist goals in habit studies. It turns tasks into identity maintenance rather than will-power battles."
    },
    {
      title: "Shared Incentives",
      description: "Zero conflict of interest. Because the interests are perfectly aligned, there's no bargaining or external approval needed."
    },
    {
      title: "Cognitive Permanence",
      description: "Traditional coaches can be ignored or unfollowed. But your future self? They show up every morning when you look in the mirror. This raises the stakes: unfinished commitments follow you around, while completed ones compound into confidence."
    },
  ], []);

  const testimonials = useMemo(() => [
    {
      quote: "This completely changed how I approach my goals. Having my future self guide me is incredible.",
      author: "Sarah Chen",
      role: "Product Designer"
    },
    {
      quote: "The accountability system actually works. I've achieved more in 3 months than the past year.",
      author: "Marcus Rodriguez",
      role: "Entrepreneur"
    },
    {
      quote: "Finally, a goal-setting app that understands the psychology of motivation.",
      author: "Dr. Emily Watson",
      role: "Behavioral Psychologist"
    }
  ], []);

  // Optimized animation variants
  const fadeInUp = useMemo(() => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: "easeOut" }
  }), []);

  const staggerContainer = useMemo(() => ({
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }), []);

  return (
    <div className={`min-h-screen ${isScrolled ? 'scrolled' : ''}`}>
      {/* Blur effect overlay - optimized with will-change */}
      <div 
        className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 will-change-transform ${
          isScrolled 
            ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
            : 'backdrop-filter backdrop-blur-0'
        }`} 
      />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32">
        <div className="container mx-auto px-4 pb-20">
          <motion.div 
            className="text-center max-w-5xl mx-auto"
            {...fadeInUp}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Sparkles className="w-4 h-4 text-primary-aqua" />
              <span className="text-sm font-medium text-white/90 font-heading">The future of personal growth</span>
            </motion.div>
            
            <h1 className="font-heading font-black leading-tight mb-8 tracking-tight">
              Accountability that<br />
              actually <span className="gradient-text">works</span>
            </h1>
            
            <p className="text-body-large text-white/70 max-w-3xl mx-auto mb-12 font-body">
              Your future self is calling...
            </p>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {isSignedIn ? (
                <Link to="/dashboard">
                  <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-10 py-4 font-heading transform-gpu">
                    {isOnboardingComplete === false ? 'Finish Onboarding' : 'Go to Dashboard'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              ) : (
                <Link to="/waitlist">
                  <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-10 py-4 font-heading transform-gpu">
                    Join Waitlist
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </Link>
              )}
            </motion.div>

           <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                className="bg-gradient-to-r from-primary-aqua/10 to-primary-blue/10 rounded-2xl border border-primary-aqua/20 p-6"
              >
                <blockquote className="text-lg md:text-xl font-medium text-white/90 font-body italic leading-relaxed">
                  "The person you are today is the result of conversations you had with yourself yesterday. 
                  The person you become tomorrow depends on the conversations you have with yourself today."
                </blockquote>
                <div className="mt-4 text-primary-aqua font-semibold font-heading">
                  — Dr. Hal Hershfield, UCLA Behavioral Scientist
                </div>
              </motion.div>
          </motion.div>
        </div>

        {/* Floating Elements - optimized with transform-gpu */}
        <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-primary-aqua/20 blur-xl transform-gpu" style={{ animation: 'float 6s ease-in-out infinite' }}></div>
        <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-primary-blue/20 blur-xl transform-gpu" style={{ animation: 'float 6s ease-in-out infinite 2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 rounded-full bg-accent-purple/20 blur-xl transform-gpu" style={{ animation: 'float 6s ease-in-out infinite 4s' }}></div>
      </section>

      {/* Features Section - Optimized */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-heading font-bold mb-6">
              How <span className="gradient-text">MyFutrSelf</span> Works
            </h2>
            <p className="text-body-large text-white/70 max-w-2xl mx-auto font-body">
              Your future self will literally call you, to keep you on track.
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <motion.div
                  key={index}
                  className="card hover:glow-border transition-all duration-300 transform-gpu will-change-transform"
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 }
                  }}
                  transition={{ duration: 0.6 }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className="text-primary-aqua mb-4">
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-semibold mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed font-body">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Why It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-heading font-bold mb-6">
              Why It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-body-large text-white/70 max-w-2xl mx-auto font-body">
              Backed by psychology research and designed around how your brain actually works.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {whyItWorks.map((principle, index) => (
              <motion.div
                key={index}
                className="mb-12 last:mb-0"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-aqua to-primary-blue flex items-center justify-center text-white font-bold text-xl font-heading">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-2xl mb-4 text-white">
                      {principle.title}
                    </h3>
                    <p className="text-white/80 leading-relaxed text-lg font-body">
                      {principle.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Get Started Button */}
          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            viewport={{ once: true }}
          >
            {isSignedIn ? (
              <Link to="/dashboard">
                <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-12 py-4 font-heading mx-auto transform-gpu">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            ) : (
              <Link to="/waitlist">
                <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-12 py-4 font-heading mx-auto transform-gpu">
                  Join Waitlist
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="font-heading font-bold mb-6">
              Real Results from Real People
            </h2>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-50px" }}
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                className="card transform-gpu"
                variants={{
                  initial: { opacity: 0, y: 30 },
                  animate: { opacity: 1, y: 0 }
                }}
                transition={{ duration: 0.6 }}
              >
                <p className="text-white/90 mb-6 text-body leading-relaxed italic font-body">
                  "{testimonial.quote}"
                </p>
                <div>
                  <p className="font-semibold text-white font-heading">{testimonial.author}</p>
                  <p className="text-white/60 text-caption font-body">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="card max-w-4xl mx-auto text-center glow-border"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading font-bold mb-6">
              Ready to Create Your <span className="gradient-text">FutrSelf</span>?
            </h2>
            <p className="text-body-large text-white/70 mb-8 max-w-2xl mx-auto font-body">
              Join thousands who are waiting to transform their lives through the power of future self-connection.
            </p>
            {isSignedIn ? (
              <Link to="/dashboard">
                <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-12 py-4 font-heading mx-auto transform-gpu">
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            ) : (
              <Link to="/waitlist">
                <button className="btn btn-primary flex items-center justify-center gap-3 text-lg px-12 py-4 font-heading mx-auto transform-gpu">
                  Join Waitlist
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            )}
            <p className="text-white/50 text-caption mt-4 font-body">Be the first to know when we launch</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Landing;