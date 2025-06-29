import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Calendar, Clock, AlertCircle, ChevronLeft, ChevronRight, Handshake } from 'lucide-react';
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

// Helper function - defined before usage in hooks
const getCategoryIcon = (categoryName: string, isCustom: boolean) => {
  if (isCustom) {
    return categoryIcons['custom'];
  }
  
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return categoryIcons[normalizedName as keyof typeof categoryIcons] || categoryIcons['custom'];
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

const frequencies = [
  'None, I will reach out on my own',
  'Daily',
  'Weekly', 
  'Bi-weekly',
  'Monthly',
  'Quarterly'
];

interface ExtendedCommitment {
  deadline?: string;
  deadlineNA?: boolean;
  frequency?: string;
  startDate?: string;
}

const getTodaysDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper function to check if a frequency selection is valid (not empty or default)
const isValidFrequency = (frequency: string | undefined): boolean => {
  return !!frequency && frequency !== '' && frequency !== 'Select routine' && frequency !== 'Select a routine';
};

const UserCommitments = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { state, dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Array<{id: string, name: string, is_custom: boolean}>>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [extendedCommitments, setExtendedCommitments] = useState<Record<string, ExtendedCommitment>>({});
  const activeCategoryRef = useRef<HTMLButtonElement>(null);
  const [preloadedCategoryData, setPreloadedCategoryData] = useState<Record<string, any>>({});
  const [goalIdMap, setGoalIdMap] = useState<Record<string, string>>({});

  const handleCommitmentChange = useCallback((goalKey: string, field: keyof ExtendedCommitment, value: string | boolean | string[]) => {
    console.log('✏️ Commitment changed for goal:', goalKey, 'Field:', field, 'Value:', value);
    
    let currentExtended = extendedCommitments[goalKey] || {};
    let updatedExtended = { ...currentExtended, [field]: value };
    
    if (field === 'deadlineNA' && value === true) {
      updatedExtended.deadline = undefined;
    } else if (field === 'deadline' && value) {
      updatedExtended.deadlineNA = false;
    } else if (field === 'frequency') {
      if (value === 'None, I will reach out on my own' || !value || value === 'Select a routine') {
        updatedExtended.startDate = undefined;
      } else {
        if (!updatedExtended.startDate) {
          updatedExtended.startDate = getTodaysDate();
          console.log('📅 Setting default start date to today:', updatedExtended.startDate);
        }
      }
    }
    
    setExtendedCommitments(prev => ({
      ...prev,
      [goalKey]: updatedExtended
    }));

    // Update the database immediately when commitment changes
    saveCommitmentToDatabase(goalKey, updatedExtended);
  }, [extendedCommitments, state.commitments, dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadExistingCommitments = async () => {
      if (!user?.id || hasLoadedFromDB) {
        console.log('❌ Skipping commitments load:', { 
          userId: user?.id ? 'present' : 'missing',
          hasLoadedFromDB 
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading existing commitments for user:', user.id);

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
            deadline,
            frequency,
            start_date,
            start_date,
            category_id,
            categories (
              id,
              name,
              is_custom
            )
          `)
          .eq('user_id', user.id)
          .in('category_id', categoryIds)
          .not('title', 'like', 'New % Goal');

        if (goalsError) {
          console.error('❌ Error loading goals with commitments:', goalsError);
          setError(`Failed to load existing commitments: ${goalsError.message}`);
          return;
        } else {
          console.log('✅ Successfully loaded goals:', userGoals?.length || 0);
        }

        console.log('✅ Goals with commitments loaded details:', userGoals);

        if (userGoals && userGoals.length > 0) {
          const uniqueCategories = new Map();
          userGoals.forEach(goal => {
            if (goal.categories) {
              uniqueCategories.set(goal.categories.id, goal.categories);
            }
          });

          const categoriesArray = Array.from(uniqueCategories.values());
          setAvailableCategories(categoriesArray);

          const goalsByCategory: Record<string, string[]> = {};
          const goalIdMapping: Record<string, string> = {};

          userGoals.forEach((goal) => {
            const categoryName = goal.categories?.name?.toLowerCase();
            if (categoryName) {
              if (!goalsByCategory[categoryName]) {
                goalsByCategory[categoryName] = [];
              }
              goalsByCategory[categoryName].push(goal.title);
            }
          });

          Object.entries(goalsByCategory).forEach(([categoryName, goals]) => {
            goals.forEach((goal, index) => {
              const goalKey = `${categoryName}-${index}`;
              const goalObj = userGoals.find(g => g.title === goal && g.categories?.name?.toLowerCase() === categoryName);
              
              if (goalObj) {
                goalIdMapping[goalKey] = goalObj.id;
                
                // Load existing commitments from goal data
                if (goalObj.deadline || goalObj.frequency || goalObj.start_date) {
                  const extendedCommitment: ExtendedCommitment = {};
                  
                  if (goalObj.deadline) {
                    extendedCommitment.deadline = goalObj.deadline;
                    extendedCommitment.deadlineNA = false;
                  } else {
                    extendedCommitment.deadlineNA = true; // If no deadline, assume N/A is checked
                  }
                  
                  if (goalObj.frequency) {
                    extendedCommitment.frequency = goalObj.frequency;
                    if (goalObj.frequency !== 'None, I will reach out on my own') {
                      extendedCommitment.startDate = goalObj.start_date || getTodaysDate();
                    }
                  }
                  
                  console.log(`📊 Loaded commitment for goal "${goal}":`, extendedCommitment);
                  
                  setExtendedCommitments(prev => ({
                    ...prev,
                    [goalKey]: extendedCommitment
                  }));
                }
              }
            });
          });
          console.log('📋 Goals loaded from database:', goalsByCategory);
          console.log('📋 Goal ID mapping:', goalIdMapping); 
          console.log('📋 Extended commitments loaded:', extendedCommitments);
          
          const selectedCategoryNames = categoriesArray.map(cat => 
            cat.is_custom ? cat.name.toLowerCase() : cat.name.toLowerCase()
          );
          dispatch({ type: 'SET_CATEGORIES', payload: selectedCategoryNames });
          dispatch({ type: 'SET_GOALS', payload: goalsByCategory });
          setGoalIdMap(goalIdMapping);
        }

        setHasLoadedFromDB(true);

      } catch (error) {
        console.error('❌ Error loading commitments:', error);
        setError('Failed to load existing commitments. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingCommitments();
  }, [user?.id, getToken, dispatch, hasLoadedFromDB]);

  // Pre-process all category data once when available categories or goals change
  useEffect(() => {
    if (availableCategories.length > 0) {
      console.log('📊 Pre-processing commitments category data for smooth navigation');
      const processedData: Record<string, any> = {};
      
      availableCategories.forEach((category, index) => {
        const categoryKey = category.is_custom ? category.name.toLowerCase() : category.name.toLowerCase();
        const categoryIconData = getCategoryIcon(category.name, category.is_custom);
        const goals = state.goals[categoryKey] || [];
        
        processedData[index] = {
          category,
          categoryKey,
          categoryIconData,
          goals
        };
      });
      
      setPreloadedCategoryData(processedData);
      console.log('✅ Commitments category data pre-processed for', availableCategories.length, 'categories');
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

  const saveCommitmentToDatabase = async (goalKey: string, extendedCommitment: ExtendedCommitment) => {
    if (!user?.id) {
      console.warn('⚠️ No user ID available for saving commitment');
      return;
    }

    try {
      console.log('💾 Saving commitment to database for goal:', goalKey);
      console.log('📊 Extended commitment data:', extendedCommitment);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);
      const goalId = goalIdMap[goalKey];
      
      if (!goalId) {
        console.warn(`⚠️ No goal ID found for key: ${goalKey}`);
        return;
      }

      // Prepare the update data
      const updateData: any = {};
      
      // Handle deadline
      if (extendedCommitment.deadlineNA) {
        updateData.deadline = null;
      } else if (extendedCommitment.deadline) {
        updateData.deadline = extendedCommitment.deadline;
      }
      
      // Handle frequency
      if (extendedCommitment.frequency === 'None, I will reach out on my own') {
        updateData.frequency = 'None, I will reach out on my own';
        updateData.start_date = null; // Clear start date if no routine
      } else if (extendedCommitment.frequency) {
        updateData.frequency = extendedCommitment.frequency;
        // Handle start date
        if (extendedCommitment.startDate) {
          updateData.start_date = extendedCommitment.startDate;
        }
      } else {
        // If no frequency is set, ensure we don't set it to null if deadline is also null
        // This would violate the goals_commitment_check constraint
        if (extendedCommitment.deadlineNA && !extendedCommitment.deadline) {
          // Both deadline and frequency would be null, which violates the constraint
          // Set a default frequency to satisfy the constraint
          updateData.frequency = 'None, I will reach out on my own';
          updateData.start_date = null;
        }
      }
      
      console.log('📝 Updating goal with data:', updateData);
      
      const { error: updateError } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalId);

      if (updateError) {
        console.error('❌ Error updating goal commitment:', updateError);
        setError(`Failed to save commitment: ${updateError.message}`);
        return;
      }

      console.log('✅ Commitment saved to database successfully for goal:', goalKey);
      
      // Update local state to reflect the saved data
      const basicCommitment = {
        deadline: extendedCommitment.deadlineNA ? undefined : extendedCommitment.deadline,
        frequency: extendedCommitment.frequency === 'None, I will reach out on my own' ? undefined : extendedCommitment.frequency,
      };

      dispatch({
        type: 'SET_COMMITMENTS',
        payload: {
          ...state.commitments,
          [goalKey]: basicCommitment
        }
      });
      
    } catch (error) {
      console.error('❌ Error saving commitment:', error);
      setError(`Failed to save commitment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    navigate('/onboarding/user-obstacles');
  };

  const handleStepContinue = async () => {
    if (!hasRequiredCommitments) {
      setError('Please set a target deadline (or select N/A) AND a check-in routine for each goal. If you select a frequency other than "None", you must also set a start date.');
      return;
    }

    // Save all commitments before proceeding
    try {
      setIsSaving(true);
      console.log('💾 Saving all commitments before proceeding...');
      
      for (const [goalKey, extendedCommitment] of Object.entries(extendedCommitments)) {
        if (extendedCommitment && (extendedCommitment.deadline || extendedCommitment.deadlineNA || extendedCommitment.frequency)) {
          await saveCommitmentToDatabase(goalKey, extendedCommitment);
        }
      }
      
      console.log('✅ All commitments saved successfully');
    } catch (error) {
      console.error('❌ Error saving commitments before proceeding:', error);
      setError('Failed to save commitments. Please try again.');
      return;
    } finally {
      setIsSaving(false);
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/call-prefs');
  };

  // Check if ALL goals have commitments (either deadline or frequency)
  const hasRequiredCommitments = useMemo(() => {
    return availableCategories.every(category => {
      const categoryKey = category.name.toLowerCase();
      const categoryGoals = state.goals[categoryKey] || [];
      
      return categoryGoals.every((goal, goalIndex) => {
        const goalKey = `${categoryKey}-${goalIndex}`;
        const commitment = extendedCommitments[goalKey] || {};
        // Check if deadline is set OR deadlineNA is checked
        const hasDeadlineInput = commitment.deadline || commitment.deadlineNA;
        
        // Check if frequency is set and it's a valid selection (not empty or "Select routine")
        const hasValidFrequency = commitment.frequency && 
                                 commitment.frequency !== '' && 
                                 commitment.frequency !== 'Select a routine';
        
        // If frequency requires a start date, check if it's set
        const needsStartDate = hasValidFrequency && 
                              commitment.frequency !== 'None, I will reach out on my own';
        const hasStartDateIfNeeded = !needsStartDate || (commitment.startDate && commitment.startDate.trim() !== '');
        
        // Goal is valid if it has BOTH deadline input AND (valid frequency AND start date if needed)
        const isValid = hasDeadlineInput && hasValidFrequency && hasStartDateIfNeeded;
        
        if (!isValid) {
          console.log(`❌ Goal ${goalKey} is not valid:`, {
            hasDeadlineInput,
            hasValidFrequency,
            needsStartDate,
            hasStartDateIfNeeded,
            frequency: commitment.frequency,
            startDate: commitment.startDate
          });
        }
        
        return isValid;
      });
    });
  }, [availableCategories, state.goals, extendedCommitments]);

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
            <Handshake className="w-8 h-8 md:w-10 md:h-10 text-primary-aqua" />
            <h1 className="text-3xl md:text-4xl font-bold font-heading">Set Commitments</h1>
          </div>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed font-body">
            When will you achieve these goals? Set deadlines and routines to check in on yourself.
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
              <p className="text-blue-400 font-medium font-heading">Saving your commitments...</p>
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
          
          const { category, categoryKey, categoryIconData, goals } = categoryData;

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
                  const currentCommitment = state.commitments[goalKey] || {};
                  const extendedCommitment = extendedCommitments[goalKey] || {};

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
                        <div className="flex items-start justify-between mb-6">
                          <p className="font-medium text-lg font-heading text-white pr-4">
                            {goal}
                          </p>
                        </div>
                        
                        {/* Deadline Section */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-white/80 mb-3 font-heading">
                            Target Deadline <span className="text-red-400">*</span>
                          </label>
                          
                          <div className="mb-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={extendedCommitment.deadlineNA || false}
                                onChange={(e) => handleCommitmentChange(goalKey, 'deadlineNA', e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary-aqua focus:ring-primary-aqua/50"
                                disabled={isSaving}
                              />
                              <span className="text-white/80 font-body">N/A - No specific deadline</span>
                            </label>
                          </div>

                          {!extendedCommitment.deadlineNA && (
                            <div className="relative">
                              <input
                                type="date"
                                value={extendedCommitment.deadline || currentCommitment.deadline || ''}
                                onChange={(e) => handleCommitmentChange(goalKey, 'deadline', e.target.value)}
                                className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body"
                                style={{ 
                                  focusRingColor: categoryIconData.color + '50'
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                disabled={isSaving}
                              />
                              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                            </div>
                          )}
                        </div>

                        {/* Start Date Section - Only show if frequency is selected and not "None" */}
                        {extendedCommitment.frequency && 
                         extendedCommitment.frequency !== 'None, I will reach out on my own' && (
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-white/80 mb-3 font-heading">
                              Start Date
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={extendedCommitment.startDate || ''}
                                onChange={(e) => handleCommitmentChange(goalKey, 'startDate', e.target.value)}
                                className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body"
                                style={{ 
                                  focusRingColor: categoryIconData.color + '50'
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                disabled={isSaving}
                              />
                              <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5 pointer-events-none" />
                            </div>
                            <p className="text-white/60 text-xs mt-2 font-body">
                              When would you like to start your {extendedCommitment.frequency.toLowerCase()} check-ins?
                            </p>
                          </div>
                        )}
                        {/* Check-in Routine Section */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-white/80 mb-3 font-heading">
                            Check-in Routine <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={extendedCommitment.frequency || currentCommitment.frequency || ''}
                              onChange={(e) => handleCommitmentChange(goalKey, 'frequency', e.target.value)}
                              className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body appearance-none"
                              style={{ 
                                focusRingColor: categoryIconData.color + '50'
                              }}
                              disabled={isSaving}
                            >
                              <option value="">Select a routine</option>
                              {frequencies.map(freq => (
                                <option key={freq} value={freq} className="bg-bg-primary text-white">
                                  {freq}
                                </option>
                              ))}
                            </select>
                            <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                          </div>
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
              hasRequiredCommitments
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={!hasRequiredCommitments}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserCommitments;