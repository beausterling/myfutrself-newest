import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, User, CheckCircle, AlertCircle, ArrowLeft, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

const Waitlist = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    goals: '',
    feedback: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendWelcomeEmail = async (email: string, firstName?: string, goals?: string) => {
    try {
      console.log('🔄 Sending welcome email to:', email);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-waitlist-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          goals
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Welcome email failed:', errorData);
        // Don't throw error here - we don't want to fail the waitlist signup if email fails
        console.warn('⚠️ Welcome email failed but continuing with signup');
      } else {
        const result = await response.json();
        console.log('✅ Welcome email sent successfully:', result);
      }
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      // Don't throw error here - we don't want to fail the waitlist signup if email fails
      console.warn('⚠️ Welcome email failed but continuing with signup');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('🔄 Submitting waitlist form:', {
        email: formData.email,
        firstName: formData.firstName || 'not provided',
        goals: formData.goals ? 'provided' : 'not provided',
        feedback: formData.feedback ? 'provided' : 'not provided'
      });

      // Insert into waitlist table
      const { data, error: insertError } = await supabase
        .from('waitlist')
        .insert({
          email: formData.email.trim().toLowerCase(),
          first_name: formData.firstName.trim() || null,
          goals: formData.goals.trim() || null,
          feedback: formData.feedback.trim() || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error inserting waitlist entry:', {
          error: insertError,
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          email: formData.email
        });
        
        // Handle specific error cases with detailed logging and user-friendly messages
        if (insertError.code === '23505') {
          console.log('📧 Duplicate email detected:', formData.email);
          setError('This email address is already on our waitlist. Thank you for your interest!');
        } else if (insertError.code === 'PGRST301') {
          console.error('🔒 RLS policy violation - user may not have permission to insert');
          setError('Unable to join waitlist due to permission restrictions. Please try again or contact support.');
        } else if (insertError.code === 'PGRST116') {
          console.error('🔍 Table or column not found');
          setError('Service temporarily unavailable. Please try again in a few moments.');
        } else if (insertError.message?.includes('network')) {
          console.error('🌐 Network connectivity issue');
          setError('Network connection issue. Please check your internet connection and try again.');
        } else if (insertError.message?.includes('timeout')) {
          console.error('⏱️ Request timeout');
          setError('Request timed out. Please try again.');
        } else {
          console.error('🚨 Unexpected database error:', insertError);
          setError(`Unable to join waitlist: ${insertError.message || 'Unknown database error'}. Please try again.`);
        }
        return;
      }

      console.log('✅ Waitlist entry created successfully:', {
        id: data?.id,
        email: data?.email,
        createdAt: data?.created_at
      });
      
      // Send welcome email (don't await to avoid blocking the UI)
      sendWelcomeEmail(
        formData.email.trim().toLowerCase(),
        formData.firstName.trim() || undefined,
        formData.goals.trim() || undefined
      );
      
      setIsSubmitted(true);

    } catch (error) {
      console.error('❌ Unexpected error submitting waitlist form:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        email: formData.email
      });
      
      // Handle different types of unexpected errors
      if (error instanceof TypeError) {
        setError('Configuration error. Please refresh the page and try again.');
      } else if (error instanceof Error && error.message.includes('fetch')) {
        setError('Unable to connect to our servers. Please check your internet connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again or contact support if the problem persists.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSubmitted) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${isScrolled ? 'scrolled' : ''}`}>
        {/* Blur effect overlay */}
        <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
          isScrolled 
            ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
            : 'backdrop-filter backdrop-blur-0'
        }`} />
        
        <motion.div 
          className="max-w-md w-full text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="card glow-border">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-aqua/20 mb-6">
              <CheckCircle className="w-8 h-8 text-primary-aqua" />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold mb-4 font-heading">You're on the list!</h1>
            <p className="text-text-secondary text-base md:text-lg mb-6 font-body">
              Thank you for joining our waitlist. We'll notify you as soon as MyFutrSelf is ready to transform your life.
            </p>
            
            <div className="bg-primary-aqua/10 border border-primary-aqua/20 rounded-xl p-4 mb-8">
              <p className="text-primary-aqua text-sm font-medium font-body">
                📧 Check your email! We've sent you a welcome message with more details about what's coming next.
              </p>
            </div>
            
            <div className="space-y-4">
              <Link 
                to="/" 
                className="btn btn-primary w-full font-heading"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isScrolled ? 'scrolled' : ''}`}>
      {/* Blur effect overlay */}
      <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
          : 'backdrop-filter backdrop-blur-0'
      }`} />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <nav className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/icon_nobackground_small copy.png" 
              alt="MyFutrSelf" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="gradient-text font-heading text-xl font-bold">MyFutrSelf</span>
          </Link>

          <Link 
            to="/" 
            className="btn btn-ghost flex items-center gap-2 font-heading"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <motion.div 
            className="max-w-2xl mx-auto text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-heading font-black leading-tight mb-6 tracking-tight">
              Join the <span className="gradient-text">Waitlist</span>
            </h1>
            
            <p className="text-body-large text-white/70 mb-8 font-body">
              Be among the first to experience the future of personal transformation. 
              We're putting the finishing touches on something extraordinary.
            </p>

            <div className="flex justify-center items-center gap-8 text-white/50 text-sm mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-aqua" />
                <span className="font-body">Early Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-aqua" />
                <span className="font-body">Exclusive Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary-aqua" />
                <span className="font-body">Special Pricing</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="max-w-lg mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="card glow-border">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                    Email Address *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className="input pl-12"
                      required
                      disabled={isSubmitting}
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  </div>
                </div>

                {/* First Name Field */}
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                    First Name <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="Your first name"
                      className="input pl-12"
                      disabled={isSubmitting}
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                  </div>
                </div>

                {/* Goals Field */}
                <div>
                  <label htmlFor="goals" className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                    What goals or dreams do you have? <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="goals"
                      name="goals"
                      value={formData.goals}
                      onChange={handleInputChange}
                      placeholder="Tell us about your aspirations, goals, or dreams you'd like to achieve..."
                      className="input h-24 resize-none pl-12 pt-4"
                      disabled={isSubmitting}
                    />
                    <Target className="absolute left-4 top-4 text-white/40 w-5 h-5" />
                  </div>
                </div>

                {/* Feedback Field */}
                <div>
                  <label htmlFor="feedback" className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                    Questions or Comments <span className="text-white/40">(optional)</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="feedback"
                      name="feedback"
                      value={formData.feedback}
                      onChange={handleInputChange}
                      placeholder="What would you like to know about MyFutrSelf? Any specific features you're hoping for?"
                      className="input h-24 resize-none pl-12 pt-4"
                      disabled={isSubmitting}
                    />
                    <MessageSquare className="absolute left-4 top-4 text-white/40 w-5 h-5" />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
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
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.email.trim()}
                  className="btn btn-primary w-full text-lg py-4 font-heading disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
                      Joining Waitlist...
                    </>
                  ) : (
                    'Join the Waitlist'
                  )}
                </button>

                <p className="text-white/50 text-xs text-center font-body">
                  We respect your privacy. Your email will only be used to notify you about MyFutrSelf updates.
                </p>
              </form>
            </div>
          </motion.div>

          {/* Additional Info */}
          <motion.div 
            className="max-w-4xl mx-auto mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-aqua/20 mb-4">
                  <CheckCircle className="w-6 h-6 text-primary-aqua" />
                </div>
                <h3 className="font-heading font-semibold mb-2 text-white">Early Access</h3>
                <p className="text-white/70 text-sm font-body">
                  Be the first to experience MyFutrSelf when we launch
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-blue/20 mb-4">
                  <Mail className="w-6 h-6 text-primary-blue" />
                </div>
                <h3 className="font-heading font-semibold mb-2 text-white">Exclusive Updates</h3>
                <p className="text-white/70 text-sm font-body">
                  Get behind-the-scenes insights and development updates
                </p>
              </div>
              
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-purple/20 mb-4">
                  <MessageSquare className="w-6 h-6 text-accent-purple" />
                </div>
                <h3 className="font-heading font-semibold mb-2 text-white">Shape the Future</h3>
                <p className="text-white/70 text-sm font-body">
                  Your feedback helps us build the perfect experience
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-primary-aqua/20 blur-xl animate-float"></div>
      <div className="absolute top-40 right-20 w-32 h-32 rounded-full bg-primary-blue/20 blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-16 h-16 rounded-full bg-accent-purple/20 blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
    </div>
  );
};

export default Waitlist;