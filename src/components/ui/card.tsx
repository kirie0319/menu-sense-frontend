import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CardProps, MenuCardProps } from '@/types/ui';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';

const cardVariants = {
  default: 'bg-white border border-gray-200 shadow-sm',
  elevated: 'bg-white border border-gray-100 shadow-lg',
  outline: 'bg-white border-2 border-gray-300',
  ghost: 'bg-gray-50 border border-gray-100'
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverable = false,
  className,
  children,
  onClick
}) => {
  const baseClassName = cn(
    'rounded-xl p-4 md:p-6 transition-all duration-300',
    cardVariants[variant],
    hoverable && 'cursor-pointer hover:shadow-xl',
    className
  );

  if (hoverable) {
    return (
      <motion.div
        whileHover={{ 
          scale: 1.02, 
          y: -4,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={baseClassName}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClassName} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('mb-4 md:mb-6', className)} {...props}>
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('space-y-4', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => (
  <div className={cn('mt-4 md:mt-6 pt-4 border-t border-gray-100', className)} {...props}>
    {children}
  </div>
);

// Menu Card Component
export const MenuCard: React.FC<MenuCardProps> = ({
  item,
  onItemClick,
  onToggleFavorite,
  isFavorite,
  showImages = true,
  index = 0
}) => {
  // 🖼️ 複数画像カルーセル用の状態
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  // 🖼️ 画像URL配列を取得（test/page.tsx準拠版）
  const imageUrls = React.useMemo(() => {
    console.log(`[MenuCard] 🔍 Processing image URLs for item ${item.id}:`, {
      image_urls: item.image_urls,
      image_url: item.image_url
    });
    
    // 1. image_urls配列がある場合はそれを最優先で使用
    if (item.image_urls && Array.isArray(item.image_urls) && item.image_urls.length > 0) {
      console.log(`[MenuCard] ✅ Using image_urls array:`, item.image_urls);
      return item.image_urls;
    }
    
    // 2. image_urlがある場合の処理（test/page.tsx準拠）
    if (item.image_url) {
      // JSON文字列として解析を試行
      if (typeof item.image_url === 'string' && (item.image_url.startsWith('[') || item.image_url.includes('http'))) {
        try {
          // JSON配列として解析を試行
          const parsed = JSON.parse(item.image_url);
          console.log(`[MenuCard] ✅ JSON.parse successful for item ${item.id}:`, parsed);
          
          if (Array.isArray(parsed)) {
            console.log(`[MenuCard] ✅ Array validation passed, length: ${parsed.length}`);
            parsed.forEach((url: string, idx: number) => {
              console.log(`  Image ${idx + 1}: ${url}`);
            });
            return parsed;
          } else {
            console.log(`[MenuCard] ❌ Parsed data is not an array:`, typeof parsed, parsed);
            return [item.image_url];
          }
        } catch (error) {
          console.log(`[MenuCard] ❌ JSON.parse failed for item ${item.id}:`, error);
          // JSON解析失敗時は単一URLとして扱う
          return [item.image_url];
        }
      } else {
        // 単純なURL文字列の場合
        console.log(`[MenuCard] ✅ Using single image_url:`, item.image_url);
        return [item.image_url];
      }
    }
    
    console.log(`[MenuCard] ❌ No image URLs found for item ${item.id}`);
    return [];
  }, [item.image_urls, item.image_url, item.id]);

  // 🖼️ 安全なインデックス計算
  const safeCurrentIndex = imageUrls.length > 0 ? currentImageIndex % imageUrls.length : 0;
  const currentImageUrl = imageUrls[safeCurrentIndex] || null;

  // 🐛 デバッグ情報（test/page.tsx準拠）
  React.useEffect(() => {
    console.log(`[MenuCard] 🔍 DEBUG: Item debug info for ${item.id}:`);
    console.log(`[MenuCard] 🔍 DEBUG: Raw item data:`, {
      image_urls: item.image_urls,
      image_url: item.image_url
    });
    console.log(`[MenuCard] 🔍 DEBUG: Processed imageUrls:`, imageUrls);
    console.log(`[MenuCard] 🔍 DEBUG: CurrentIndex: ${currentImageIndex}, SafeIndex: ${safeCurrentIndex}, CurrentURL: ${currentImageUrl}`);
    console.log(`[MenuCard] 🔄 DEBUG: Total items with images: ${imageUrls.length}`);
  }, [item.id, imageUrls.length, currentImageIndex, safeCurrentIndex, currentImageUrl, item.image_urls, item.image_url]);

  // 🖼️ itemが変更されたときにインデックスをリセット
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [item.id]);
  
  // 価格から数値部分を抽出する関数
  const extractPriceNumber = (priceStr: string): number => {
    const cleanPrice = priceStr.replace(/[^\d]/g, '');
    const numPrice = parseInt(cleanPrice, 10);
    return isNaN(numPrice) ? 0 : numPrice;
  };

  const handleCardClick = () => {
    // モバイルデバイスでのバイブレーション効果（対応している場合）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    onItemClick(item);
  };

  // 🖼️ 画像読み込み処理（test/page.tsx準拠版）
  const handleImageLoad = () => {
    console.log(`[MenuCard] ✅ Image loaded successfully for ${item.id}:`, currentImageUrl);
  };

  const handleImageError = () => {
    console.log(`[MenuCard] ❌ Image load error for ${item.id}:`, currentImageUrl);
    console.log(`[MenuCard] ❌ Available image URLs:`, imageUrls);
  };

  // 🖼️ 次の画像に移動 - 条件なしでループ
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => {
      const nextIndex = imageUrls.length > 0 ? (prev + 1) % imageUrls.length : 0;
      console.log(`[MenuCard] Next image: ${prev} -> ${nextIndex} (total: ${imageUrls.length})`);
      return nextIndex;
    });
  };

  // 🖼️ 前の画像に移動 - 条件なしでループ
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => {
      const prevIndex = imageUrls.length > 0 ? (prev - 1 + imageUrls.length) % imageUrls.length : 0;
      console.log(`[MenuCard] Prev image: ${prev} -> ${prevIndex} (total: ${imageUrls.length})`);
      return prevIndex;
    });
  };

  // 🖼️ インジケーターのクリック処理
  const jumpToImage = (index: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[MenuCard] Jump to image: ${currentImageIndex} -> ${index}`);
    setCurrentImageIndex(index);
  };

  return (
    <motion.div
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
      className="relative bg-white rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl border border-gray-100 overflow-hidden hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 cursor-pointer group"
      onClick={handleCardClick}
      style={{
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {/* Image Section */}
      <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-orange-100 via-yellow-100 to-red-100 overflow-hidden">
        {/* 🖼️ 画像表示 */}
        {currentImageUrl ? (
          <img 
            src={currentImageUrl}
            alt={item.translation || item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-2">🖼️</div>
              <div className="text-xs">No Image</div>
              <div className="text-xs mt-1">ID: {item.id}</div>
            </div>
          </div>
        )}
        
        {/* 🖼️ 左矢印ボタン - 常に表示 */}
        <button
          onClick={prevImage}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full hover:bg-opacity-100 transition-all duration-200 shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center z-10"
          style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
        >
          <ChevronLeft size={12} className="text-gray-700" />
        </button>
        
        {/* 🖼️ 右矢印ボタン - 常に表示 */}
        <button
          onClick={nextImage}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full hover:bg-opacity-100 transition-all duration-200 shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center z-10"
          style={{ width: '22px', height: '22px', minWidth: '22px', minHeight: '22px' }}
        >
          <ChevronRight size={12} className="text-gray-700" />
        </button>
        
        {/* 🖼️ 画像インジケーター - 常に表示 */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1 z-10">
          {imageUrls.map((_, idx) => (
            <button
              key={idx}
              onClick={jumpToImage(idx)}
              className={`rounded-full transition-all duration-200 ${
                idx === safeCurrentIndex 
                  ? 'bg-white scale-110' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              style={{ width: '6px', height: '6px', minWidth: '6px', minHeight: '6px' }}
            />
          ))}
        </div>
        
        {/* Favorite button positioned on image */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
          className="absolute top-3 right-3 w-6 h-6 bg-white bg-opacity-90 backdrop-blur-sm rounded-full hover:bg-opacity-100 transition-all duration-200 shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center"
        >
          <Heart 
            size={18} 
            className={`transition-all duration-200 ${
              isFavorite 
                ? 'text-red-500 fill-current' 
                : 'text-gray-600 hover:text-red-400'
            }`} 
          />
        </button>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Content Section */}
      <div className="p-4 md:p-6 flex flex-col justify-center bg-white min-h-[80px]">
        {/* Title and Price - Vertical Left Aligned */}
        <div className="text-left space-y-2">
          <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors duration-300">
            {item.translation.length > 20 ? `${item.translation.substring(0, 20)}...` : item.translation}
          </h3>
          <div className="text-sm md:text-base font-medium text-gray-400">
            {(() => {
              const priceNum = extractPriceNumber(item.price || '0');
              return priceNum > 0 ? `¥${priceNum.toLocaleString()}` : 'Price TBD';
            })()}
          </div>
        </div>
      </div>

      {/* Hover effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 to-pink-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl md:rounded-3xl pointer-events-none"></div>
      
      <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-transparent bg-gradient-to-r from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </motion.div>
  );
}; 