import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { AlertCircle, Lightbulb, KeyRound, Pencil, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
import FutureSelfRevealModal from '../../components/FutureSelfRevealModal';

// Helper functions - defined before usage in hooks
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
      "This goal is important to me because it aligns with my personal values",
      "Achieving this will help me become the person I want to be",
      "This goal represents growth in an area that matters to me",
      "I'm motivated by the positive impact this will have on my life",
      "This challenge will help me develop new skills and confidence"
    ];
  }
  
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return motivationSuggestions[normalizedName as keyof typeof motivationSuggestions] || motivationSuggestions['side-project'];
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

const motivationSuggestions = {
  'side-project': [
    "I want to turn my passion into a profitable business",
    "Building this will showcase my skills to potential employers",
    "I want to solve a problem that I personally face",
    "Creating something from scratch gives me a sense of accomplishment",
    "This project will help me learn new technologies and grow professionally"
  ],
  'relationships': [
    "Strong relationships are the foundation of a happy life",
    "I want to be more present and connected with the people I love",
    "Building deeper connections will improve my mental health",
    "I want to be the kind of friend/partner that others can rely on",
    "Investing in relationships now will pay dividends for years to come"
  ],
  'exercise': [
    "I want to feel strong, confident, and energetic every day",
    "Regular exercise will help me live a longer, healthier life",
    "I want to be a positive role model for my family",
    "Physical fitness improves my mental clarity and mood",
    "I want to prove to myself that I can stick to challenging commitments"
  ],
  'nutrition': [
    "Eating well gives me the energy to pursue my other goals",
    "I want to feel good in my own body and improve my self-confidence",
    "Good nutrition is an investment in my long-term health",
    "I want to break free from unhealthy eating patterns",
    "Proper nutrition helps me think more clearly and perform better"
  ],
  'finances': [
    "Financial security will give me freedom to pursue my dreams",
    "I want to reduce stress and anxiety about money",
    "Building wealth will allow me to help others and give back",
    "I want to set a good example for my children about money management",
    "Financial independence means I can take more risks in my career"
  ],
  'mental-fitness': [
    "A strong mind is the foundation for achieving all my other goals",
    "I want to develop resilience to handle life's challenges",
    "Mental fitness helps me stay focused and productive",
    "I want to break free from negative thought patterns",
    "Investing in my mental health improves all my relationships"
  ],
  'sleep': [
    "Quality sleep is essential for my physical and mental performance",
    "I want to wake up feeling refreshed and ready to tackle the day",
    "Good sleep habits will improve my mood and relationships",
    "Proper rest helps me make better decisions throughout the day",
    "Sleep is when my body and mind recover and grow stronger"
  ]
};

const UserMotivation = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { state, dispatch } = useOnboarding();
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
  
  // New state for edit/delete functionality
  const [editingMotivations, setEditingMotivations] = useState<Record<string, boolean>>({});
  
  // Future Self Modal state
  const [showFutureSelfModal, setShowFutureSelfModal] = useState(false);
  const [futurePhotoUrl, setFuturePhotoUrl] = useState<string | null>(null);

  const handleMotivationChange = useCallback((goalKey: string, value: string) => {
    console.log('✏️ Motivation changed for goal:', goalKey, 'Value length:', value.length);
    dispatch({
      type: 'SET_MOTIVATIONS',
      payload: { ...state.motivations, [goalKey]: value }
    });
  }, [state.motivations, dispatch]);

  const updateMotivationInDatabase = useCallback(async (goalKey: string, motivationText: string) => {
    if (!user?.id) {
      throw new Error('User authentication failed. Please try signing in again.');
    }

    const goalId = goalIdMap[goalKey];
    if (!goalId) {
      console.warn(`⚠️ No goal ID found for key: ${goalKey}`);
      return;
    }

    const token = await getToken({ template: 'supabase' });
    if (!token) {
      throw new Error('No authentication token available');
    }

    const supabase = createAuthenticatedSupabaseClient(token);

    const { data: existingMotivation, error: checkError } = await supabase
      .from('motivations')
      .select('id')
      .eq('goal_id', goalId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing motivation:', checkError);
      throw new Error(`Failed to check motivation: ${checkError.message}`);
    }

    if (motivationText.trim()) {
      // Save or update motivation
      if (existingMotivation) {
        const { error: updateError } = await supabase
          .from('motivations')
          .update({ motivation_text: motivationText.trim() })
          .eq('id', existingMotivation.id);

        if (updateError) {
          console.error('❌ Error updating motivation:', updateError);
          throw new Error(`Failed to update motivation: ${updateError.message}`);
        }

        console.log('✅ Motivation updated for goal:', goalKey);
      } else {
        const { error: insertError } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            motivation_text: motivationText.trim(),
            obstacles: []
          });

        if (insertError) {
          console.error('❌ Error inserting motivation:', insertError);
          throw new Error(`Failed to save motivation: ${insertError.message}`);
        }

        console.log('✅ Motivation created for goal:', goalKey);
      }
    } else {
      // Delete motivation if text is empty
      if (existingMotivation) {
        const { error: deleteError } = await supabase
          .from('motivations')
          .delete()
          .eq('id', existingMotivation.id);

        if (deleteError) {
          console.error('❌ Error deleting motivation:', deleteError);
          throw new Error(`Failed to delete motivation: ${deleteError.message}`);
        }

        console.log('✅ Motivation deleted for goal:', goalKey);
      }
    }
  }, [user?.id, getToken, goalIdMap]);

  const handleSaveMotivation = useCallback(async (goalKey: string) => {
    const motivationText = state.motivations[goalKey] || '';
    
    if (!motivationText.trim()) {
      setError('Please enter a motivation before saving.');
      return;
    }

    try {
      console.log('💾 Saving motivation for goal:', goalKey);
      await updateMotivationInDatabase(goalKey, motivationText);
      
      // Switch to display mode
      setEditingMotivations(prev => ({ ...prev, [goalKey]: false }));
      console.log('✅ Motivation saved and switched to display mode');
    } catch (error) {
      console.error('❌ Error saving motivation:', error);
      setError(error instanceof Error ? error.message : 'Failed to save motivation');
    }
  }, [state.motivations, updateMotivationInDatabase]);

  const handleEditMotivation = useCallback((goalKey: string) => {
    console.log('✏️ Editing motivation for goal:', goalKey);
    setEditingMotivations(prev => ({ ...prev, [goalKey]: true }));
  }, []);

  const handleDeleteMotivation = useCallback(async (goalKey: string) => {
    try {
      console.log('🗑️ Deleting motivation for goal:', goalKey);
      
      // Clear motivation text in state
      dispatch({
        type: 'SET_MOTIVATIONS',
        payload: { ...state.motivations, [goalKey]: '' }
      });

      // Delete from database
      await updateMotivationInDatabase(goalKey, '');
      
      // Switch to edit mode
      setEditingMotivations(prev => ({ ...prev, [goalKey]: true }));
      console.log('✅ Motivation deleted and switched to edit mode');
    } catch (error) {
      console.error('❌ Error deleting motivation:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete motivation');
    }
  }, [state.motivations, dispatch, updateMotivationInDatabase]);

  const handleSuggestionClick = useCallback((goalKey: string, suggestion: string) => {
    console.log('💡 Suggestion selected for goal:', goalKey);
    handleMotivationChange(goalKey, suggestion);
    setShowSuggestions(prev => ({ ...prev, [goalKey]: false }));
  }, [handleMotivationChange]);

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
    const loadExistingMotivations = async () => {
      if (!user?.id || hasLoadedFromDB) {
        console.log('❌ Skipping motivation load:', { 
          userId: user?.id ? 'present' : 'missing',
          hasLoadedFromDB 
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading existing motivations for user:', user.id);

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
              motivation_text
            )
          `)
          .eq('user_id', user.id)
          .in('category_id', categoryIds);

        if (goalsError) {
          console.error('❌ Error loading goals with motivations:', goalsError);
          setError(`Failed to load existing motivations: ${goalsError.message}`);
          return;
        }

        console.log('✅ Goals with motivations loaded:', userGoals);

        if (userGoals && userGoals.length > 0) {
          const goalsByCategory: Record<string, string[]> = {};
          const motivationsFromDB: Record<string, string> = {};
          const goalIdMapping: Record<string, string> = {};
          const editingState: Record<string, boolean> = {};

          categoriesArray.forEach(category => {
            const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
            const categoryGoals = userGoals.filter(goal => goal.category_id === category.id);
            
            goalsByCategory[categoryKey] = categoryGoals.map(goal => goal.title);
            
            categoryGoals.forEach((goal, index) => {
              const goalKey = `${categoryKey}-${index}`;
              goalIdMapping[goalKey] = goal.id;
              
              const motivation = goal.motivations?.[0]?.motivation_text || '';
              if (motivation) {
                motivationsFromDB[goalKey] = motivation;
                editingState[goalKey] = false; // Display mode for existing motivations
              } else {
                editingState[goalKey] = true; // Edit mode for empty motivations
              }
            });
          });

          console.log('📋 Goals loaded from database:', goalsByCategory);
          console.log('📋 Motivations loaded from database:', motivationsFromDB);
          console.log('📋 Goal ID mapping:', goalIdMapping);
          console.log('📋 Initial editing state:', editingState);
          
          const selectedCategoryNames = categoriesArray.map(cat => 
            cat.is_custom ? 'custom' : cat.name.toLowerCase()
          );
          dispatch({ type: 'SET_CATEGORIES', payload: selectedCategoryNames });
          dispatch({ type: 'SET_GOALS', payload: goalsByCategory });
          dispatch({ type: 'SET_MOTIVATIONS', payload: motivationsFromDB });
          setGoalIdMap(goalIdMapping);
          setEditingMotivations(editingState);
        }

        setHasLoadedFromDB(true);

      } catch (error) {
        console.error('❌ Error loading motivations:', error);
        setError('Failed to load existing motivations. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingMotivations();
  }, [user?.id, getToken, dispatch, hasLoadedFromDB]);

  // Pre-process all category data once when available categories or goals change
  useEffect(() => {
    if (availableCategories.length > 0) {
      console.log('📊 Pre-processing motivation category data for smooth navigation');
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
      console.log('✅ Motivation category data pre-processed for', availableCategories.length, 'categories');
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

  const checkForFuturePhoto = async () => {
    if (!user?.id) return null;

    try {
      console.log('🔮 Checking for future photo URL...');
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        console.error('❌ No token available for future photo check');
        return null;
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('future_photo_url, onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Error checking for future photo:', error);
        return null;
      }

      console.log('📊 User profile data:', userProfile);

      if (userProfile?.future_photo_url && !userProfile?.onboarding_completed) {
        console.log('✅ Future photo URL found:', userProfile.future_photo_url);
        return userProfile.future_photo_url;
      }

      console.log('ℹ️ No future photo URL available or onboarding already completed');
      return null;
    } catch (error) {
      console.error('❌ Error checking for future photo:', error);
      return null;
    }
  };

  const saveMotivationsToDatabase = async () => {
    if (!user?.id) {
      console.error('❌ No user ID available for saving motivations');
      throw new Error('User authentication failed. Please try signing in again.');
    }

    try {
      setIsSaving(true);
      console.log('💾 Saving motivations to database...');
      console.log('📊 Current motivations state:', state.motivations);

      for (const [goalKey, motivationText] of Object.entries(state.motivations)) {
        if (motivationText?.trim()) {
          await updateMotivationInDatabase(goalKey, motivationText);
        }
      }

      console.log('✅ All motivations saved to database successfully');

    } catch (error) {
      console.error('❌ Error saving motivations:', error);
      setError(`Failed to save motivations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
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
    navigate('/onboarding/user-goals');
  };

  const handleStepContinue = async () => {
    // Check if all goals have motivations
    const allGoalsHaveMotivations = availableCategories.every(category => {
      const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
      const goals = state.goals[categoryKey] || [];
      
      return goals.every((goal, goalIndex) => {
        const goalKey = `${categoryKey}-${goalIndex}`;
        const motivation = state.motivations[goalKey];
        return motivation && motivation.trim().length > 0;
      });
    });
    
    if (!allGoalsHaveMotivations) {
      setError('Please add a motivation for each goal to continue.');
      return;
    }

    // Check for future photo before proceeding
    const futurePhotoUrl = await checkForFuturePhoto();
    
    if (futurePhotoUrl) {
      console.log('🎭 Showing future self reveal modal');
      setFuturePhotoUrl(futurePhotoUrl);
      setShowFutureSelfModal(true);
    } else {
      console.log('➡️ No future photo available, proceeding to next step');
      dispatch({ type: 'NEXT_STEP' });
      navigate('/onboarding/user-obstacles');
    }
  };

  const handleModalClose = () => {
    console.log('❌ Future self modal closed');
    setShowFutureSelfModal(false);
    setFuturePhotoUrl(null);
  };

  const handleModalContinue = () => {
    console.log('➡️ Continuing from future self modal');
    setShowFutureSelfModal(false);
    setFuturePhotoUrl(null);
    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-obstacles');
  };

  // Check if all goals have motivations
  const hasRequiredMotivations = availableCategories.every(category => {
    const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
    const goals = state.goals[categoryKey] || [];
    
    return goals.every((goal, goalIndex) => {
      const goalKey = `${categoryKey}-${goalIndex}`;
      const motivation = state.motivations[goalKey];
      return motivation && motivation.trim().length > 0;
    });
  });

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
            <KeyRound className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">What Drives You?</h1>
          </div>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed font-body">
            Understanding your motivations will help you stay committed to your goals.
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
              <p className="text-blue-400 font-medium font-heading">Saving your motivations...</p>
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

              {/* Goals */}
              <div className="space-y-6">
                {goals.map((goal, goalIndex) => {
                  const goalKey = `${categoryKey}-${goalIndex}`;
                  const currentMotivation = state.motivations[goalKey] || '';
                  const showSuggestionsForGoal = showSuggestions[goalKey] || false;
                  const isEditing = editingMotivations[goalKey] ?? true;
                  const hasMotivation = currentMotivation.trim().length > 0;

                  return (
                    <div 
                      ref={currentCategoryIndex === index ? activeCategoryRef : null}
                      key={goalIndex} 
                      className="rounded-2xl border transition-all duration-300"
                      style={{ 
                        backgroundColor: categoryIconData.bgColor,
                        borderColor: categoryIconData.borderColor
                      }}
                    >
                      <div className="p-6">
                        {/* Goal Title */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <p className="font-medium text-lg font-heading text-white">
                              {goal}
                            </p>
                          </div>
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
                              💡 Motivation ideas:
                            </p>
                            <div className="space-y-2">
                              {suggestions.map((suggestion, suggestionIndex) => (
                                <button
                                  key={suggestionIndex}
                                  onClick={() => handleSuggestionClick(goalKey, suggestion)}
                                  className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm text-white/90 font-body"
                                >
                                  "{suggestion}"
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Motivation Input/Display */}
                        {isEditing ? (
                          <div className="relative">
                            <textarea
                              value={currentMotivation}
                              onChange={(e) => handleMotivationChange(goalKey, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveMotivation(goalKey);
                                }
                              }}
                              placeholder="What motivates you to achieve this goal? Why is it important to you? (Press Enter to save)"
                              className="w-full h-32 resize-none bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body placeholder-white/40 transition-all duration-300"
                              style={{ 
                                focusRingColor: categoryIconData.color + '50'
                              }}
                              disabled={isSaving}
                            />
                          </div>
                        ) : (
                          <div className="bg-white/5 border border-white/20 rounded-xl p-4">
                            <div className="flex items-start justify-between gap-4">
                              <p className="text-white font-body flex-1">
                                {currentMotivation}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => handleEditMotivation(goalKey)}
                                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                                  title="Edit motivation"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMotivation(goalKey)}
                                  className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 transition-colors text-white/70 hover:text-red-400"
                                  title="Delete motivation"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
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
              hasRequiredMotivations
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!hasRequiredMotivations}
          >
            Continue
          </button>
        </div>
      </div>

      {/* Future Self Reveal Modal */}
      {showFutureSelfModal && futurePhotoUrl && (
        <FutureSelfRevealModal
          futurePhotoUrl={futurePhotoUrl}
          onClose={handleModalClose}
          onContinue={handleModalContinue}
        />
      )}
    </div>
  );
};

export default UserMotivation;