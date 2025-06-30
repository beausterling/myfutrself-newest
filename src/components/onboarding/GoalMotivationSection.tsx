import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

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

interface GoalMotivationSectionProps {
  goal: Goal;
  motivation: Motivation | undefined;
  obstacleInput: string;
  onMotivationChange: (value: string) => void;
  onObstacleInputChange: (value: string) => void;
  onAddObstacle: () => void;
  onRemoveObstacle: (obstacleIndex: number) => void;
}

const GoalMotivationSection = ({
  goal,
  motivation,
  obstacleInput,
  onMotivationChange,
  onObstacleInputChange,
  onAddObstacle,
  onRemoveObstacle
}: GoalMotivationSectionProps) => {
  console.log(`🎯 Rendering GoalMotivationSection for goal: ${goal.id}`, {
    goalTitle: goal.title,
    hasMotivation: !!motivation,
    motivationText: motivation?.motivation_text || 'none',
    obstaclesCount: motivation?.obstacles?.length || 0,
    currentObstacleInput: obstacleInput,
    timestamp: new Date().toISOString()
  });

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log(`⌨️ Enter key pressed for goal ${goal.id}, adding obstacle:`, obstacleInput);
      onAddObstacle();
    }
  };

  const handleAddClick = () => {
    console.log(`➕ Add button clicked for goal ${goal.id}, adding obstacle:`, obstacleInput);
    onAddObstacle();
  };

  const handleRemoveClick = (index: number) => {
    const obstacleToRemove = motivation?.obstacles?.[index];
    console.log(`🗑️ Remove button clicked for goal ${goal.id}, removing obstacle at index ${index}:`, obstacleToRemove);
    onRemoveObstacle(index);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`📝 Obstacle input changed for goal ${goal.id}:`, {
      oldValue: obstacleInput,
      newValue: newValue,
      timestamp: new Date().toISOString()
    });
    onObstacleInputChange(newValue);
  };

  const handleMotivationTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log(`📝 Motivation text changed for goal ${goal.id}:`, {
      oldValue: motivation?.motivation_text || '',
      newValue: newValue,
      timestamp: new Date().toISOString()
    });
    onMotivationChange(newValue);
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
      <h4 className="text-lg font-semibold mb-4 font-heading text-white">
        {goal.title}
      </h4>
      
      {/* Motivation Text Area */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
          What motivates you to achieve this goal?
        </label>
        <textarea
          value={motivation?.motivation_text || ''}
          onChange={handleMotivationTextChange}
          placeholder="Describe what drives you to achieve this goal..."
          className="w-full bg-white/5 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg resize-none font-body"
          rows={3}
          required
        />
      </div>

      {/* Obstacles Section */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2 font-heading">
          What obstacles might you face?
        </label>
        
        {/* Existing Obstacles */}
        {motivation?.obstacles && motivation.obstacles.length > 0 && (
          <div className="mb-3 space-y-2">
            {motivation.obstacles.map((obstacle, index) => (
              <div key={`${goal.id}-obstacle-${index}`} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                <span className="flex-1 text-white text-sm font-body">{obstacle}</span>
                <button
                  onClick={() => handleRemoveClick(index)}
                  className="text-red-400 hover:text-red-300 transition-colors p-1"
                  type="button"
                  aria-label={`Remove obstacle: ${obstacle}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Obstacle Input */}
        <div className="flex gap-2">
          <input
            key={`${goal.id}-obstacle-input`}
            type="text"
            value={obstacleInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Add an obstacle..."
            className="flex-1 bg-white/5 text-white border border-white/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-aqua/50 focus:border-transparent backdrop-blur-lg text-sm font-body"
            aria-label={`Add obstacle for ${goal.title}`}
          />
          <button
            onClick={handleAddClick}
            disabled={!obstacleInput?.trim()}
            className={`px-3 py-2 rounded-lg transition-colors ${
              obstacleInput?.trim()
                ? 'bg-primary-aqua text-white hover:bg-primary-aqua/80'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            type="button"
            aria-label={`Add obstacle for ${goal.title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoalMotivationSection;