'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, AlertTriangle, CheckCircle, Zap, Brain, RefreshCw, Eye, Sparkles, Heart, ArrowLeft } from 'lucide-react';
import { useTranslationStore } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api';
import { useMenuTranslationProgress } from '@/hooks/useMenuTranslationProgress';
import ServerStatus from './ServerStatus';
import DebugMonitor from './DebugMonitor';
import MenuCategoryList from './MenuCategoryList';
import MenuItemCard from './MenuItemCard';
import TranslationStatus from './TranslationStatus';
import { Category, MenuItem, StageData } from '@/types';

// Define proper types
// MenuItem interface moved to MenuItemCard.tsx

// Category interface moved to MenuCategoryList.tsx
// StageData interface moved to TranslationStatus.tsx

// TypewriterText component moved to MenuItemCard.tsx

const MenuTranslator = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  
  // UberEatsスタイルメニュー用の状態
  const [favorites, setFavorites] = useState(new Set<number>());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    selectedFile, 
    isLoading, 
    result, 
    error,
    currentStage,
    stageData,
    translateMenu,
    clearResult, 
    clearError,
    setFile 
  } = useTranslationStore();

  // 進捗関連の状態とアクションをカスタムフックから取得
  const {
    isAnalyzing,
    stage1Progress,
    stage2Progress,
    detectedItems,
    analysisItems,
    stage3Completed,
    translatedMenuVisible,
    currentSessionId,
    startAnalysis,
    cancelAnalysis,
    resetProgress,
    setStage3Completed,
    setTranslatedMenuVisible,
  } = useMenuTranslationProgress();

  // stageDataの変更を監視（デバッグ用・無限ループ修正版）
  const lastStageDataRef = useRef<string>('');
  
  useEffect(() => {
    // stageDataが変更された場合のみログ出力（無限ループ防止）
    if (stageData && Object.keys(stageData).length > 0) {
      const currentDataString = JSON.stringify(stageData);
      if (currentDataString !== lastStageDataRef.current) {
        lastStageDataRef.current = currentDataString;
        console.log('🔄 [MenuTranslator] stageData changed:', {
        timestamp: new Date().toLocaleTimeString(),
        stageDataKeys: Object.keys(stageData),
        categoriesCount: Object.keys((stageData as StageData).categories || {}).length,
        translatedCount: Object.keys((stageData as StageData).translatedCategories || {}).length,
          partialCount: Object.keys((stageData as StageData).partialResults || {}).length
      });
    }
    }
  }, [stageData]); // 依存配列を最小限に

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      setFile(file);
    }
  }, [setFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleTranslate = async () => {
    if (!selectedFile) return;
    
    // UberEatsスタイルメニューをリセット
    setFavorites(new Set<number>());
    setSelectedCategory('all');
    setSelectedItem(null);
    
    // カスタムフックの分析開始を使用
    await startAnalysis();
  };

  const handleTryAgain = () => {
    // カスタムフックのリセット機能を使用
    resetProgress();
    
    // UberEatsスタイルメニューをリセット
    setFavorites(new Set<number>());
    setSelectedCategory('all');
    setSelectedItem(null);
  };

  // LoadingSpinner and ProgressBar components moved to TranslationStatus.tsx

  // UberEatsスタイル機能
  const toggleFavorite = (itemId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    setFavorites(newFavorites);
  };

  // convertToUberEatsFormat function removed as unused

  const getEmojiForCategory = (categoryName: string): string => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('yakitori') || lower.includes('chicken')) return '🍗';
    if (lower.includes('sushi') || lower.includes('sashimi')) return '🍣';
    if (lower.includes('ramen') || lower.includes('noodle')) return '🍜';
    if (lower.includes('tempura') || lower.includes('fried')) return '🍤';
    if (lower.includes('salad') || lower.includes('vegetable')) return '🥗';
    if (lower.includes('drink') || lower.includes('beer')) return '🍺';
    if (lower.includes('rice') || lower.includes('donburi')) return '🍚';
    if (lower.includes('dessert') || lower.includes('sweet')) return '🍮';
    return '🍽️';
  };

  // generateCategories function removed as unused

  // UberEatsStyleMenu component removed as it was unused

  // 詳細モーダルコンポーネント
  const DetailModal = ({ item, onClose }: { item: MenuItem, onClose: () => void }) => (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full overflow-y-auto">
        {/* Header - モバイル対応 */}
        <div className="bg-white shadow-sm p-3 sm:p-4 sticky top-0 z-10">
          <div className="flex items-center">
            <button 
              onClick={onClose}
              className="mr-3 p-1"
            >
              <ArrowLeft size={20} className="text-gray-700 sm:w-6 sm:h-6" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{item.name}</h1>
                <span className="text-lg sm:text-xl font-bold text-gray-900 ml-2 flex-shrink-0">¥{item.price}</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 truncate">{item.original}</p>
            </div>
            <button 
              onClick={() => toggleFavorite(item.id)}
              className="p-1 ml-2 flex-shrink-0"
            >
              <Heart 
                size={20} 
                className={favorites.has(item.id) ? 'text-red-500 fill-current' : 'text-gray-400'} 
              />
            </button>
          </div>
        </div>

        {/* Content - モバイル対応 */}
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 pb-20">
          {/* Main Image - モバイル対応 */}
          <div className="w-full h-40 sm:h-48 bg-gray-100 rounded-xl flex items-center justify-center text-6xl sm:text-8xl">
            {item.image}
          </div>

          {/* Basic Info */}
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{item.subtitle}</h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{item.description}</p>
          </div>

          {/* Spice Level */}
          {item.spiceLevel > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-orange-800 mb-2 flex items-center text-sm sm:text-base">
                🌶️ Spice Level
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span 
                      key={i} 
                      className={`text-base sm:text-lg ${i < item.spiceLevel ? 'text-orange-500' : 'text-gray-300'}`}
                    >
                      🌶️
                    </span>
                  ))}
                </div>
                <span className="text-xs sm:text-sm text-orange-700">
                  {item.spiceLevel}/5 - {item.spiceLevel >= 4 ? 'Very Spicy' : item.spiceLevel >= 3 ? 'Spicy' : item.spiceLevel >= 2 ? 'Mild' : 'Light'}
                </span>
              </div>
            </div>
          )}

          {/* Allergen Information */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center text-sm sm:text-base">
              <AlertTriangle size={16} className="mr-2 sm:w-5 sm:h-5" />
              Allergen Information
            </h3>
            <p className="text-red-700 mb-2 text-sm sm:text-base">
              <strong>Contains:</strong> {Array.isArray(item.allergens) ? item.allergens.join(', ') : item.allergens}
            </p>
            <p className="text-xs text-red-600">
              Please inform restaurant staff of any allergies before ordering
            </p>
          </div>

          {/* Detailed Information */}
          <div className="space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Ingredients</h3>
              <p className="text-gray-700 text-sm sm:text-base">{item.ingredients}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Preparation Method</h3>
              <p className="text-gray-700 text-sm sm:text-base">{item.cookingMethod}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Cultural Background</h3>
              <p className="text-gray-700 text-sm sm:text-base">{item.culturalNote}</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag: string, index: number) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 翻訳結果用のUberEatsスタイルメニューコンポーネント
  const UberEatsResultMenu = ({ result }: { result: { menu_items: unknown[] } }) => {
    // TranslationResponse の menu_items を UberEats スタイルに変換
    const convertResultToUberEatsFormat = (menuItems: unknown[]): MenuItem[] => {
      if (!menuItems || !Array.isArray(menuItems)) return [];
      
      return menuItems.map((item, index) => {
        const menuItem = item as Record<string, unknown>;
        return ({
          id: index + 1,
          category: 'menu_item',
          original: (menuItem.japanese_name as string) || 'Unknown',
          name: (menuItem.english_name as string) || 'Unknown Dish',
          subtitle: 'Traditional Japanese Dish',
          description: (menuItem.description as string) || 'Delicious traditional Japanese dish prepared with care.',
          ingredients: (menuItem.ingredients as string) || 'Traditional Japanese ingredients',
          cookingMethod: (menuItem.cooking_method as string) || 'Traditional Japanese cooking method',
          culturalNote: (menuItem.cultural_background as string) || 'Traditional Japanese cuisine',
          price: parseInt((menuItem.price as string)?.replace(/[^\d]/g, '') || '500'),
          image: getEmojiForDish((menuItem.english_name as string) || (menuItem.japanese_name as string) || ''),
          allergens: (menuItem.allergens as string[]) || ['Please ask staff'],
          tags: ['Traditional', 'Japanese'].filter(Boolean),
          spiceLevel: (menuItem.spice_level as number) || 0
        });
      });
    };

    const getEmojiForDish = (dishName: string): string => {
      const lower = dishName.toLowerCase();
      if (lower.includes('yakitori') || lower.includes('chicken')) return '🍗';
      if (lower.includes('sushi') || lower.includes('sashimi')) return '🍣';
      if (lower.includes('ramen') || lower.includes('noodle')) return '🍜';
      if (lower.includes('tempura') || lower.includes('fried') || lower.includes('fry')) return '🍤';
      if (lower.includes('salad') || lower.includes('vegetable')) return '🥗';
      if (lower.includes('beer') || lower.includes('drink')) return '🍺';
      if (lower.includes('rice') || lower.includes('donburi')) return '🍚';
      if (lower.includes('tofu')) return '🥘';
      if (lower.includes('fish')) return '🐟';
      if (lower.includes('beef')) return '🥩';
      if (lower.includes('pork')) return '🍖';
      if (lower.includes('soup')) return '🍲';
      if (lower.includes('dessert') || lower.includes('sweet')) return '🍮';
      return '🍽️';
    };

    const menuItems = convertResultToUberEatsFormat(result.menu_items);
    const categories = [{ id: 'all', name: 'All Menu', icon: '📋' }];

    const MenuCard = ({ item }: { item: MenuItem }) => {
      const truncatedDescription = item.description.length > 100 
        ? item.description.substring(0, 100) + '...' 
        : item.description;

      return (
        <div 
          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setSelectedItem(item)}
        >
          <div className="p-3 sm:p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3 sm:pr-4 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{item.name}</h3>
                      <span className="text-base sm:text-lg font-bold text-gray-900 ml-2 flex-shrink-0">¥{item.price}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{item.original} • {item.subtitle}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className="p-1 ml-2 flex-shrink-0"
                  >
                    <Heart 
                      size={18} 
                      className={favorites.has(item.id) ? 'text-red-500 fill-current' : 'text-gray-400'} 
                    />
                  </button>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed mb-3 line-clamp-2">
                  {truncatedDescription}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag: string, index: number) => (
                      <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
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

    if (menuItems.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No menu items found.</p>
        </div>
      );
    }

    return (
      <div className="w-full bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto min-h-screen bg-gray-50">
          {/* Header - モバイル対応 */}
          <div className="bg-white shadow-sm p-3 sm:p-4 sticky top-0 z-10">
            <div className="text-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Translation Complete! 🎉</h1>
              <p className="text-xs sm:text-sm text-gray-600">Your menu has been successfully analyzed</p>
            </div>
          </div>

          {/* Categories - モバイル対応 */}
          <div className="bg-white border-b border-gray-200 sticky top-[72px] sm:top-[80px] z-10">
            <div className="flex overflow-x-auto p-3 sm:p-4 space-x-2 sm:space-x-4 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-orange-500 text-white whitespace-nowrap"
                >
                  <span className="mr-1 sm:mr-2">{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items - モバイル対応 */}
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 pb-20">
            {menuItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Stage2完了後のリアルタイムメニュー表示コンポーネント（Stage3&4リアルタイム強化版）
  const RealtimeMenuDisplay = () => {
    const [realtimeMenuItems, setRealtimeMenuItems] = useState<MenuItem[]>([]);
    const [realtimeCategories, setRealtimeCategories] = useState<Category[]>([]);
    // translationProgress state removed as unused
    const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
    const [newItemAnimations, setNewItemAnimations] = useState<Set<number>>(new Set());
    const [streamingUpdates, setStreamingUpdates] = useState<Set<string>>(new Set());

    // stageDataが実際に変更された時のみ処理するためのref
    const lastProcessedDataRef = useRef<string>('');
    
    // SSEからのstageDataを監視してリアルタイムでメニューを更新（Stage3&4リアルタイム強化 + 無限ループ防止）
    useEffect(() => {
      if (!stageData) return;
      
      // データが実際に変更されているかチェック（無限ループ防止）
      const currentDataString = JSON.stringify(stageData);
      if (currentDataString === lastProcessedDataRef.current) {
        return; // データに変更がないのでスキップ
      }
      lastProcessedDataRef.current = currentDataString;
      
      console.log('[RealtimeMenu] 📊 Processing new stageData:', {
        timestamp: new Date().toLocaleTimeString(),
        stage: currentStage
      });
      
      if (stageData) {
        const categories = (stageData as StageData).categories as Record<string, unknown[]> || {};
        const translatedCategories = (stageData as StageData).translatedCategories as Record<string, unknown[]> || {};
        const finalMenu = (stageData as StageData).finalMenu as Record<string, unknown[]> || {};
        
        // Stage4のpartial_resultsとpartial_menuを監視（リアルタイム反映）
        const partialResults = ((stageData as StageData).partialResults || (stageData as Record<string, unknown>).partial_results || {}) as Record<string, unknown[]>;
        const partialMenu = ((stageData as StageData).partialMenu || (stageData as Record<string, unknown>).partial_menu || {}) as Record<string, unknown[]>;

        // Stage3の詳細進捗データを抽出
        const currentProcessingCategory = (stageData as Record<string, unknown>).processing_category as string;
        const globalProgressPercent = (stageData as Record<string, unknown>).progress_percent as number;
        const elapsedTime = (stageData as Record<string, unknown>).elapsed_time as number;
        const heartbeat = (stageData as Record<string, unknown>).heartbeat as boolean;
        const categoryCompleted = (stageData as Record<string, unknown>).category_completed as boolean;
        const categoryProgress = (stageData as Record<string, unknown>).category_progress as number;

        // 🔍 詳細デバッグログ（リアルタイム反映確認用）
        const debugInfo = {
          timestamp: new Date().toLocaleTimeString(),
          stage: currentStage,
          categoriesCount: Object.keys(categories).length,
          translatedCount: Object.keys(translatedCategories).length,
          finalMenuCount: Object.keys(finalMenu).length,
          partialResultsCount: Object.keys(partialResults).length,
          partialMenuCount: Object.keys(partialMenu).length,
          currentProcessingCategory,
          categoryCompleted,
          categoryProgress,
          globalProgressPercent,
          elapsedTime: elapsedTime ? `${Math.round(elapsedTime / 1000)}s` : null,
          heartbeat,
          // 翻訳カテゴリーの詳細確認
          translatedCategoriesDetails: Object.entries(translatedCategories).map(([cat, items]) => ({
            category: cat,
            itemCount: Array.isArray(items) ? items.length : 0,
            sampleItems: Array.isArray(items) ? items.slice(0, 2) : []
          }))
        };

        console.log('[RealtimeMenu] 🔍 Raw SSE Data:', JSON.stringify(stageData, null, 2));
        console.log('[RealtimeMenu] Enhanced SSE Data Update:', debugInfo);
        
        // Stage別の詳細ログ
        if (currentStage === 3 && Object.keys(translatedCategories).length > 0) {
          console.log('🌍 [Stage3] Translation data received:', Object.keys(translatedCategories));
        }
        if (currentStage >= 4 && Object.keys(partialResults).length > 0) {
          console.log('📝 [Stage4] Partial results received:', Object.keys(partialResults));
        }

        // 重要な更新があった場合は視覚的にハイライト
        if (Object.keys(translatedCategories).length > 0 || Object.keys(partialResults).length > 0) {
          console.log('🚀 [RealtimeMenu] IMPORTANT UPDATE DETECTED - should trigger UI update!');
        }

        // Stage4のストリーミング更新を検出
        if ((stageData as any).streaming_update && (stageData as any).newly_processed_items) {
          console.log('📺 [Stage4 Streaming] New items processed:', (stageData as any).newly_processed_items);
          
          // 新しく処理されたアイテムを一時的にハイライト
          const newItems = (stageData as any).newly_processed_items as any[];
          const itemNames = newItems.map(item => item.japanese_name || item.name).filter(Boolean);
          
          setStreamingUpdates(new Set(itemNames));
          
          // 3秒後にハイライトを削除
          setTimeout(() => {
            setStreamingUpdates(new Set());
          }, 3000);
        }

        // Stage4のカテゴリ完了を検出
        if ((stageData as any).category_completion && (stageData as any).category_completed) {
          console.log('🎯 [Stage4 Category] Completed:', (stageData as any).category_completed);
          
          // カテゴリ完了のお祝いアニメーション効果（オプション）
          // 今回は簡単にコンソールログで確認
        }

        // Category progress calculation removed as unused

        // Stage 2完了後: categoriesからメニューアイテムを生成（Stage3&4リアルタイム対応強化）
        if (Object.keys(categories).length > 0) {
          const menuItems: MenuItem[] = [];
          let itemId = 1;

          Object.entries(categories).forEach(([categoryName, categoryItems]: [string, unknown[]]) => {
            if (Array.isArray(categoryItems)) {
              categoryItems.forEach((item: unknown) => {
                const itemData = item as Record<string, unknown>;
                const translatedItem = translatedCategories[categoryName]?.find((t: unknown) => {
                  const translatedData = t as Record<string, unknown>;
                  return translatedData.japanese_name === itemData.name || translatedData.name === itemData.name;
                });
                const finalItem = finalMenu[categoryName]?.find((f: unknown) => {
                  const finalData = f as Record<string, unknown>;
                  return finalData.japanese_name === itemData.name || finalData.name === itemData.name;
                });
                
                // Stage4のpartial_resultsやpartial_menuからもデータを取得（リアルタイム反映）
                const partialItem = partialResults[categoryName]?.find((p: unknown) => {
                  const partialData = p as Record<string, unknown>;
                  return partialData.japanese_name === itemData.name || partialData.name === itemData.name;
                }) || partialMenu[categoryName]?.find((p: unknown) => {
                  const partialMenuData = p as Record<string, unknown>;
                  return partialMenuData.japanese_name === itemData.name || partialMenuData.name === itemData.name;
                });

                // Stage3処理中の視覚的フィードバック
                const isCurrentlyProcessing = currentProcessingCategory === categoryName;
                
                // 処理状況をより詳細に判定（partial dataも考慮）
                let processingState = 'pending';
                const isTranslated = !!translatedItem;
                const isComplete = !!finalItem;
                let isPartiallyComplete = !!partialItem;
                
                if (finalItem) {
                  processingState = 'complete';
                } else if (partialItem) {
                  processingState = 'processing_description';
                  isPartiallyComplete = true;
                } else if (translatedItem) {
                  processingState = 'translated';
                } else if (isCurrentlyProcessing) {
                  processingState = 'processing';
                } else {
                  processingState = 'pending';
                }

                // データの優先順位: finalItem > partialItem > translatedItem > original
                const effectiveItem = finalItem || partialItem || translatedItem || item;
                const hasDescription = !!((finalItem as any)?.description || (partialItem as any)?.description);

                menuItems.push({
                  id: itemId++,
                  category: categoryName.toLowerCase().replace(/\s+/g, '_'),
                  categoryName: categoryName,
                  // Stage 2: 日本語名のみ
                  original: (item as Record<string, unknown>).name as string || (item as Record<string, unknown>).japanese_name as string || 'Unknown',
                  // Stage 3: 翻訳名が利用可能な場合は使用（リアルタイム反映）
                  name: (effectiveItem as any)?.english_name || (effectiveItem as any)?.translated_name || 
                    (isCurrentlyProcessing ? 'Translating...' : 'Pending translation...'),
                  subtitle: processingState === 'complete' ? 'Complete with details' : 
                           processingState === 'processing_description' ? 'Adding description...' :
                           processingState === 'translated' ? 'Translated' : 
                           processingState === 'processing' ? 'Translating now...' : 'Waiting for translation...',
                  // Stage 4: 詳細説明が利用可能な場合は使用（リアルタイム反映）
                  description: (effectiveItem as any)?.description || 
                    (hasDescription ? 'Description available' : 
                     isCurrentlyProcessing ? 'Translation in progress...' : 'Awaiting translation...'),
                  ingredients: (effectiveItem as any)?.ingredients || 'Being analyzed...',
                  cookingMethod: (effectiveItem as any)?.cooking_method || 'Being analyzed...',
                  culturalNote: (effectiveItem as any)?.cultural_background || 'Being analyzed...',
                  price: parseInt((item as any).price?.replace(/[^\d]/g, '') || (effectiveItem as any)?.price?.replace(/[^\d]/g, '') || '500'),
                  image: getEmojiForCategory(categoryName),
                  allergens: (effectiveItem as any)?.allergens || ['Being analyzed...'],
                  tags: processingState === 'complete' ? ['Complete', 'Detailed'] : 
                        processingState === 'processing_description' ? ['Updating', 'Description'] :
                        processingState === 'translated' ? ['Translated'] : 
                        processingState === 'processing' ? ['Processing'] : ['Pending'],
                  spiceLevel: (effectiveItem as any)?.spice_level || 0,
                  // 処理状況（Stage3&4リアルタイム強化）
                  isTranslated: isTranslated,
                  isComplete: isComplete,
                  isPartiallyComplete: isPartiallyComplete,
                  isCurrentlyProcessing: isCurrentlyProcessing,
                  processingState: processingState,
                  hasDescription: hasDescription,
                  rawData: { original: item, translated: translatedItem, final: finalItem, partial: partialItem }
                });
              });
            }
          });

          setRealtimeMenuItems(menuItems);

          // カテゴリーも更新（Stage3&4進捗表示強化）
          const categorySet = new Set(Object.keys(categories));
          const categoryList = [
            { 
              id: 'all', 
              name: 'All Menu', 
              icon: '📋', 
              count: menuItems.length, 
              translated: menuItems.filter(item => item.isTranslated).length, 
              completed: menuItems.filter(item => item.isComplete).length,
              partiallyCompleted: menuItems.filter(item => item.isPartiallyComplete).length
            },
            ...Array.from(categorySet).map(cat => {
              const categoryMenuItems = menuItems.filter(item => item.categoryName === cat);
              return {
                id: cat.toLowerCase().replace(/\s+/g, '_'),
                name: cat,
                icon: getEmojiForCategory(cat),
                count: categories[cat]?.length || 0,
                translated: translatedCategories[cat]?.length || 0,
                completed: finalMenu[cat]?.length || 0,
                partiallyCompleted: (partialResults[cat]?.length || 0) + (partialMenu[cat]?.length || 0),
                isCurrentlyProcessing: currentProcessingCategory === cat,
                progress: 0, // progress calculation removed
                // リアルタイム反映のためのアイテム数
                realtimeTranslated: categoryMenuItems.filter(item => item.isTranslated).length,
                realtimeCompleted: categoryMenuItems.filter(item => item.isComplete).length,
                realtimePartial: categoryMenuItems.filter(item => item.isPartiallyComplete).length
              };
            })
          ];
          setRealtimeCategories(categoryList);
          // 強制更新トリガー
          setLastUpdateTime(Date.now());
        }
      }
    }, [stageData]); // 依存配列を最小限に（無限ループ防止）

    // リアルタイム反映の強制更新（Cursor風の徐々に表示効果）
    useEffect(() => {
      if (realtimeMenuItems.length > 0) {
        // 新しく翻訳されたアイテムのアニメーション効果
        const newlyTranslatedItems = realtimeMenuItems.filter(item => 
          item.isTranslated && !item.wasTranslated
        );
        
        if (newlyTranslatedItems.length > 0) {
          const newAnimations = new Set(newlyTranslatedItems.map(item => item.id));
          setNewItemAnimations(newAnimations);
          
          // アニメーション効果をクリア
          setTimeout(() => {
            setNewItemAnimations(new Set());
            // 翻訳状態フラグを更新
            setRealtimeMenuItems(items => 
              items.map(item => ({
                ...item,
                wasTranslated: item.isTranslated
              }))
            );
          }, 1000);
        }
      }
    }, [lastUpdateTime]); // lastUpdateTimeに依存

    const filteredItems = selectedCategory === 'all' 
      ? realtimeMenuItems
      : realtimeMenuItems.filter(item => item.category === selectedCategory);

    // RealtimeMenuCard component moved to MenuItemCard.tsx

    if (realtimeMenuItems.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Building menu from analysis results...</p>
          <p className="text-sm text-gray-500 mt-2">
            Stage {currentStage}: {
              currentStage === 2 ? 'Organizing menu structure' :
              currentStage === 3 ? 'Translating dishes' :
              currentStage >= 4 ? 'Adding detailed descriptions' :
              'Processing'
            }
          </p>
        </div>
      );
    }

         return (
       <div className="w-full bg-gray-50 min-h-screen">
         <div className="max-w-md mx-auto min-h-screen bg-gray-50">
           {/* Header - TranslationStatusコンポーネントに置き換え */}
           <TranslationStatus
             isAnalyzing={false}
             currentStage={currentStage}
             stageData={stageData}
             stage1Progress={0}
             stage2Progress={0}
             detectedItems={[]}
             analysisItems={[]}
             onCancelAnalysis={() => {}}
             realtimeMenuItems={realtimeMenuItems}
             stage3Completed={stage3Completed}
             isDebugVisible={isDebugVisible}
             lastUpdateTime={lastUpdateTime}
           />

           {/* Categories - モバイル対応（Stage3進捗表示強化） */}
           <MenuCategoryList
             categories={realtimeCategories}
             selectedCategory={selectedCategory}
             onCategorySelect={setSelectedCategory}
             currentStage={currentStage}
             stageData={stageData}
           />

           {/* Menu Items - モバイル対応 */}
           <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 pb-20">
             {filteredItems.map((item) => (
               <MenuItemCard
                 key={item.id}
                 item={item}
                 isFavorite={favorites.has(item.id)}
                 onToggleFavorite={toggleFavorite}
                 onItemClick={setSelectedItem}
                 newItemAnimations={newItemAnimations}
                 streamingUpdates={streamingUpdates}
               />
             ))}
           </div>
         </div>
       </div>
     );
  };

  // 詳細モーダルが選択されている場合
  if (selectedItem) {
    return <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header - モバイル対応 */}
      {!isAnalyzing && !result && (
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            {/* デスクトップレイアウト */}
            <div className="hidden md:flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🍽️</span>
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  MenuSense
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">✨ Free to try</span>
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
            <ServerStatus onStatusChange={setIsServerHealthy} />
            <button
              onClick={() => setIsDebugVisible(!isDebugVisible)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDebugVisible
                  ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
              }`}
            >
              🐛 Debug {isDebugVisible ? 'ON' : 'OFF'}
            </button>
          </div>
            </div>

            {/* モバイルレイアウト */}
            <div className="md:hidden">
              {/* トップ行: ロゴとアクションボタン */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-lg">🍽️</span>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    MenuSense
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  {/* モバイル用シンプルなデバッグボタン */}
                  <button
                    onClick={() => setIsDebugVisible(!isDebugVisible)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      isDebugVisible
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`Debug ${isDebugVisible ? 'ON' : 'OFF'}`}
                  >
                    🐛
                  </button>
                </div>
              </div>

              {/* ボトム行: ステータス情報 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Online</span>
                  </div>
                  <span className="text-xs text-gray-500">✨ Free</span>
                </div>
                <div className="scale-75 origin-right">
                  <ServerStatus onStatusChange={setIsServerHealthy} />
                </div>
              </div>
            </div>

            {/* タブレットレイアウト（中間サイズ） */}
            <div className="hidden sm:flex md:hidden items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🍽️</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  MenuSense
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Online</span>
                </div>
                <ServerStatus onStatusChange={setIsServerHealthy} />
                <button
                  onClick={() => setIsDebugVisible(!isDebugVisible)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDebugVisible
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  🐛 {isDebugVisible ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Hero Section - モバイル対応 */}
        {!isAnalyzing && !result && (
          <motion.div
          initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="inline-flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <span>🎌</span>
            <span className="hidden sm:inline">Perfect for travelers in Japan</span>
            <span className="sm:hidden">For Japan travelers</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight px-2">
            Finally understand{' '}
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Japanese menus
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
            <span className="hidden sm:inline">
              Don&apos;t guess what you&apos;re ordering. Get instant, detailed explanations of every dish, 
              including ingredients, allergens, and spice levels—all in seconds.
            </span>
            <span className="sm:hidden">
              Get instant explanations of Japanese dishes with ingredients, allergens, and spice levels.
            </span>
          </p>

          {/* Social Proof - モバイル対応 */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 px-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>🔥</span>
              <span className="hidden sm:inline">Trusted by 10k+ travelers</span>
              <span className="sm:hidden">10k+ users</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>⚡</span>
              <span className="hidden sm:inline">Works in 3 seconds</span>
              <span className="sm:hidden">3s fast</span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span>🛡️</span>
              <span className="hidden sm:inline">100% private & secure</span>
              <span className="sm:hidden">Private</span>
            </div>
          </div>
          </motion.div>
        )}

        {/* Upload Section - モバイル対応 */}
        {!isAnalyzing && !result && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
              Try it now with your menu photo
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Upload any Japanese menu and see the magic happen ✨
            </p>
          </div>

              <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`relative bg-gradient-to-br from-orange-50 to-yellow-50 p-6 sm:p-8 md:p-12 text-center cursor-pointer rounded-lg sm:rounded-xl border-2 border-dashed transition-all duration-300 ${
              isDragOver 
                ? 'border-orange-500 bg-gradient-to-br from-orange-100 to-red-100 scale-105' 
                : 'border-orange-300 hover:border-orange-400 hover:bg-gradient-to-br hover:from-orange-100 hover:to-yellow-100'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleFileSelect}
          >
            {isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-orange-500 mx-auto"></div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Analyzing your menu...
                </h3>
                <p className="text-sm sm:text-base text-gray-600">This will just take a moment</p>
              </div>
            ) : selectedFile ? (
              <div className="space-y-3 sm:space-y-4">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Menu uploaded successfully!
                </h3>
                <p className="text-sm sm:text-base text-gray-600 truncate px-4">
                  File: {selectedFile.name}
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-orange-600 hover:text-orange-800 font-medium text-sm sm:text-base"
                  >
                    Upload another menu
                  </button>
                  {!result && (
                <motion.button
                  whileHover={isServerHealthy ? { scale: 1.05 } : {}}
                  whileTap={isServerHealthy ? { scale: 0.95 } : {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTranslate();
                      }}
                  disabled={!isServerHealthy}
                      className={`px-4 sm:px-6 py-2 font-semibold rounded-lg transition-all duration-300 text-sm sm:text-base ${
                    isServerHealthy
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                      <Camera className="inline-block h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">
                        {isServerHealthy ? 'Analyze Menu' : 'Backend Required'}
                      </span>
                      <span className="sm:hidden">
                        {isServerHealthy ? 'Analyze' : 'Backend Required'}
                      </span>
                </motion.button>
                  )}
                </div>
                {!isServerHealthy && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-2 px-2">
                    Please ensure the backend server is running to enable translation.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <div className="animate-bounce">
                  <Upload className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto" />
                </div>
                
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  <span className="hidden sm:inline">Drop your menu photo here</span>
                  <span className="sm:hidden">Upload menu photo</span>
                </h3>
                
                <p className="text-sm sm:text-base text-gray-600">
                  <span className="hidden sm:inline">Or click to browse your files</span>
                  <span className="sm:hidden">Tap to select from gallery</span>
                </p>
                
                <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 hover:from-orange-600 hover:to-red-600 text-sm sm:text-base">
                  Choose Photo
                </button>
                
                <p className="text-xs sm:text-sm text-gray-500 px-2">
                  <span className="hidden sm:inline">JPG, PNG, or GIF up to 10MB • Completely free to try</span>
                  <span className="sm:hidden">JPG, PNG, GIF up to 10MB • Free</span>
                </p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
              </motion.div>

          {/* Example Results Preview - モバイル対応 */}
          {!selectedFile && !result && (
            <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg sm:rounded-xl border border-orange-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 text-center">
                ✨ Here&apos;s what you&apos;ll get instantly:
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">Original: 焼き鳥 ¥300</div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Yakitori - Grilled Chicken Skewers</div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    <span className="hidden sm:inline">
                      Tender chicken pieces grilled on bamboo skewers with sweet soy-based tare sauce. 
                      A popular Japanese pub food.
                    </span>
                    <span className="sm:hidden">
                      Grilled chicken skewers with sweet soy sauce.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Contains: Soy, Gluten</span>
                      <span className="sm:hidden">Soy, Gluten</span>
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      🌶️ Mild
                    </span>
                  </div>
                </div>
                
                <div className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="text-xs sm:text-sm text-gray-500 mb-1">Original: 海老フライ ¥450</div>
                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-2">Ebi Fry - Breaded Fried Shrimp</div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                    <span className="hidden sm:inline">
                      Large prawns coated in panko breadcrumbs and deep-fried until golden. 
                      Served with tartar sauce.
                    </span>
                    <span className="sm:hidden">
                      Panko-breaded fried prawns with tartar sauce.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full flex items-center gap-1">
                      <AlertTriangle size={10} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Contains: Shellfish, Gluten</span>
                      <span className="sm:hidden">Shellfish, Gluten</span>
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      🌶️ None
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* 分析画面 */}
          <AnimatePresence>
          {(isAnalyzing && currentStage <= 2) && (
            <TranslationStatus
              isAnalyzing={isAnalyzing}
              currentStage={currentStage}
              stageData={stageData}
              stage1Progress={stage1Progress}
              stage2Progress={stage2Progress}
              detectedItems={detectedItems}
              analysisItems={analysisItems}
              onCancelAnalysis={cancelAnalysis}
            />
          )}

          {/* Stage 3以降のリアルタイムメニュー表示 */}
          {(isAnalyzing && currentStage >= 3) && (
                  <RealtimeMenuDisplay />
            )}
          </AnimatePresence>

          {/* エラー状態 */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-50 border border-red-200 rounded-xl p-6"
              >
                <div className="flex items-start space-x-3">
                <AlertTriangle className="h-6 w-6 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-800 mb-1">
                      Translation Failed
                    </h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    
                    {/* Stage1 OCRエラーの場合の詳細ヒント */}
                    {(error.includes('OCR') || error.includes('Vision API') || error.includes('画像から') || error.includes('テキストを検出')) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-blue-800 text-sm mb-2">
                          📷 <strong>Image Recognition Tips:</strong>
                        </p>
                        <ul className="text-blue-700 text-sm space-y-1 ml-4">
                          <li>• Use clear, well-lit photos with readable text</li>
                          <li>• Make sure menu text is large and in focus</li>
                          <li>• Avoid blurry or dark images</li>
                          <li>• Try taking the photo from directly above the menu</li>
                          <li>• Ensure the entire menu fits in the frame</li>
                        </ul>
                      </div>
                    )}
                    
                    {/* Google Vision API認証エラーの場合 */}
                    {(error.includes('Vision API') || error.includes('認証') || error.includes('利用できません')) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-yellow-800 text-sm mb-2">
                          🔧 <strong>Service Configuration Issue:</strong>
                        </p>
                        <ul className="text-yellow-700 text-sm space-y-1 ml-4">
                          <li>• Google Vision API service may be temporarily unavailable</li>
                          <li>• Please contact administrator or try again later</li>
                          <li>• This is likely a server configuration issue, not your image</li>
                        </ul>
                      </div>
                    )}
                    
                    {/* タイムアウトエラーの場合のデバッグヒント */}
                    {(error.includes('timeout') || error.includes('timed out')) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-yellow-800 text-sm mb-2">
                          💡 <strong>Timeout Debug Tips:</strong>
                        </p>
                        <ul className="text-yellow-700 text-sm space-y-1 ml-4">
                          <li>• Click &quot;🐛 Debug&quot; button to monitor network and timing information</li>
                          <li>• Check browser console (F12) for detailed logs</li>
                          <li>• Stage 3 now uses Google Translate API for faster processing</li>
                          <li>• Try with a simpler menu image</li>
                        </ul>
                      </div>
                    )}

                    {/* ネットワークエラーの場合 */}
                    {(error.includes('network') || error.includes('connection') || error.includes('fetch')) && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                        <p className="text-purple-800 text-sm mb-2">
                          🌐 <strong>Connection Issue:</strong>
                        </p>
                        <ul className="text-purple-700 text-sm space-y-1 ml-4">
                          <li>• Check your internet connection</li>
                          <li>• The server may be temporarily busy</li>
                          <li>• Wait a few moments and try again</li>
                          <li>• Contact support if the problem persists</li>
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleTryAgain}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <RefreshCw className="inline-block h-4 w-4 mr-2" />
                        Try Again
                      </button>
                      
                      {!isDebugVisible && (
                        <button
                          onClick={() => setIsDebugVisible(true)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                          🐛 Enable Debug Mode
                        </button>
                      )}

                      {/* システム診断ボタン */}
                      <button
                        onClick={async () => {
                          try {
                            // バックエンドの診断エンドポイントを呼び出し
                            const response = await fetch(`${API_BASE_URL}/diagnostic`);
                            const data = await response.json();
                            console.log('🔍 System Diagnostic:', data);
                            
                            // 診断結果を整理してユーザーフレンドリーに表示
                            const statusReport = `
システム診断結果:

🔍 Google Vision API: ${data.vision_api?.available ? '✅ 利用可能' : '❌ 利用不可'}
${data.vision_api?.error ? `   エラー: ${data.vision_api.error}` : ''}

🤖 OpenAI API: ${data.openai_api?.available ? '✅ 利用可能' : '❌ 利用不可'}
${data.openai_api?.error ? `   エラー: ${data.openai_api.error}` : ''}

🌍 Google Translate API: ${data.translate_api?.available ? '✅ 利用可能' : '❌ 利用不可'}
${data.translate_api?.error ? `   エラー: ${data.translate_api.error}` : ''}

環境設定:
- Google認証情報: ${data.environment?.google_credentials_available ? '✅' : '❌'}
- OpenAI APIキー: ${data.environment?.openai_api_key_env ? '✅' : '❌'}

${!data.vision_api?.available ? '\n⚠️ Vision APIの問題が原因でStage1エラーが発生している可能性があります。' : ''}
                            `.trim();
                            
                            alert(statusReport);
                          } catch (error) {
                            console.error('診断エラー:', error);
                            alert(`診断に失敗しました: ${error}\n\nバックエンドサーバーが起動していることを確認してください。`);
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        🔍 Check System Status
                      </button>

                      {/* 新しい画像を選択するボタン */}
                      <button
                        onClick={handleFileSelect}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Camera className="inline-block h-4 w-4 mr-2" />
                        Try Different Image
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 翻訳結果 */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
              <UberEatsResultMenu result={result} />
                
                {/* 再試行ボタン */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-8"
                >
                  <button
                    onClick={handleTryAgain}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <RefreshCw className="inline-block h-4 w-4 mr-2" />
                    Translate Another Menu
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        {/* Value Props */}
        {!result && !isLoading && !isAnalyzing && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Beyond Google Translate</h3>
              <p className="text-gray-600 text-sm">
                Get context, cooking methods, and cultural background—not just word-for-word translation.
              </p>
        </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Allergy Safety First</h3>
              <p className="text-gray-600 text-sm">
                Automatically detect allergens and ingredients that might be hidden in traditional dishes.
              </p>
            </div>
            
            <div className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Results</h3>
              <p className="text-gray-600 text-sm">
                No more spending 10 minutes googling each dish. Get everything you need in seconds.
              </p>
            </div>
          </div>
        )}

        {/* CTA Section */}
        {!result && !isLoading && !selectedFile && !isAnalyzing && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">Ready to never worry about Japanese menus again?</h2>
            <p className="text-blue-100 mb-6">Join thousands of travelers who dine with confidence in Japan</p>
            <button 
              onClick={handleFileSelect}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2 mx-auto"
            >
              <Camera className="w-5 h-5" />
              Upload Your First Menu Photo
            </button>
            <p className="text-sm text-blue-200 mt-3">Completely free • No signup required • Works instantly</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600">
            Powered by Google Vision API, Google Translate API, and OpenAI GPT-4 • Built with Next.js and Tailwind CSS
      </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* デバッグモニター */}
      <DebugMonitor
        sessionId={currentSessionId}
        isVisible={isDebugVisible}
        onToggle={() => setIsDebugVisible(!isDebugVisible)}
      />

      {/* CSS Animations moved to TranslationStatus.tsx */}
    </div>
  );
};

export default MenuTranslator; 