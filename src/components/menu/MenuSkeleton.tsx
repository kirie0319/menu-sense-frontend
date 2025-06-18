'use client';

import React from 'react';
import { motion } from 'framer-motion';

// カテゴリ部分のスケルトンスクリーン
export const MenuCategoriesSkeleton: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-100 p-4 md:p-6"
    >
      <div className="mb-4 md:mb-6">
        <div className="h-6 md:h-8 bg-gray-200 rounded-lg w-1/3 mb-2 animate-pulse"></div>
        <div className="h-4 md:h-5 bg-gray-100 rounded-lg w-1/4 animate-pulse"></div>
      </div>

      {/* Mobile: Horizontal scroll skeleton */}
      <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[100px] h-[80px] bg-gray-200 rounded-xl animate-pulse"
          />
        ))}
      </div>

      {/* Desktop: Wrap skeleton */}
      <div className="hidden md:flex md:flex-wrap md:gap-3 lg:gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="w-32 lg:w-40 h-16 lg:h-20 bg-gray-200 rounded-xl lg:rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </motion.div>
  );
};

// メニューアイテムグリッド部分のスケルトンスクリーン
export const MenuItemsGridSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 md:space-y-6 pb-16 md:pb-20">
      {Array.from({ length: 6 }, (_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-2xl md:rounded-3xl shadow-md md:shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="p-4 md:p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3 md:pr-6 min-w-0">
                <div className="flex items-start justify-between mb-2 md:mb-3">
                  <div className="flex-1 min-w-0">
                    {/* Title and price skeleton */}
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <div className="h-5 md:h-6 bg-gray-200 rounded-lg w-2/3 animate-pulse"></div>
                      <div className="h-5 md:h-6 bg-gray-200 rounded-lg w-16 animate-pulse ml-2 md:ml-3"></div>
                    </div>
                    {/* Subtitle skeleton */}
                    <div className="h-3 md:h-4 bg-gray-100 rounded-lg w-3/4 mb-1 animate-pulse"></div>
                  </div>
                  {/* Favorite button skeleton */}
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse ml-2 md:ml-3"></div>
                </div>
                
                {/* Description skeleton */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <div className="h-3 md:h-4 bg-gray-100 rounded-lg w-full animate-pulse"></div>
                  <div className="h-3 md:h-4 bg-gray-100 rounded-lg w-4/5 animate-pulse"></div>
                </div>

                {/* Tags and details skeleton */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 md:gap-2">
                    <div className="h-6 bg-gray-100 rounded-full w-16 animate-pulse"></div>
                    <div className="h-6 bg-gray-100 rounded-full w-20 animate-pulse"></div>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-lg w-20 animate-pulse"></div>
                </div>
              </div>

              {/* Image skeleton */}
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-200 rounded-xl md:rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// メニューページ全体のスケルトンスクリーン
export const MenuPageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* ヘッダー部分（オプション）*/}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="text-4xl md:text-6xl mb-4">🍽️</div>
          <div className="h-8 bg-gray-200 rounded-lg w-64 mx-auto mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-100 rounded-lg w-48 mx-auto animate-pulse"></div>
        </motion.div>

        {/* カテゴリスケルトン */}
        <MenuCategoriesSkeleton />

        {/* メニューアイテムスケルトン */}
        <MenuItemsGridSkeleton />
      </div>
    </div>
  );
}; 