'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, AlertTriangle, CheckCircle, Zap, Brain, RefreshCw, Eye, Sparkles, Heart, ArrowLeft } from 'lucide-react';
import { useTranslationStore } from '@/lib/store';
import ServerStatus from './ServerStatus';
import DebugMonitor from './DebugMonitor';

// Define proper types
interface MenuItem {
  id: number;
  category: string;
  categoryName?: string;
  original: string;
  name: string;
  subtitle: string;
  description: string;
  ingredients: string;
  cookingMethod: string;
  culturalNote: string;
  price: number;
  image: string;
  allergens: string[];
  tags: string[];
  spiceLevel: number;
  isTranslated?: boolean;
  isComplete?: boolean;
  isPartiallyComplete?: boolean;
  isCurrentlyProcessing?: boolean;
  processingState?: string;
  hasDescription?: boolean;
  wasTranslated?: boolean;
  rawData?: Record<string, unknown>;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
  translated?: number;
  completed?: number;
  partiallyCompleted?: number;
  isCurrentlyProcessing?: boolean;
  progress?: number;
  realtimeTranslated?: number;
  realtimeCompleted?: number;
  realtimePartial?: number;
}

interface StageData {
  categories?: Record<string, unknown[]>;
  translatedCategories?: Record<string, unknown[]>;
  finalMenu?: Record<string, unknown[]>;
  partialResults?: Record<string, unknown[]>;
  partialMenu?: Record<string, unknown[]>;
  progress_percent?: number;
  processing_category?: string;
  elapsed_time?: number;
  heartbeat?: boolean;
  category_completed?: boolean;
  category_progress?: number;
}

// Cursor風のタイプライター効果コンポーネント
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
    // テキストが変わったらリセット
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return <span>{displayText}</span>;
};

