'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { MenuItem, MenuItemCardProps } from '@/types';

// Cursor風のタイプライター効果コンポーネント
const TypewriterText = ({ text, speed = 50 }: { text: string; speed?: number }) => {
  const [displayText, setDisplayText] = React.useState('');
  const [currentIndex, setCurrentIndex] = React.useState(0);

  React.useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  React.useEffect(() => {
    // テキストが変わったらリセット
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return <span>{displayText}</span>;
};

const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  isFavorite,
  onToggleFavorite,
  onItemClick,
  newItemAnimations = new Set(),
  streamingUpdates = new Set()
}) => {
  const truncatedDescription = item.description.length > 100 
    ? item.description.substring(0, 100) + '...' 
    : item.description;

  // Stage3&4リアルタイム処理状況の視覚的フィードバック（強化版）
  const getStatusIndicator = () => {
    if (item.isComplete) {
      return <span className="ml-2 w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Complete with details"></span>;
    } else if (item.isPartiallyComplete) {
      return (
        <div className="ml-2 flex items-center flex-shrink-0">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          <span className="ml-1 text-xs text-blue-600 font-medium">Adding details...</span>
        </div>
      );
    } else if (item.isTranslated) {
      return <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Translated"></span>;
    } else if (item.isCurrentlyProcessing) {
      return (
        <div className="ml-2 flex items-center flex-shrink-0">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
          <span className="ml-1 text-xs text-orange-600 font-medium">Processing...</span>
        </div>
      );
    } else {
      return <span className="ml-2 w-2 h-2 bg-gray-300 rounded-full flex-shrink-0" title="Pending"></span>;
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Processing':
        return 'bg-orange-100 text-orange-700 animate-pulse';
      case 'Updating':
      case 'Description':
        return 'bg-blue-100 text-blue-700 animate-pulse';
      case 'Translated':
        return 'bg-blue-100 text-blue-700';
      case 'Complete':
      case 'Detailed':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-gray-100 text-gray-500';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Cursor風の徐々に表示効果 + ストリーミング更新ハイライト
  const isNewlyTranslated = newItemAnimations.has(item.id);
  const isStreamingUpdate = streamingUpdates.has(item.original) || streamingUpdates.has(item.name);
  const shouldHighlight = isNewlyTranslated || item.isCurrentlyProcessing || item.isPartiallyComplete || isStreamingUpdate;

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all duration-500 cursor-pointer ${
        item.isCurrentlyProcessing 
          ? 'border-orange-200 ring-1 ring-orange-100' 
          : item.isComplete 
            ? 'border-green-200' 
            : item.isPartiallyComplete
              ? 'border-blue-200 ring-1 ring-blue-100'
              : item.isTranslated 
                ? 'border-blue-200' 
                : 'border-gray-100'
      } ${
        isNewlyTranslated 
          ? 'transform scale-105 ring-2 ring-blue-300 shadow-lg animate-pulse' 
          : ''
      } ${
        isStreamingUpdate
          ? 'transform scale-105 ring-2 ring-green-300 shadow-lg animate-bounce'
          : ''
      } ${
        shouldHighlight 
          ? 'bg-gradient-to-r from-blue-50 to-white' 
          : ''
      }`}
      onClick={() => onItemClick(item)}
    >
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1 pr-3 sm:pr-4 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center min-w-0">
                    <h3 className={`text-base sm:text-lg font-semibold text-gray-900 truncate transition-all duration-300 ${
                      isNewlyTranslated ? 'text-blue-600 animate-pulse' : ''
                    }`}>
                      {isNewlyTranslated ? (
                        <TypewriterText text={item.name} speed={50} />
                      ) : (
                        item.name
                      )}
                    </h3>
                    {getStatusIndicator()}
                  </div>
                  <span className="text-base sm:text-lg font-bold text-gray-900 ml-2 flex-shrink-0">¥{item.price}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{item.original} • {item.subtitle}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item.id);
                }}
                className="p-1 ml-2 flex-shrink-0"
              >
                <Heart 
                  size={18} 
                  className={isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'} 
                />
              </button>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3 line-clamp-2">
              {truncatedDescription}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 2).map((tag: string, index: number) => (
                  <span 
                    key={index} 
                    className={`text-xs px-2 py-1 rounded-full ${getTagColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
                {item.spiceLevel > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {'🌶️'.repeat(Math.min(item.spiceLevel, 3))}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">
            {item.image}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemCard;
