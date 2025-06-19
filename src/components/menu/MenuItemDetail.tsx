'use client';

import React from 'react';
import { X, Heart, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useUIStore } from '@/lib/stores/uiStore';

export const MenuItemDetail: React.FC = () => {
  // UI関連は新しいUIStoreから取得
  const { ui, hideItemDetail, toggleFavorite } = useUIStore();
  
  // データ関連は既存ストアから継続取得
  const { getFilteredItems } = useMenuStore();

  const filteredItems = getFilteredItems();
  const selectedItem = filteredItems.find((item, index) => {
    const itemObj = item as Record<string, unknown>;
    const originalName = String(
      itemObj.japanese_name || 
      itemObj.name_japanese || 
      itemObj.original || 
      ''
    );
    const name = String(
      itemObj.english_name || 
      itemObj.name_english || 
      itemObj.name || 
      ''
    );
    const itemId = String(itemObj.id || `${originalName || name || 'item'}-${index}-${ui.selectedCategory}`);
    return itemId === ui.selectedItemId;
  });

  console.log('MenuItemDetail Debug:', {
    selectedItemId: ui.selectedItemId,
    filteredItemsCount: filteredItems.length,
    selectedItemFound: !!selectedItem,
    selectedCategory: ui.selectedCategory,
    filteredItemsPreview: filteredItems.slice(0, 3).map((item, index) => {
      const itemObj = item as Record<string, unknown>;
      const originalName = String(
        itemObj.japanese_name || 
        itemObj.name_japanese || 
        itemObj.original || 
        ''
      );
      const name = String(
        itemObj.english_name || 
        itemObj.name_english || 
        itemObj.name || 
        ''
      );
      const generatedId = String(itemObj.id || `${originalName || name || 'item'}-${index}-${ui.selectedCategory}`);
      return { index, originalName, name, generatedId };
    })
  });

  if (!ui.showItemDetail || !selectedItem) {
    return null;
  }

  const itemObj = selectedItem as Record<string, unknown>;
  const itemIndex = filteredItems.findIndex(item => item === selectedItem);
  
  // Prioritize pre-refactoring data structure
  const name = String(
    itemObj.english_name || 
    itemObj.name_english || 
    itemObj.name || 
    ''
  );
  const originalName = String(
    itemObj.japanese_name || 
    itemObj.name_japanese || 
    itemObj.original || 
    itemObj.name || 
    ''
  );
  
  // Generate consistent itemId using the same logic as in MenuItemsGrid
  const itemId = String(itemObj.id || `${originalName || name || 'item'}-${itemIndex}-${ui.selectedCategory}`);
  
  const description = String(itemObj.description || '');
  const price = String(itemObj.price || '0');
  
  // 価格から数値部分を抽出する関数
  const extractPriceNumber = (priceStr: string): number => {
    const cleanPrice = priceStr.replace(/[^\d]/g, ''); // 数字以外を除去
    const numPrice = parseInt(cleanPrice, 10);
    return isNaN(numPrice) ? 0 : numPrice;
  };
  const subtitle = String(itemObj.subtitle || '');
  const image = String(itemObj.image || '🍽️');
  const ingredients = String(itemObj.ingredients || '');
  const cookingMethod = String(itemObj.cookingMethod || itemObj.cooking_method || '');
  const culturalNote = String(itemObj.culturalNote || itemObj.cultural_note || '');
  const allergens = Array.isArray(itemObj.allergens) ? itemObj.allergens.map(String) : [];
  const tags = Array.isArray(itemObj.tags) ? itemObj.tags.map(String) : [];
  const spiceLevel = Number(itemObj.spice_level || itemObj.spiceLevel || 0);
  const isFavorite = ui.favorites.has(itemId);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 md:p-4 z-50"
        onClick={hideItemDetail}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl md:rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-4 md:p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
            <button
              onClick={hideItemDetail}
              className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white hover:bg-opacity-80 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            
            <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6 pr-12 md:pr-16">
              {/* Image */}
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center text-4xl md:text-6xl flex-shrink-0 mx-auto md:mx-0">
                {image}
              </div>
              
              {/* Basic info */}
              <div className="flex-1 min-w-0 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                  <div className="flex-1 mb-4 md:mb-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{name}</h1>
                    {originalName && originalName !== name && (
                      <p className="text-base md:text-lg text-gray-600 mb-2">{originalName}</p>
                    )}
                    {subtitle && (
                      <p className="text-sm md:text-base text-gray-500 mb-3">{subtitle}</p>
                    )}
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      {(() => {
                        const priceNum = extractPriceNumber(price);
                        return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : 'Price TBD';
                      })()}
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleFavorite(itemId)}
                    className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all duration-200 min-w-[52px] min-h-[52px] md:min-w-[60px] md:min-h-[60px] flex items-center justify-center ${
                      isFavorite
                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                        : 'text-gray-400 bg-gray-50 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Heart 
                      className="h-6 w-6 md:h-8 md:w-8" 
                      fill={isFavorite ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-6 md:space-y-8">
            {/* Description */}
            {description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 flex items-center">
                  📝 Description
                </h3>
                <p className="text-gray-700 leading-relaxed text-base md:text-lg bg-gray-50 p-3 md:p-4 rounded-xl">
                  {description}
                </p>
              </motion.div>
            )}

            {/* Spice Level */}
            {spiceLevel > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-orange-50 border border-orange-200 rounded-xl p-4 md:p-6"
              >
                <h3 className="font-semibold text-orange-800 mb-3 flex items-center text-base md:text-lg">
                  🌶️ Spice Level
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                  <div className="flex">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`text-xl md:text-2xl ${i < spiceLevel ? 'text-orange-500' : 'text-gray-300'}`}
                      >
                        🌶️
                      </span>
                    ))}
                  </div>
                  <span className="text-orange-700 font-medium text-sm md:text-base">
                    {spiceLevel}/5 - {spiceLevel >= 4 ? 'Very Spicy' : spiceLevel >= 3 ? 'Spicy' : spiceLevel >= 2 ? 'Mild' : 'Light'}
                  </span>
                </div>
              </motion.div>
            )}

            {/* Allergen Information */}
            {allergens.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6"
              >
                <h3 className="font-semibold text-red-800 mb-3 flex items-center text-base md:text-lg">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Allergen Information
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {allergens.map((allergen, index) => (
                    <span 
                      key={index}
                      className="bg-red-100 text-red-800 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
                <p className="text-red-700 text-xs md:text-sm">
                  ⚠️ Please inform staff of any allergies before ordering
                </p>
              </motion.div>
            )}

            {/* Detailed Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {ingredients && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-blue-50 rounded-xl p-4 md:p-6"
                >
                  <h3 className="font-semibold text-blue-900 mb-3 text-base md:text-lg">🥘 Main Ingredients</h3>
                  <p className="text-blue-800 leading-relaxed text-sm md:text-base">{ingredients}</p>
                </motion.div>
              )}

              {cookingMethod && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-green-50 rounded-xl p-4 md:p-6"
                >
                  <h3 className="font-semibold text-green-900 mb-3 text-base md:text-lg">👨‍🍳 Cooking Method</h3>
                  <p className="text-green-800 leading-relaxed text-sm md:text-base">{cookingMethod}</p>
                </motion.div>
              )}

              {culturalNote && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-purple-50 rounded-xl p-4 md:p-6 md:col-span-2"
                >
                  <h3 className="font-semibold text-purple-900 mb-3 text-base md:text-lg">🏮 Cultural Background</h3>
                  <p className="text-purple-800 leading-relaxed text-sm md:text-base">{culturalNote}</p>
                </motion.div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <h3 className="font-semibold text-gray-900 mb-3 text-base md:text-lg">🏷️ Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="bg-gray-100 text-gray-700 px-2 md:px-3 py-1 md:py-2 rounded-full text-xs md:text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-between sm:justify-end space-y-3 sm:space-y-0 sm:space-x-4 p-4 md:p-6 border-t bg-gray-50">
            <button
              onClick={hideItemDetail}
              className="px-4 md:px-6 py-2 md:py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors text-sm md:text-base min-h-[44px]"
            >
              Close
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFavorite(itemId)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-semibold transition-all duration-200 text-sm md:text-base min-h-[44px] ${
                isFavorite
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg'
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg'
              }`}
            >
              {isFavorite ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
