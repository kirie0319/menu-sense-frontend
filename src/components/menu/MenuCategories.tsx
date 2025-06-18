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
      className="bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-100 p-4 md:p-6"
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">
          🍴 Select Category
        </h2>
        <p className="text-gray-600 text-sm md:text-base">
          Browse {categories.length} categories
        </p>
      </div>

      {/* Mobile: Horizontal scroll, Desktop: Wrap */}
      <div className="md:flex md:flex-wrap md:gap-3 lg:gap-4">
        {/* Mobile horizontal scroll container */}
        <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {/* All items button - Mobile */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory('all')}
            className={`flex-shrink-0 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-md min-w-[100px] ${
              ui.selectedCategory === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-300 scale-105'
                : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-md border-2 border-gray-200 hover:border-orange-300'
            }`}
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-lg">🍽️</span>
              <div>
                <div>All</div>
                <div className="text-xs opacity-80">
                  {menuData ? Object.values(menuData).flat().length : 0}
                </div>
              </div>
            </div>
            {ui.selectedCategory === 'all' && (
              <motion.div
                layoutId="selectedCategoryIndicator"
                className="absolute inset-0 border-2 border-white rounded-xl"
                initial={false}
                transition={{ duration: 0.3 }}
              />
            )}
          </motion.button>

          {/* Category buttons - Mobile */}
          {categories.map((category, index) => {
            const isSelected = ui.selectedCategory === category;
            const emoji = getEmojiForCategory(category);
            const itemCount = menuData?.[category]?.length || 0;
            
            return (
              <motion.button
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(category)}
                className={`relative flex-shrink-0 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 shadow-md min-w-[100px] ${
                  isSelected
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-300 scale-105'
                    : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-md border-2 border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-lg">{emoji}</span>
                  <div>
                    <div className="capitalize">{category}</div>
                    <div className="text-xs opacity-80">
                      {itemCount}
                    </div>
                  </div>
                </div>
                
                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    layoutId="selectedCategoryIndicatorMobile"
                    className="absolute inset-0 border-2 border-white rounded-xl"
                    initial={false}
                    transition={{ duration: 0.3 }}
                  />
                )}

                {/* Item count badge */}
                {itemCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? 'bg-white text-orange-600'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Desktop: All items button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSelectedCategory('all')}
          className={`hidden md:flex relative px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-lg transition-all duration-300 shadow-lg ${
            ui.selectedCategory === 'all'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-300 scale-105'
              : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-md border-2 border-gray-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center space-x-2 lg:space-x-3">
            <span className="text-xl lg:text-2xl">🍽️</span>
            <div>
              <div>All</div>
              <div className="text-xs opacity-80">
                {menuData ? Object.values(menuData).flat().length : 0} items
              </div>
            </div>
          </div>
          {ui.selectedCategory === 'all' && (
            <motion.div
              layoutId="selectedCategoryIndicatorDesktop"
              className="absolute inset-0 border-2 lg:border-3 border-white rounded-xl lg:rounded-2xl"
              initial={false}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.button>

        {/* Desktop: Category buttons */}
        {categories.map((category, index) => {
          const isSelected = ui.selectedCategory === category;
          const emoji = getEmojiForCategory(category);
          const itemCount = menuData?.[category]?.length || 0;
          
          return (
            <motion.button
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`hidden md:flex relative px-4 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-sm lg:text-lg transition-all duration-300 shadow-lg ${
                isSelected
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-300 scale-105'
                  : 'bg-white text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:shadow-md border-2 border-gray-200 hover:border-orange-300'
              }`}
            >
              <div className="flex items-center space-x-2 lg:space-x-3">
                <span className="text-xl lg:text-2xl">{emoji}</span>
                <div>
                  <div className="capitalize">{category}</div>
                  <div className="text-xs opacity-80">
                    {itemCount} items
                  </div>
                </div>
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  layoutId="selectedCategoryIndicatorDesktop"
                  className="absolute inset-0 border-2 lg:border-3 border-white rounded-xl lg:rounded-2xl"
                  initial={false}
                  transition={{ duration: 0.3 }}
                />
              )}

              {/* Item count badge */}
              {itemCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute -top-1 lg:-top-2 -right-1 lg:-right-2 w-5 h-5 lg:w-6 lg:h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-white text-orange-600'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
