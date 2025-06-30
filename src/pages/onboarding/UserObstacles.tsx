import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Plus, X, AlertCircle, Lightbulb, ChevronLeft, ChevronRight, GitPullRequestClosed } from 'lucide-react';
import { useMemo } from 'react';
import { 
  FaCode, 
  FaHeart, 
  FaDumbbell, 
  FaAppleAlt, 
  FaDollarSign, 
  FaBrain, 
  FaBed, 
  FaPlus 
} from 'react-icons/fa';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const categoryIcons = {
  'side-project': { icon: <FaCode />, color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' },
  'relationships': { icon: <FaHeart />, color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)' },
  'exercise': { icon: <FaDumbbell />, color: '#F97316', bgColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)' },
  'nutrition': { icon: <FaAppleAlt />, color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  'finances': { icon: <FaDollarSign />, color: '#059669', bgColor: 'rgba(5, 150, 105, 0.1)', borderColor: 'rgba(5, 150, 105, 0.3)' },
  'mental-fitness': { icon: <FaBrain />, color: '#8B5CF6', bgColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' },
  'sleep': { icon: <FaBed />, color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.3)' },
  'custom': { icon: <FaPlus />, color: '#6B7280', bgColor: 'rgba(107, 114, 128, 0.1)', borderColor: 'rgba(107, 114, 128, 0.3)' }
};

const obstacleSuggestions = {
  'side-project': [
    "Lack of time due to work commitments",
    "Not knowing where to start or feeling overwhelmed",
    "Perfectionism preventing me from launching",
    "Lack of technical skills or knowledge",
    "Fear of failure or criticism",
    "Procrastination and distractions",
    "Limited budget for tools and resources"
  ],
  'relationships': [
    "Busy schedules making it hard to connect",
    "Fear of vulnerability or opening up",
    "Past relationship trauma or trust issues",
    "Social anxiety or shyness",
    "Different communication styles causing misunderstandings",
    "Geographic distance from loved ones",
    "Prioritizing work over relationships"
  ],
  'exercise': [
    "Lack of time in my busy schedule",
    "Feeling self-conscious at the gym",
    "Not knowing proper form or routines",
    "Lack of motivation or energy",
    "Weather affecting outdoor activities",
    "Injuries or physical limitations",
    "Expensive gym memberships or equipment"
  ],
  'nutrition': [
    "Busy lifestyle leading to fast food choices",
    "Lack of cooking skills or knowledge",
    "Emotional eating or stress eating",
    "Social pressure to eat unhealthy foods",
    "Limited budget for healthy groceries",
    "Food cravings and lack of willpower",
    "Meal planning and prep taking too much time"
  ],
  'finances': [
    "Living paycheck to paycheck with no extra money",
    "Lack of financial education or knowledge",
    "Impulse spending and poor budgeting habits",
    "Unexpected expenses derailing progress",
    "Fear of investing or taking financial risks",
    "Debt payments consuming most of my income",
    "Lifestyle inflation as income increases"
  ],
  'mental-fitness': [
    "Busy schedule leaving no time for self-care",
    "Stigma around mental health or seeking help",
    "Negative thought patterns that are hard to break",
    "Stress from work or personal life",
    "Lack of knowledge about mental health practices",
    "Feeling like mental health isn't a priority",
    "Difficulty being consistent with practices"
  ],
  'sleep': [
    "Work stress keeping my mind racing at night",
    "Screen time and blue light exposure before bed",
    "Irregular work schedule or shift work",
    "Caffeine consumption too late in the day",
    "Noisy environment or uncomfortable sleeping conditions",
    "Anxiety or worry preventing relaxation",
    "Poor sleep habits and inconsistent bedtime routine"
  ]
};

const UserObstacles = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { state, dispatch } = useOnboarding();
  const [newObstacles, setNewObstacles] = useState<Record<string, string>>({});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string, name: string, is_custom: boolean}>>([]);
  const [goalIdMap, setGoalIdMap] = useState<Record<string, string>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const activeCategoryRef = useRef<HTMLButtonElement>(null);
  const [preloadedCategoryData, setPreloadedCategoryData] = useState<Record<string, any>>({});

  const handleAddObstacle = useCallback(async (goalKey: string, obstacle: string) => {
    if (!obstacle.trim() || !user?.id) return;

    try {
      console.log('➕ Adding obstacle for goal:', goalKey, 'Obstacle:', obstacle.trim());
      
      const currentObstacles = state.obstacles[goalKey] || [];
      const updatedObstacles = [...currentObstacles, obstacle.trim()];
      
      dispatch({
        type: 'SET_OBSTACLES',
        payload: {
          ...state.obstacles,
          [goalKey]: updatedObstacles
        }
      });

      await saveObstacleToDatabase(goalKey, updatedObstacles);
      
    } catch (error) {
      console.error('❌ Error adding obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to add obstacle');
      
      const currentObstacles = state.obstacles[goalKey] || [];
      dispatch({
        type: 'SET_OBSTACLES',
        payload: {
          ...state.obstacles,
          [goalKey]: currentObstacles
        }
      });
    }
  }, [user?.id, state.obstacles, dispatch]);

  const handleRemoveObstacle = useCallback(async (goalKey: string, index: number) => {
    if (!user?.id) return;

    try {
      console.log('🗑️ Removing obstacle for goal:', goalKey, 'Index:', index);
      
      const currentObstacles = state.obstacles[goalKey] || [];
      const updatedObstacles = [...currentObstacles];
      updatedObstacles.splice(index, 1);
      
      dispatch({
        type: 'SET_OBSTACLES',
        payload: { ...state.obstacles, [goalKey]: updatedObstacles }
      });

      await saveObstacleToDatabase(goalKey, updatedObstacles);
      
    } catch (error) {
      console.error('❌ Error removing obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove obstacle');
      
      const currentObstacles = state.obstacles[goalKey] || [];
      dispatch({
        type: 'SET_OBSTACLES',
        payload: { ...state.obstacles, [goalKey]: currentObstacles }
      });
    }
  }, [user?.id, state.obstacles, dispatch]);

  const handleSuggestionClick = useCallback(async (goalKey: string, suggestion: string) => {
    console.log('💡 Suggestion selected for goal:', goalKey);
    const currentObstacles = state.obstacles[goalKey] || [];
    if (!currentObstacles.includes(suggestion)) {
      try {
        const updatedObstacles = [...currentObstacles, suggestion];
        
        dispatch({
          type: 'SET_OBSTACLES',
          payload: {
            ...state.obstacles,
            [goalKey]: updatedObstacles
          }
        });

        await saveObstacleToDatabase(goalKey, updatedObstacles);
      } catch (error) {
        console.error('❌ Error adding suggestion:', error);
        setError(error instanceof Error ? error.message : 'Failed to add suggestion');
      }
    }
    setShowSuggestions(prev => ({ ...prev, [goalKey]: false }));
  }, [state.obstacles, dispatch]);

  const handleToggleSuggestions = useCallback((goalKey: string) => {
    setShowSuggestions(prev => ({ ...prev, [goalKey]: !prev[goalKey] }));
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadExistingObstacles = async () => {
      if (!user?.id || hasLoadedFromDB) {
        console.log('❌ Skipping obstacles load:', { 
          userId: user?.id ? 'present' : 'missing',
          hasLoadedFromDB 
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading existing obstacles for user:', user.id);

        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          setIsLoading(false);
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);

        const { data: userSelections, error: selectionsError } = await supabase
          .from('user_selected_categories')
          .select(`
            category_id,
            categories (
              id,
              name,
              is_custom
            )
          `)
          .eq('user_id', user.id);

        if (selectionsError) {
          console.error('❌ Error loading user selections:', selectionsError);
          setError(`Failed to load categories: ${selectionsError.message}`);
          return;
        }

        if (!userSelections || userSelections.length === 0) {
          console.log('ℹ️ No categories selected yet');
          setIsLoading(false);
          return;
        }

        const categoriesArray = userSelections.map(selection => selection.categories).filter(Boolean);
        categoriesArray.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableCategories(categoriesArray);

        const categoryIds = categoriesArray.map(cat => cat.id);
        const { data: userGoals, error: goalsError } = await supabase
          .from('goals')
          .select(`
            id,
            title,
            category_id,
            categories (
              id,
              name,
              is_custom
            ),
            motivations (
              id,
              obstacles
            )
          `)
          .eq('user_id', user.id)
          .in('category_id', categoryIds);

        if (goalsError) {
          console.error('❌ Error loading goals with obstacles:', goalsError);
          setError(`Failed to load existing obstacles: ${goalsError.message}`);
          return;
        }

        console.log('✅ Goals with obstacles loaded:', userGoals);

        if (userGoals && userGoals.length > 0) {
          const goalsByCategory: Record<string, string[]> = {};
          const obstaclesFromDB: Record<string, string[]> = {};
          const goalIdMapping: Record<string, string> = {};

          categoriesArray.forEach(category => {
            const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
            const categoryGoals = userGoals.filter(goal => goal.category_id === category.id);
            
            goalsByCategory[categoryKey] = categoryGoals.map(goal => goal.title);
            
            categoryGoals.forEach((goal, index) => {
              const goalKey = `${categoryKey}-${index}`;
              goalIdMapping[goalKey] = goal.id;
              
              const obstacles = goal.motivations?.[0]?.obstacles || [];
              if (obstacles.length > 0) {
                obstaclesFromDB[goalKey] = obstacles;
              }
            });
          });

          console.log('📋 Goals loaded from database:', goalsByCategory);
          console.log('📋 Obstacles loaded from database:', obstaclesFromDB);
          console.log('📋 Goal ID mapping:', goalIdMapping);
          
          const selectedCategoryNames = categoriesArray.map(cat => 
            cat.is_custom ? 'custom' : cat.name.toLowerCase()
          );
          dispatch({ type: 'SET_CATEGORIES', payload: selectedCategoryNames });
          dispatch({ type: 'SET_GOALS', payload: goalsByCategory });
          dispatch({ type: 'SET_OBSTACLES', payload: obstaclesFromDB });
          setGoalIdMap(goalIdMapping);
        }

        setHasLoadedFromDB(true);

      } catch (error) {
        console.error('❌ Error loading obstacles:', error);
        setError('Failed to load existing obstacles. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingObstacles();
  }, [user?.id, getToken, dispatch, hasLoadedFromDB]);

  // Pre-process all category data once when available categories or goals change
  useEffect(() => {
    if (availableCategories.length > 0) {
      console.log('📊 Pre-processing obstacles category data for smooth navigation');
      const processedData: Record<string, any> = {};
      
      availableCategories.forEach((category, index) => {
        const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
        const categoryIconData = getCategoryIcon(category.name, category.is_custom);
        const suggestions = getCategorySuggestions(category.name, category.is_custom);
        const goals = state.goals[categoryKey] || [];
        
        processedData[index] = {
          category,
          categoryKey,
          categoryIconData,
          suggestions,
          goals
        };
      });
      
      setPreloadedCategoryData(processedData);
      console.log('✅ Obstacles category data pre-processed for', availableCategories.length, 'categories');
    }
  }, [availableCategories, state.goals]);

  // Scroll active category into view when currentCategoryIndex changes
  useEffect(() => {
    if (activeCategoryRef.current) {
      activeCategoryRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [currentCategoryIndex]);

  const saveObstacleToDatabase = async (goalKey: string, obstacles: string[]) => {
    if (!user?.id) return;

    const token = await getToken({ template: 'supabase' });
    if (!token) {
      throw new Error('No authentication token available');
    }

    const supabase = createAuthenticatedSupabaseClient(token);
    const goalId = goalIdMap[goalKey];
    
    if (!goalId) {
      throw new Error(`No goal ID found for key: ${goalKey}`);
    }

    const { data: existingMotivation, error: checkError } = await supabase
      .from('motivations')
      .select('id')
      .eq('goal_id', goalId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Failed to check motivation: ${checkError.message}`);
    }

    if (existingMotivation) {
      const { error: updateError } = await supabase
        .from('motivations')
        .update({ obstacles })
        .eq('id', existingMotivation.id);

      if (updateError) {
        throw new Error(`Failed to update obstacles: ${updateError.message}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('motivations')
        .insert({
          goal_id: goalId,
          motivation_text: '',
          obstacles
        });

      if (insertError) {
        throw new Error(`Failed to save obstacles: ${insertError.message}`);
      }
    }

    console.log('✅ Obstacles saved for goal:', goalKey);
  };

  const getCategoryIcon = (categoryName: string, isCustom: boolean) => {
    if (isCustom) {
      return categoryIcons['custom'];
    }
    
    const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
    return categoryIcons[normalizedName as keyof typeof categoryIcons] || categoryIcons['custom'];
  };

  const getCategorySuggestions = (categoryName: string, isCustom: boolean) => {
    if (isCustom) {
      return [
        "Lack of time due to other commitments",
        "Not knowing where to start or how to begin",
        "Fear of failure or not being good enough",
        "Lack of motivation or consistency",
        "Limited resources or budget constraints",
        "Distractions and competing priorities",
        "Self-doubt and negative self-talk"
      ];
    }
    
    const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
    return obstacleSuggestions[normalizedName as keyof typeof obstacleSuggestions] || obstacleSuggestions['side-project'];
  };

  const saveAllObstaclesToDatabase = async () => {
    if (!user?.id) {
      console.error('❌ No user ID available for saving obstacles');
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      console.log('💾 Saving all obstacles to database...');

      for (const [goalKey, obstacles] of Object.entries(state.obstacles)) {
        if (obstacles && obstacles.length > 0) {
          await saveObstacleToDatabase(goalKey, obstacles);
        }
      }

      console.log('✅ All obstacles saved to database successfully');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCategoryChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    } else if (direction === 'next' && currentCategoryIndex < availableCategories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    }
  };

  const handleStepBack = async () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/user-motivation');
  };

  const handleStepContinue = async () => {
    if (!allGoalsHaveObstacles) {
      setError('Please add at least one obstacle for each goal to continue.');
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-commitments');
  };

  const hasRequiredObstacles = Object.values(state.obstacles).some(obstacles => obstacles?.length > 0);

  // Check if all goals have at least one obstacle
  const allGoalsHaveObstacles = useMemo(() => {
    return availableCategories.every(category => {
      const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
      const goals = state.goals[categoryKey] || [];
      
      return goals.every((goal, goalIndex) => {
        const goalKey = `${categoryKey}-${goalIndex}`;
        const obstacles = state.obstacles[goalKey] || [];
        return obstacles.length > 0;
      });
    });
  }, [availableCategories, state.goals, state.obstacles]);

  if (isLoading) {
    return null; // Let the main loading screen handle this
  }

  if (availableCategories.length === 0 && !isLoading) {
    return (
      <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="onboarding-content container mx-auto px-4 max-w-4xl">
          <div className="text-center">
            <div className="card bg-yellow-500/10 border-yellow-500/20">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-400 font-medium text-lg font-heading">No Categories Selected</p>
                  <p className="text-yellow-300 mt-2 font-body">
                    It looks like you haven't selected any categories yet. Please go back and choose your focus areas first.
                  </p>
                  <button
                    onClick={handleStepBack}
                    className="btn btn-outline text-yellow-400 border-yellow-400 hover:bg-yellow-400/10 mt-4 font-heading"
                  >
                    Go Back to Categories
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      <div className="onboarding-content container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <GitPullRequestClosed className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">Identify Obstacles</h1>
          </div>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed font-body">
            What might prevent you from achieving your goals? Identifying obstacles helps prepare for them.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
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

        {isSaving && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-400 font-medium font-heading">Saving your obstacles...</p>
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="mb-8">
          <div className="flex justify-center gap-3 flex-wrap">
            {availableCategories.map((category, index) => {
              const categoryIconData = getCategoryIcon(category.name, category.is_custom);
              const isSelected = currentCategoryIndex === index;

              return (
                <button
                  key={category.id}
                  onClick={() => setCurrentCategoryIndex(index)}
                  className={`flex items-center gap-2 rounded-full text-sm font-medium transition-all duration-300 font-heading select-none ${
                    isSelected
                      ? 'px-4 py-2 text-white shadow-lg'
                      : 'p-3 bg-white/10 text-white/70 hover:bg-white/20 hover:scale-110'
                  }`}
                  style={{
                    backgroundColor: isSelected ? categoryIconData.color : undefined
                  }}
                  title={category.name}
                >
                  <span className={isSelected ? 'text-base' : 'text-lg'}>
                    {categoryIconData.icon}
                  </span>
                  {isSelected && (
                    <>
                      {category.name}
                      {category.is_custom && <span className="text-xs opacity-75">(Custom)</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          
        </div>

        {/* Category Content */}
        {Object.keys(preloadedCategoryData).map((indexStr) => {
          const index = parseInt(indexStr);
          const categoryData = preloadedCategoryData[index];
          
          if (!categoryData) return null;
          
          const { category, categoryKey, categoryIconData, suggestions, goals } = categoryData;

          return (
            <div key={category.id} className={`space-y-6 ${index === currentCategoryIndex ? 'block' : 'hidden'}`}>
              {/* Category Header */}
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="text-2xl md:text-3xl"
                  style={{ color: categoryIconData.color }}
                >
                  {categoryIconData.icon}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold capitalize font-heading">
                    {category.name}
                  </h3>
                  {category.is_custom && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                      Custom Category
                    </span>
                  )}
                </div>
              </div>

              {/* Goals for Current Category */}
              <div className="space-y-6">
                {goals.map((goal, goalIndex) => {
                  const goalKey = `${categoryKey}-${goalIndex}`;
                  const currentObstacles = state.obstacles[goalKey] || [];
                  const showSuggestionsForGoal = showSuggestions[goalKey] || false;

                  return (
                    <div 
                      ref={currentCategoryIndex === index ? activeCategoryRef : null}
                      key={goalKey} 
                      className="rounded-2xl border transition-all duration-300"
                      style={{ 
                        backgroundColor: categoryIconData.bgColor,
                        borderColor: categoryIconData.borderColor
                      }}
                    >
                      <div className="p-6">
                        {/* Goal Title */}
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="font-medium text-lg font-heading text-white pr-4">
                            {goal}
                          </h3>
                          <button
                            onClick={() => handleToggleSuggestions(goalKey)}
                            className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors font-heading ${
                              category.is_custom ? 'text-white' : ''
                            }`}
                            style={{ 
                              color: category.is_custom ? 'white' : categoryIconData.color 
                            }}
                          >
                            <Lightbulb className="w-4 h-4" />
                            {showSuggestionsForGoal ? 'Hide' : 'Ideas'}
                          </button>
                        </div>

                        {/* Suggestions */}
                        {showSuggestionsForGoal && (
                          <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-sm font-medium text-white/80 mb-3 font-heading">
                              💡 Common obstacles:
                            </p>
                            <div className="space-y-2">
                              {suggestions.map((suggestion, suggestionIndex) => (
                                <button
                                  key={suggestionIndex}
                                  onClick={() => handleSuggestionClick(goalKey, suggestion)}
                                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/90 font-body"
                                  disabled={currentObstacles.includes(suggestion)}
                                >
                                  <span className={currentObstacles.includes(suggestion) ? 'opacity-50' : ''}>
                                    "{suggestion}"
                                    {currentObstacles.includes(suggestion) && ' ✓'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Obstacle Input */}
                        <div className="flex gap-3 mb-4">
                          <input
                            type="text" 
                            value={newObstacles[goalKey] || ''}
                            onChange={(e) => setNewObstacles(prev => ({
                              ...prev,
                              [goalKey]: e.target.value
                            }))}
                            placeholder={currentObstacles.length > 0 ? "Anything else?" : "What obstacles might you face?"}
                            className="flex-grow bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body placeholder-white/40"
                            style={{ 
                              focusRingColor: categoryIconData.color + '50'
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddObstacle(goalKey, newObstacles[goalKey] || '');
                                setNewObstacles(prev => ({ ...prev, [goalKey]: '' }));
                              }
                            }}
                            disabled={isSaving}
                          />
                          <button
                            onClick={() => {
                              handleAddObstacle(goalKey, newObstacles[goalKey] || '');
                              setNewObstacles(prev => ({ ...prev, [goalKey]: '' }));
                            }}
                            className="px-6 py-3 rounded-xl font-medium transition-colors font-heading"
                            style={{
                              backgroundColor: newObstacles[goalKey]?.trim() ? categoryIconData.color : 'rgba(255, 255, 255, 0.1)',
                              color: newObstacles[goalKey]?.trim() ? 'white' : 'rgba(255, 255, 255, 0.4)'
                            }}
                            disabled={!newObstacles[goalKey]?.trim() || isSaving}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Current Obstacles */}
                        <div className="space-y-3">
                          {currentObstacles.map((obstacle, obstacleIndex) => (
                            <div
                              key={obstacleIndex}
                              className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                            >
                              <span className="text-base font-body text-white">{obstacle}</span>
                              <button
                                onClick={() => handleRemoveObstacle(goalKey, obstacleIndex)}
                                className="text-white/40 hover:text-red-400 p-2 transition-colors"
                                disabled={isSaving}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Navigation Arrows - moved to bottom */}
        {availableCategories.length > 1 && (
          <div className="flex justify-center gap-4 mt-8 mb-8">
            <button
              onClick={() => handleCategoryChange('prev')}
              disabled={currentCategoryIndex === 0}
              className={`p-3 rounded-full bg-black/20 backdrop-blur-sm transition-all duration-300 ${
                currentCategoryIndex === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'opacity-100 hover:bg-black/30'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <span className="flex items-center px-4 py-2 bg-black/20 backdrop-blur-sm rounded-full text-white/70 text-sm font-body">
              {currentCategoryIndex + 1} of {availableCategories.length}
            </span>
            
            <button
              onClick={() => handleCategoryChange('next')}
              disabled={currentCategoryIndex === availableCategories.length - 1}
              className={`p-3 rounded-full bg-black/20 backdrop-blur-sm transition-all duration-300 ${
                currentCategoryIndex === availableCategories.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'opacity-100 hover:bg-black/30'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        <div className="mt-16 flex justify-between max-w-md mx-auto">
          <button 
            onClick={handleStepBack} 
            className="btn btn-outline text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading"
          >
            Back
          </button>
          
          <button
            onClick={handleStepContinue}
            className={`text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading transition-all duration-300 rounded-xl border ${
              allGoalsHaveObstacles
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!allGoalsHaveObstacles}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserObstacles;