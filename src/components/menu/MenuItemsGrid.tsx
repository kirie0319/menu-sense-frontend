'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useUIStore } from '@/lib/stores/uiStore';
import { useDataStore } from '@/lib/stores/dataStore';
import { t } from '@/lib/i18n';

export const MenuItemsGrid: React.FC = () => {
  // UI関連は新しいUIStoreから取得
  const { ui, showItemDetail, toggleFavorite } = useUIStore();
  
  // データ関連は既存ストアから継続取得
  const { 
    getFilteredItems,
    getGeneratedImageUrl,
    hasGeneratedImages
  } = useMenuStore();

  // デバッグ用データストア
  const { testS3ImageMatching } = useDataStore();

  const [newItemAnimations, setNewItemAnimations] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());

  const filteredItems = getFilteredItems();

  // 詳細なメニューデータデバッグ
  useEffect(() => {
    console.log(`🔍 [MenuItemsGrid] Menu data debug:`, {
      filteredItemsCount: filteredItems.length,
      hasGeneratedImages: hasGeneratedImages(),
      selectedCategory: ui.selectedCategory,
      filteredItems: filteredItems.slice(0, 3) // 最初の3項目のみ表示
    });
  }, [filteredItems, hasGeneratedImages, ui.selectedCategory]);

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

  // S3テスト機能
  const handleS3Test = async () => {
    console.log(`🧪 [MenuItemsGrid] Starting S3 image matching test...`);
    try {
      const cacheCount = await testS3ImageMatching();
      console.log(`✅ [MenuItemsGrid] S3 test completed! Cache contains ${cacheCount} images`);
    } catch (error) {
      console.error(`❌ [MenuItemsGrid] S3 test failed:`, error);
    }
  };

  if (filteredItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 md:py-16"
      >
        <div className="text-6xl md:text-8xl mb-4 md:mb-6">🔍</div>
        <h3 className="text-xl md:text-2xl font-bold text-gray-700 mb-2 md:mb-4">{t('noMenuItemsFound')}</h3>
        <p className="text-gray-500 text-sm md:text-base">{t('tryDifferentCategory')}</p>
        
        {/* デバッグ用S3テストボタン */}
        <div className="mt-8">
          <button
            onClick={handleS3Test}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            🧪 Test S3 Image Matching
          </button>
          <p className="text-xs text-gray-400 mt-2">Debug: Test S3 image fetching (check console)</p>
        </div>
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
          
          // 詳細なデバッグ情報
          const debugHasGeneratedImages = hasGeneratedImages();
          const debugImageErrors = imageErrors.has(itemId);
          const hasImage = debugHasGeneratedImages && generatedImageUrl && !debugImageErrors;
          
          // 画像表示ロジックの詳細ログ
          console.log(`🖼️ [MenuItemsGrid] Image debug for "${name}":`, {
            itemId,
            hasGeneratedImages: debugHasGeneratedImages,
            generatedImageUrl,
            imageErrors: debugImageErrors,
            hasImageFinal: hasImage,
            itemObj: { ...itemObj, image: itemObj.image }
          });
          
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
              className={`relative bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-100 overflow-hidden hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 cursor-pointer group ${
                isNewItem ? 'animate-pulse border-green-300 shadow-green-200' : ''
              }`}
              onClick={handleCardClick}
              layout
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                aspectRatio: '1 / 1.3'
              }}
            >
              {/* Image Section - Top 60-70% */}
              <div className="relative h-[60%] bg-gradient-to-br from-orange-100 via-yellow-100 to-red-100 overflow-hidden">
                {hasImage ? (
                  <>
                    {isLoadingImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-3 border-orange-500 border-t-transparent"></div>
                      </div>
                    )}
                    <img
                      src={generatedImageUrl}
                      alt={name}
                      className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                        isLoadingImage ? 'opacity-0' : 'opacity-100'
                      }`}
                      onLoad={() => handleImageLoad(itemId)}
                      onError={() => handleImageError(itemId)}
                      onLoadStart={() => handleImageLoadStart(itemId)}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl md:text-8xl filter drop-shadow-sm group-hover:scale-105 transition-all duration-300">
                    {defaultEmoji}
                  </div>
                )}
                
                {/* Favorite button positioned on image */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(itemId);
                  }}
                  className="absolute top-3 right-3 p-2.5 bg-white bg-opacity-90 backdrop-blur-sm rounded-full hover:bg-opacity-100 transition-all duration-200 shadow-lg hover:scale-110 active:scale-95"
                >
                  <Heart 
                    size={18} 
                    className={`transition-all duration-200 ${
                      isFavorite 
                        ? 'text-red-500 fill-current scale-110' 
                        : 'text-gray-600 hover:text-red-400'
                    }`} 
                  />
                </button>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Content Section - Bottom 30-40% */}
              <div className="h-[40%] p-4 md:p-5 flex flex-col justify-between bg-white">
                <div className="flex-1">
                  {/* Title and Price Row */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors duration-300 flex-1 pr-2">
                      {name}
                    </h3>
                    <div className="text-lg md:text-xl font-bold text-green-600 flex-shrink-0">
                      {(() => {
                        const priceNum = extractPriceNumber(price);
                        return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : t('priceTBD');
                      })()}
                    </div>
                  </div>

                  {/* Original name */}
                  <p className="text-sm text-gray-600 truncate mb-2">{originalName}</p>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-2 mb-3">
                    {truncatedDescription}
                  </p>
                </div>

                {/* Tags and spice level at bottom */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 2).map((tag, tagIndex) => (
                      <span 
                        key={tagIndex} 
                        className="text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-2.5 py-1 rounded-full font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {spiceLevel > 0 && (
                      <span className="text-xs bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 px-2.5 py-1 rounded-full font-medium flex items-center">
                        {'🌶️'.repeat(Math.min(spiceLevel, 3))}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tap for details indicator */}
              <div className="absolute bottom-3 right-3 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex items-center text-xs text-orange-600 bg-white bg-opacity-95 rounded-full px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse mr-1.5"></div>
                  <span className="font-medium">{t('details')}</span>
                </div>
              </div>

              {/* Hover effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 to-pink-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-3xl pointer-events-none"></div>
              
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};