'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useProgressStore } from '@/lib/stores/progressStore';

export const DebugPanel: React.FC = () => {
  // UI関連は引き続きメインストアから
  const {
    ui,
    getCurrentMenuData,
    getFilteredItems,
    getCategoryList
  } = useMenuStore();

  // Progress関連は新しいProgressStoreから
  const { currentStage, stageData } = useProgressStore();

  const menuData = getCurrentMenuData();
  const filteredItems = getFilteredItems();
  const categoryList = getCategoryList();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-100 p-4 md:p-6"
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">🐛 Debug Information</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Stage Information */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            📊 Stage Information
          </h3>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4">
            <div className="space-y-2 text-sm md:text-base">
              <div>Current Stage: {currentStage}</div>
              <div>Stage Data Keys: {Object.keys(stageData).join(', ') || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Menu Data */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            🍽️ Menu Data
          </h3>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4">
            <div className="space-y-2 text-sm md:text-base">
              <div>Menu Categories: {menuData ? Object.keys(menuData).length : 0}</div>
              <div>Total Items: {menuData ? Object.values(menuData).flat().length : 0}</div>
              <div>Filtered Items: {filteredItems.length}</div>
            </div>
          </div>
        </div>

        {/* UI State */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            ⚙️ UI State
          </h3>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4">
            <div className="space-y-2 text-sm md:text-base">
              <div>Selected Category: {ui.selectedCategory}</div>
              <div>Favorites: {ui.favorites.size}</div>
              <div>Current View: {ui.currentView}</div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            📂 Categories
          </h3>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4">
            <div className="space-y-1 text-sm md:text-base">
              {categoryList.length > 0 ? (
                categoryList.map((category, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{category}</span>
                    <span className="text-gray-500">
                      {menuData?.[category]?.length || 0} items
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No categories available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Preview */}
      {menuData && (
        <div className="mt-4 md:mt-6 space-y-3 md:space-y-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 flex items-center">
            📋 Raw Data Preview
          </h3>
          <div className="bg-gray-50 rounded-lg md:rounded-xl p-3 md:p-4">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(menuData, null, 2).substring(0, 500)}
              {JSON.stringify(menuData, null, 2).length > 500 && '...'}
            </pre>
          </div>
        </div>
      )}
    </motion.div>
  );
};
