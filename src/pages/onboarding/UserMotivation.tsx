import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { Heart, AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

interface Goal {
  id: string;
  title: string;
  category_name: string;
}

interface Motivation {
  id: string;
  goal_id: string;
  motivation_text: string;
}

const UserMotivation = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motivations, setMotivations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
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

  // Load goals and existing motivations
  useEffect(() => {
    const loadGoalsAndMotivations = async () => {
      if (!user?.id) {
        console.log('❌ No user ID available, skipping goals load');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading goals and motivations for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          throw new Error('Authentication token not available');
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Load goals with categories
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select(`
            id,
            title,
            categories!inner(name)
          `)
          .eq('user_id', user.id);

        if (goalsError) {
          console.error('❌ Error loading goals:', goalsError);
          throw new Error(`Failed to load goals: ${goalsError.message}`);
        }

        if (!goalsData || goalsData.length === 0) {
          console.log('⚠️ No goals found for user');
          setGoals([]);
          setIsLoading(false);
          return;
        }

        // Transform goals data
        const transformedGoals: Goal[] = goalsData.map(goal => ({
          id: goal.id,
          title: goal.title,
          category_name: goal.categories?.name || 'Unknown'
        }));

        console.log('✅ Goals loaded successfully:', transformedGoals.length);
        setGoals(transformedGoals);

        // Load existing motivations
        const goalIds = transformedGoals.map(g => g.id);
        const { data: motivationsData, error: motivationsError } = await supabase
          .from('motivations')
          .select('id, goal_id, motivation_text')
          .in('goal_id', goalIds);

        if (motivationsError) {
          console.error('❌ Error loading motivations:', motivationsError);
          throw new Error(`Failed to load motivations: ${motivationsError.message}`);
        }

        // Transform motivations into a map
        const motivationsMap: Record<string, string> = {};
        if (motivationsData) {
          motivationsData.forEach((motivation: Motivation) => {
            if (motivation.motivation_text) {
              motivationsMap[motivation.goal_id] = motivation.motivation_text;
            }
          });
        }

        console.log('✅ Motivations loaded successfully:', Object.keys(motivationsMap).length);
        setMotivations(motivationsMap);

      } catch (error) {
        console.error('❌ Error loading goals and motivations:', error);
        setError(error instanceof Error ? error.message : 'Failed to load goals and motivations');
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalsAndMotivations();
  }, [user?.id, getToken]);

  const handleMotivationChange = (goalId: string, value: string) => {
    console.log('📝 Motivation changed for goal:', goalId, 'Value length:', value.length);
    setMotivations(prev => ({
      ...prev,
      [goalId]: value
    }));
  };

  const saveMotivations = async () => {
    if (!user?.id) {
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      setError(null);
      console.log('💾 Saving motivations to database...');
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Process each goal's motivation
      for (const goal of goals) {
        const motivationText = motivations[goal.id]?.trim();
        
        if (!motivationText) {
          console.log('⚠️ Skipping empty motivation for goal:', goal.id);
          continue;
        }

        console.log('💾 Saving motivation for goal:', goal.id);

        // Check if motivation already exists
        const { data: existingMotivation, error: checkError } = await supabase
          .from('motivations')
          .select('id')
          .eq('goal_id', goal.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ Error checking existing motivation:', checkError);
          throw new Error(`Failed to check existing motivation: ${checkError.message}`);
        }

        if (existingMotivation) {
          // Update existing motivation
          const { error: updateError } = await supabase
            .from('motivations')
            .update({
              motivation_text: motivationText,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingMotivation.id);

          if (updateError) {
            console.error('❌ Error updating motivation:', updateError);
            throw new Error(`Failed to update motivation: ${updateError.message}`);
          }

          console.log('✅ Motivation updated for goal:', goal.id);
        } else {
          // Create new motivation
          const { error: insertError } = await supabase
            .from('motivations')
            .insert({
              goal_id: goal.id,
              motivation_text: motivationText,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('❌ Error creating motivation:', insertError);
            throw new Error(`Failed to create motivation: ${insertError.message}`);
          }

          console.log('✅ Motivation created for goal:', goal.id);
        }
      }
      
      console.log('✅ All motivations saved successfully');
    } catch (error) {
      console.error('❌ Error saving motivations:', error);
      setError(error instanceof Error ? error.message : 'Failed to save motivations');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Validate that all goals have motivations
    const goalsWithoutMotivations = goals.filter(goal => !motivations[goal.id]?.trim());
    
    if (goalsWithoutMotivations.length > 0) {
      setError(`Please add motivation for: ${goalsWithoutMotivations.map(g => g.title).join(', ')}`);
      return;
    }

    try {
      await saveMotivations();
      dispatch({ type: 'NEXT_STEP' });
      navigate('/onboarding/user-obstacles');
    } catch (error) {
      console.error('❌ Error saving motivations before proceeding:', error);
      setError('Failed to save motivations. Please try again.');
    }
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-goals');
  };

  const isValidMotivations = () => {
    return goals.every(goal => motivations[goal.id]?.trim());
  };

  if (isLoading) {
    return (
      <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="onboarding-content container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70 font-body">Loading your goals...</p>
          </div>
        </div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="onboarding-content container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 font-heading">No Goals Found</h2>
            <p className="text-white/70 mb-8 font-body">
              You need to set up your goals first before adding motivations.
            </p>
            <button 
              onClick={() => navigate('/onboarding/user-goals')} 
              className="btn btn-primary font-heading"
            >
              Go Back to Goals
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">What Motivates You?</h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            Understanding your deeper motivations will help your future self provide more meaningful guidance.
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
              <p className="text-blue-400 font-medium font-heading">Saving your motivations...</p>
            </div>
          </div>
        )}

        {/* Goals List */}
        <div className="space-y-8 max-w-2xl mx-auto">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-semibold mb-4 font-heading text-white">
                {goal.title}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                  What motivates you to achieve this goal?
                </label>
                <textarea
                  value={motivations[goal.id] || ''}
                  onChange={(e) => handleMotivationChange(goal.id, e.target.value)}
                  placeholder="Describe what drives you to achieve this goal..."
                  className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg resize-none font-body"
                  rows={3}
                  required
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-between max-w-md mx-auto">
          <button 
            onClick={handleBack} 
            className="btn btn-outline text-lg px-8 py-4 font-heading"
            disabled={isSaving}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-lg px-8 py-4 font-heading transition-all duration-300 rounded-xl border ${
              isValidMotivations() && !isSaving
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!isValidMotivations() || isSaving}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserMotivation;