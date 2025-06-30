import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth, useClerk } from '@clerk/clerk-react';
import { Target, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';
import GoalMotivationSection from '../../components/onboarding/GoalMotivationSection';

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

const UserObstacles = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [motivations, setMotivations] = useState<Motivation[]>([]);
  const [obstacleInputs, setObstacleInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

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
      if (!user?.id || hasLoadedData) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading goals and motivations for user:', user.id);
        
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          setError('Authentication failed. Please refresh and try again.');
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);
        
        // Load goals with categories
        console.log('📊 Fetching goals from database...');
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select(`
            id,
            title,
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
          setError('No goals found. Please go back and set up your goals first.');
          return;
        }

        // Transform goals data
        const transformedGoals: Goal[] = goalsData.map(goal => ({
          id: goal.id,
          title: goal.title,
          category_name: goal.categories?.name || 'Unknown'
        }));

        console.log('✅ Goals loaded successfully:', {
          count: transformedGoals.length,
          goals: transformedGoals.map(g => ({ id: g.id, title: g.title }))
        });

        setGoals(transformedGoals);

        // Initialize obstacle inputs for each goal
        const initialInputs: Record<string, string> = {};
        transformedGoals.forEach(goal => {
          initialInputs[goal.id] = '';
        });
        setObstacleInputs(initialInputs);

        // Load existing motivations
        console.log('📊 Fetching motivations from database...');
        const goalIds = transformedGoals.map(g => g.id);
        const { data: motivationsData, error: motivationsError } = await supabase
          .from('motivations')
          .select('*')
          .in('goal_id', goalIds)
          .order('created_at', { ascending: true });

        if (motivationsError) {
          console.error('❌ Error loading motivations:', motivationsError);
          setError(`Failed to load motivations: ${motivationsError.message}`);
          return;
        }

        console.log('✅ Motivations loaded successfully:', {
          count: motivationsData?.length || 0,
          motivations: motivationsData?.map(m => ({ 
            id: m.id, 
            goal_id: m.goal_id, 
            hasText: !!m.motivation_text,
            obstaclesCount: m.obstacles?.length || 0 
          })) || []
        });

        setMotivations(motivationsData || []);
        setHasLoadedData(true);

      } catch (error) {
        console.error('❌ Error loading goals and motivations:', error);
        setError('Failed to load data. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadGoalsAndMotivations();
  }, [user?.id, getToken, hasLoadedData]);

  const handleMotivationChange = async (goalId: string, motivationText: string) => {
    console.log('📝 Motivation text changed for goal:', goalId, 'New text:', motivationText);
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Find existing motivation for this goal
      const existingMotivation = motivations.find(m => m.goal_id === goalId);
      
      if (existingMotivation) {
        // Update existing motivation
        console.log('📝 Updating existing motivation for goal:', goalId);
        const { data, error } = await supabase
          .from('motivations')
          .update({
            motivation_text: motivationText,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMotivation.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating motivation:', error);
          throw error;
        }

        // Update local state
        setMotivations(prev => prev.map(m => 
          m.id === existingMotivation.id 
            ? { ...m, motivation_text: motivationText }
            : m
        ));

        console.log('✅ Motivation updated successfully');
      } else {
        // Create new motivation
        console.log('📝 Creating new motivation for goal:', goalId);
        const { data, error } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            motivation_text: motivationText,
            obstacles: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating motivation:', error);
          throw error;
        }

        // Add to local state
        setMotivations(prev => [...prev, data]);
        console.log('✅ Motivation created successfully');
      }

    } catch (error) {
      console.error('❌ Error saving motivation:', error);
      setError('Failed to save motivation. Please try again.');
    }
  };

  const handleObstacleInputChange = (goalId: string, value: string) => {
    console.log(`📝 Obstacle input changed for goal ${goalId}:`, {
      oldValue: obstacleInputs[goalId] || '',
      newValue: value,
      timestamp: new Date().toISOString()
    });
    
    setObstacleInputs(prev => ({
      ...prev,
      [goalId]: value
    }));
  };

  const handleAddObstacle = async (goalId: string) => {
    const obstacleText = obstacleInputs[goalId]?.trim();
    
    if (!obstacleText) {
      console.log('⚠️ Cannot add empty obstacle for goal:', goalId);
      return;
    }

    console.log(`➕ Adding obstacle for goal ${goalId}:`, obstacleText);

    try {
      setIsSaving(true);
      setError(null);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Find existing motivation for this goal
      let motivation = motivations.find(m => m.goal_id === goalId);
      
      if (motivation) {
        // Update existing motivation with new obstacle
        const updatedObstacles = [...(motivation.obstacles || []), obstacleText];
        
        console.log('📝 Updating existing motivation with new obstacle for goal:', goalId);
        const { data, error } = await supabase
          .from('motivations')
          .update({
            obstacles: updatedObstacles,
            updated_at: new Date().toISOString()
          })
          .eq('id', motivation.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Error updating motivation with obstacle:', error);
          throw error;
        }

        // Update local state
        setMotivations(prev => prev.map(m => 
          m.id === motivation!.id 
            ? { ...m, obstacles: updatedObstacles }
            : m
        ));

        console.log('✅ Obstacle added to existing motivation successfully');
      } else {
        // Create new motivation with obstacle
        console.log('📝 Creating new motivation with obstacle for goal:', goalId);
        const { data, error } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            motivation_text: '',
            obstacles: [obstacleText],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating motivation with obstacle:', error);
          throw error;
        }

        // Add to local state
        setMotivations(prev => [...prev, data]);
        console.log('✅ New motivation with obstacle created successfully');
      }

      // Clear the input for this specific goal
      setObstacleInputs(prev => ({
        ...prev,
        [goalId]: ''
      }));

      console.log(`✅ Obstacles saved for goal: ${goalId}`);

    } catch (error) {
      console.error('❌ Error saving obstacle:', error);
      setError('Failed to save obstacle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveObstacle = async (goalId: string, obstacleIndex: number) => {
    console.log(`🗑️ Removing obstacle at index ${obstacleIndex} for goal ${goalId}`);

    try {
      setIsSaving(true);
      setError(null);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      
      // Find existing motivation for this goal
      const motivation = motivations.find(m => m.goal_id === goalId);
      
      if (!motivation || !motivation.obstacles) {
        console.log('⚠️ No motivation or obstacles found for goal:', goalId);
        return;
      }

      // Remove obstacle at specified index
      const updatedObstacles = motivation.obstacles.filter((_, index) => index !== obstacleIndex);
      
      console.log('📝 Updating motivation with removed obstacle for goal:', goalId);
      const { data, error } = await supabase
        .from('motivations')
        .update({
          obstacles: updatedObstacles,
          updated_at: new Date().toISOString()
        })
        .eq('id', motivation.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating motivation after removing obstacle:', error);
        throw error;
      }

      // Update local state
      setMotivations(prev => prev.map(m => 
        m.id === motivation.id 
          ? { ...m, obstacles: updatedObstacles }
          : m
      ));

      console.log('✅ Obstacle removed successfully');

    } catch (error) {
      console.error('❌ Error removing obstacle:', error);
      setError('Failed to remove obstacle. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    // Check if all goals have at least one obstacle
    const allGoalsHaveObstacles = goals.every(goal => {
      const motivation = motivations.find(m => m.goal_id === goal.id);
      return motivation && motivation.obstacles && motivation.obstacles.length > 0;
    });

    if (!allGoalsHaveObstacles) {
      setError('Please add at least one obstacle for each goal before continuing.');
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-commitments');
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-motivation');
  };

  const isValidToProgress = () => {
    return goals.every(goal => {
      const motivation = motivations.find(m => m.goal_id === goal.id);
      return motivation && motivation.obstacles && motivation.obstacles.length > 0;
    });
  };

  if (isLoading) {
    return (
      <div className="onboarding-container">
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
            <Target className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">Identify Your Obstacles</h1>
          </div>
          <p className="text-text-secondary text-lg leading-relaxed font-body">
            What challenges might you face on your journey? Identifying obstacles helps your future self provide better guidance.
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

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="space-y-6 mb-16">
            {goals.map((goal) => {
              const motivation = motivations.find(m => m.goal_id === goal.id);
              const obstacleInput = obstacleInputs[goal.id] || '';
              
              return (
                <GoalMotivationSection
                  key={goal.id}
                  goal={goal}
                  motivation={motivation}
                  obstacleInput={obstacleInput}
                  onMotivationChange={(value) => handleMotivationChange(goal.id, value)}
                  onObstacleInputChange={(value) => handleObstacleInputChange(goal.id, value)}
                  onAddObstacle={() => handleAddObstacle(goal.id)}
                  onRemoveObstacle={(index) => handleRemoveObstacle(goal.id, index)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60 font-body">
              No goals found. Please go back and set up your goals first.
            </p>
          </div>
        )}

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
              isValidToProgress() && !isSaving
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!isValidToProgress() || isSaving}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserObstacles;