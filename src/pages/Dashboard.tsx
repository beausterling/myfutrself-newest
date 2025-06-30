import { useState, useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { 
  CheckCircle, 
  BarChart3, 
  Calendar, 
  PieChart, 
  Plus, 
  Target, 
  Trash2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Edit, 
  Save, 
  X,
  Clock,
  GitPullRequestClosed,
  KeyRound
} from 'lucide-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';
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

// Helper function to get category icon
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

// Helper function to format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'No deadline';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper function to calculate days remaining
const getDaysRemaining = (dateString: string | null) => {
  if (!dateString) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Component for goal card
const GoalCard = ({ 
  goal, 
  onDelete, 
  onUpdate, 
  onUpdateMotivation, 
  onAddObstacle, 
  onRemoveObstacle,
  categoryIconData
}: { 
  goal: any, 
  onDelete: (goalId: string) => Promise<void>, 
  onUpdate: (goalId: string, updates: any) => Promise<void>,
  onUpdateMotivation: (goalId: string, motivationId: string | null, motivationText: string) => Promise<void>,
  onAddObstacle: (goalId: string, motivationId: string | null, obstacle: string) => Promise<void>,
  onRemoveObstacle: (goalId: string, motivationId: string | null, obstacleIndex: number) => Promise<void>,
  categoryIconData: any
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState({
    title: goal.title,
    deadline: goal.deadline || '',
    frequency: goal.frequency || '',
    start_date: goal.start_date || ''
  });
  const [motivationText, setMotivationText] = useState(goal.motivations?.[0]?.motivation_text || '');
  const [isEditingMotivation, setIsEditingMotivation] = useState(!goal.motivations?.[0]?.motivation_text);
  const [newObstacle, setNewObstacle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Calculate days remaining
  const daysRemaining = getDaysRemaining(goal.deadline);
  
  const handleSaveGoal = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(goal.id, editedGoal);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating goal:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleSaveMotivation = async () => {
    setIsUpdating(true);
    try {
      await onUpdateMotivation(goal.id, goal.motivations?.[0]?.id || null, motivationText);
      setIsEditingMotivation(false);
    } catch (error) {
      console.error('Error updating motivation:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleAddObstacle = async () => {
    if (!newObstacle.trim()) return;
    
    setIsUpdating(true);
    try {
      await onAddObstacle(goal.id, goal.motivations?.[0]?.id || null, newObstacle);
      setNewObstacle('');
    } catch (error) {
      console.error('Error adding obstacle:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden transition-all duration-300">
      {/* Goal Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: categoryIconData.bgColor, color: categoryIconData.color }}
          >
            {categoryIconData.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white font-heading truncate">{goal.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {goal.deadline && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-body ${
                  daysRemaining !== null && daysRemaining < 0 
                    ? 'bg-red-500/20 text-red-300' 
                    : daysRemaining !== null && daysRemaining < 7
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-green-500/20 text-green-300'
                }`}>
                  {daysRemaining !== null && daysRemaining < 0 
                    ? 'Overdue' 
                    : daysRemaining !== null 
                    ? `${daysRemaining} days left` 
                    : formatDate(goal.deadline)}
                </span>
              )}
              {goal.frequency && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-body">
                  {goal.frequency}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal.id);
            }}
            className="p-2 text-white/40 hover:text-red-400 transition-colors"
            title="Delete goal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-white/60" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/60" />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-white/10">
          {/* Goal Details Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white/80 font-heading">Goal Details</h4>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-white/60 mb-1 font-heading">Title</label>
                  <input
                    type="text"
                    value={editedGoal.title}
                    onChange={(e) => setEditedGoal({...editedGoal, title: e.target.value})}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent font-body"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1 font-heading">Deadline</label>
                  <input
                    type="date"
                    value={editedGoal.deadline}
                    onChange={(e) => setEditedGoal({...editedGoal, deadline: e.target.value})}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent font-body"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1 font-heading">Check-in Frequency</label>
                  <select
                    value={editedGoal.frequency}
                    onChange={(e) => setEditedGoal({...editedGoal, frequency: e.target.value})}
                    className="w-full bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent font-body"
                  >
                    <option value="">Select a routine</option>
                    <option value="None, I will reach out on my own">None, I will reach out on my own</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-weekly">Bi-weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
                {editedGoal.frequency && editedGoal.frequency !== 'None, I will reach out on my own' && (
                  <div>
                    <label className="block text-xs text-white/60 mb-1 font-heading">Start Date</label>
                    <input
                      type="date"
                      value={editedGoal.start_date}
                      onChange={(e) => setEditedGoal({...editedGoal, start_date: e.target.value})}
                      className="w-full bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent font-body"
                    />
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveGoal}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-aqua text-white rounded-lg text-sm hover:bg-primary-aqua/80 transition-colors"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-primary-aqua mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white/60 font-body">Deadline:</span>
                    <span className="ml-2 text-white font-body">{goal.deadline ? formatDate(goal.deadline) : 'No deadline set'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-primary-aqua mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white/60 font-body">Check-in:</span>
                    <span className="ml-2 text-white font-body">{goal.frequency || 'Not set'}</span>
                  </div>
                </div>
                {goal.frequency && goal.frequency !== 'None, I will reach out on my own' && goal.start_date && (
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-primary-aqua mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-white/60 font-body">Start date:</span>
                      <span className="ml-2 text-white font-body">{formatDate(goal.start_date)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Motivation Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white/80 font-heading flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary-aqua" />
                Motivation
              </h4>
              {!isEditingMotivation && (
                <button
                  onClick={() => setIsEditingMotivation(true)}
                  className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
                >
                  {goal.motivations?.[0]?.motivation_text ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            
            {isEditingMotivation ? (
              <div>
                <textarea
                  value={motivationText}
                  onChange={(e) => setMotivationText(e.target.value)}
                  placeholder="What motivates you to achieve this goal?"
                  className="w-full bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent resize-none h-24 font-body"
                />
                <div className="flex justify-end mt-2 gap-2">
                  <button
                    onClick={() => {
                      setIsEditingMotivation(false);
                      setMotivationText(goal.motivations?.[0]?.motivation_text || '');
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white/70 rounded-lg text-xs hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMotivation}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-aqua text-white rounded-lg text-xs hover:bg-primary-aqua/80 transition-colors"
                  >
                    {isUpdating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-white/80 text-sm font-body">
                  {goal.motivations?.[0]?.motivation_text || 'No motivation added yet.'}
                </p>
              </div>
            )}
          </div>
          
          {/* Obstacles Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white/80 font-heading flex items-center gap-2">
                <GitPullRequestClosed className="w-4 h-4 text-primary-aqua" />
                Obstacles
              </h4>
            </div>
            
            {/* Obstacles List */}
            {goal.motivations?.[0]?.obstacles && goal.motivations[0].obstacles.length > 0 ? (
              <div className="space-y-2 mb-3">
                {goal.motivations[0].obstacles.map((obstacle: string, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/10">
                    <span className="text-white/80 text-sm font-body">{obstacle}</span>
                    <button
                      onClick={() => onRemoveObstacle(goal.id, goal.motivations[0].id, index)}
                      className="text-white/40 hover:text-red-400 p-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10 mb-3">
                <p className="text-white/60 text-sm font-body">No obstacles added yet.</p>
              </div>
            )}
            
            {/* Add Obstacle */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newObstacle}
                onChange={(e) => setNewObstacle(e.target.value)}
                placeholder="Add a new obstacle..."
                className="flex-1 bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-aqua/50 focus:border-transparent font-body"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newObstacle.trim()) {
                    handleAddObstacle();
                  }
                }}
              />
              <button
                onClick={handleAddObstacle}
                disabled={!newObstacle.trim() || isUpdating}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  newObstacle.trim() && !isUpdating
                    ? 'bg-primary-aqua text-white hover:bg-primary-aqua/80'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // State for data
  const [categories, setCategories] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State for adding new goals
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  // Group goals by category
  const goalsByCategory = goals.reduce((acc: Record<string, any[]>, goal) => {
    const categoryId = goal.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(goal);
    return acc;
  }, {});

  // Handle scroll effect for blur
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch user's goals and categories
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching dashboard data for user:', user.id);

        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        const supabase = createAuthenticatedSupabaseClient(token);

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          throw categoriesError;
        }

        setCategories(categoriesData || []);

        // Fetch user's goals with category and motivation information
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select(`
            *,
            categories (
              id,
              name,
              is_custom
            ),
            motivations (
              id,
              motivation_text,
              obstacles
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
          throw goalsError;
        }

        setGoals(goalsData || []);

        // Set default category for new goals
        if (categoriesData && categoriesData.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(categoriesData[0].id);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, getToken]);

  // Add new goal
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGoalTitle.trim() || !selectedCategoryId || !user?.id) return;

    try {
      setIsAddingGoal(true);
      console.log('Adding new goal:', { title: newGoalTitle, categoryId: selectedCategoryId });

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const { data: newGoal, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          category_id: selectedCategoryId,
          title: newGoalTitle.trim()
        })
        .select(`
          *,
          categories (
            id,
            name,
            is_custom
          ),
          motivations (
            id,
            motivation_text,
            obstacles
          )
        `)
        .single();

      if (error) {
        console.error('Error adding goal:', error);
        throw error;
      }

      console.log('Goal added successfully:', newGoal);
      
      // Add the new goal to the state
      setGoals(prev => [newGoal, ...prev]);
      
      // Reset form
      setNewGoalTitle('');
      
    } catch (error) {
      console.error('Error adding goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to add goal');
    } finally {
      setIsAddingGoal(false);
    }
  };

  // Delete goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!user?.id) return;

    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      console.log('Deleting goal:', goalId);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting goal:', error);
        throw error;
      }

      console.log('Goal deleted successfully');
      
      // Remove the goal from state
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete goal');
    }
  };

  // Update goal
  const handleUpdateGoal = async (goalId: string, updates: any) => {
    if (!user?.id) return;

    try {
      console.log('Updating goal:', goalId, updates);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select(`
          *,
          categories (
            id,
            name,
            is_custom
          ),
          motivations (
            id,
            motivation_text,
            obstacles
          )
        `)
        .single();

      if (error) {
        console.error('Error updating goal:', error);
        throw error;
      }

      console.log('Goal updated successfully:', data);
      
      // Update the goal in state
      setGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      
    } catch (error) {
      console.error('Error updating goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to update goal');
      throw error;
    }
  };

  // Update motivation
  const handleUpdateMotivation = async (goalId: string, motivationId: string | null, motivationText: string) => {
    if (!user?.id) return;

    try {
      console.log('Updating motivation:', { goalId, motivationId, motivationText });

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      if (motivationId) {
        // Update existing motivation
        const { error } = await supabase
          .from('motivations')
          .update({ motivation_text: motivationText })
          .eq('id', motivationId);

        if (error) {
          console.error('Error updating motivation:', error);
          throw error;
        }
      } else {
        // Create new motivation
        const { error } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            motivation_text: motivationText,
            obstacles: []
          });

        if (error) {
          console.error('Error creating motivation:', error);
          throw error;
        }
      }

      // Refresh the goal data
      const { data, error: refreshError } = await supabase
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            is_custom
          ),
          motivations (
            id,
            motivation_text,
            obstacles
          )
        `)
        .eq('id', goalId)
        .single();

      if (refreshError) {
        console.error('Error refreshing goal data:', refreshError);
        throw refreshError;
      }

      console.log('Motivation updated successfully:', data);
      
      // Update the goal in state
      setGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      
    } catch (error) {
      console.error('Error updating motivation:', error);
      setError(error instanceof Error ? error.message : 'Failed to update motivation');
      throw error;
    }
  };

  // Add obstacle
  const handleAddObstacle = async (goalId: string, motivationId: string | null, obstacle: string) => {
    if (!user?.id || !obstacle.trim()) return;

    try {
      console.log('Adding obstacle:', { goalId, motivationId, obstacle });

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      if (motivationId) {
        // Get current obstacles
        const { data: motivationData, error: fetchError } = await supabase
          .from('motivations')
          .select('obstacles')
          .eq('id', motivationId)
          .single();

        if (fetchError) {
          console.error('Error fetching obstacles:', fetchError);
          throw fetchError;
        }

        const currentObstacles = motivationData.obstacles || [];
        const updatedObstacles = [...currentObstacles, obstacle];

        // Update obstacles
        const { error } = await supabase
          .from('motivations')
          .update({ obstacles: updatedObstacles })
          .eq('id', motivationId);

        if (error) {
          console.error('Error updating obstacles:', error);
          throw error;
        }
      } else {
        // Create new motivation with obstacle
        const { error } = await supabase
          .from('motivations')
          .insert({
            goal_id: goalId,
            motivation_text: '',
            obstacles: [obstacle]
          });

        if (error) {
          console.error('Error creating motivation with obstacle:', error);
          throw error;
        }
      }

      // Refresh the goal data
      const { data, error: refreshError } = await supabase
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            is_custom
          ),
          motivations (
            id,
            motivation_text,
            obstacles
          )
        `)
        .eq('id', goalId)
        .single();

      if (refreshError) {
        console.error('Error refreshing goal data:', refreshError);
        throw refreshError;
      }

      console.log('Obstacle added successfully:', data);
      
      // Update the goal in state
      setGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      
    } catch (error) {
      console.error('Error adding obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to add obstacle');
      throw error;
    }
  };

  // Remove obstacle
  const handleRemoveObstacle = async (goalId: string, motivationId: string | null, obstacleIndex: number) => {
    if (!user?.id || !motivationId) return;

    try {
      console.log('Removing obstacle:', { goalId, motivationId, obstacleIndex });

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Get current obstacles
      const { data: motivationData, error: fetchError } = await supabase
        .from('motivations')
        .select('obstacles')
        .eq('id', motivationId)
        .single();

      if (fetchError) {
        console.error('Error fetching obstacles:', fetchError);
        throw fetchError;
      }

      const currentObstacles = motivationData.obstacles || [];
      const updatedObstacles = [...currentObstacles];
      updatedObstacles.splice(obstacleIndex, 1);

      // Update obstacles
      const { error } = await supabase
        .from('motivations')
        .update({ obstacles: updatedObstacles })
        .eq('id', motivationId);

      if (error) {
        console.error('Error updating obstacles:', error);
        throw error;
      }

      // Refresh the goal data
      const { data, error: refreshError } = await supabase
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            is_custom
          ),
          motivations (
            id,
            motivation_text,
            obstacles
          )
        `)
        .eq('id', goalId)
        .single();

      if (refreshError) {
        console.error('Error refreshing goal data:', refreshError);
        throw refreshError;
      }

      console.log('Obstacle removed successfully:', data);
      
      // Update the goal in state
      setGoals(prev => prev.map(goal => goal.id === goalId ? data : goal));
      
    } catch (error) {
      console.error('Error removing obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove obstacle');
      throw error;
    }
  };

  // Calculate stats
  const stats = [
    { 
      icon: <CheckCircle className="w-6 h-6 text-primary-aqua" />, 
      label: 'Active Goals', 
      value: goals.length.toString() 
    },
    { 
      icon: <Calendar className="w-6 h-6 text-primary-aqua" />, 
      label: 'Categories', 
      value: Object.keys(goalsByCategory).length.toString() 
    },
    { 
      icon: <PieChart className="w-6 h-6 text-primary-aqua" />, 
      label: 'This Week', 
      value: goals.filter(goal => {
        const daysLeft = getDaysRemaining(goal.deadline);
        return daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
      }).length.toString()
    },
    { 
      icon: <BarChart3 className="w-6 h-6 text-primary-aqua" />, 
      label: 'Completed', 
      value: '0' // Placeholder for future functionality
    }
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary font-body">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-heading font-bold mb-2">Welcome back, {user?.firstName || 'there'}</h1>
        <p className="text-text-secondary mb-6 font-body text-body">Let's make today count</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium font-heading">Error</p>
              <p className="text-red-300 text-sm mt-1 font-body">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-300 text-sm underline mt-2 hover:text-red-200 font-body"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center space-x-3">
              {stat.icon}
              <div>
                <p className="text-caption text-text-secondary font-body">{stat.label}</p>
                <p className="text-xl font-medium font-heading">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Goal */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4 flex items-center gap-2 font-heading">
          <Target className="w-5 h-5 text-primary-aqua" />
          Add New Goal
        </h2>
        <form onSubmit={handleAddGoal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                Goal Title
              </label>
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="What do you want to achieve?"
                className="input"
                disabled={isAddingGoal}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                Category
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="input"
                disabled={isAddingGoal || categories.length === 0}
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.is_custom ? '(Custom)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newGoalTitle.trim() || !selectedCategoryId || isAddingGoal || categories.length === 0}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-heading"
          >
            {isAddingGoal ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Adding Goal...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Goal
              </>
            )}
          </button>
        </form>
      </div>

      {/* Goals By Category */}
      {Object.entries(goalsByCategory).map(([categoryId, categoryGoals]) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category) return null;
        
        const categoryIconData = getCategoryIcon(category.name, category.is_custom);
        
        return (
          <div key={categoryId} className="space-y-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: categoryIconData.bgColor, color: categoryIconData.color }}
              >
                {categoryIconData.icon}
              </div>
              <h2 className="text-xl font-semibold font-heading">{category.name}</h2>
              {category.is_custom && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 font-medium">
                  Custom
                </span>
              )}
            </div>
            
            <div className="space-y-4">
              {categoryGoals.map((goal: any) => (
                <GoalCard 
                  key={goal.id} 
                  goal={goal} 
                  onDelete={handleDeleteGoal}
                  onUpdate={handleUpdateGoal}
                  onUpdateMotivation={handleUpdateMotivation}
                  onAddObstacle={handleAddObstacle}
                  onRemoveObstacle={handleRemoveObstacle}
                  categoryIconData={categoryIconData}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="card text-center py-12">
          <Target className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold font-heading mb-2">No Goals Yet</h3>
          <p className="text-white/60 font-body mb-6">
            Start by adding your first goal above to begin tracking your progress.
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;