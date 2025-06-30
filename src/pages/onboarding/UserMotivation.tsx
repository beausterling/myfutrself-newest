import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { Heart, Plus, X, AlertCircle, Trash2 } from 'lucide-react';
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
  obstacles: string[];
}

const UserMotivation = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motivations, setMotivations] = useState<Record<string, Motivation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  
  // Individual state for each goal's obstacle input - this is the key fix
  const [obstacleInputs, setObstacleInputs] = useState<Record<string, string>>({});

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
          setError(`Failed to load goals: ${goalsError.message}`);
          return;
        }

        if (!goalsData || goalsData.length === 0) {
          console.log('❌ No goals found for user');
          setError('No goals found. Please go back and set up your goals first.');
          return;
        }

        // Transform goals data
        const transformedGoals: Goal[] = goalsData.map(goal => ({
          id: goal.id,
          title: goal.title,
          category_name: goal.categories?.name || 'Unknown'
        }));

        console.log('✅ Goals loaded:', transformedGoals.length);
        setGoals(transformedGoals);

        // Load existing motivations
        const { data: motivationsData, error: motivationsError } = await supabase
          .from('motivations')
          .select('*')
          .in('goal_id', transformedGoals.map(g => g.id));

        if (motivationsError) {
          console.error('❌ Error loading motivations:', motivationsError);
          setError(`Failed to load existing motivations: ${motivationsError.message}`);
          return;
        }

        // Transform motivations data into a record keyed by goal_id
        const motivationsRecord: Record<string, Motivation> = {};
        const initialObstacleInputs: Record<string, string> = {};
        
        if (motivationsData) {
          motivationsData.forEach(motivation => {
            motivationsRecord[motivation.goal_id] = {
              id: motivation.id,
              goal_id: motivation.goal_id,
              motivation_text: motivation.motivation_text || '',
              obstacles: motivation.obstacles || []
            };
          });
        }

        // Initialize obstacle inputs for all goals (empty string for each goal)
        transformedGoals.forEach(goal => {
          initialObstacleInputs[goal.id] = '';
        });

        console.log('✅ Motivations loaded:', Object.keys(motivationsRecord).length);
        setMotivations(motivationsRecord);
        setObstacleInputs(initialObstacleInputs);
        setHasLoadedFromDB(true);
        
      } catch (error) {
        console.error('❌ Error loading goals and motivations:', error);
        setError('Failed to load data. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalsAndMotivations();
  }, [user?.id, getToken, hasLoadedFromDB]);

  const handleMotivationChange = (goalId: string, value: string) => {
    setMotivations(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        goal_id: goalId,
        motivation_text: value,
        obstacles: prev[goalId]?.obstacles || [],
        id: prev[goalId]?.id || ''
      }
    }));
  };

  // Fixed: Handle obstacle input change for specific goal
  const handleObstacleInputChange = (goalId: string, value: string) => {
    setObstacleInputs(prev => ({
      ...prev,
      [goalId]: value
    }));
  };

  // Fixed: Add obstacle for specific goal
  const handleAddObstacle = (goalId: string) => {
    const obstacleText = obstacleInputs[goalId]?.trim();
    if (!obstacleText) return;

    setMotivations(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        goal_id: goalId,
        motivation_text: prev[goalId]?.motivation_text || '',
        obstacles: [...(prev[goalId]?.obstacles || []), obstacleText],
        id: prev[goalId]?.id || ''
      }
    }));

    // Clear the input for this specific goal
    setObstacleInputs(prev => ({
      ...prev,
      [goalId]: ''
    }));
  };

  const handleRemoveObstacle = (goalId: string, obstacleIndex: number) => {
    setMotivations(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        goal_id: goalId,
        motivation_text: prev[goalId]?.motivation_text || '',
        obstacles: prev[goalId]?.obstacles?.filter((_, index) => index !== obstacleIndex) || [],
        id: prev[goalId]?.id || ''
      }
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
        const motivation = motivations[goal.id];
        
        if (!motivation?.motivation_text?.trim()) {
          console.warn(`⚠️ Skipping goal ${goal.id} - no motivation text`);
          continue;
        }

        const motivationData = {
          goal_id: goal.id,
          motivation_text: motivation.motivation_text.trim(),
          obstacles: motivation.obstacles || [],
          updated_at: new Date().toISOString()
        };

        if (motivation.id) {
          // Update existing motivation
          console.log(`📝 Updating motivation for goal ${goal.id}`);
          const { error: updateError } = await supabase
            .from('motivations')
            .update(motivationData)
            .eq('id', motivation.id);

          if (updateError) {
            console.error(`❌ Error updating motivation for goal ${goal.id}:`, updateError);
            throw new Error(`Failed to update motivation for "${goal.title}": ${updateError.message}`);
          }
        } else {
          // Create new motivation
          console.log(`➕ Creating motivation for goal ${goal.id}`);
          const { data: insertData, error: insertError } = await supabase
            .from('motivations')
            .insert({
              ...motivationData,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error(`❌ Error creating motivation for goal ${goal.id}:`, insertError);
            throw new Error(`Failed to create motivation for "${goal.title}": ${insertError.message}`);
          }

          // Update local state with the new ID
          if (insertData) {
            setMotivations(prev => ({
              ...prev,
              [goal.id]: {
                ...prev[goal.id],
                id: insertData.id
              }
            }));
          }
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

  const handleNext = () => {
    // Validate that all goals have motivations
    const goalsWithoutMotivations = goals.filter(goal => 
      !motivations[goal.id]?.motivation_text?.trim()
    );

    if (goalsWithoutMotivations.length > 0) {
      setError(`Please add motivations for: ${goalsWithoutMotivations.map(g => g.title).join(', ')}`);
      return;
    }

    // Save motivations before proceeding
    saveMotivations().then(() => {
      dispatch({ type: 'NEXT_STEP' });
      navigate('/onboarding/user-obstacles');
    }).catch((error) => {
      console.error('❌ Error saving motivations before proceeding:', error);
      setError('Failed to save motivations. Please try again.');
    });
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-goals');
  };

  // Group goals by category
  const goalsByCategory = goals.reduce((acc, goal) => {
    const category = goal.category_name;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(goal);
    return acc;
  }, {} as Record<string, Goal[]>);

  const isValidMotivations = () => {
    return goals.every(goal => motivations[goal.id]?.motivation_text?.trim());
  };

  if (isLoading) {
    return null; // Let the main loading screen handle this
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main content */}
      <div className="onboarding-content container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">What Motivates You?</h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            Tell us what drives you to achieve each of your goals. This helps your future self provide personalized motivation.
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

        {/* Goals by Category */}
        <div className="space-y-8">
          {Object.entries(goalsByCategory).map(([categoryName, categoryGoals]) => (
            <div key={categoryName} className="card">
              <h3 className="text-xl font-semibold mb-6 font-heading text-primary-aqua">
                {categoryName}
              </h3>
              
              <div className="space-y-6">
                {categoryGoals.map((goal) => (
                  <div key={goal.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h4 className="text-lg font-semibold mb-4 font-heading text-white">
                      {goal.title}
                    </h4>
                    
                    {/* Motivation Text Area */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                        What motivates you to achieve this goal?
                      </label>
                      <textarea
                        value={motivations[goal.id]?.motivation_text || ''}
                        onChange={(e) => handleMotivationChange(goal.id, e.target.value)}
                        placeholder="Describe what drives you to achieve this goal..."
                        className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg resize-none font-body"
                        rows={3}
                        required
                      />
                    </div>

                    {/* Obstacles Section */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
                        What obstacles might you face?
                      </label>
                      
                      {/* Existing Obstacles */}
                      {motivations[goal.id]?.obstacles && motivations[goal.id].obstacles.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {motivations[goal.id].obstacles.map((obstacle, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                              <span className="flex-1 text-white text-sm font-body">{obstacle}</span>
                              <button
                                onClick={() => handleRemoveObstacle(goal.id, index)}
                                className="text-red-400 hover:text-red-300 transition-colors p-1"
                                type="button"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Obstacle Input - Fixed: Each goal has its own input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={obstacleInputs[goal.id] || ''}
                          onChange={(e) => handleObstacleInputChange(goal.id, e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddObstacle(goal.id);
                            }
                          }}
                          placeholder="Add an obstacle..."
                          className="flex-1 bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-sm font-body"
                        />
                        <button
                          onClick={() => handleAddObstacle(goal.id)}
                          disabled={!obstacleInputs[goal.id]?.trim()}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            obstacleInputs[goal.id]?.trim()
                              ? 'bg-primary-aqua text-white hover:bg-primary-aqua/80'
                              : 'bg-white/10 text-white/40 cursor-not-allowed'
                          }`}
                          type="button"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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