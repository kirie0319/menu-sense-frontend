'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, Loader2 } from 'lucide-react';
import { MenuItemState, IncrementalMenuProps } from '@/types';

const IncrementalMenu = ({ 
  categories, 
  translatedCategories, 
  finalMenu, 
  currentStage 
}: IncrementalMenuProps) => {
  const [menuItems, setMenuItems] = useState<Record<string, MenuItemState[]>>({});
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);

  // Stage 2: 日本語カテゴリからメニューアイテムを初期化
  useEffect(() => {
    if (categories && currentStage >= 2) {
      const newMenuItems: Record<string, MenuItemState[]> = {};
      const newCategoryOrder: string[] = [];

      for (const [category, items] of Object.entries(categories)) {
        if (items.length > 0) {
          newCategoryOrder.push(category);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newMenuItems[category] = items.map((item: any) => ({
            japanese_name: item.name || 'N/A',
            price: item.price || '',
            stage: 2
          }));
        }
      }

      setCategoryOrder(newCategoryOrder);
      setMenuItems(newMenuItems);
    }
  }, [categories, currentStage]);

  // Stage 3: 英語翻訳を追加
  useEffect(() => {
    if (translatedCategories && currentStage >= 3) {
      setMenuItems(prevItems => {
        const updatedItems = { ...prevItems };
        
        for (const [englishCategory, items] of Object.entries(translatedCategories)) {
          // 英語カテゴリ名に対応する日本語カテゴリを見つける
          const categoryMapping: Record<string, string> = {
            'Appetizers': '前菜',
            'Main Dishes': 'メイン',
            'Drinks': 'ドリンク',
            'Desserts': 'デザート'
          };
          
          const japaneseCategory = categoryMapping[englishCategory] || englishCategory;
          
          if (updatedItems[japaneseCategory]) {
            updatedItems[japaneseCategory] = updatedItems[japaneseCategory].map((item, index) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const translatedItem = (items as any[])[index];
              return {
                ...item,
                english_name: translatedItem?.english_name || item.english_name,
                stage: Math.max(item.stage, 3)
              };
            });
          }
        }
        
        return updatedItems;
      });
    }
  }, [translatedCategories, currentStage]);

  // Stage 4: 詳細説明を追加
  useEffect(() => {
    if (finalMenu && currentStage >= 4) {
      setMenuItems(prevItems => {
        const updatedItems = { ...prevItems };
        
        for (const [englishCategory, items] of Object.entries(finalMenu)) {
          const categoryMapping: Record<string, string> = {
            'Appetizers': '前菜',
            'Main Dishes': 'メイン',
            'Drinks': 'ドリンク',
            'Desserts': 'デザート'
          };
          
          const japaneseCategory = categoryMapping[englishCategory] || englishCategory;
          
          if (updatedItems[japaneseCategory]) {
            updatedItems[japaneseCategory] = updatedItems[japaneseCategory].map((item, index) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const finalItem = (items as any[])[index];
              return {
                ...item,
                description: finalItem?.description || item.description,
                stage: Math.max(item.stage, 4)
              };
            });
          }
        }
        
        return updatedItems;
      });
    }
  }, [finalMenu, currentStage]);

  const getStageIcon = (stage: number) => {
    if (stage >= 4) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (stage >= 3) return <CheckCircle className="h-4 w-4 text-blue-500" />;
    if (stage >= 2) return <CheckCircle className="h-4 w-4 text-yellow-500" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getItemStatus = (stage: number) => {
    if (stage >= 4) return 'completed';
    if (stage >= 3) return 'translated';
    if (stage >= 2) return 'categorized';
    return 'pending';
  };

  const getItemStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 shadow-md';
      case 'translated':
        return 'bg-blue-50 border-blue-200 shadow-sm';
      case 'categorized':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (Object.keys(menuItems).length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">Waiting for menu analysis...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          📋 Menu Construction in Progress
        </h3>
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span>Stage 2: Categorized</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            <span>Stage 3: Translated</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span>Stage 4: Complete</span>
          </div>
        </div>
        
        {/* Stage 3の強化情報 */}
        {currentStage >= 3 && (
          <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block">
            🌍 Enhanced with Google Translate API + OpenAI fallback for faster translations
          </div>
        )}
      </div>

      <div className="space-y-6">
        {categoryOrder.map((category, categoryIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: categoryIndex * 0.2 }}
            className="space-y-3"
          >
            <h4 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              {category}
            </h4>
            
            <div className="grid gap-3">
              <AnimatePresence>
                {menuItems[category]?.map((item, itemIndex) => {
                  const status = getItemStatus(item.stage);
                  
                  return (
                    <motion.div
                      key={`${category}-${itemIndex}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ 
                        delay: categoryIndex * 0.2 + itemIndex * 0.1,
                        duration: 0.3 
                      }}
                      className={`border-2 rounded-lg p-4 transition-all duration-500 ${getItemStyle(status)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* 日本語名 */}
                          <div className="flex items-center space-x-2">
                            {getStageIcon(item.stage)}
                            <span className="font-medium text-gray-900">
                              {item.japanese_name}
                            </span>
                            {item.price && (
                              <span className="text-sm font-semibold text-green-600">
                                {item.price}
                              </span>
                            )}
                          </div>

                          {/* 英語名 */}
                          <AnimatePresence>
                            {item.english_name && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-blue-600 font-medium"
                              >
                                {item.english_name}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* 詳細説明 */}
                          <AnimatePresence>
                            {item.description && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.4, delay: 0.1 }}
                                className="text-sm text-gray-600 leading-relaxed"
                              >
                                {item.description}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ローディング状態表示 */}
                          {item.stage < 4 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center space-x-2 text-xs text-gray-500"
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>
                                {item.stage < 3 ? 'Translating...' : 'Adding description...'}
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 全体進捗表示 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 p-4 bg-gray-50 rounded-lg"
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Menu Completion</span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round(
              (Object.values(menuItems).flat().filter(item => item.stage >= 4).length / 
               Object.values(menuItems).flat().length) * 100
            )}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-yellow-400 via-blue-500 to-green-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${
                (Object.values(menuItems).flat().filter(item => item.stage >= 4).length / 
                 Object.values(menuItems).flat().length) * 100
              }%` 
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IncrementalMenu; 