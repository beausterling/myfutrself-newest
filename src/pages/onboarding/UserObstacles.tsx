import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { Target, Plus, X, AlertCircle, Trash2 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

interface Goal {
  id: string;
  title: string;
  category_name: string;
  deadline: string | null;
  frequency: string | null;
  start_date: string | null;
}

interface Motivation {
  id: string;
  goal_id: string;
  motivation_text: string | null;
  obstacles: string[] | null;
}

interface GoalWithMotivation extends Goal {
  motivation?: Motivation;
}

const UserObstacles = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [goals, setGoals] = useState<GoalWithMotivation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  
  // State for managing obstacle inputs - each goal has its own input state
  const [obstacleInputs, setObstacleInputs] = useState<Record<string, string>>({});
  
  // State for managing which goals are being edited
  const [editingGoals, setEditingGoals] = useState<Record<string, boolean>>({});

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load goals and motivations from database
  useEffect(() => {
    const loadGoalsAndMotivations = async () => {
      if (!user?.id || hasLoadedFromDB) {
        return;
      }

      try {
        console.log('🔄 Loading goals and motivations for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          setError('Authentication failed. Please refresh and try again.');
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Fetch goals with their categories
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select(`
            id,
            title,
            deadline,
            frequency,
            start_date,
            categories!inner(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (goalsError) {
          console.error('❌ Error loading goals:', goalsError);
          setError(`Failed to load goals: ${goalsError.message}`);
          return;
        }

        if (!goalsData || goalsData.length === 0) {
          console.log('❌ No goals found for user');
          setError('No goals found. Please go back and add some goals first.');
          return;
        }

        // Transform goals data
        const transformedGoals: Goal[] = goalsData.map(goal => ({
          id: goal.id,
          title: goal.title,
          category_name: goal.categories?.name || 'Unknown',
          deadline: goal.deadline,
          frequency: goal.frequency,
          start_date: goal.start_date
        }));

        console.log('✅ Goals loaded:', transformedGoals.length);

        // Fetch motivations for these goals
        const goalIds = transformedGoals.map(g => g.id);
        const { data: motivationsData, error: motivationsError } = await supabase
          .from('motivations')
          .select('*')
          .in('goal_id', goalIds);

        if (motivationsError) {
          console.error('❌ Error loading motivations:', motivationsError);
          setError(`Failed to load motivations: ${motivationsError.message}`);
          return;
        }

        console.log('✅ Motivations loaded:', motivationsData?.length || 0);

        // Combine goals with their motivations
        const goalsWithMotivations: GoalWithMotivation[] = transformedGoals.map(goal => {
          const motivation = motivationsData?.find(m => m.goal_id === goal.id);
          return {
            ...goal,
            motivation
          };
        });

        setGoals(goalsWithMotivations);
        
        // Initialize obstacle inputs for each goal
        const initialInputs: Record<string, string> = {};
        goalsWithMotivations.forEach(goal => {
          initialInputs[goal.id] = '';
        });
        setObstacleInputs(initialInputs);
        
        setHasLoadedFromDB(true);
      } catch (error) {
        console.error('❌ Error loading goals and motivations:', error);
        setError('Failed to load data. Please refresh and try again.');
        setHasLoadedFromDB(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalsAndMotivations();
  }, [user?.id, getToken, hasLoadedFromDB]);

  // Update obstacle input for a specific goal
  const handleObstacleInputChange = (goalId: string, value: string) => {
    setObstacleInputs(prev => ({
      ...prev,
      [goalId]: value
    }));
  };

  // Add obstacle to a specific goal
  const handleAddObstacle = async (goalId: string) => {
    const obstacleText = obstacleInputs[goalId]?.trim();
    if (!obstacleText) {
      setError('Please enter an obstacle before adding.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      console.log('🔄 Adding obstacle to goal:', goalId, obstacleText);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Find the goal and its current motivation
      const goal = goals.find(g => g.id === goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      const currentObstacles = goal.motivation?.obstacles || [];
      const updatedObstacles = [...currentObstacles, obstacleText];

      if (goal.motivation) {
        // Update existing motivation
        const { error: updateError } = await supabase
          .from('motivations')
          .update({
            obstacles: updatedObstacles,
            updated_at: new Date().toISOString()
          })
          .eq('id', goal.motivation.id);

        if (updateError) {
          console.error('❌ Error updating motivation:', updateError);
          throw new Error(`Failed to update obstacles: ${updateError.message}`);
        }
      } else {
        // Create new motivation with obstacles
        const { error: insertError } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            obstacles: updatedObstacles,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('❌ Error creating motivation:', insertError);
          throw new Error(`Failed to create obstacles: ${insertError.message}`);
        }
      }

      // Update local state
      setGoals(prevGoals => 
        prevGoals.map(g => {
          if (g.id === goalId) {
            return {
              ...g,
              motivation: {
                ...g.motivation,
                id: g.motivation?.id || '',
                goal_id: goalId,
                motivation_text: g.motivation?.motivation_text || null,
                obstacles: updatedObstacles
              }
            };
          }
          return g;
        })
      );

      // Clear the input for this specific goal
      setObstacleInputs(prev => ({
        ...prev,
        [goalId]: ''
      }));

      console.log('✅ Obstacle added successfully');
    } catch (error) {
      console.error('❌ Error adding obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to add obstacle');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove obstacle from a specific goal
  const handleRemoveObstacle = async (goalId: string, obstacleIndex: number) => {
    try {
      setIsSaving(true);
      setError(null);
      console.log('🔄 Removing obstacle from goal:', goalId, 'index:', obstacleIndex);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Find the goal and its current motivation
      const goal = goals.find(g => g.id === goalId);
      if (!goal?.motivation) {
        throw new Error('Goal or motivation not found');
      }

      const currentObstacles = goal.motivation.obstacles || [];
      const updatedObstacles = currentObstacles.filter((_, index) => index !== obstacleIndex);

      // Update motivation
      const { error: updateError } = await supabase
        .from('motivations')
        .update({
          obstacles: updatedObstacles,
          updated_at: new Date().toISOString()
        })
        .eq('id', goal.motivation.id);

      if (updateError) {
        console.error('❌ Error updating motivation:', updateError);
        throw new Error(`Failed to remove obstacle: ${updateError.message}`);
      }

      // Update local state
      setGoals(prevGoals => 
        prevGoals.map(g => {
          if (g.id === goalId) {
            return {
              ...g,
              motivation: {
                ...g.motivation!,
                obstacles: updatedObstacles
              }
            };
          }
          return g;
        })
      );

      console.log('✅ Obstacle removed successfully');
    } catch (error) {
      console.error('❌ Error removing obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove obstacle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    // Check if all goals have at least one obstacle
    const goalsWithoutObstacles = goals.filter(goal => 
      !goal.motivation?.obstacles || goal.motivation.obstacles.length === 0
    );

    if (goalsWithoutObstacles.length > 0) {
      setError(`Please add at least one obstacle for: ${goalsWithoutObstacles.map(g => g.title).join(', ')}`);
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-commitments');
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-motivation');
  };

  // Group goals by category
  const goalsByCategory = goals.reduce((acc, goal) => {
    const category = goal.category_name;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(goal);
    return acc;
  }, {} as Record<string, GoalWithMotivation[]>);

  if (isLoading) {
    return (
      <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="onboarding-content container mx-auto px-4 max-w-2xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/70 font-body">Loading your goals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Target className="w-8 h-8 md:w-10 md:h-10 text-accent-purple" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">Identify Your Obstacles</h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            What challenges might prevent you from achieving each goal? Being aware of obstacles helps your future self guide you through them.
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
              <p className="text-blue-400 font-medium font-heading">Saving obstacles...</p>
            </div>
          </div>
        )}

        {/* Goals by Category */}
        <div className="space-y-8">
          {Object.entries(goalsByCategory).map(([categoryName, categoryGoals]) => (
            <div key={categoryName} className="card">
              <h3 className="text-xl font-semibold mb-6 font-heading text-primary-aqua">
                {categoryName}
              </h3>
              
              <div className="space-y-6">
                {categoryGoals.map((goal) => (
                  <div key={goal.id} className="border border-white/10 rounded-xl p-6 bg-white/5">
                    <h4 className="text-lg font-semibold mb-4 font-heading text-white">
                      {goal.title}
                    </h4>
                    
                    {/* Existing Obstacles */}
                    {goal.motivation?.obstacles && goal.motivation.obstacles.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-white/80 mb-3 font-heading">Current Obstacles:</p>
                        <div className="space-y-2">
                          {goal.motivation.obstacles.map((obstacle, index) => (
                            <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                              <span className="text-white/90 font-body">{obstacle}</span>
                              <button
                                onClick={() => handleRemoveObstacle(goal.id, index)}
                                disabled={isSaving}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                                title="Remove obstacle"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Add New Obstacle */}
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={obstacleInputs[goal.id] || ''}
                          onChange={(e) => handleObstacleInputChange(goal.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleAddObstacle(goal.id);
                            }
                          }}
                          placeholder="What might prevent you from achieving this goal?"
                          className="flex-1 bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-transparent backdrop-blur-lg font-body"
                          disabled={isSaving}
                        />
                        <button
                          onClick={() => handleAddObstacle(goal.id)}
                          disabled={isSaving || !obstacleInputs[goal.id]?.trim()}
                          className={`px-4 py-3 rounded-xl font-heading transition-all duration-300 ${
                            obstacleInputs[goal.id]?.trim() && !isSaving
                              ? 'bg-accent-purple hover:bg-accent-purple/80 text-white'
                              : 'bg-white/10 text-white/40 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      
                      <p className="text-white/60 text-sm font-body">
                        Examples: Time constraints, lack of resources, fear of failure, competing priorities
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Summary */}
        <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
          <h4 className="text-lg font-semibold mb-4 font-heading">Progress Summary</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-aqua font-heading">
                {goals.filter(g => g.motivation?.obstacles && g.motivation.obstacles.length > 0).length}
              </div>
              <div className="text-white/70 text-sm font-body">Goals with obstacles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-purple font-heading">
                {goals.reduce((total, g) => total + (g.motivation?.obstacles?.length || 0), 0)}
              </div>
              <div className="text-white/70 text-sm font-body">Total obstacles identified</div>
            </div>
          </div>
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
              goals.every(g => g.motivation?.obstacles && g.motivation.obstacles.length > 0) && !isSaving
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!goals.every(g => g.motivation?.obstacles && g.motivation.obstacles.length > 0) || isSaving}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserObstacles;