import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useMemo, useCallback } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { motion } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
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
import { createAuthenticatedSupabaseClient } from '../../lib/supabase';

const defaultCategories = [
  {
    id: 'side-project',
    title: 'Side Project',
    description: 'Turn your ideas into reality',
    icon: <FaCode />,
    iconColor: '#3B82F6'
  },
  {
    id: 'relationships',
    title: 'Relationships',
    description: 'Strengthen your connections',
    icon: <FaHeart />,
    iconColor: '#EC4899'
  },
  {
    id: 'exercise',
    title: 'Exercise',
    description: 'Achieve your fitness goals',
    icon: <FaDumbbell />,
    iconColor: '#F97316'
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    description: 'Develop healthy eating habits',
    icon: <FaAppleAlt />,
    iconColor: '#EF4444'
  },
  {
    id: 'finances',
    title: 'Finances',
    description: 'Build your financial future',
    icon: <FaDollarSign />,
    iconColor: '#059669'
  },
  {
    id: 'mental-fitness',
    title: 'Mental Fitness',
    description: 'Strengthen your mind',
    icon: <FaBrain />,
    iconColor: '#8B5CF6'
  },
  {
    id: 'sleep',
    title: 'Sleep',
    description: 'Improve your rest quality',
    icon: <FaBed />,
    iconColor: '#6366F1'
  }
];

interface Category {
  id: string;
  name: string;
  is_custom: boolean;
}

interface CustomCategory {
  id: string;
  name: string;
}

const CategoryCard = ({ 
  id,
  title, 
  description, 
  icon, 
  iconColor, 
  isSelected, 
  onToggle,
  isCustom = false,
  onCustomInput,
  customValue = '',
  isEditing = false,
  onStartEditing,
  onCancelEditing
}: {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconColor: string;
  isSelected: boolean;
  onToggle: () => void;
  isCustom?: boolean;
  onCustomInput?: (categoryId: string, value: string) => void;
  customValue?: string;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
}) => {
  const [inputValue, setInputValue] = useState(customValue);

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleCustomClick = () => {
    if (isCustom && !isEditing) {
      if (!isSelected) {
        onToggle();
        onStartEditing?.();
      } else if (isSelected) {
        onStartEditing?.();
      }
    } else if (!isCustom) {
      onToggle();
    }
  };

  const handleInputSubmit = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && onCustomInput) {
      const capitalizedValue = capitalizeWords(trimmedValue);
      onCustomInput(id, capitalizedValue);
      setInputValue(capitalizedValue);
    }
    onCancelEditing?.();
  };

  const handleInputCancel = () => {
    if (customValue.trim()) {
      setInputValue(customValue);
    } else {
      onToggle();
      setInputValue('');
    }
    onCancelEditing?.();
  };

  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit();
    } else if (e.key === 'Escape') {
      handleInputCancel();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 30);
    setInputValue(value);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  useEffect(() => {
    setInputValue(customValue);
  }, [customValue]);

  return (
    <motion.div
      className="relative cursor-pointer"
      onClick={handleCustomClick}
      whileHover={{ scale: isEditing ? 1 : 1.05 }}
      whileTap={{ scale: isEditing ? 1 : 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col items-center text-center p-4">
        <div 
          className={`text-5xl md:text-6xl mb-3 transition-all duration-300 ${
            isSelected ? 'drop-shadow-lg' : ''
          }`}
          style={{ 
            color: isSelected ? iconColor : '#6B7280',
            filter: isSelected ? `drop-shadow(0 0 20px ${iconColor}80)` : 'none'
          }}
        >
          {icon}
        </div>
        
        {isCustom && isEditing ? (
          <div className="w-full max-w-[140px] space-y-3" onClick={handleInputClick}>
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyPress}
              placeholder="Category name..."
              className="w-full bg-white/10 text-white text-center rounded-lg px-2 py-2 text-sm border border-white/20 focus:outline-none focus:border-white/40"
              autoFocus
              maxLength={30}
            />
            
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleInputCancel}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={handleInputSubmit}
                disabled={!inputValue.trim()}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                  inputValue.trim()
                    ? 'bg-green-500/20 hover:bg-green-500/30'
                    : 'bg-gray-500/20 cursor-not-allowed'
                }`}
                title="Save"
              >
                <Check className={`w-4 h-4 ${
                  inputValue.trim() ? 'text-green-400' : 'text-gray-500'
                }`} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className={`text-base md:text-lg font-semibold mb-1 font-heading transition-all duration-300 ${
              isSelected ? 'text-white' : 'text-white/60'
            }`}>
              {isCustom && customValue ? customValue : title}
            </h3>
            <p className={`text-xs md:text-sm font-body leading-tight transition-all duration-300 ${
              isSelected ? 'text-white/90' : 'text-white/40'
            }`}>
              {isCustom && customValue ? 'Your custom category' : description}
            </p>
            
            {isCustom && isSelected && customValue && !isEditing && (
              <p className="text-xs text-white/30 mt-1 font-body">
                Tap to edit
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

const PickCategory = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { dispatch } = useOnboarding();
  const [isScrolled, setIsScrolled] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Memoize category selection checks to prevent unnecessary re-renders
  const categorySelectionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    selectedCategoryNames.forEach(name => {
      map.set(name.toLowerCase(), true);
    });
    return map;
  }, [selectedCategoryNames]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadCategoriesAndSelections = async () => {
      if (!user?.id) {
        console.log('❌ No user ID available, skipping category load');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        console.log('🔄 Loading categories and user selections for user:', user.id);

        const token = await getToken({ template: 'supabase' });
        if (!token) {
          console.error('❌ No Clerk token available');
          setError('Authentication failed. Please try signing in again.');
          setIsLoading(false);
          return;
        }

        const supabase = createAuthenticatedSupabaseClient(token);

        console.log('📊 Fetching all available categories...');
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, is_custom, user_id')
          .or(`is_custom.eq.false,and(is_custom.eq.true,user_id.eq.${user.id})`);

        if (categoriesError) {
          console.error('❌ Error loading categories:', categoriesError);
          throw new Error(`Failed to load categories: ${categoriesError.message}`);
        }

        console.log('✅ Categories loaded:', categoriesData?.length || 0);
        setAllCategories(categoriesData || []);

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
          console.log('ℹ️ No existing selections found, starting fresh');
        }

        console.log('✅ User selections loaded:', userSelections);

        const customCats: CustomCategory[] = [];
        const selectedIds = new Set<string>();
        const selectedNames: string[] = [];

        if (userSelections && userSelections.length > 0) {
          userSelections.forEach(selection => {
            if (selection.categories) {
              selectedIds.add(selection.categories.id);
              selectedNames.push(selection.categories.name);
              
              if (selection.categories.is_custom) {
                customCats.push({ 
                  name: selection.categories.name, 
                  id: selection.categories.id 
                });
              }
            }
          });
        }

        console.log('📋 Processed selections:', { 
          selectedNames, 
          customCategories: customCats,
          selectedIds: Array.from(selectedIds)
        });

        setSelectedCategoryIds(selectedIds);
        setCustomCategories(customCats);
        setSelectedCategoryNames(selectedNames);

      } catch (error) {
        console.error('❌ Error loading categories and selections:', error);
        setError('Failed to load categories. Please refresh and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCategoriesAndSelections();
  }, [user?.id, getToken]);

  const handleCategoryToggle = useCallback(async (categoryName: string) => {
    if (!user?.id) return;

    try {
      console.log('🎯 Category selected/deselected:', categoryName);
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const categoryData = allCategories.find(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (!categoryData) {
        console.error('❌ Category not found in loaded data:', categoryName);
        throw new Error(`Category "${categoryName}" not found in database`);
      }

      const isCurrentlySelected = selectedCategoryIds.has(categoryData.id);
      
      if (isCurrentlySelected) {
        console.log('🗑️ Deselecting category:', categoryData.name);
        
        const { error: deleteError } = await supabase
          .from('user_selected_categories')
          .delete()
          .eq('user_id', user.id)
          .eq('category_id', categoryData.id);

        if (deleteError) {
          console.error('❌ Error deselecting category:', deleteError);
          throw new Error(`Failed to deselect category: ${deleteError.message}`);
        }

        selectedCategoryIds.delete(categoryData.id);
        const updatedNames = selectedCategoryNames.filter(name => 
          name.toLowerCase() !== categoryName.toLowerCase()
        );
        setSelectedCategoryNames(updatedNames);
        
        if (categoryData.is_custom) {
          setCustomCategories(prev => prev.filter(cat => cat.id !== categoryData.id));
        }
        
      } else {
        console.log('✅ Selecting category:', categoryData.name);
        
        const { error: insertError } = await supabase
          .from('user_selected_categories')
          .insert({
            user_id: user.id,
            category_id: categoryData.id
          });

        if (insertError) {
          console.error('❌ Error selecting category:', insertError);
          throw new Error(`Failed to select category: ${insertError.message}`);
        }

        selectedCategoryIds.add(categoryData.id);
        const updatedNames = [...selectedCategoryNames, categoryData.name];
        setSelectedCategoryNames(updatedNames);
        
        if (categoryData.is_custom) {
          setCustomCategories(prev => [...prev, { name: categoryData.name, id: categoryData.id }]);
        }
      }
      
      setSelectedCategoryIds(new Set(selectedCategoryIds));
    } catch (error) {
      console.error('❌ Error handling category selection:', error);
      setError(error instanceof Error ? error.message : 'Failed to update category selection');
    }
  }, [user?.id, getToken, allCategories, selectedCategoryIds, selectedCategoryNames]);

  const handleCustomCategoryInput = useCallback(async (categoryId: string, value: string) => {
    if (!user?.id || !value.trim()) return;
    
    try {
      console.log('✏️ Custom category input:', { categoryId, value });
      
      const existingCustom = customCategories.find(cat => 
        cat.name.toLowerCase() === value.toLowerCase() && cat.id !== categoryId
      );
      
      if (existingCustom) {
        setError(`You already have a custom category named "${value}". Please choose a different name.`);
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const { error: updateError } = await supabase
        .from('categories')
        .update({ name: value })
        .eq('id', categoryId);

      if (updateError) {
        console.error('❌ Error updating custom category:', updateError);
        if (updateError.code === '23505') {
          setError(`A category named "${value}" already exists. Please choose a different name.`);
        } else {
          throw new Error(`Failed to update custom category: ${updateError.message}`);
        }
        return;
      }

      console.log('✅ Custom category updated successfully');
      
      setCustomCategories(prev => 
        prev.map(cat => cat.id === categoryId ? { ...cat, name: value } : cat)
      );
      
      const updatedNames = selectedCategoryNames.map(catName => {
        const existingCat = customCategories.find(cat => cat.id === categoryId);
        return existingCat && catName === existingCat.name ? value : catName;
      });
      
      if (!updatedNames.includes(value)) {
        updatedNames.push(value);
      }
      
      setSelectedCategoryNames(updatedNames);
      
    } catch (error) {
      console.error('❌ Error handling custom category input:', error);
      setError(error instanceof Error ? error.message : 'Failed to save custom category');
    }
  }, [user?.id, getToken, customCategories, selectedCategoryNames]);

  const addNewCustomCategory = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      if (customCategories.length >= 3) {
        setError('You can only have up to 3 custom categories.');
        return;
      }

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const tempName = `Custom Category ${customCategories.length + 1}`;

      const { data: newCategory, error: createError } = await supabase
        .from('categories')
        .insert({
          name: tempName,
          description: 'Custom user category',
          is_custom: true,
          user_id: user.id
        })
        .select('id, name')
        .single();

      if (createError) {
        console.error('❌ Error creating custom category:', createError);
        throw new Error(`Failed to create custom category: ${createError.message}`);
      }

      const { error: selectError } = await supabase
        .from('user_selected_categories')
        .insert({
          user_id: user.id,
          category_id: newCategory.id
        });

      if (selectError) {
        console.error('❌ Error selecting new custom category:', selectError);
        throw new Error(`Failed to select custom category: ${selectError.message}`);
      }

      setCustomCategories(prev => [...prev, { name: tempName, id: newCategory.id }]);
      selectedCategoryIds.add(newCategory.id);
      setSelectedCategoryIds(new Set(selectedCategoryIds));
      
      const updatedNames = [...selectedCategoryNames, tempName];
      setSelectedCategoryNames(updatedNames);
      
      setEditingCategoryId(newCategory.id);
      
    } catch (error) {
      console.error('❌ Error adding new custom category:', error);
      setError(error instanceof Error ? error.message : 'Failed to add custom category');
    }
  }, [user?.id, getToken, customCategories, selectedCategoryIds, selectedCategoryNames]);

  const removeCustomCategory = useCallback(async (categoryToRemove: CustomCategory) => {
    if (!user?.id) return;
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      await supabase
        .from('user_selected_categories')
        .delete()
        .eq('user_id', user.id)
        .eq('category_id', categoryToRemove.id);

      await supabase
        .from('categories')
        .delete()
        .eq('id', categoryToRemove.id)
        .eq('user_id', user.id);

      setCustomCategories(prev => prev.filter(cat => cat.id !== categoryToRemove.id));
      selectedCategoryIds.delete(categoryToRemove.id);
      setSelectedCategoryIds(new Set(selectedCategoryIds));

      const updatedNames = selectedCategoryNames.filter(cat => cat !== categoryToRemove.name);
      setSelectedCategoryNames(updatedNames);
      
    } catch (error) {
      console.error('❌ Error removing custom category:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove custom category');
    }
  }, [user?.id, getToken, selectedCategoryIds, selectedCategoryNames]);

  const handleNext = () => {
    if (selectedCategoryNames.length === 0) {
      setError('Please select at least one category to continue.');
      return;
    }

    const hasUnnamedCustomCategories = customCategories.some(cat => 
      !cat.name.trim() || cat.name.startsWith('Custom Category')
    );
    
    if (hasUnnamedCustomCategories) {
      setError('Please provide names for your custom categories or remove them.');
      return;
    }

    dispatch({ type: 'NEXT_STEP' });
    navigate('/onboarding/user-goals');
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
    navigate('/onboarding/current-self');
  };

  const isCategorySelected = useCallback((categoryName: string) => {
    return categorySelectionMap.has(categoryName.toLowerCase());
  }, [categorySelectionMap]);

  if (isLoading) {
    return null; // Let the main loading screen handle this
  }

  return (
    <div className={`onboarding-container ${isScrolled ? 'scrolled' : ''}`}>
      <div className="onboarding-content container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 font-heading">Choose Focus Areas</h1>
          <p className="text-text-secondary text-base md:text-lg leading-relaxed font-body">
            Select the areas of your life you want to transform. You can always add more later.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-start gap-3">
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
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
          {defaultCategories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              title={category.title}
              description={category.description}
              icon={category.icon}
              iconColor={category.iconColor}
              isSelected={isCategorySelected(category.id)}
              onToggle={() => handleCategoryToggle(category.id)}
            />
          ))}

          {customCategories.map((customCat) => (
            <CategoryCard
              key={customCat.id}
              id={customCat.id}
              title={customCat.name || 'Custom'}
              description="Your custom category"
              icon={<FaPlus />}
              iconColor="#6B7280"
              isSelected={isCategorySelected(customCat.name)}
              onToggle={() => removeCustomCategory(customCat)}
              isCustom={true}
              onCustomInput={handleCustomCategoryInput}
              customValue={customCat.name}
              isEditing={editingCategoryId === customCat.id}
              onStartEditing={() => setEditingCategoryId(customCat.id)}
              onCancelEditing={() => setEditingCategoryId(null)}
            />
          ))}

          {customCategories.length < 3 && (
            <motion.div
              className="relative cursor-pointer"
              onClick={addNewCustomCategory}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center text-center p-4 opacity-60 hover:opacity-80 transition-opacity duration-300">
                <div className="text-5xl md:text-6xl mb-3 text-white/30">
                  <FaPlus />
                </div>
                <h3 className="text-base md:text-lg font-semibold mb-1 font-heading text-white/50">
                  Add Custom
                </h3>
                <p className="text-xs md:text-sm font-body leading-tight text-white/30">
                  Create your own category
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-12 flex justify-between max-w-md mx-auto">
          <button
            onClick={handleBack}
            className="btn btn-outline text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className={`text-base md:text-lg px-6 md:px-8 py-3 md:py-4 font-heading transition-all duration-300 rounded-xl border ${
              selectedCategoryNames.length > 0
                ? 'btn btn-primary'
                : 'bg-transparent text-gray-400 border-gray-600 cursor-not-allowed hover:bg-transparent'
            }`}
            disabled={selectedCategoryNames.length === 0}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PickCategory;