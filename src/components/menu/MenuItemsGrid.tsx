'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Info, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/lib/store';

// Cursor-style typewriter effect component
const TypewriterText = ({ text, speed = 50 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    // Reset when text changes
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return <span>{displayText}</span>;
};

export const MenuItemsGrid: React.FC = () => {
  const { 
    ui,
    showItemDetail,
    toggleFavorite,
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
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              className={`bg-white rounded-2xl md:rounded-3xl shadow-md md:shadow-lg border border-gray-100 overflow-hidden hover:shadow-lg md:hover:shadow-2xl transition-all duration-300 cursor-pointer group ${
                isNewItem ? 'animate-pulse border-green-300 shadow-green-100' : ''
              }`}
              onClick={handleCardClick}
              layout
            >
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-3 md:pr-6 min-w-0">
                    <div className="flex items-start justify-between mb-2 md:mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 md:mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 truncate group-hover:text-orange-600 transition-colors duration-200">
                            {isNewItem ? (
                              <TypewriterText text={name} speed={50} />
                            ) : (
                              name
                            )}
                          </h3>
                          <span className="text-lg md:text-xl font-bold text-green-600 ml-2 md:ml-3 flex-shrink-0 text-sm md:text-base">
                            {(() => {
                              const priceNum = extractPriceNumber(price);
                              return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : 'Price TBD';
                            })()}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-500 truncate mb-1">
                          {originalName} {subtitle && `• ${subtitle}`}
                        </p>
                        {spiceLevel > 0 && (
                          <div className="flex items-center space-x-1 mb-2">
                            <span className="text-xs text-orange-600 font-medium">Spice:</span>
                            {Array.from({ length: Math.min(spiceLevel, 3) }, (_, i) => (
                              <span key={i} className="text-orange-500">🌶️</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(itemId);
                        }}
                        className="p-2 ml-2 md:ml-3 flex-shrink-0 hover:scale-110 transition-all duration-200 rounded-full hover:bg-red-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Heart 
                          size={18} 
                          className={`transition-all duration-200 ${
                            isFavorite 
                              ? 'text-red-500 fill-current scale-110' 
                              : 'text-gray-400 hover:text-red-400'
                          }`} 
                        />
                      </button>
                    </div>
                    
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed mb-3 md:mb-4 line-clamp-2 md:line-clamp-3">
                      {truncatedDescription}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1 md:gap-2">
                        {tags.slice(0, 2).map((tag: string, tagIndex: number) => (
                          <span 
                            key={tagIndex} 
                            className="text-xs bg-gray-100 text-gray-700 px-2 md:px-3 py-1 rounded-full font-medium hover:bg-gray-200 transition-colors duration-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Info className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span className="hidden sm:inline">View details</span>
                        <span className="sm:hidden">Details</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-xl md:rounded-2xl flex items-center justify-center text-2xl md:text-4xl flex-shrink-0 group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
                    {hasImage ? (
                      <>
                        {isLoadingImage && (
                          <div className="absolute inset-0 flex items-center justify-center bg-orange-50">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                          </div>
                        )}
                        <img
                          src={generatedImageUrl}
                          alt={name}
                          className={`w-full h-full object-cover rounded-xl md:rounded-2xl transition-opacity duration-300 ${
                            isLoadingImage ? 'opacity-0' : 'opacity-100'
                          }`}
                          onLoad={() => handleImageLoad(itemId)}
                          onError={() => handleImageError(itemId)}
                          onLoadStart={() => handleImageLoadStart(itemId)}
                        />
                      </>
                    ) : (
                      <span className="text-2xl md:text-4xl">{defaultEmoji}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-3xl pointer-events-none"></div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