const MenuTranslator = () => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isDebugVisible, setIsDebugVisible] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage1Progress, setStage1Progress] = useState(0);
  const [stage2Progress, setStage2Progress] = useState(0);
  const [detectedItems, setDetectedItems] = useState<Array<{text: string, delay: number}>>([]);
  const [analysisItems, setAnalysisItems] = useState<Array<{text: string, delay: number}>>([]);
  
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

  // stageDataの変更を強制的に監視（デバッグ用）
  const [forceUpdateCounter, setForceUpdateCounter] = useState(0);
  
  useEffect(() => {
    // stageDataが変更されるたびに強制更新をトリガー
    if (stageData && Object.keys(stageData).length > 0) {
      console.log('🔄 [MenuTranslator] stageData changed, forcing update:', {
        timestamp: new Date().toLocaleTimeString(),
        stageDataKeys: Object.keys(stageData),
        categoriesCount: Object.keys((stageData as StageData).categories || {}).length,
        translatedCount: Object.keys((stageData as StageData).translatedCategories || {}).length,
        partialCount: Object.keys((stageData as StageData).partialResults || {}).length,
        forceUpdateCounter
      });
      setForceUpdateCounter(prev => prev + 1);
    }
  }, [stageData, forceUpdateCounter]);

  // 翻訳が完了したときに分析画面を閉じる
  useEffect(() => {
    if (result && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [result, isAnalyzing]);

  // エラーが発生したときに分析画面を閉じる
  useEffect(() => {
    if (error && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [error, isAnalyzing]);

  // Stage 1とStage 2のアイテムデータ
  const stage1Items = [
    { text: "Scanning menu image...", delay: 500 },
    { text: "Detecting Japanese text...", delay: 1200 },
    { text: "Found: 焼き鳥", delay: 1800 },
    { text: "Found: 麻婆豆腐", delay: 2200 },
    { text: "Found: 海老フライ", delay: 2600 },
    { text: "Extracting prices...", delay: 3000 },
    { text: "OCR complete ✓", delay: 3400 }
  ];

  const stage2Items = [
    { text: "Initializing AI translator...", delay: 500 },
    { text: "Analyzing dish contexts...", delay: 1000 },
    { text: "Identifying ingredients...", delay: 1500 },
    { text: "Detecting allergens...", delay: 2000 },
    { text: "Calculating spice levels...", delay: 2500 },
    { text: "Adding cultural context...", delay: 3000 },
    { text: "Finalizing translations...", delay: 3500 }
  ];

  // バックエンドの進捗データからフロントエンドの進捗を更新
  useEffect(() => {
    // Stage 1の進捗更新
    if (isAnalyzing && currentStage === 1 && isLoading) {
      // Stage 1アイテムを段階的に追加（実際のOCR検出に基づく）
      const currentDetectedCount = detectedItems.length;
      if (currentDetectedCount < stage1Items.length) {
        const nextItem = stage1Items[currentDetectedCount];
        setTimeout(() => {
          setDetectedItems(prev => [...prev, nextItem]);
        }, 500);
      }

             // 進捗バーを現在のステージの進行状況に基づいて更新
       if (currentStage === 1) {
         // バックエンドから進捗パーセンテージが来ている場合はそれを使用
         const backendProgress = stageData && (stageData as StageData).progress_percent;
         if (backendProgress !== undefined && backendProgress > 0) {
           setStage1Progress(Math.min(100, backendProgress));
         } else {
           // フォールバック: 検出されたアイテム数に基づく
           setStage1Progress(Math.min(85, (detectedItems.length / stage1Items.length) * 100));
         }
       }
    }
     }, [isAnalyzing, currentStage, isLoading, detectedItems.length, stageData, stage1Items]);

  useEffect(() => {
    // Stage 2の進捗更新
    if (isAnalyzing && currentStage === 2 && isLoading) {
      // Stage 2アイテムを段階的に追加
      const currentAnalysisCount = analysisItems.length;
      if (currentAnalysisCount < stage2Items.length) {
        const nextItem = stage2Items[currentAnalysisCount];
        setTimeout(() => {
          setAnalysisItems(prev => [...prev, nextItem]);
        }, 700);
      }

             // 進捗バーを現在のステージの進行状況に基づいて更新
       if (currentStage === 2) {
         // バックエンドから進捗パーセンテージが来ている場合はそれを使用
         const backendProgress = stageData && (stageData as StageData).progress_percent;
         if (backendProgress !== undefined && backendProgress > 0) {
           setStage2Progress(Math.min(100, backendProgress));
         } else {
           // フォールバック: 分析アイテム数に基づく
           setStage2Progress(Math.min(85, (analysisItems.length / stage2Items.length) * 100));
         }
       }
    }
     }, [isAnalyzing, currentStage, isLoading, analysisItems.length, stageData, stage2Items]);

  // ステージ完了時の進捗バー完了
  useEffect(() => {
    if (currentStage > 1) {
      setStage1Progress(100);
    }
    if (currentStage > 2) {
      setStage2Progress(100);
    }
  }, [currentStage]);

     // バックエンドからの詳細進捗データを活用
   useEffect(() => {
     if (stageData && isAnalyzing && isLoading) {
       // バックエンドからのリアルタイム進捗データをログ出力
       console.log(`[Frontend] Real-time progress data:`, {
         currentStage,
         progress_percent: (stageData as StageData).progress_percent,
         processing_category: (stageData as StageData).processing_category,
         heartbeat: (stageData as StageData).heartbeat,
         elapsed_time: (stageData as StageData).elapsed_time,
         chunk_progress: (stageData as Record<string, unknown>).chunk_progress
       });

       // Stage 3以降の進捗データがある場合
       if (currentStage >= 3 && (stageData as StageData).translatedCategories) {
         const categories = (stageData as StageData).categories as Record<string, unknown[]> || {};
         const translatedCategories = (stageData as StageData).translatedCategories as Record<string, unknown[]> || {};
         
         // 翻訳完了率を計算
         const totalCategories = Object.keys(categories).length;
         const translatedCount = Object.keys(translatedCategories).length;
         const translationProgressPercent = totalCategories > 0 ? (translatedCount / totalCategories) * 100 : 0;
         
         console.log(`[Frontend] Translation progress: ${translationProgressPercent}% (${translatedCount}/${totalCategories})`);
       }

       // Stage 4の詳細な進捗データがある場合
       if (currentStage >= 4 && (stageData as StageData).finalMenu) {
         const finalMenu = (stageData as StageData).finalMenu as Record<string, unknown[]> || {};
         const totalItems = Object.values(finalMenu).reduce((acc, items) => acc + items.length, 0);
         
         console.log(`[Frontend] Final menu processing: ${totalItems} items processed`);
       }
     }
   }, [stageData, currentStage, isAnalyzing, isLoading]);

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
    
    // 分析画面に遷移
    setIsAnalyzing(true);
    
    // 進捗をリセット
    setStage1Progress(0);
    setStage2Progress(0);
    setDetectedItems([]);
    setAnalysisItems([]);
    
    // UberEatsスタイルメニューをリセット
    setFavorites(new Set<number>());
    setSelectedCategory('all');
    setSelectedItem(null);
    
    // セッションIDをクリア
    setCurrentSessionId(undefined);
    
    // リアルタイム進捗モードでセッションIDを取得
    try {
      const sessionId = await startProgressTranslation();
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Failed to start progress translation:', error);
      setIsAnalyzing(false); // エラー時は分析画面から戻る
    }
  };

  // リアルタイム進捗翻訳の開始（セッションID取得用）
  const startProgressTranslation = async (): Promise<string> => {
    if (!selectedFile) throw new Error('No file selected');
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('http://localhost:8000/process-menu', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to start processing: ${response.status}`);
    }

    const data = await response.json();
    console.log('🆔 Session ID obtained:', data.session_id);
    
    // 通常の進捗付き翻訳を実行
    await translateMenu();
    
    return data.session_id;
  };

  const handleTryAgain = () => {
    clearResult();
    clearError();
    setFile(null);
    setIsAnalyzing(false); // 分析画面から戻る
    setCurrentSessionId(undefined);
    // 進捗をリセット
    setStage1Progress(0);
    setStage2Progress(0);
    setDetectedItems([]);
    setAnalysisItems([]);
    // UberEatsスタイルメニューをリセット
    setFavorites(new Set<number>());
    setSelectedCategory('all');
    setSelectedItem(null);
  };

  // ローディングスピナーコンポーネント
  const LoadingSpinner = ({ color = "orange" }: { color?: string }) => (
    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${color}-500`}></div>
  );

  // プログレスバーコンポーネント
  const ProgressBar = ({ progress, color = "orange" }: { progress: number, color?: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div 
        className={`h-2 bg-gradient-to-r from-${color}-500 to-red-500 rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

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

    // SSEからのstageDataを監視してリアルタイムでメニューを更新（Stage3&4リアルタイム強化 + 強制更新）
    useEffect(() => {
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

        // 重要な更新があった場合は視覚的にハイライト
        if (Object.keys(translatedCategories).length > 0 || Object.keys(partialResults).length > 0) {
          console.log('🚀 [RealtimeMenu] IMPORTANT UPDATE DETECTED - should trigger UI update!');
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
    }, [stageData, currentStage, isAnalyzing, isLoading, forceUpdateCounter]); // 強制更新カウンターを追加

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

    const RealtimeMenuCard = ({ item }: { item: MenuItem }) => {
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

      // Cursor風の徐々に表示効果
      const isNewlyTranslated = newItemAnimations.has(item.id);
      const shouldHighlight = isNewlyTranslated || item.isCurrentlyProcessing || item.isPartiallyComplete;

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
            shouldHighlight 
              ? 'bg-gradient-to-r from-blue-50 to-white' 
              : ''
          }`}
          onClick={() => setSelectedItem(item)}
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
           {/* Header - モバイル対応（Stage3詳細進捗表示 + デバッグ情報） */}
           <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
             <div className="text-center">
               <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                 {currentStage === 2 && 'Menu Structure Detected'}
                 {currentStage === 3 && 'Translating Menu Items'}
                 {currentStage >= 4 && 'Adding Detailed Information'}
            </h1>

               {/* リアルタイムデバッグ情報（開発用） */}
               {isDebugVisible && (
                 <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                   <div className="text-left space-y-1">
                     <div>🔄 Update #{forceUpdateCounter} at {new Date(lastUpdateTime).toLocaleTimeString()}</div>
                     <div>📊 Items: {realtimeMenuItems.length} | 🌍 Translated: {realtimeMenuItems.filter(item => item.isTranslated).length} | 🔄 Partial: {realtimeMenuItems.filter(item => item.isPartiallyComplete).length} | ✅ Complete: {realtimeMenuItems.filter(item => item.isComplete).length}</div>
                     <div>📋 Raw Categories: {Object.keys((stageData as StageData).categories || {}).length}</div>
                     <div>🌍 Translated Categories: {Object.keys((stageData as StageData).translatedCategories || {}).length}</div>
                     <div>🔄 Partial Results: {Object.keys((stageData as StageData).partialResults || {}).length}</div>
                     <div>📝 Partial Menu: {Object.keys((stageData as StageData).partialMenu || {}).length}</div>
                     {(stageData as any).processing_category && (
                       <div>⚡ Processing: {(stageData as any).processing_category}</div>
                     )}
                     {realtimeMenuItems.length > 0 && (
                       <div className="mt-1 text-xs text-gray-600">
                         🎯 Sample Item States: {realtimeMenuItems.slice(0, 3).map((item, i) => 
                           `${i+1}:${item.isTranslated?'T':''}${item.isPartiallyComplete?'P':''}${item.isComplete?'C':''}`
                         ).join(' ')}
          </div>
                     )}
                   </div>
                 </div>
               )}
               
               {/* Stage3 詳細進捗表示 */}
               {currentStage === 3 && (
                 <div className="space-y-1">
                   <p className="text-xs sm:text-sm text-gray-600">
                     {realtimeMenuItems.filter(item => item.isTranslated).length} of {realtimeMenuItems.length} items translated
                   </p>
                   {stageData && (stageData as any).processing_category && (
                     <div className="flex items-center justify-center space-x-2">
                       <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                       <p className="text-xs text-orange-600 font-medium">
                         Translating: {(stageData as any).processing_category}
                       </p>
                     </div>
                   )}
                   {stageData && (stageData as any).progress_percent && (
                     <p className="text-xs text-blue-600">
                       {Math.round((stageData as any).progress_percent)}% complete
                     </p>
                   )}
                   {stageData && (stageData as any).elapsed_time && (
                     <p className="text-xs text-gray-500">
                       Elapsed: {Math.round((stageData as any).elapsed_time / 1000)}s
                     </p>
                   )}
                 </div>
               )}

               {/* Stage4 詳細進捗表示 */}
               {currentStage >= 4 && (
                 <div className="space-y-1">
                   <p className="text-xs sm:text-sm text-gray-600">
                     {realtimeMenuItems.filter(item => item.isComplete || item.isPartiallyComplete).length} of {realtimeMenuItems.length} items processed
                   </p>
                   <p className="text-xs text-gray-500">
                     Complete: {realtimeMenuItems.filter(item => item.isComplete).length} | 
                     Updating: {realtimeMenuItems.filter(item => item.isPartiallyComplete).length}
                   </p>
                   {stageData && (stageData as any).processing_category && (
                     <div className="flex items-center justify-center space-x-2">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                       <p className="text-xs text-green-600 font-medium">
                         Detailing: {(stageData as any).processing_category}
                       </p>
                     </div>
                   )}
                   {stageData && (stageData as any).progress_percent && (
                     <p className="text-xs text-green-600">
                       {Math.round((stageData as any).progress_percent)}% complete
                     </p>
                   )}
                 </div>
               )}

               {/* Stage2 簡易表示 */}
               {currentStage === 2 && (
                 <p className="text-xs sm:text-sm text-gray-600 mb-1">
                   {realtimeMenuItems.length} items detected, ready for translation
                 </p>
               )}

               {/* 共通のハートビート表示 */}
               {stageData && (stageData as any).heartbeat && (
                 <div className="mt-2 flex items-center justify-center space-x-1">
                   <span className="text-xs text-gray-400">●</span>
                   <span className="text-xs text-gray-400 animate-pulse">●</span>
                   <span className="text-xs text-gray-400">●</span>
                 </div>
               )}
             </div>
           </div>

           {/* Categories - モバイル対応（Stage3進捗表示強化） */}
           <div className="bg-white border-b border-gray-200 sticky top-[80px] sm:top-[88px] z-10">
             <div className="flex overflow-x-auto p-3 sm:p-4 space-x-2 sm:space-x-4 scrollbar-hide">
               {realtimeCategories.map((category) => {
                 const getButtonStyle = () => {
                   if (selectedCategory === category.id) {
                     return 'bg-orange-500 text-white';
                   } else if (category.isCurrentlyProcessing) {
                     return 'bg-orange-100 text-orange-700 ring-2 ring-orange-200 animate-pulse';
                   } else if ((category.completed || 0) > 0 && (category.completed || 0) === (category.count || 0)) {
                     return 'bg-green-100 text-green-700 hover:bg-green-200';
                   } else if ((category.realtimeCompleted || category.completed || 0) > 0) {
                     return 'bg-green-100 text-green-700 hover:bg-green-200';
                   } else if ((category.realtimePartial || category.partiallyCompleted || 0) > 0) {
                     return 'bg-blue-100 text-blue-700 hover:bg-blue-200 ring-1 ring-blue-200 animate-pulse';
                   } else if ((category.realtimeTranslated || category.translated || 0) > 0) {
                     return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
                   } else {
                     return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                   }
                 };

                 const getProgressInfo = () => {
                   if (category.id === 'all') {
                     if (currentStage >= 4) {
                       // Stage4では、完了+部分完了の数を表示
                       const totalProgressing = (category.completed || 0) + (category.partiallyCompleted || 0);
                       return `${totalProgressing}/${category.count || 0}`;
                     } else {
                       return `${category.completed || 0}/${category.count || 0}`;
                     }
                   } else if (currentStage >= 4) {
                     // Stage4では、リアルタイム数とpartial数も考慮
                     const totalProgressing = (category.realtimeCompleted || category.completed || 0) + 
                                             (category.realtimePartial || category.partiallyCompleted || 0);
                     return `${totalProgressing}/${category.count || 0}`;
                   } else if (currentStage >= 3) {
                     return `${category.realtimeTranslated || category.translated || 0}/${category.count || 0}`;
                   } else {
                     return `${category.count || 0}`;
                   }
                 };

                 return (
                   <button
                     key={category.id}
                     onClick={() => setSelectedCategory(category.id)}
                     className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap relative ${getButtonStyle()}`}
                   >
                     <span className="mr-1 sm:mr-2">{category.icon}</span>
                     {category.name}
                     {category.isCurrentlyProcessing && (
                       <span className="ml-1 text-xs">
                         <span className="inline-block w-1 h-1 bg-current rounded-full animate-bounce"></span>
                       </span>
                     )}
                     {category.id !== 'all' && (
                       <span className="ml-1 text-xs opacity-75">
                         ({getProgressInfo()})
                       </span>
                     )}
                     {category.id === 'all' && (
                       <span className="ml-1 text-xs opacity-75">
                         ({getProgressInfo()})
                       </span>
                     )}
                     {/* 進捗バー（カテゴリー別） */}
                     {category.progress !== undefined && category.progress > 0 && category.progress < 100 && currentStage >= 3 && (
                       <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-white transition-all duration-300"
                           style={{ width: `${category.progress}%` }}
                         ></div>
                       </div>
                     )}
                   </button>
                 );
               })}
             </div>
           </div>

           {/* Menu Items - モバイル対応 */}
           <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 pb-20">
             {filteredItems.map((item) => (
               <RealtimeMenuCard key={item.id} item={item} />
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
          {isAnalyzing && (
              <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🍽️</span>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    MenuSense
                  </h1>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {currentStage === 1 ? 'Reading your menu...' : 'Understanding the dishes...'}
                </h2>
                <p className="text-gray-600">
                  {currentStage === 1 
                    ? 'Extracting text and identifying menu items' 
                    : 'Adding context, ingredients, and cultural insights'
                  }
                </p>
              </div>

              {/* Stage Indicators */}
              <div className="flex items-center justify-center space-x-8 mb-8">
                {/* Stage 1 */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    currentStage >= 1 
                      ? (currentStage === 1 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white') 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStage === 1 ? (
                      <Eye className="w-6 h-6" />
                    ) : currentStage > 1 ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Camera className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${currentStage >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                    OCR Scan
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex-1 h-0.5 bg-gray-300 relative">
                  <div 
                    className={`absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000 ${
                      currentStage >= 2 ? 'w-full' : 'w-0'
                    }`}
                  ></div>
                </div>

                {/* Stage 2 */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
                    currentStage >= 2 
                      ? (currentStage === 2 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white') 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {currentStage === 2 ? (
                      <Brain className="w-6 h-6" />
                    ) : currentStage > 2 ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Brain className="w-6 h-6" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${currentStage >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                    AI Analysis
                  </span>
                </div>
              </div>

              {/* Main Content */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                {currentStage === 1 ? (
                  // Stage 1: OCR & Text Detection
                <div className="space-y-6">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <LoadingSpinner />
                      <span className="text-lg font-semibold text-gray-900">Scanning Menu Image</span>
                  </div>
                  
                    <ProgressBar progress={stage1Progress} />
                    
                    <div className="text-center text-sm text-gray-600 mb-6">
                      {Math.round(stage1Progress)}% complete
                      {stageData && (stageData as any).elapsed_time && (
                        <span className="text-xs text-gray-500 block">
                          Elapsed: {Math.round((stageData as any).elapsed_time / 1000)}s
                        </span>
                      )}
                    </div>

                    {/* Detected Items */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-orange-500" />
                        Detected Items:
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                        {detectedItems.map((item, index) => (
                          <div 
                            key={index} 
                            className="flex items-center space-x-2 py-1 animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <span className="text-green-500">✓</span>
                            <span className="text-sm text-gray-700">{item.text}</span>
                            {index === detectedItems.length - 1 && stageData && (stageData as any).heartbeat && (
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulated OCR Preview */}
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                      <h4 className="font-medium text-gray-900 mb-2">Raw Text Detected:</h4>
                      <div className="text-sm text-gray-600 font-mono">
                        焼き鳥 ¥300<br/>
                        麻婆豆腐 ¥600<br/>
                        海老フライ ¥450<br/>
                        <span className="animate-pulse">|</span>
                      </div>
                    </div>
                  </div>
                ) : currentStage === 2 ? (
                  // Stage 2: AI Analysis
                  <div className="space-y-6">
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <div className="relative">
                        <Brain className="w-8 h-8 text-orange-500 animate-pulse" />
                        <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                      </div>
                      <span className="text-lg font-semibold text-gray-900">AI Analysis in Progress</span>
                    </div>

                    <ProgressBar progress={stage2Progress} color="purple" />
                    
                    <div className="text-center text-sm text-gray-600 mb-6">
                      {Math.round(stage2Progress)}% complete
                      {stageData && (stageData as any).progress_percent && (
                        <span className="text-xs text-orange-600 block font-medium">
                          Backend: {Math.round((stageData as any).progress_percent)}%
                        </span>
                      )}
                      {stageData && (stageData as any).processing_category && (
                        <span className="text-xs text-gray-500 block">
                          Processing: {(stageData as any).processing_category}
                        </span>
                      )}
                    </div>

                    {/* Analysis Steps */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-500" />
                        Processing Steps:
                      </h3>
                      <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                        {analysisItems.map((item, index) => (
                          <div 
                            key={index} 
                            className="flex items-center space-x-2 py-1 animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <span className="text-purple-500">⚡</span>
                            <span className="text-sm text-gray-700">{item.text}</span>
                            {index === analysisItems.length - 1 && stageData && (stageData as any).heartbeat && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse ml-2"></span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Insights Preview */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                      <h4 className="font-medium text-gray-900 mb-2">AI Insights Preview:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-gray-600">Yakitori: Traditional grilled chicken skewers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span className="text-gray-600">Mapo Tofu: Contains soy, very spicy 🌶️🌶️🌶️🌶️</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-gray-600">Ebi Fry: Breaded fried shrimp, contains shellfish</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Stage 2完了後（categories取得後）からリアルタイムメニュー表示開始
                  <RealtimeMenuDisplay />
                )}
              </div>

              {/* Demo Controls */}
              <div className="text-center mt-6">
                <button 
                  onClick={() => {
                    setIsAnalyzing(false);
                    setCurrentSessionId(undefined);
                    // 進捗をリセット
                    setStage1Progress(0);
                    setStage2Progress(0);
                    setDetectedItems([]);
                    setAnalysisItems([]);
                  }}
                  className="text-orange-600 hover:text-orange-800 font-medium text-sm"
                >
                  ← Cancel Analysis
                </button>
                </div>
              </motion.div>
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

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MenuTranslator; 