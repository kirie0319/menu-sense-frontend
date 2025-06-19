'use client';

import React from 'react';
import { Category, StageData, MenuCategoryListProps } from '@/types';
import { useMenuStore } from '@/lib/store';
import { useProgressStore } from '@/lib/stores/progressStore';

const MenuCategoryList: React.FC<MenuCategoryListProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  currentStage,
  stageData
}) => {
  // Progress関連は新しいProgressStoreから
  const { getCategoryProgress, getOverallProgress } = useProgressStore();

  const getButtonStyle = (category: Category) => {
    if (selectedCategory === category.id) {
      return 'bg-orange-500 text-white';
    }
    
    // リアルタイム進捗データを取得
    const progress = category.id === 'all' ? null : getCategoryProgress(category.id);
    
    if (progress) {
      // Stage 4のリアルタイム状態判定
      if (progress.processing) {
        return 'bg-orange-100 text-orange-700 ring-2 ring-orange-200 animate-pulse';
      } else if (progress.isCompleted) {
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      } else if (progress.completed > 0 || progress.partial > 0) {
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 animate-pulse';
      }
    }
    
    // 従来のロジック（Stage 3以下）
    if (category.isCurrentlyProcessing) {
      return 'bg-orange-100 text-orange-700 ring-2 ring-orange-200 animate-pulse';
    } else if ((category.completed || 0) > 0 && (category.completed || 0) === (category.count || 0)) {
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    } else if ((category.realtimeCompleted || category.completed || 0) > 0) {
      return 'bg-green-100 text-green-700 hover:bg-green-200';
    } else if ((category.realtimePartial || category.partiallyCompleted || 0) > 0) {
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 animate-pulse';
    } else if ((category.realtimeTranslated || category.translated || 0) > 0) {
      return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
    } else {
      return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const getProgressInfo = (category: Category) => {
    if (category.id === 'all') {
      // 全体進捗の表示
      const overallProgress = getOverallProgress();
      if (overallProgress) {
        const totalProcessed = overallProgress.completedItems + overallProgress.partialItems;
        return `${totalProcessed}/${overallProgress.totalItems}`;
      }
      
      // フォールバック
      if (currentStage >= 4) {
        const totalProgressing = (category.completed || 0) + (category.partiallyCompleted || 0);
        return `${totalProgressing}/${category.count || 0}`;
      } else {
        return `${category.completed || 0}/${category.count || 0}`;
      }
    } else {
      // 個別カテゴリの進捗
      const progress = getCategoryProgress(category.id);
      if (progress && currentStage >= 4) {
        const totalProcessed = progress.completed + progress.partial;
        return `${totalProcessed}/${progress.total}`;
      }
      
      // フォールバック
      if (currentStage >= 4) {
        const totalProgressing = (category.realtimeCompleted || category.completed || 0) + 
                                (category.realtimePartial || category.partiallyCompleted || 0);
        return `${totalProgressing}/${category.count || 0}`;
      } else if (currentStage >= 3) {
        return `${category.realtimeTranslated || category.translated || 0}/${category.count || 0}`;
      } else {
        return `${category.count || 0}`;
      }
    }
  };

  const getCategoryProgressPercent = (category: Category) => {
    if (category.id === 'all') {
      const overallProgress = getOverallProgress();
      return overallProgress?.progressPercent || 0;
    } else {
      const progress = getCategoryProgress(category.id);
      if (progress && progress.total > 0) {
        return Math.round(((progress.completed + progress.partial * 0.5) / progress.total) * 100);
      }
      return category.progress || 0;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-[80px] sm:top-[88px] z-10">
      <div className="flex overflow-x-auto p-3 sm:p-4 space-x-2 sm:space-x-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategorySelect(category.id)}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${getButtonStyle(category)}`}
          >
            <span className="mr-1 sm:mr-2">{category.icon}</span>
            {category.name}
            {(() => {
              const progress = category.id === 'all' ? null : getCategoryProgress(category.id);
              const isProcessing = category.isCurrentlyProcessing || (progress?.processing);
              
              if (isProcessing) {
                return (
                  <span className="ml-1 text-xs flex items-center">
                    <span className="inline-block w-1 h-1 bg-current rounded-full animate-bounce"></span>
                    <span className="inline-block w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{animationDelay: '0.2s'}}></span>
                    <span className="inline-block w-1 h-1 bg-current rounded-full animate-bounce ml-0.5" style={{animationDelay: '0.4s'}}></span>
                  </span>
                );
              }
              
              if (progress?.isCompleted) {
                return (
                  <span className="ml-1 text-xs">
                    <span className="inline-block text-green-600">✓</span>
                  </span>
                );
              }
              
              return null;
            })()}
            {category.id !== 'all' && (
              <span className="ml-1 text-xs opacity-75">
                ({getProgressInfo(category)})
              </span>
            )}
            {category.id === 'all' && (
              <span className="ml-1 text-xs opacity-75">
                ({getProgressInfo(category)})
              </span>
            )}
            {/* リアルタイム進捗バー */}
            {(() => {
              const progressPercent = getCategoryProgressPercent(category);
              return progressPercent > 0 && progressPercent < 100 && currentStage >= 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              );
            })()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuCategoryList;
