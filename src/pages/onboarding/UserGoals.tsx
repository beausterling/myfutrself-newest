import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { ClipboardList, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import CategoryTab from '../../components/onboarding/CategoryTab';
import GoalCategorySection from '../../components/onboarding/GoalCategorySection';

const goalSuggestions = {
  'side-project': [
    'Launch my first MVP within 3 months',
    'Build a portfolio website',
    'Learn a new programming language',
    'Create a mobile app',
    'Start a tech blog',
    'Contribute to open source projects',
    'Build an e-commerce website'
  ],
  'relationships': [
    'Have weekly date nights with my partner',
    'Call family members more regularly',
    'Make 3 new meaningful friendships',
    'Improve communication skills',
    'Join a social club or group',
    'Practice active listening',
    'Express gratitude more often'
  ],
  'exercise': [
    'Work out 4 times per week',
    'Run a 5K race',
    'Increase my strength by 25%',
    'Try a new fitness class',
    'Walk 10,000 steps daily',
    'Learn a new sport',
    'Improve flexibility with yoga'
  ],
  'nutrition': [
    'Meal prep every Sunday',
    'Drink 8 glasses of water daily',
    'Eat 5 servings of vegetables per day',
    'Cook at home 5 days a week',
    'Reduce sugar intake',
    'Try new healthy recipes',
    'Eat mindfully without distractions'
  ],
  'finances': [
    'Save $10,000 for emergency fund',
    'Increase income by 20%',
    'Pay off credit card debt',
    'Create a monthly budget',
    'Start investing in index funds',
    'Track all expenses',
    'Build a retirement fund'
  ],
  'mental-fitness': [
    'Meditate for 10 minutes daily',
    'Read 2 books per month',
    'Practice gratitude journaling',
    'Learn stress management techniques',
    'Practice mindfulness throughout the day',
    'Develop a morning routine',
    'Limit social media usage'
  ],
  'sleep': [
    'Get 8 hours of sleep nightly',
    'Create a consistent bedtime routine',
    'Avoid screens 1 hour before bed',
    'Keep bedroom cool and dark',
    'Wake up at the same time daily',
    'Limit caffeine after 2 PM',
    'Use relaxation techniques before bed'
  ]
};

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

// Helper function to get category icon data
const getCategoryIcon = (categoryName: string, isCustom: boolean) => {
  if (isCustom) {
    return categoryIcons['custom'];
  }
  
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return categoryIcons[normalizedName as keyof typeof categoryIcons] || categoryIcons['custom'];
};

// Helper function to get category suggestions
const getCategorySuggestions = (categoryName: string, isCustom: boolean) => {
  if (isCustom) {
    return [
      "Create a personal project in this area",
      "Learn new skills related to this interest",
      "Set a specific achievement target",
      "Build a habit around this activity",
      "Connect with others who share this interest",
      "Track progress weekly",
      "Dedicate specific time blocks to this goal"
    ];
  }
  
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return goalSuggestions[normalizedName as keyof typeof goalSuggestions] || goalSuggestions['side-project'];
};

const UserGoals = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { state, dispatch } = useOnboarding();
  const [newGoals, setNewGoals] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string, name: string, is_custom: boolean}>>([]);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const handleGoalToggle = useCallback(async (category: string, goal: string) => {
    if (!user?.id) return;

    try {
      const currentGoals = state.goals[category] || [];
      const isSelected = currentGoals.includes(goal);
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const categoryData = availableCategories.find(cat => {
        return cat.name.toLowerCase() === category.toLowerCase();
      });

      if (!categoryData) {
        throw new Error(`Category not found: ${category}`);
      }

      let updatedGoals;
      if (isSelected) {
        const { error: deleteError } = await supabase
          .from('goals')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryData.id)
          .eq('title', goal);

        if (deleteError) {
          console.error('❌ Error deleting goal:', deleteError);
          throw new Error(`Failed to remove goal: ${deleteError.message}`);
        }

        updatedGoals = currentGoals.filter(g => g !== goal);
        console.log('🗑️ Goal removed:', goal);
      } else {
        const { error: insertError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            category_id: categoryData.id,
            title: goal
          });

        if (insertError) {
          console.error('❌ Error inserting goal:', insertError);
          throw new Error(`Failed to add goal: ${insertError.message}`);
        }

        updatedGoals = [...currentGoals, goal];
        console.log('✅ Goal added:', goal);
      }
      
      dispatch({
        type: 'SET_GOALS',
        payload: {
          ...state.goals,
          [category]: updatedGoals
        }
      });
    } catch (error) {
      console.error('❌ Error toggling goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to update goal');
    }
  }, [user?.id, getToken, state.goals, availableCategories, dispatch]);

  const handleAddCustomGoal = useCallback(async (category: string) => {
    if (!user?.id) return;

    const customGoal = newGoals[category]?.trim();
    if (!customGoal) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const categoryData = availableCategories.find(cat => {
        return cat.name.toLowerCase() === category.toLowerCase();
      });

      if (!categoryData) {
        throw new Error(`Category not found: ${category}`);
      }

      const { error: insertError } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          category_id: categoryData.id,
          title: customGoal
        });

      if (insertError) {
        console.error('❌ Error inserting custom goal:', insertError);
        throw new Error(`Failed to add custom goal: ${insertError.message}`);
      }

      const currentGoals = state.goals[category] || [];
      dispatch({
        type: 'SET_GOALS',
        payload: {
          ...state.goals,
          [category]: [...currentGoals, customGoal]
        }
      });
      setNewGoals(prev => ({ ...prev, [category]: '' }));
      console.log('✅ Custom goal added:', customGoal);
    } catch (error) {
      console.error('❌ Error adding custom goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to add custom goal');
    }
  }, [user?.id, getToken, state.goals, availableCategories, dispatch, newGoals]);

  const handleSuggestionClick = useCallback(async (categoryKey: string, suggestion: string) => {
    console.log('💡 Goal suggestion selected for category:', categoryKey);
    const currentGoals = state.goals[categoryKey] || [];
    if (!currentGoals.includes(suggestion)) {
      await handleGoalToggle(categoryKey, suggestion);
    }
    setShowSuggestions(prev => ({ ...prev, [categoryKey]: false }));
  }, [state.goals, handleGoalToggle]);

  const handleToggleSuggestions = useCallback((categoryKey: string) => {
    setShowSuggestions(prev => ({ ...prev, [categoryKey]: !prev[categoryKey] }));
  }, []);

  const handleNewGoalChange = useCallback((categoryKey: string, value: string) => {
    setNewGoals(prev => ({ ...prev, [categoryKey]: value }));
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
    const loadData = async () => {
      if (!user?.id || hasLoadedFromDB) {
        console.log('❌ Skipping goals load:', { 
          userId: user?.id ? 'present' : 'missing',
          hasLoadedFromDB 
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading data for UserGoals...');

        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        const supabase = createAuthenticatedSupabaseClient(token);

        console.log('📊 Fetching user selected categories...');
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
          throw new Error(`Failed to load selected categories: ${selectionsError.message}`);
        }

        console.log('✅ User selected categories:', userSelections);

        if (!userSelections || userSelections.length === 0) {
          console.log('ℹ️ No categories selected yet');
          setIsLoading(false);
          return;
        }

        const categoriesArray = userSelections.map(selection => selection.categories).filter(Boolean);
        categoriesArray.sort((a, b) => a.name.localeCompare(b.name));
        setAvailableCategories(categoriesArray);

        const categoryIds = categoriesArray.map(cat => cat.id);
        console.log('📊 Fetching existing goals for categories:', categoryIds);
        
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
            )
          `)
          .eq('user_id', user.id)
          .in('category_id', categoryIds);

        if (goalsError) {
          console.error('❌ Error loading goals:', goalsError);
        }

        console.log('✅ Existing goals loaded:', userGoals);

        const goalsByCategory: Record<string, string[]> = {};
        const selectedCategoryNames: string[] = [];

        categoriesArray.forEach(category => {
          const categoryKey = category.name.toLowerCase();
          if (!selectedCategoryNames.includes(categoryKey)) {
            selectedCategoryNames.push(categoryKey);
          }
          
          const categoryGoals = userGoals?.filter(goal => goal.category_id === category.id) || [];
          const goalTitles = categoryGoals.map(goal => goal.title);
          
          goalsByCategory[categoryKey] = goalTitles;
        });

        console.log('✅ Goals by category:', goalsByCategory);
        console.log('✅ Selected category names:', selectedCategoryNames);

        dispatch({ type: 'SET_CATEGORIES', payload: selectedCategoryNames });
        dispatch({ type: 'SET_GOALS', payload: goalsByCategory });

        setHasLoadedFromDB(true);

      } catch (error) {
        console.error('❌ Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id, getToken, dispatch, hasLoadedFromDB]);

  const handleNext = async () => {
    const hasGoalsPerCategory = availableCategories.every(category => {
      const categoryKey = category.name.toLowerCase();
      const categoryGoalsList = state.goals[categoryKey] || [];
      return categoryGoalsList.length > 0;
    });
    
    if (!hasGoalsPerCategory) {
      setError('Please select at least one goal for each category to continue.');
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-motivation');
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/pick-category');
  };

  const hasRequiredGoals = availableCategories.every(category => {
    const categoryKey = category.name.toLowerCase();
    const categoryGoalsList = state.goals[categoryKey] || [];
    return categoryGoalsList.length > 0;
  });

  const handleCategoryChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentCategoryIndex > 0) {
      setCurrentCategoryIndex(currentCategoryIndex - 1);
    } else if (direction === 'next' && currentCategoryIndex < availableCategories.length - 1) {
      setCurrentCategoryIndex(currentCategoryIndex + 1);
    }
  };

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
                    onClick={handleBack}
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
    <>
      <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
        <div className="onboarding-content container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-4 mb-4">
              <ClipboardList className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
              <h1 className="text-3xl md:text-4xl font-bold font-heading">Set Your Goals</h1>
            </div>
            <p className="text-text-secondary text-lg leading-relaxed font-body">
              What specific goals do you want to achieve? Choose from suggestions or create your own.
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

          {/* Category Tabs */}
          <div className="mb-8">
            <div className="flex justify-center gap-3 flex-wrap">
              {availableCategories.map((category, index) => (
                <CategoryTab
                  key={category.id}
                  category={category}
                  index={index}
                  currentCategoryIndex={currentCategoryIndex}
                  getCategoryIcon={getCategoryIcon}
                  setCurrentCategoryIndex={setCurrentCategoryIndex}
                />
              ))}
            </div>
          </div>

          {/* Category Content */}
          {availableCategories.map((category, index) => {
            const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
            const categoryIconData = getCategoryIcon(category.name, category.is_custom);
            const suggestions = getCategorySuggestions(category.name, category.is_custom);
            const currentGoals = state.goals[categoryKey] || [];
            const showSuggestionsForCategory = showSuggestions[categoryKey] || false;

            return (
              <div key={category.id} className={`${index === currentCategoryIndex ? 'block' : 'hidden'}`}>
                <GoalCategorySection
                  category={category}
                  categoryKey={categoryKey}
                  categoryIconData={categoryIconData}
                  suggestions={suggestions}
                  currentGoals={currentGoals}
                  showSuggestionsForCategory={showSuggestionsForCategory}
                  handleToggleSuggestions={handleToggleSuggestions}
                  handleSuggestionClick={handleSuggestionClick}
                  newGoals={newGoals}
                  handleNewGoalChange={handleNewGoalChange}
                  handleAddCustomGoal={handleAddCustomGoal}
                  handleGoalToggle={handleGoalToggle}
                />
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
              onClick={handleBack} 
              className="btn btn-outline text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading"
            >
              Back
            </button>
            
            <button
              onClick={handleNext}
              className={`text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading transition-all duration-300 rounded-xl border ${
                hasRequiredGoals
                  ? 'btn btn-primary'
                  : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
              }`}
              disabled={!hasRequiredGoals}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserGoals;