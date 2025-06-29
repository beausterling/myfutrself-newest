import React from 'react';
import { Plus, X, Lightbulb } from 'lucide-react';

interface GoalCategorySectionProps {
  category: {id: string, name: string, is_custom: boolean};
  categoryKey: string;
  categoryIconData: {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  };
  suggestions: string[];
  currentGoals: string[];
  showSuggestionsForCategory: boolean;
  handleToggleSuggestions: (categoryKey: string) => void;
  handleSuggestionClick: (categoryKey: string, suggestion: string) => void;
  newGoals: Record<string, string>;
  handleNewGoalChange: (categoryKey: string, value: string) => void;
  handleAddCustomGoal: (categoryKey: string) => void;
  handleGoalToggle: (categoryKey: string, goal: string) => void;
}

const GoalCategorySection: React.FC<GoalCategorySectionProps> = ({
  category,
  categoryKey,
  categoryIconData,
  suggestions,
  currentGoals,
  showSuggestionsForCategory,
  handleToggleSuggestions,
  handleSuggestionClick,
  newGoals,
  handleNewGoalChange,
  handleAddCustomGoal,
  handleGoalToggle
}) => {
  return (
    <div className="space-y-6">
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

      {/* Goals Section */}
      <div 
        className="rounded-2xl border transition-all duration-300"
        style={{ 
          backgroundColor: categoryIconData.bgColor,
          borderColor: categoryIconData.borderColor
        }}
      >
        <div className="p-6">
          {/* Header with Ideas button */}
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-semibold text-white font-heading">
              Your Goals
            </h4>
            <button
              onClick={() => handleToggleSuggestions(categoryKey)}
              className="flex items-center gap-2 text-sm px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors font-heading"
              style={{ color: categoryIconData.color }}
            >
              <Lightbulb className="w-4 h-4" />
              {showSuggestionsForCategory ? 'Hide' : 'Ideas'}
            </button>
          </div>

          {/* Suggestions */}
          {showSuggestionsForCategory && (
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-sm font-medium text-white/80 mb-3 font-heading">
                💡 Goal ideas for {category.name}:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {suggestions.map((suggestion, suggestionIndex) => (
                  <button
                    key={suggestionIndex}
                    onClick={() => handleSuggestionClick(categoryKey, suggestion)}
                    className={`w-full text-left p-3 rounded-lg transition-colors text-sm font-body ${
                      currentGoals.includes(suggestion)
                        ? 'bg-white/10 text-white/50 cursor-not-allowed'
                        : 'bg-white/5 hover:bg-white/10 text-white/90'
                    }`}
                    disabled={currentGoals.includes(suggestion)}
                  >
                    "{suggestion}"
                    {currentGoals.includes(suggestion) && ' ✓'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Goals */}
          <div className="space-y-3 mb-6">
            {currentGoals.map((goal, goalIndex) => (
              <div
                key={goalIndex}
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <span className="text-base font-body text-white">{goal}</span>
                <button
                  onClick={() => handleGoalToggle(categoryKey, goal)}
                  className="text-white/40 hover:text-red-400 p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Custom Goal */}
          <div className="flex gap-3">
            <input
              type="text"
              value={newGoals[categoryKey] || ''}
              onChange={(e) => handleNewGoalChange(categoryKey, e.target.value)}
              placeholder={currentGoals.length > 0 ? "Add another goal..." : "What goal do you want to achieve?"}
              className="flex-grow bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:border-transparent backdrop-blur-lg text-base font-body placeholder-white/40"
              style={{ 
                focusRingColor: categoryIconData.color + '50'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomGoal(categoryKey);
                }
              }}
            />
            <button
              onClick={() => handleAddCustomGoal(categoryKey)}
              className="px-6 py-3 rounded-xl font-medium transition-colors font-heading"
              style={{
                backgroundColor: newGoals[categoryKey]?.trim() ? categoryIconData.color : 'rgba(255, 255, 255, 0.1)',
                color: newGoals[categoryKey]?.trim() ? 'white' : 'rgba(255, 255, 255, 0.4)'
              }}
              disabled={!newGoals[categoryKey]?.trim()}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCategorySection;