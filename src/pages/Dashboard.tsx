import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { CheckCircle, BarChart3, Calendar, PieChart, Plus, Target, Trash2, AlertCircle } from 'lucide-react';
import { createAuthenticatedSupabaseClient } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Goal = Database['public']['Tables']['goals']['Row'] & {
  categories: Database['public']['Tables']['categories']['Row'] | null;
};

type Category = Database['public']['Tables']['categories']['Row'];

const Dashboard = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  // State for data
  const [goals, setGoals] = useState<Goal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // State for adding new goals
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  
  // State for reflection
  const [reflection, setReflection] = useState('');

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

        // Fetch user's goals with category information
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
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
          throw goalsError;
        }

        console.log('Goals fetched:', goalsData?.length || 0);
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
            description,
            is_custom
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
      value: new Set(goals.map(goal => goal.category_id)).size.toString() 
    },
    { 
      icon: <PieChart className="w-6 h-6 text-primary-aqua" />, 
      label: 'This Week', 
      value: goals.filter(goal => {
        const created = new Date(goal.created_at || '');
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length.toString()
    },
    { 
      icon: <BarChart3 className="w-6 h-6 text-primary-aqua" />, 
      label: 'Focus Areas', 
      value: categories.filter(cat => goals.some(goal => goal.category_id === cat.id)).length.toString()
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
    <div className={`max-w-5xl mx-auto px-4 py-8 space-y-8 ${isScrolled ? 'scrolled' : ''}`}>
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

      {/* Goals List */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4 font-heading">Your Goals</h2>
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-text-secondary/50 mx-auto mb-3" />
            <p className="text-text-secondary font-body">No goals yet. Add your first goal above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-white font-heading">{goal.title}</h3>
                  <p className="text-sm text-text-secondary font-body">
                    {goal.categories?.name || 'Unknown Category'}
                    {goal.deadline && (
                      <span className="ml-2">• Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                    )}
                    {goal.frequency && (
                      <span className="ml-2">• {goal.frequency}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                  title="Delete goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Reflection */}
      <div className="card">
        <h2 className="text-lg font-medium mb-4 font-heading">Today's Reflection</h2>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What would your future self be proud of you for doing today?"
          className="input h-32 resize-none mb-4"
        />
        <button className="btn btn-primary font-heading">Save Reflection</button>
      </div>
    </div>
  );
};

export default Dashboard;