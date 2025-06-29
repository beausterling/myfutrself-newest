import React from 'react';

interface CategoryTabProps {
  category: {id: string, name: string, is_custom: boolean};
  index: number;
  currentCategoryIndex: number;
  getCategoryIcon: (categoryName: string, isCustom: boolean) => {
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    borderColor: string;
  };
  setCurrentCategoryIndex: (index: number) => void;
}

const CategoryTab: React.FC<CategoryTabProps> = ({
  category,
  index,
  currentCategoryIndex,
  getCategoryIcon,
  setCurrentCategoryIndex
}) => {
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
};

export default CategoryTab;