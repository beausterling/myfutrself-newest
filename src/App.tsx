import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import {
  ClerkLoaded,
  ClerkLoading,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useUser,
  useAuth
} from '@clerk/clerk-react';
import { createAuthenticatedSupabaseClient } from './lib/supabase';
import { useScrollbarVisibility } from './hooks/useScrollbarVisibility';

// Layout components
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Pricing from './pages/Pricing';
import NotFound from './pages/NotFound';
import LoadingScreen from './components/ui/LoadingScreen';

// Helper function to determine the furthest completed onboarding step
const determineOnboardingProgress = async (userId: string, supabaseClient: any, token: string) => {
  console.log('🔍 Determining onboarding progress for user:', userId);
  const startTime = Date.now();

  try {
    console.log('✅ Using provided authenticated Supabase client', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Get user profile
    console.log('📊 Fetching user profile from database...');
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*, twilio_setup_completed')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error loading user profile:', {
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        userId,
        timestamp: new Date().toISOString(),
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...',
        hasToken: !!token
      });
      return 1;
    }

    if (!userProfile) {
      console.log('❌ Step 1 incomplete: No user profile', {
        userId,
        profileError: profileError?.code || 'No error',
        timestamp: new Date().toISOString()
      });
      return 1;
    }

    console.log('📊 User profile loaded successfully:', {
      userId: userProfile.user_id,
      hasPhoto: !!userProfile.photo_url,
      hasVoicePreference: !!userProfile.voice_preference,
      hasCallMode: !!userProfile.call_mode,
      hasTimePreferences: !!(userProfile.preferred_time_start && userProfile.preferred_time_end),
      twilioSetupCompleted: userProfile.twilio_setup_completed,
      onboardingCompleted: userProfile.onboarding_completed,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at
    });

    // Step 1: Photo (current-self)
    if (!userProfile.photo_url) {
      console.log('❌ Step 1 incomplete: No photo', {
        userId,
        photoUrl: userProfile.photo_url,
        timestamp: new Date().toISOString()
      });
      return 1;
    }
    console.log('✅ Step 1 complete: Photo exists', {
      userId,
      photoLength: userProfile.photo_url?.length || 0,
      isBase64: userProfile.photo_url?.startsWith('data:') || false
    });

    // Get user's selected categories
    console.log('📊 Fetching user selected categories...');
    const { data: userSelections, error: selectionsError } = await supabaseClient
      .from('user_selected_categories')
      .select('*')
      .eq('user_id', userId);

    if (selectionsError) {
      console.error('❌ Error loading user selections:', {
        error: selectionsError.message,
        code: selectionsError.code,
        details: selectionsError.details,
        hint: selectionsError.hint,
        userId,
        timestamp: new Date().toISOString()
      });
      return 2;
    }

    // Step 2: Categories (pick-category)
    if (!userSelections || userSelections.length === 0) {
      console.log('❌ Step 2 incomplete: No categories selected', {
        userId,
        selectionsCount: userSelections?.length || 0,
        selectionsData: userSelections,
        timestamp: new Date().toISOString()
      });
      return 2;
    }
    console.log('✅ Step 2 complete: Categories selected', {
      userId,
      categoriesCount: userSelections.length,
      categoryIds: userSelections.map(s => s.category_id)
    });

    // Get user's goals
    console.log('📊 Fetching user goals...');
    const { data: userGoals, error: goalsError } = await supabaseClient
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (goalsError) {
      console.error('❌ Error loading user goals:', {
        error: goalsError.message,
        code: goalsError.code,
        details: goalsError.details,
        hint: goalsError.hint,
        userId,
        timestamp: new Date().toISOString()
      });
      return 3;
    }

    // Step 3: Goals (user-goals)
    if (!userGoals || userGoals.length === 0) {
      console.log('❌ Step 3 incomplete: No goals set', {
        userId,
        goalsCount: userGoals?.length || 0,
        goalsData: userGoals,
        timestamp: new Date().toISOString()
      });
      return 3;
    }
    console.log('✅ Step 3 complete: Goals set', {
      userId,
      goalsCount: userGoals.length,
      goalTitles: userGoals.map(g => g.title)
    });

    // Get motivations for user's goals
    console.log('📊 Fetching user motivations...');
    const goalIds = userGoals.map(g => g.id);
    const { data: userMotivations, error: motivationsError } = await supabaseClient
      .from('motivations')
      .select('*')
      .in('goal_id', goalIds);

    if (motivationsError) {
      console.error('❌ Error loading user motivations:', {
        error: motivationsError.message,
        code: motivationsError.code,
        details: motivationsError.details,
        hint: motivationsError.hint,
        userId,
        goalIds,
        timestamp: new Date().toISOString()
      });
      return 4;
    }

    // Step 4: Motivations (user-motivation)
    // Check if ALL goals have motivations (not just some)
    const goalMotivationMap = new Map();
    userMotivations?.forEach(motivation => {
      if (motivation.motivation_text?.trim()) {
        goalMotivationMap.set(motivation.goal_id, true);
      }
    });
    
    const allGoalsHaveMotivations = userGoals.every(goal => goalMotivationMap.has(goal.id));
    console.log('🔍 Motivation analysis:', {
      userId,
      totalGoals: userGoals.length,
      motivationsCount: userMotivations?.length || 0,
      goalsWithMotivations: goalMotivationMap.size,
      allGoalsHaveMotivations,
      goalMotivationDetails: userGoals.map(goal => ({
        goalId: goal.id,
        goalTitle: goal.title,
        hasMotivation: goalMotivationMap.has(goal.id)
      }))
    });
    
    if (!allGoalsHaveMotivations) {
      console.log('❌ Step 4 incomplete: Not all goals have motivations', {
        userId,
        totalGoals: userGoals.length,
        goalsWithMotivations: goalMotivationMap.size,
        missingMotivations: userGoals.filter(goal => !goalMotivationMap.has(goal.id)).map(g => g.title),
        timestamp: new Date().toISOString()
      });
      return 4;
    }
    console.log('✅ Step 4 complete: All goals have motivations', {
      userId,
      totalGoals: userGoals.length,
      goalsWithMotivations: goalMotivationMap.size
    });

    // Step 5: Obstacles (user-obstacles)
    // Check if ALL goals have at least one obstacle
    const allGoalsHaveObstacles = userGoals.every(goal => {
      const goalMotivation = userMotivations?.find(m => m.goal_id === goal.id);
      return goalMotivation && goalMotivation.obstacles && goalMotivation.obstacles.length > 0;
    });
    
    console.log('🔍 Obstacles analysis:', {
      userId,
      motivationsCount: userMotivations?.length || 0,
      allGoalsHaveObstacles,
      obstacleDetails: userMotivations?.map(m => ({
        goalId: m.goal_id,
        hasObstacles: !!(m.obstacles && m.obstacles.length > 0),
        obstaclesCount: m.obstacles?.length || 0
      })) || []
    });
    
    if (!allGoalsHaveObstacles) {
      console.log('❌ Step 5 incomplete: Not all goals have obstacles', {
        userId,
        totalGoals: userGoals.length,
        goalsWithObstacles: userGoals.filter(goal => {
          const goalMotivation = userMotivations?.find(m => m.goal_id === goal.id);
          return goalMotivation && goalMotivation.obstacles && goalMotivation.obstacles.length > 0;
        }).length,
        timestamp: new Date().toISOString()
      });
      return 5;
    }
    console.log('✅ Step 5 complete: All goals have obstacles', {
      userId,
      totalGoals: userGoals.length,
      goalsWithObstacles: userGoals.filter(goal => {
        const goalMotivation = userMotivations?.find(m => m.goal_id === goal.id);
        return goalMotivation && goalMotivation.obstacles && goalMotivation.obstacles.length > 0;
      }).length
    });

    // Step 6: Commitments (user-commitments)
    // Check if ALL goals have commitments (deadline or frequency)
    const allGoalsHaveCommitments = userGoals.every(g => g.deadline || g.frequency);
    
    console.log('🔍 Commitments analysis:', {
      userId,
      goalsCount: userGoals.length,
      allGoalsHaveCommitments,
      commitmentDetails: userGoals.map(g => ({
        goalId: g.id,
        goalTitle: g.title,
        hasDeadline: !!g.deadline,
        hasFrequency: !!g.frequency,
        deadline: g.deadline,
        frequency: g.frequency
      }))
    });
    
    if (!allGoalsHaveCommitments) {
      console.log('❌ Step 6 incomplete: Not all goals have commitments', {
        userId,
        totalGoals: userGoals.length,
        goalsWithCommitments: userGoals.filter(g => g.deadline || g.frequency).length,
        timestamp: new Date().toISOString()
      });
      return 6;
    }
    console.log('✅ Step 6 complete: All goals have commitments', {
      userId,
      totalGoals: userGoals.length,
      goalsWithCommitments: userGoals.filter(g => g.deadline || g.frequency).length
    });

    // Step 7: Call Preferences (call-prefs)
    console.log('🔍 Call preferences analysis:', {
      userId,
      hasStartTime: !!userProfile.preferred_time_start,
      hasEndTime: !!userProfile.preferred_time_end,
      startTime: userProfile.preferred_time_start,
      endTime: userProfile.preferred_time_end
    });
    
    if (!userProfile.preferred_time_start || !userProfile.preferred_time_end) {
      console.log('❌ Step 7 incomplete: No call preferences set', {
        userId,
        hasStartTime: !!userProfile.preferred_time_start,
        hasEndTime: !!userProfile.preferred_time_end,
        timestamp: new Date().toISOString()
      });
      return 7;
    }
    console.log('✅ Step 7 complete: Call preferences set', {
      userId,
      startTime: userProfile.preferred_time_start,
      endTime: userProfile.preferred_time_end
    });

    // Step 8: Voice Preference (choose-voice)
    console.log('🔍 Voice preference analysis:', {
      userId,
      hasVoicePreference: !!userProfile.voice_preference,
      voicePreference: userProfile.voice_preference
    });
    
    if (userProfile.voice_preference === null) {
      console.log('❌ Step 8 incomplete: No voice preference set', {
        userId,
        voicePreference: userProfile.voice_preference,
        timestamp: new Date().toISOString()
      });
      return 8;
    }
    console.log('✅ Step 8 complete: Voice preference set', {
      userId,
      voicePreference: userProfile.voice_preference
    });

    // Step 9: Twilio Setup (twilio-setup) 
    console.log('🔍 Twilio setup analysis:', {
      userId,
      twilioSetupCompleted: userProfile.twilio_setup_completed
    });
    
    if (!userProfile.twilio_setup_completed) {
      console.log('❌ Step 9 incomplete: Twilio setup not completed', {
        userId,
        twilioSetupCompleted: userProfile.twilio_setup_completed,
        timestamp: new Date().toISOString()
      });
      return 9;
    }
    console.log('✅ Step 9 complete: Twilio setup completed', {
      userId,
      twilioSetupCompleted: userProfile.twilio_setup_completed
    });

    // Step 10: Consent (consent) - this is checked by onboarding_completed
    console.log('🔍 Onboarding completion analysis:', {
      userId,
      onboardingCompleted: userProfile.onboarding_completed,
      updatedAt: userProfile.updated_at
    });
    
    if (!userProfile.onboarding_completed) {
      console.log('❌ Step 10 incomplete: Onboarding not completed', {
        userId,
        onboardingCompleted: userProfile.onboarding_completed,
        timestamp: new Date().toISOString()
      });
      return 10;
    }
    
    const processingTime = Date.now() - startTime;
    console.log('✅ All steps complete: Onboarding finished', {
      userId,
      onboardingCompleted: userProfile.onboarding_completed,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString()
    });

    return null; // Onboarding is complete

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error determining onboarding progress:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      processingTimeMs: processingTime,
      timestamp: new Date().toISOString(),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...'
    });
    return 1; // Default to first step on error
  }
};

// Map step numbers to routes
const stepToRouteMap: Record<number, string> = {
  1: '/onboarding/current-self',
  2: '/onboarding/pick-category',
  3: '/onboarding/user-goals',
  4: '/onboarding/user-motivation',
  5: '/onboarding/user-obstacles',
  6: '/onboarding/user-commitments',
  7: '/onboarding/call-prefs',
  8: '/onboarding/choose-voice',
  9: '/onboarding/twilio-setup',
  10: '/onboarding/consent'
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [nextOnboardingStep, setNextOnboardingStep] = useState<number | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user?.id || !isLoaded) {
        console.log('❌ No user ID or not loaded, skipping profile check');
        setIsCheckingProfile(false);
        return;
      }

      try {
        setIsCheckingProfile(true);
        console.log('Checking onboarding status for user:', user.id);
        
        // Get fresh token for this request
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available for Supabase request');
          throw new Error('No authentication token available');
        }

        // Create fresh authenticated Supabase client
        const supabaseClient = createAuthenticatedSupabaseClient(token);
        
        // Check if onboarding is completed first
        const { data, error } = await supabaseClient
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error querying user_profiles:', error);
          throw error;
        }

        if (!data) {
          // User profile doesn't exist, they need onboarding
          console.log('User profile not found, user needs onboarding');
          setIsOnboarded(false);
          setNextOnboardingStep(1);
        } else {
          const onboardingCompleted = data.onboarding_completed ?? false;
          console.log('User onboarding completed:', onboardingCompleted);
          
          if (onboardingCompleted) {
            setIsOnboarded(true);
            setNextOnboardingStep(null);
          } else {
            // Determine the specific step they need to complete
            const nextStep = await determineOnboardingProgress(user.id, supabaseClient, token);
            
            if (nextStep === null) {
              // All steps complete but onboarding_completed is false - this shouldn't happen
              console.warn('⚠️ All onboarding steps complete but onboarding_completed is false');
              setIsOnboarded(true);
              setNextOnboardingStep(null);
            } else {
              console.log('🎯 Next onboarding step:', nextStep);
              setIsOnboarded(false);
              setNextOnboardingStep(nextStep);
            }
          }
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // Default to requiring onboarding on error
        setIsOnboarded(false);
        setNextOnboardingStep(1);
      } finally {
        setIsCheckingProfile(false);
      }
    }

    if (isLoaded) {
      checkOnboardingStatus();
    }
  }, [user?.id, isLoaded, getToken, location.pathname]);

  if (!isLoaded || isCheckingProfile || isOnboarded === null) {
    return <LoadingScreen />;
  }

  // Helper function to determine if user should be redirected to onboarding
  const shouldRedirectToOnboarding = () => {
    if (isOnboarded) return false;
    if (location.pathname.startsWith('/onboarding')) return false;
    return true;
  };

  // Helper function to get the appropriate onboarding redirect path
  const getOnboardingRedirectPath = () => {
    if (nextOnboardingStep && stepToRouteMap[nextOnboardingStep]) {
      console.log('🔄 Redirecting to onboarding step:', nextOnboardingStep, stepToRouteMap[nextOnboardingStep]);
      return stepToRouteMap[nextOnboardingStep];
    }
    console.log('🔄 Redirecting to onboarding start');
    return '/onboarding/current-self';
  };

  return (
    <>
      <SignedIn>
        {shouldRedirectToOnboarding() ? (
          <Navigate to={getOnboardingRedirectPath()} replace />
        ) : (
          isOnboarded && location.pathname.startsWith('/onboarding') ? (
            <Navigate to="/dashboard" replace />
          ) : children
        )}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

function App() {
  const location = useLocation();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Initialize auto-hiding scrollbars
  useScrollbarVisibility();
  
  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  useEffect(() => {
    // Update data-theme attribute when theme changes
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <>
      <ClerkLoading>
        <LoadingScreen />
      </ClerkLoading>
      
      <ClerkLoaded>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<MainLayout theme={theme} toggleTheme={toggleTheme} />}>
            <Route index element={<Landing />} />
          </Route>
          
          {/* Waitlist route */}
          
          {/* Pricing route */}
          <Route path="/pricing" element={<Pricing />} />
          
          {/* Onboarding route - available after signup but before completing profile */}
          <Route path="/onboarding/*" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />
          
          {/* Protected dashboard routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
          </Route>
          
          {/* 404 page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ClerkLoaded>
    </>
  );
}

export default App;