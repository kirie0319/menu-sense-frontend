'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useUIStore } from '@/lib/stores/uiStore';

export const MenuItemsGrid: React.FC = () => {
  // UI関連は新しいUIStoreから取得
  const { ui, showItemDetail, toggleFavorite } = useUIStore();
  
  // データ関連は既存ストアから継続取得
  const { 
    getFilteredItems,
    getGeneratedImageUrl,
    hasGeneratedImages
  } = useMenuStore();

  const [newItemAnimations, setNewItemAnimations] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());

  const filteredItems = getFilteredItems();

  // 画像生成状況のデバッグ情報
  useEffect(() => {
    if (hasGeneratedImages()) {
      console.log(`🖼️ [MenuItemsGrid] Image generation detected, checking mappings...`);
      filteredItems.forEach((item, index) => {
        const itemObj = item as Record<string, unknown>;
        const itemName = String(itemObj.english_name || itemObj.name_english || itemObj.name || '');
        const imageUrl = getGeneratedImageUrl(itemObj);
        
        console.log(`🔍 [MenuItemsGrid] Item ${index + 1}: "${itemName}" → ${imageUrl ? 'IMAGE FOUND' : 'NO IMAGE'}`, {
          itemName,
          imageUrl,
          itemData: itemObj
        });
      });
    }
  }, [filteredItems, hasGeneratedImages, getGeneratedImageUrl]);

  const handleImageLoad = (itemId: string) => {
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const handleImageError = (itemId: string) => {
    setImageErrors(prev => new Set(prev).add(itemId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const handleImageLoadStart = (itemId: string) => {
    setImageLoading(prev => new Set(prev).add(itemId));
  };

  if (filteredItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 md:py-16"
      >
        <div className="text-6xl md:text-8xl mb-4 md:mb-6">🔍</div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-4">No menu items found</h3>
        <p className="text-gray-500 text-sm md:text-base">Try selecting a different category</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-6 pb-16 md:pb-20">
      <AnimatePresence>
        {filteredItems.map((item, index) => {
          const itemObj = item as Record<string, unknown>;
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
            ''
          );
          
          // Generate unique itemId using multiple identifiers
          const itemId = String(itemObj.id || `${originalName || name || 'item'}-${index}-${ui.selectedCategory}`);
          const subtitle = String(itemObj.subtitle || '');
          const description = String(itemObj.description || '');
          const price = String(itemObj.price || '0');
          
          // 価格から数値部分を抽出する関数
          const extractPriceNumber = (priceStr: string): number => {
            const cleanPrice = priceStr.replace(/[^\d]/g, ''); // 数字以外を除去
            const numPrice = parseInt(cleanPrice, 10);
            return isNaN(numPrice) ? 0 : numPrice;
          };
          const defaultEmoji = String(itemObj.image || '🍽️');
          const generatedImageUrl = getGeneratedImageUrl(itemObj);
          const hasImage = hasGeneratedImages() && generatedImageUrl && !imageErrors.has(itemId);
          const isLoadingImage = imageLoading.has(itemId);
          
          const tags = Array.isArray(itemObj.tags) ? itemObj.tags.map(String) : ['Japanese'];
          const spiceLevel = Number(itemObj.spice_level || itemObj.spiceLevel || 0);
          const isFavorite = ui.favorites.has(itemId);
          const isNewItem = newItemAnimations.has(itemId);

          const truncatedDescription = description.length > 100 
            ? description.substring(0, 100) + '...' 
            : description;

          const handleCardClick = () => {
            // モバイルデバイスでのバイブレーション効果（対応している場合）
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
            
            console.log('Card clicked:', {
              itemId,
              name,
              originalName,
              index,
              category: ui.selectedCategory,
              price
            });
            showItemDetail(itemId);
          };

          return (
            <motion.div
              key={itemId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ 
                scale: 1.02, 
                y: -4,
                transition: { duration: 0.2, ease: "easeOut" }
              }}
              whileTap={{ 
                scale: 0.96,
                transition: { duration: 0.1, ease: "easeInOut" }
              }}
              className={`relative bg-white rounded-3xl md:rounded-4xl shadow-lg md:shadow-xl border border-gray-100 overflow-hidden hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 cursor-pointer group ${
                isNewItem ? 'animate-pulse border-green-300 shadow-green-200' : ''
              }`}
              onClick={handleCardClick}
              layout
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="p-5 md:p-7">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4 md:pr-6 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center min-w-0">
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate transition-all duration-300 group-hover:text-orange-600">
                              {name}
                            </h3>
                          </div>
                          <div className="text-xl md:text-2xl font-bold text-green-600 ml-3 flex-shrink-0 bg-green-50 px-3 py-1 rounded-xl">
                            {(() => {
                              const priceNum = extractPriceNumber(price);
                              return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : 'TBD';
                            })()}
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 truncate mb-1">{originalName}</p>
                        {subtitle && (
                          <p className="text-xs md:text-sm text-gray-500 truncate">{subtitle}</p>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed mb-4 line-clamp-2 md:line-clamp-3">
                      {truncatedDescription}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 2).map((tag, tagIndex) => (
                          <span 
                            key={tagIndex} 
                            className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1.5 rounded-full font-medium transition-all duration-200 hover:from-blue-200 hover:to-purple-200"
                          >
                            {tag}
                          </span>
                        ))}
                        {spiceLevel > 0 && (
                          <span className="text-xs bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-3 py-1.5 rounded-full font-medium flex items-center">
                            {'🌶️'.repeat(Math.min(spiceLevel, 3))}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(itemId);
                        }}
                        className="p-3 ml-3 flex-shrink-0 hover:scale-110 transition-all duration-200 rounded-full hover:bg-red-50 min-w-[48px] min-h-[48px] flex items-center justify-center active:scale-95"
                      >
                        <Heart 
                          size={20} 
                          className={`transition-all duration-200 ${
                            isFavorite 
                              ? 'text-red-500 fill-current scale-110' 
                              : 'text-gray-400 hover:text-red-400'
                          }`} 
                        />
                      </button>
                    </div>
                  </div>

                  <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-orange-100 via-yellow-100 to-red-100 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-5xl flex-shrink-0 group-hover:scale-105 transition-all duration-300 relative overflow-hidden shadow-lg">
                    {hasImage ? (
                      <>
                        {isLoadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                          </div>
                        )}
                        <img
                          src={generatedImageUrl}
                          alt={name}
                          className={`w-full h-full object-cover rounded-2xl md:rounded-3xl transition-all duration-300 ${
                            isLoadingImage ? 'opacity-0' : 'opacity-100'
                          }`}
                          onLoad={() => handleImageLoad(itemId)}
                          onError={() => handleImageError(itemId)}
                          onLoadStart={() => handleImageLoadStart(itemId)}
                        />
                      </>
                    ) : (
                      <span className="text-3xl md:text-5xl filter drop-shadow-sm">{defaultEmoji}</span>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-3xl"></div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center text-xs text-orange-600 bg-white bg-opacity-90 rounded-full px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse mr-2"></div>
                  <span className="hidden sm:inline font-medium">タップして詳細</span>
                  <span className="sm:hidden font-medium">詳細</span>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 to-pink-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl md:rounded-4xl pointer-events-none"></div>
              
              <div className="absolute inset-0 rounded-3xl md:rounded-4xl border border-transparent bg-gradient-to-r from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
