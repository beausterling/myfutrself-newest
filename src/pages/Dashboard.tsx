import { useState, useEffect } from 'react';
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
  Edit, 
  Save, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Lightbulb,
  GitPullRequestClosed,
  Clock
} from 'lucide-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';
import type { Database } from '../types/supabase';
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

interface Goal {
  id: string;
  title: string;
  deadline: string | null;
  frequency: string | null;
  start_date: string | null;
  category_id: string;
  categories: {
    id: string;
    name: string;
    is_custom: boolean;
  } | null;
  motivations?: {
    id: string;
    motivation_text: string | null;
    obstacles: string[] | null;
  }[];
};

type Category = Database['public']['Tables']['categories']['Row'];

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

const frequencies = [
  'None, I will reach out on my own',
  'Daily',
  'Weekly', 
  'Bi-weekly',
  'Monthly',
  'Quarterly'
];

const Dashboard = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // State for data
  const [goals, setGoals] = useState<Record<string, Goal[]>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State for adding new goals
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  // State for editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingMotivationId, setEditingMotivationId] = useState<string | null>(null);
  const [editingMotivationText, setEditingMotivationText] = useState('');
  const [newObstacle, setNewObstacle] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});
  const [editingGoalData, setEditingGoalData] = useState<{
    title: string;
    deadline: string | null;
    frequency: string | null;
    start_date: string | null;
  }>({
    title: '',
    deadline: null,
    frequency: null,
    start_date: null
  });

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
    if (!user?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setWebhookError(null);
        console.log('Fetching dashboard data for user:', user.id);

        // Get Clerk token and create authenticated Supabase client
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('No authentication token available');
        }

        const supabase = createAuthenticatedSupabaseClient(token);

        // First, check if user profile exists (this tells us if webhook worked)
        console.log('Checking if user profile exists...');
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, onboarding_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error checking user profile:', profileError);
          throw profileError;
        }

        if (!profile) {
          // User profile doesn't exist - webhook didn't work
          console.error('User profile not found - webhook may have failed');
          setWebhookError('Your user profile was not created automatically. This indicates a webhook configuration issue. Please check that the Clerk webhook is properly configured and the webhook secret is set correctly in Supabase.');
          return;
        }

        console.log('User profile found:', profile);
        
        // Fetch categories (both default and user's custom ones)
        console.log('Fetching categories...');
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) {
          console.error('Error fetching categories:', categoriesError);
          throw categoriesError;
        }

        console.log('Categories fetched:', categoriesData?.length || 0);
        setCategories(categoriesData || []);

        // Fetch user's goals with category information and motivations
        console.log('Fetching goals...');
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select(`
            *,
            categories (
              id,
              name,
              description,
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

        console.log('Goals fetched:', goalsData?.length || 0);
        
        // Organize goals by category
        const goalsByCategory: Record<string, Goal[]> = {};
        
        if (goalsData) {
          goalsData.forEach(goal => {
            const categoryName = goal.categories?.name || 'Uncategorized';
            if (!goalsByCategory[categoryName]) {
              goalsByCategory[categoryName] = [];
            }
            goalsByCategory[categoryName].push(goal as Goal);
          });
        }
        
        setGoals(goalsByCategory);

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

  // Toggle goal expansion
  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  // Start editing goal
  const handleEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditingGoalData({
      title: goal.title,
      deadline: goal.deadline,
      frequency: goal.frequency,
      start_date: goal.start_date
    });
  };

  // Save edited goal
  const handleSaveGoal = async (goalId: string) => {
    if (!user?.id) return;

    try {
      setIsAddingGoal(true);
      
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      const { error } = await supabase
        .from('goals')
        .update({
          title: editingGoalData.title,
          deadline: editingGoalData.deadline,
          frequency: editingGoalData.frequency,
          start_date: editingGoalData.start_date
        })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating goal:', error);
        throw error;
      }

      // Update local state
      const updatedGoals = { ...goals };
      
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category] = updatedGoals[category].map(goal => {
          if (goal.id === goalId) {
            return {
              ...goal,
              title: editingGoalData.title,
              deadline: editingGoalData.deadline,
              frequency: editingGoalData.frequency,
              start_date: editingGoalData.start_date
            };
          }
          return goal;
        });
      });
      
      setGoals(updatedGoals);
      setEditingGoalId(null);
      
    } catch (error) {
      console.error('Error saving goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to save goal');
    } finally {
      setIsAddingGoal(false);
    }
  };

  // Start editing motivation
  const handleEditMotivation = (motivationId: string | undefined, motivationText: string | null) => {
    setEditingMotivationId(motivationId || 'new');
    setEditingMotivationText(motivationText || '');
  };

  // Save motivation
  const handleSaveMotivation = async (goalId: string, motivationId: string | null) => {
    if (!user?.id) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      if (motivationId && motivationId !== 'new') {
        // Update existing motivation
        const { error } = await supabase
          .from('motivations')
          .update({
            motivation_text: editingMotivationText
          })
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
            motivation_text: editingMotivationText,
            obstacles: []
          });

        if (error) {
          console.error('Error creating motivation:', error);
          throw error;
        }
      }

      // Refresh goals data
      const token2 = await getToken({ template: 'supabase' });
      if (!token2) {
        throw new Error('No authentication token available');
      }

      const supabase2 = createAuthenticatedSupabaseClient(token2);
      
      const { data: updatedGoal, error: fetchError } = await supabase2
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            description,
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

      if (fetchError) {
        console.error('Error fetching updated goal:', fetchError);
        throw fetchError;
      }

      // Update local state
      const updatedGoals = { ...goals };
      
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category] = updatedGoals[category].map(goal => {
          if (goal.id === goalId) {
            return updatedGoal as Goal;
          }
          return goal;
        });
      });
      
      setGoals(updatedGoals);
      setEditingMotivationId(null);
      
    } catch (error) {
      console.error('Error saving motivation:', error);
      setError(error instanceof Error ? error.message : 'Failed to save motivation');
    }
  };

  // Add obstacle
  const handleAddObstacle = async (goalId: string, motivationId: string) => {
    if (!user?.id || !newObstacle.trim()) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Find the current obstacles
      let currentObstacles: string[] = [];
      
      Object.keys(goals).forEach(category => {
        goals[category].forEach(goal => {
          if (goal.id === goalId && goal.motivations) {
            const motivation = goal.motivations.find(m => m.id === motivationId);
            if (motivation && motivation.obstacles) {
              currentObstacles = [...motivation.obstacles];
            }
          }
        });
      });

      // Add new obstacle
      const updatedObstacles = [...currentObstacles, newObstacle.trim()];

      const { error } = await supabase
        .from('motivations')
        .update({
          obstacles: updatedObstacles
        })
        .eq('id', motivationId);

      if (error) {
        console.error('Error adding obstacle:', error);
        throw error;
      }

      // Refresh goals data
      const token2 = await getToken({ template: 'supabase' });
      if (!token2) {
        throw new Error('No authentication token available');
      }

      const supabase2 = createAuthenticatedSupabaseClient(token2);
      
      const { data: updatedGoal, error: fetchError } = await supabase2
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            description,
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

      if (fetchError) {
        console.error('Error fetching updated goal:', fetchError);
        throw fetchError;
      }

      // Update local state
      const updatedGoals = { ...goals };
      
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category] = updatedGoals[category].map(goal => {
          if (goal.id === goalId) {
            return updatedGoal as Goal;
          }
          return goal;
        });
      });
      
      setGoals(updatedGoals);
      setNewObstacle('');
      
    } catch (error) {
      console.error('Error adding obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to add obstacle');
    }
  };

  // Remove obstacle
  const handleRemoveObstacle = async (goalId: string, motivationId: string, obstacleIndex: number) => {
    if (!user?.id) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Find the current obstacles
      let currentObstacles: string[] = [];
      
      Object.keys(goals).forEach(category => {
        goals[category].forEach(goal => {
          if (goal.id === goalId && goal.motivations) {
            const motivation = goal.motivations.find(m => m.id === motivationId);
            if (motivation && motivation.obstacles) {
              currentObstacles = [...motivation.obstacles];
            }
          }
        });
      });

      // Remove obstacle
      const updatedObstacles = [...currentObstacles];
      updatedObstacles.splice(obstacleIndex, 1);

      const { error } = await supabase
        .from('motivations')
        .update({
          obstacles: updatedObstacles
        })
        .eq('id', motivationId);

      if (error) {
        console.error('Error removing obstacle:', error);
        throw error;
      }

      // Refresh goals data
      const token2 = await getToken({ template: 'supabase' });
      if (!token2) {
        throw new Error('No authentication token available');
      }

      const supabase2 = createAuthenticatedSupabaseClient(token2);
      
      const { data: updatedGoal, error: fetchError } = await supabase2
        .from('goals')
        .select(`
          *,
          categories (
            id,
            name,
            description,
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

      if (fetchError) {
        console.error('Error fetching updated goal:', fetchError);
        throw fetchError;
      }

      // Update local state
      const updatedGoals = { ...goals };
      
      Object.keys(updatedGoals).forEach(category => {
        updatedGoals[category] = updatedGoals[category].map(goal => {
          if (goal.id === goalId) {
            return updatedGoal as Goal;
          }
          return goal;
        });
      });
      
      setGoals(updatedGoals);
      
    } catch (error) {
      console.error('Error removing obstacle:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove obstacle');
    }
  };

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
            description,
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
      
      // Add the new goal to the state by category
      const categoryName = newGoal.categories?.name || 'Uncategorized';
      
      setGoals(prev => {
        const updatedGoals = { ...prev };
        
        if (!updatedGoals[categoryName]) {
          updatedGoals[categoryName] = [];
        }
        
        updatedGoals[categoryName] = [newGoal as Goal, ...updatedGoals[categoryName]];
        
        return updatedGoals;
      });
      
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

    try {
      console.log('Deleting goal:', goalId);

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const supabase = createAuthenticatedSupabaseClient(token);

      // Find the goal to delete (for category info)
      let goalToDelete: Goal | null = null;
      let categoryName = '';
      
      Object.keys(goals).forEach(category => {
        goals[category].forEach(goal => {
          if (goal.id === goalId) {
            goalToDelete = goal;
            categoryName = category;
          }
        });
      });
      
      if (!goalToDelete) {
        throw new Error('Goal not found');
      }

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
      
      // Remove the goal from state by category
      setGoals(prev => {
        const updatedGoals = { ...prev };
        
        if (updatedGoals[categoryName]) {
          updatedGoals[categoryName] = updatedGoals[categoryName].filter(goal => goal.id !== goalId);
          
          // Remove the category if it's empty
          if (updatedGoals[categoryName].length === 0) {
            delete updatedGoals[categoryName];
          }
        }
        
        return updatedGoals;
      });
      
    } catch (error) {
      console.error('Error deleting goal:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete goal');
    }
  };

  // Calculate stats
  const stats = [
    { 
      icon: <CheckCircle className="w-6 h-6 text-primary-aqua" />, 
      label: 'Active Goals', 
      value: Object.values(goals).reduce((total, categoryGoals) => total + categoryGoals.length, 0).toString()
    },
    { 
      icon: <Calendar className="w-6 h-6 text-primary-aqua" />, 
      label: 'Categories', 
      value: Object.keys(goals).length.toString()
    },
    { 
      icon: <PieChart className="w-6 h-6 text-primary-aqua" />, 
      label: 'This Week', 
      value: Object.values(goals).reduce((total, categoryGoals) => {
        return total + categoryGoals.filter(goal => {
          const created = new Date(goal.created_at || '');
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created >= weekAgo;
        }).length;
      }, 0).toString()
    },
    { 
      icon: <BarChart3 className="w-6 h-6 text-primary-aqua" />, 
      label: 'Focus Areas', 
      value: Object.keys(goals).length.toString()
    }
  ];

  if (loading) {
    return (
      <div className={`max-w-5xl mx-auto px-4 py-8 ${isScrolled ? 'scrolled' : ''}`}>
        {/* Blur effect overlay */}
        <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
          isScrolled 
            ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
            : 'backdrop-filter backdrop-blur-0'
        }`} />
        
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary-aqua border-t-transparent rounded-full animate-spin" />
            <span className="text-text-secondary font-body">Loading your dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show webhook error if user profile doesn't exist
  if (webhookError) {
    return (
      <div className={`max-w-5xl mx-auto px-4 py-8 ${isScrolled ? 'scrolled' : ''}`}>
        {/* Blur effect overlay */}
        <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
          isScrolled 
            ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
            : 'backdrop-filter backdrop-blur-0'
        }`} />
        
        <div className="card bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium font-heading">Webhook Configuration Issue</p>
              <p className="text-red-300 text-sm mt-1 font-body">{webhookError}</p>
              <div className="mt-4 p-4 bg-red-500/5 rounded-lg">
                <p className="text-red-300 text-sm font-medium mb-2 font-heading">To fix this issue:</p>
                <ol className="text-red-300 text-sm space-y-1 list-decimal list-inside font-body">
                  <li>Go to your Clerk Dashboard → Webhooks</li>
                  <li>Create a webhook endpoint: <code className="bg-red-500/20 px-1 rounded">https://your-project.supabase.co/functions/v1/clerk-webhook</code></li>
                  <li>Select events: user.created, user.updated, user.deleted</li>
                  <li>Copy the webhook secret and add it to Supabase Edge Functions environment variables as <code className="bg-red-500/20 px-1 rounded">CLERK_WEBHOOK_SECRET</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto px-4 py-8 space-y-8 ${isScrolled ? 'scrolled' : ''}`}>
      {/* Blur effect overlay */}
      <div className={`fixed top-0 left-0 right-0 h-20 z-40 pointer-events-none transition-all duration-300 ${
        isScrolled 
          ? 'backdrop-filter backdrop-blur-xl bg-gradient-to-b from-bg-primary/30 via-bg-primary/20 to-transparent' 
          : 'backdrop-filter backdrop-blur-0'
      }`} />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-heading font-bold mb-2">Welcome back, {user?.firstName || 'there'}</h1>
        <p className="text-text-secondary mb-6 font-body text-body">Let's make today count</p>
        <button className="btn bg-primary-aqua/10 hover:bg-primary-aqua/20 text-primary-aqua px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 font-heading">
          Call My Future Self
        </button>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
      <div className="card mb-8">
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

      {/* Goals List */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold mb-6 font-heading">Your Goals & Progress</h2>
        
        {Object.keys(goals).length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-text-secondary/50 mx-auto mb-3" />
            <p className="text-text-secondary font-body">No goals yet. Add your first goal above!</p>
          </div>
        ) : (
          Object.entries(goals).map(([categoryName, categoryGoals]) => (
            <div key={categoryName} className="card">
              <div className="mb-6">
                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const isCustom = categoryGoals[0]?.categories?.is_custom || false;
                    const iconData = getCategoryIcon(categoryName, isCustom);
                    return (
                      <div 
                        className="text-2xl p-2 rounded-lg"
                        style={{ 
                          color: iconData.color,
                          backgroundColor: iconData.bgColor
                        }}
                      >
                        {iconData.icon}
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-xl font-semibold font-heading">{categoryName}</h3>
                    <p className="text-sm text-white/60 font-body">
                      {categoryGoals.length} goal{categoryGoals.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                {/* Goals in this category */}
                <div className="space-y-4">
                  {categoryGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                    >
                      {/* Goal Header */}
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => toggleGoalExpansion(goal.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white font-heading">{goal.title}</h4>
                            {goal.deadline && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                                Due: {new Date(goal.deadline).toLocaleDateString()}
                              </span>
                            )}
                            {goal.frequency && (
                              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                                {goal.frequency}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingGoalId !== goal.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGoal(goal);
                              }}
                              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              title="Edit goal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGoal(goal.id);
                            }}
                            className="p-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete goal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="p-2 text-white/60">
                            {expandedGoals[goal.id] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Goal Content */}
                      {expandedGoals[goal.id] && (
                        <div className="p-4 border-t border-white/10 bg-white/5">
                          {/* Edit Goal Form */}
                          {editingGoalId === goal.id ? (
                            <div className="space-y-4 mb-4">
                              <h5 className="font-medium text-white font-heading">Edit Goal</h5>
                              <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={editingGoalData.title}
                                  onChange={(e) => setEditingGoalData({...editingGoalData, title: e.target.value})}
                                  className="input"
                                />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                                    Deadline (optional)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="date"
                                      value={editingGoalData.deadline || ''}
                                      onChange={(e) => setEditingGoalData({...editingGoalData, deadline: e.target.value || null})}
                                      className="input pl-10"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                                    Check-in Frequency
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={editingGoalData.frequency || ''}
                                      onChange={(e) => setEditingGoalData({
                                        ...editingGoalData, 
                                        frequency: e.target.value || null,
                                        start_date: e.target.value && e.target.value !== 'None, I will reach out on my own' 
                                          ? editingGoalData.start_date || new Date().toISOString().split('T')[0]
                                          : null
                                      })}
                                      className="input pl-10 appearance-none"
                                    >
                                      <option value="">Select a routine</option>
                                      {frequencies.map(freq => (
                                        <option key={freq} value={freq}>{freq}</option>
                                      ))}
                                    </select>
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Start Date - Only show if frequency is selected and not "None" */}
                              {editingGoalData.frequency && 
                               editingGoalData.frequency !== 'None, I will reach out on my own' && (
                                <div>
                                  <label className="block text-sm font-medium text-text-secondary mb-1 font-heading">
                                    Start Date
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="date"
                                      value={editingGoalData.start_date || ''}
                                      onChange={(e) => setEditingGoalData({...editingGoalData, start_date: e.target.value || null})}
                                      className="input pl-10"
                                    />
                                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setEditingGoalId(null)}
                                  className="btn btn-outline"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSaveGoal(goal.id)}
                                  className="btn btn-primary"
                                  disabled={!editingGoalData.title.trim()}
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Goal Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Motivation Section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-5 h-5 text-primary-aqua" />
                                    <h5 className="font-medium text-white font-heading">Motivation</h5>
                                  </div>
                                  
                                  {editingMotivationId === (goal.motivations?.[0]?.id || 'new') ? (
                                    <div className="space-y-3">
                                      <textarea
                                        value={editingMotivationText}
                                        onChange={(e) => setEditingMotivationText(e.target.value)}
                                        placeholder="What motivates you to achieve this goal?"
                                        className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg resize-none font-body h-32"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => setEditingMotivationId(null)}
                                          className="btn btn-outline btn-sm"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => handleSaveMotivation(goal.id, goal.motivations?.[0]?.id || null)}
                                          className="btn btn-primary btn-sm"
                                          disabled={!editingMotivationText.trim()}
                                        >
                                          Save
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                      {goal.motivations?.[0]?.motivation_text ? (
                                        <div className="flex justify-between items-start">
                                          <p className="text-white/80 font-body">{goal.motivations[0].motivation_text}</p>
                                          <button
                                            onClick={() => handleEditMotivation(goal.motivations?.[0]?.id, goal.motivations?.[0]?.motivation_text)}
                                            className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors ml-2 flex-shrink-0"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="text-center py-3">
                                          <button
                                            onClick={() => handleEditMotivation('new', '')}
                                            className="btn btn-outline btn-sm"
                                          >
                                            Add Motivation
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Obstacles Section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <GitPullRequestClosed className="w-5 h-5 text-primary-aqua" />
                                    <h5 className="font-medium text-white font-heading">Obstacles</h5>
                                  </div>
                                  
                                  {goal.motivations?.[0] ? (
                                    <div className="space-y-3">
                                      {/* Obstacles List */}
                                      {goal.motivations[0].obstacles && goal.motivations[0].obstacles.length > 0 ? (
                                        <div className="space-y-2 mb-3">
                                          {goal.motivations[0].obstacles.map((obstacle, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                                              <span className="text-sm text-white/80 font-body">{obstacle}</span>
                                              <button
                                                onClick={() => handleRemoveObstacle(goal.id, goal.motivations![0].id, index)}
                                                className="text-white/40 hover:text-red-400 p-1 transition-colors"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-white/50 text-sm italic mb-3 font-body">No obstacles identified yet</p>
                                      )}
                                      
                                      {/* Add Obstacle Form */}
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={newObstacle}
                                          onChange={(e) => setNewObstacle(e.target.value)}
                                          placeholder="Add a potential obstacle..."
                                          className="flex-1 bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent text-sm font-body"
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter' && newObstacle.trim()) {
                                              handleAddObstacle(goal.id, goal.motivations![0].id);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => handleAddObstacle(goal.id, goal.motivations![0].id)}
                                          disabled={!newObstacle.trim()}
                                          className={`p-2 rounded-lg transition-colors ${
                                            newObstacle.trim()
                                              ? 'bg-primary-aqua text-white hover:bg-primary-aqua/80'
                                              : 'bg-white/10 text-white/40 cursor-not-allowed'
                                          }`}
                                        >
                                          <Plus className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                                      <p className="text-white/50 text-sm mb-2 font-body">Add a motivation first to track obstacles</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Commitment Details */}
                              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Clock className="w-5 h-5 text-primary-aqua" />
                                  <h5 className="font-medium text-white font-heading">Commitment Details</h5>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-white/60 font-body mb-1">Deadline:</p>
                                    <p className="text-white font-body">
                                      {goal.deadline 
                                        ? new Date(goal.deadline).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                          })
                                        : 'No specific deadline'}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm text-white/60 font-body mb-1">Check-in Frequency:</p>
                                    <p className="text-white font-body">
                                      {goal.frequency || 'Not specified'}
                                    </p>
                                  </div>
                                  
                                  {goal.frequency && 
                                   goal.frequency !== 'None, I will reach out on my own' && 
                                   goal.start_date && (
                                    <div className="md:col-span-2">
                                      <p className="text-sm text-white/60 font-body mb-1">Started on:</p>
                                      <p className="text-white font-body">
                                        {new Date(goal.start_date).toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        })}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;