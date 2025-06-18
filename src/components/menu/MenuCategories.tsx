'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useMenuStore } from '@/lib/store';

export const MenuCategories: React.FC = () => {
  const { 
    ui,
    setSelectedCategory,
    getCategoryList,
    getEmojiForCategory,
    getCurrentMenuData
  } = useMenuStore();

  const categories = getCategoryList();
  const menuData = getCurrentMenuData();

  if (categories.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white"
    >
      {/* シンプルなヘッダー - 余白なし */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Menu Categories
        </h1>
      </div>

      {/* 水平タブバー */}
      <div className="relative border-b border-gray-100">
        <div className="flex overflow-x-auto scrollbar-hide px-4 md:px-6">
          {/* All カテゴリタブ */}
          <motion.button
            onClick={() => setSelectedCategory('all')}
            className={`relative flex-shrink-0 px-6 py-4 text-base font-medium transition-all duration-300 whitespace-nowrap ${
              ui.selectedCategory === 'all'
                ? 'text-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            All
            
            {/* アクティブタブの下線アニメーション */}
            {ui.selectedCategory === 'all' && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full"
                initial={false}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            )}
          </motion.button>

          {/* カテゴリタブ */}
          {categories.map((category, index) => {
            const isSelected = ui.selectedCategory === category;
            
            return (
              <motion.button
                key={category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCategory(category)}
                className={`relative flex-shrink-0 px-6 py-4 text-base font-medium transition-all duration-300 whitespace-nowrap ${
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
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-green-600 rounded-t-full"
                    initial={false}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
