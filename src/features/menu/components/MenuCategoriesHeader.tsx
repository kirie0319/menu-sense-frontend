'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const MenuCategoriesHeader: React.FC = () => {
  // PLACEHOLDER: State management replacement
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // PLACEHOLDER: Mock categories
  const categories = ['前菜', 'メイン', 'スープ', 'デザート'];

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center w-full border-b border-gray-100">
      <div className="flex overflow-x-auto scrollbar-hide">
        {/* All カテゴリタブ */}
        <motion.button
          onClick={() => setSelectedCategory('all')}
          className={`relative flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-300 whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'text-green-600'
              : 'text-gray-400 hover:text-gray-600'
          }`}
          whileTap={{ scale: 0.98 }}
        >
          All
          
          {/* アクティブタブの下線アニメーション */}
          {selectedCategory === 'all' && (
            <motion.div
              layoutId="headerActiveTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t-full"
              initial={false}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          )}
        </motion.button>

        {/* カテゴリタブ */}
        {categories.map((category, index) => {
          const isSelected = selectedCategory === category;
          
          return (
            <motion.button
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedCategory(category)}
              className={`relative flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-all duration-300 whitespace-nowrap ${
                isSelected
                  ? 'text-green-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="capitalize">{category}</span>
              
              {/* アクティブタブの下線アニメーション */}
              {isSelected && (
                <motion.div
                  layoutId="headerActiveTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600 rounded-t-full"
                  initial={false}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}; 