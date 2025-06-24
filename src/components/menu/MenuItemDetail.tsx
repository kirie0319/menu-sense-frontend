'use client';

import React, { useEffect, useState } from 'react';
import { X, Heart, AlertTriangle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useUIStore } from '@/lib/stores/uiStore';

export const MenuItemDetail: React.FC = () => {
  // UI関連は新しいUIStoreから取得
  const { ui, hideItemDetail, toggleFavorite } = useUIStore();
  
  // データ関連は既存ストアから継続取得
  const { getFilteredItems } = useMenuStore();

  // スライドアップ用の状態管理
  const [dragY, setDragY] = useState(0);

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

  // モバイルでbodyのスクロールを無効化
  useEffect(() => {
    if (ui.showItemDetail) {
      document.body.style.overflow = 'hidden';
      // iOS Safariでの追加対応
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [ui.showItemDetail]);

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
  const ingredients = String(itemObj.ingredients || 'Please ask staff for detailed ingredient information');
  const cookingMethod = String(itemObj.cookingMethod || itemObj.cooking_method || 'Please ask staff about preparation methods');
  const culturalNote = String(itemObj.culturalNote || itemObj.cultural_note || 'Ask our staff about the cultural background and traditional preparation of this dish');
  const allergens = Array.isArray(itemObj.allergens) && itemObj.allergens.length > 0 
    ? itemObj.allergens.map(String) 
    : ['Soy', 'Gluten', 'Please ask staff'];
  const tags = Array.isArray(itemObj.tags) ? itemObj.tags.map(String) : ['Japanese', 'Traditional'];
  const spiceLevel = Number(itemObj.spice_level || itemObj.spiceLevel || 1);
  const isFavorite = ui.favorites.has(itemId);

  // ドラッグでの閉じる処理
  const handleDragEnd = (event: any, info: PanInfo) => {
    const shouldClose = info.velocity.y > 300 || (info.velocity.y > 50 && info.offset.y > 150);
    
    if (shouldClose) {
      hideItemDetail();
    }
    setDragY(0);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end"
        onClick={hideItemDetail}
      >
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 400,
            duration: 0.6,
            ease: "easeOut"
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 400 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          onDrag={(event, info) => {
            setDragY(info.offset.y);
            // タッチフィードバック（振動）
            if (info.offset.y > 100 && navigator.vibrate) {
              navigator.vibrate(10);
            }
          }}
          onDragEnd={handleDragEnd}
          style={{ y: dragY }}
          className="bg-white rounded-t-3xl shadow-2xl w-full h-[95vh] overflow-hidden flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ドラッグハンドル */}
          <div className="flex-shrink-0 w-full py-3 flex justify-center bg-white rounded-t-3xl border-b border-gray-100">
            <div className="w-12 h-1 bg-gray-300 rounded-full cursor-grab active:cursor-grabbing transition-colors duration-200 hover:bg-gray-400"></div>
          </div>

          {/* Header */}
          <div className="flex-shrink-0 relative p-6 md:p-8 border-b bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50">
            <button
              onClick={hideItemDetail}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-white hover:bg-opacity-80 transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center z-10 active:scale-95"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="flex flex-col space-y-6 pr-16">
              {/* Layout optimized for full view */}
              <div className="flex items-start space-x-6">
                {/* Image */}
                <div className="w-32 h-32 bg-gradient-to-br from-orange-100 via-yellow-100 to-pink-100 rounded-3xl flex items-center justify-center text-6xl flex-shrink-0 shadow-lg">
                  {image}
                </div>
                
                {/* Basic info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">{name}</h1>
                  {originalName && originalName !== name && (
                    <p className="text-lg md:text-xl text-gray-600 mb-2">{originalName}</p>
                  )}
                  {subtitle && (
                    <p className="text-base text-gray-500 mb-3">{subtitle}</p>
                  )}
                  <div className="text-2xl md:text-3xl font-bold text-green-600 bg-green-50 px-4 py-2 rounded-2xl inline-block">
                    {(() => {
                      const priceNum = extractPriceNumber(price);
                      return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : 'Price TBD';
                    })()}
                  </div>
                </div>
              </div>

              {/* Favorite button row */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ 
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  }}
                  onClick={() => {
                    toggleFavorite(itemId);
                    // タッチフィードバック
                    if (navigator.vibrate) {
                      navigator.vibrate(30);
                    }
                  }}
                  className={`px-8 py-4 rounded-2xl font-semibold transition-all duration-200 text-base flex items-center space-x-3 shadow-lg hover:shadow-xl ${
                    isFavorite
                      ? 'text-red-500 bg-red-50 hover:bg-red-100 border-2 border-red-200'
                      : 'text-gray-700 bg-gray-100 hover:text-red-500 hover:bg-red-50 border-2 border-gray-200'
                  }`}
                >
                  <Heart 
                    className="h-5 w-5" 
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />
                  <span>{isFavorite ? 'お気に入りから削除' : 'お気に入りに追加'}</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ scrollBehavior: 'smooth' }}>
            <div className="p-6 md:p-8 space-y-8 pb-safe">
              {/* Description */}
              {description && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100"
                >
                  <h3 className="text-xl font-semibold text-blue-900 mb-4 flex items-center">
                    📝 Description
                  </h3>
                  <p className="text-blue-800 leading-relaxed text-lg">
                    {description}
                  </p>
                </motion.div>
              )}

              {/* Spice Level */}
              {spiceLevel > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-6"
                >
                  <h3 className="font-semibold text-orange-800 mb-4 flex items-center text-xl">
                    🌶️ Spice Level
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="flex space-x-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          className={`text-3xl transition-all duration-200 ${
                            i < spiceLevel ? 'text-orange-500 scale-110' : 'text-gray-300'
                          }`}
                        >
                          🌶️
                        </span>
                      ))}
                    </div>
                    <span className="text-orange-700 font-medium text-lg bg-orange-100 px-4 py-2 rounded-xl">
                      {spiceLevel}/5 - {spiceLevel >= 4 ? 'Very Spicy' : spiceLevel >= 3 ? 'Spicy' : spiceLevel >= 2 ? 'Medium' : 'Mild'}
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Allergen Information */}
              {allergens.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6"
                >
                  <h3 className="font-semibold text-red-800 mb-4 flex items-center text-xl">
                    <AlertTriangle className="w-6 h-6 mr-3" />
                    Allergen Information
                  </h3>
                  <div className="flex flex-wrap gap-3 mb-4">
                    {allergens.map((allergen, index) => (
                      <span 
                        key={index}
                        className="bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium border border-red-200"
                      >
                        {allergen}
                      </span>
                    ))}
                  </div>
                  <p className="text-red-700 text-base bg-red-100 p-3 rounded-xl">
                    ⚠️ Please inform staff of any allergies before ordering
                  </p>
                </motion.div>
              )}

              {/* Detailed Information Grid */}
              <div className="space-y-6">
                {ingredients && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200"
                  >
                    <h3 className="font-semibold text-blue-900 mb-4 text-xl">🥘 Main Ingredients</h3>
                    <p className="text-blue-800 leading-relaxed text-base">{ingredients}</p>
                  </motion.div>
                )}

                {cookingMethod && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200"
                  >
                    <h3 className="font-semibold text-green-900 mb-4 text-xl">👨‍🍳 Cooking Method</h3>
                    <p className="text-green-800 leading-relaxed text-base">{cookingMethod}</p>
                  </motion.div>
                )}

                {culturalNote && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200"
                  >
                    <h3 className="font-semibold text-purple-900 mb-4 text-xl">🏮 Cultural Background</h3>
                    <p className="text-purple-800 leading-relaxed text-base">{culturalNote}</p>
                  </motion.div>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-6 border border-gray-200"
                >
                  <h3 className="font-semibold text-gray-900 mb-4 text-xl">🏷️ Tags</h3>
                  <div className="flex flex-wrap gap-3">
                    {tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium hover:from-gray-200 hover:to-slate-200 transition-all duration-200 border border-gray-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* 底部の安全エリア */}
          <div className="h-safe bg-white"></div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
