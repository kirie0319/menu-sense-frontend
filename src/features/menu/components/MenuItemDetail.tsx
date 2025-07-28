'use client';

import React, { useEffect, useState } from 'react';
import { X, Heart, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimpleMenuItem } from '@/features/menu/types';

interface MenuItemDetailProps {
  item: SimpleMenuItem | null;
  isVisible: boolean;
  onClose: () => void;
  onToggleFavorite?: (itemId: string) => void;
  favorites?: Set<string>;
}

export const MenuItemDetail: React.FC<MenuItemDetailProps> = ({
  item,
  isVisible,
  onClose,
  onToggleFavorite,
  favorites = new Set()
}) => {
  // 状態管理
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false); // アニメーション制御用

  // モバイルでbodyのスクロールを無効化
  useEffect(() => {
    if (isVisible) {
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
  }, [isVisible]);

  // アイテムが存在しない場合は表示しない
  if (!item || (!isVisible && !isClosing)) {
    return null;
  }

  // 画像エラーハンドリング（URL単位で管理）
  const handleImageError = (imageUrl: string) => {
    setImageErrors(prev => new Set(prev).add(imageUrl));
    setImageLoading(prev => {
      const updated = new Set(prev);
      updated.delete(imageUrl);
      return updated;
    });
  };

  const handleImageLoadStart = (imageUrl: string) => {
    setImageLoading(prev => new Set(prev).add(imageUrl));
  };

  const handleImageLoadComplete = (imageUrl: string) => {
    setImageLoading(prev => {
      const updated = new Set(prev);
      updated.delete(imageUrl);
      return updated;
    });
  };

  // 画像表示ロジック
  const getAllImageUrls = (): string[] => {
    const urls: string[] = [];
    
    // image_urls配列がある場合はそれを使用
    if (item.image_urls && item.image_urls.length > 0) {
      urls.push(...item.image_urls);
    }
    
    // image_urlも追加（重複していなければ）
    if (item.image_url && !urls.includes(item.image_url)) {
      urls.push(item.image_url);
    }
    
    return urls.filter(url => url && !imageErrors.has(url));
  };

  const imageUrls = getAllImageUrls();
  const hasImages = imageUrls.length > 0;
  const isLoadingImage = imageUrls.some(url => imageLoading.has(url));

  // アニメーション付きの閉じる関数
  const handleClose = () => {
    setIsClosing(true);
    // アニメーション時間後に実際の状態更新
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 500); // exitアニメーション時間に合わせる
  };

  // お気に入りトグル
  const handleToggleFavorite = () => {
    if (onToggleFavorite) {
      onToggleFavorite(item.id);
    }
  };

  const isFavorite = favorites.has(item.id);

  return (
    <AnimatePresence mode="wait">
      {(isVisible || isClosing) && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-end"
          onClick={() => {
            // 背景クリック時のフィードバック
            if (navigator.vibrate) {
              navigator.vibrate(20);
            }
            handleClose();
          }}
        >
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ 
              y: "100%",
              transition: {
                type: "spring",
                damping: 30,
                stiffness: 300,
                duration: 0.4,
                ease: "easeIn"
              }
            }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 400,
              duration: 0.6,
              ease: "easeOut"
            }}
            className="bg-white rounded-t-3xl shadow-2xl w-full h-[80vh] overflow-y-auto overscroll-contain relative"
            style={{ 
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header with Handle and Close Button */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 relative">
              {/* Close Button - 独立して配置 */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation(); // イベントバブリング防止
                  // タッチフィードバック
                  if (navigator.vibrate) {
                    navigator.vibrate(50);
                  }
                  handleClose();
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ 
                  scale: 0.9,
                  transition: { duration: 0.1 }
                }}
                className="absolute top-2 left-4 z-30 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-full transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center shadow-md"
                style={{ isolation: 'isolate' }} // スタッキングコンテキストを作成
              >
                <motion.div
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              </motion.button>

              {/* Favorite Button */}
              {onToggleFavorite && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite();
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-2 right-4 z-30 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center shadow-md"
                >
                  <Heart 
                    className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                  />
                </motion.button>
              )}

              {/* Handle Bar */}
              <div 
                className="w-full py-3 flex justify-center cursor-pointer"
                onClick={() => {
                  // タッチフィードバック
                  if (navigator.vibrate) {
                    navigator.vibrate(30);
                  }
                  handleClose();
                }}
              >
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                    {item.translation || item.name}
                  </h1>
                  {item.translation && item.name !== item.translation && (
                    <p className="text-lg text-gray-600 font-medium">
                      {item.name}
                    </p>
                  )}
                </div>
                
                {item.price && (
                  <div className="flex items-center">
                    <span className="text-xl font-semibold text-green-600">
                      {item.price}
                    </span>
                  </div>
                )}

                {item.category && (
                  <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {item.category}
                  </div>
                )}
              </div>

              {/* Images */}
              {hasImages && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Images</h3>
                  
                  {/* Main Image */}
                  <div className="relative">
                    <motion.img
                      src={imageUrls[0]}
                      alt={item.translation || item.name}
                      className="w-full h-64 object-cover rounded-lg shadow-md"
                      onLoadStart={() => handleImageLoadStart(imageUrls[0])}
                      onLoad={() => handleImageLoadComplete(imageUrls[0])}
                      onError={() => handleImageError(imageUrls[0])}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    {imageLoading.has(imageUrls[0]) && (
                      <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                        <div className="text-gray-500">読み込み中...</div>
                      </div>
                    )}
                  </div>

                  {/* Additional Images */}
                  {imageUrls.length > 1 && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium text-gray-700">Additional Images</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {imageUrls.slice(1).map((url, index) => (
                          <div key={index} className="relative">
                            <motion.img
                              src={url}
                              alt={`${item.translation || item.name} - ${index + 2}`}
                              className="w-full h-32 object-cover rounded-lg shadow-sm"
                              onLoadStart={() => handleImageLoadStart(url)}
                              onLoad={() => handleImageLoadComplete(url)}
                              onError={() => handleImageError(url)}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            />
                            {imageLoading.has(url) && (
                              <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
                                <div className="text-gray-400 text-xs">読み込み中...</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {item.description && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Allergens */}
              {item.allergens && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Allergens</h3>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      {item.allergens}
                    </p>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {item.ingredients && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Ingredients</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {item.ingredients}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
