// 統合された軽量ストア - 以前の469行から大幅削減
import { create } from 'zustand';
import { TranslationState } from '@/types';
import { MenuTranslationApi, API_BASE_URL } from './api';

// 進捗ステージの型定義
interface ProgressStage {
  stage: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  message: string;
}

// UI状態の型定義
interface UIState {
  selectedCategory: string;
  showItemDetail: boolean;
  selectedItemId: string | null;
  favorites: Set<string>;
  showDebugMonitor: boolean;
  showRawMenu: boolean;
  currentView: 'categories' | 'items' | 'generated';
}

// ステージデータの型定義
interface StageData {
  categories?: Record<string, unknown[]>;
  translatedCategories?: Record<string, unknown[]>;
  finalMenu?: Record<string, unknown[]>;
  partialResults?: Record<string, unknown[]>;
  partialMenu?: Record<string, unknown[]>;
  stage3_completed?: boolean;
  show_translated_menu?: boolean;
  status?: string;
  
  // Stage 4リアルタイム部分結果管理
  realtimePartialResults?: Record<string, unknown[]>;
  completedCategories?: Set<string>;
  processingCategory?: string;
  
  // チャンク処理状況
  chunkProgress?: {
    category: string;
    completed: number;
    total: number;
  };
  
  // カテゴリ完了通知
  categoryCompleted?: {
    name: string;
    items: unknown[];
    timestamp: number;
  };
}

// 統合された状態管理ストア
interface MenuStore extends TranslationState {
  // 進捗管理
  currentStage: number;
  progressStages: ProgressStage[];
  stageData: StageData;
  sessionId: string | null;
  
  // UI状態
  ui: UIState;
  
  // Core Actions
  setFile: (file: File | null) => void;
  translateMenu: (existingSessionId?: string) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  resetProgress: () => void;
  
  // UI Actions
  setSelectedCategory: (category: string) => void;
  showItemDetail: (itemId: string) => void;
  hideItemDetail: () => void;
  toggleFavorite: (itemId: string) => void;
  toggleDebugMonitor: () => void;
  toggleRawMenu: () => void;
  setCurrentView: (view: 'categories' | 'items' | 'generated') => void;
  
  // Utility Functions
  getEmojiForCategory: (category: string) => string;
  getCurrentMenuData: () => Record<string, unknown[]> | null;
  getFilteredItems: () => unknown[];
  getCategoryList: () => string[];
  
  // Stage 4リアルタイム状態判定ユーティリティ
  getMenuItemStatus: (item: any, categoryName: string) => {
    isTranslated: boolean;
    isComplete: boolean;
    isPartiallyComplete: boolean;
    isCurrentlyProcessing: boolean;
  };
  getCategoryProgress: (categoryName: string) => {
    total: number;
    completed: number;
    partial: number;
    processing: boolean;
    isCompleted: boolean;
  } | null;
  getOverallProgress: () => {
    totalItems: number;
    completedItems: number;
    partialItems: number;
    progressPercent: number;
  } | null;
}

// Emojiマッピング
const categoryEmojiMap: Record<string, string> = {
  'appetizers': '🥗', 'starters': '🥗', '前菜': '🥗', 'サラダ': '🥗',
  'main': '🍖', 'mains': '🍖', 'entrees': '🍖', 'メイン': '🍖', '主菜': '🍖',
  'desserts': '🍰', 'dessert': '🍰', 'sweets': '🍰', 'デザート': '🍰', '甘味': '🍰',
  'drinks': '🥤', 'beverages': '🥤', 'cocktails': '🍸', '飲み物': '🥤', 'ドリンク': '🥤',
  'sushi': '🍣', '寿司': '🍣', 'sashimi': '🍣', '刺身': '🍣',
  'noodles': '🍜', 'ramen': '🍜', 'udon': '🍜', '麺類': '🍜', 'ラーメン': '🍜',
  'rice': '🍚', 'fried rice': '🍚', 'ご飯': '🍚', '丼': '🍚',
  'soup': '🍲', 'soups': '🍲', 'スープ': '🍲', '汁物': '🍲',
  'grilled': '🔥', 'bbq': '🔥', 'barbecue': '🔥', '焼き物': '🔥', 'グリル': '🔥',
  'fried': '🍤', 'tempura': '🍤', 'katsu': '🍤', '揚げ物': '🍤', '天ぷら': '🍤',
  'hot pot': '🍲', 'shabu': '🍲', '鍋': '🍲', 'しゃぶしゃぶ': '🍲'
};

export const useMenuStore = create<MenuStore>((set, get) => ({
  // 初期状態
  isLoading: false,
  result: null,
  error: null,
  selectedFile: null,
  
  // 進捗関連の初期状態
  currentStage: 0,
  progressStages: [
    { stage: 1, status: 'pending', message: 'OCR - 画像からテキストを抽出' },
    { stage: 2, status: 'pending', message: 'カテゴリ分析 - 日本語メニューを分析' },
    { stage: 3, status: 'pending', message: '翻訳 - 英語に翻訳' },
    { stage: 4, status: 'pending', message: '詳細説明 - 詳細な説明を追加' },
  ],
  stageData: {},
  sessionId: null,
  
  // UI初期状態
  ui: {
    selectedCategory: 'all',
    showItemDetail: false,
    selectedItemId: null,
    favorites: new Set<string>(),
    showDebugMonitor: false,
    showRawMenu: false,
    currentView: 'categories'
  },

  // === Core Actions ===
  setFile: (file: File | null) => {
    set({ selectedFile: file, error: null });
    if (file) {
      get().resetProgress();
    }
  },

  translateMenu: async (existingSessionId?: string) => {
    const { selectedFile, sessionId, isLoading } = get();
    
    if (!selectedFile) {
      set({ error: 'Please select a file first' });
      return;
    }

    // すでに処理中の場合は重複実行を避ける
    if (isLoading) {
      console.log('[Store] Translation already in progress, skipping duplicate request');
      return;
    }

    // 既存のセッションIDがある場合は、そちらを優先
    const useSessionId = existingSessionId || sessionId || undefined;

    set({ isLoading: true, error: null });
    get().resetProgress();

    try {
      const result = await MenuTranslationApi.translateMenuWithProgress(
        selectedFile,
        (stage: number, status: string, message: string, data?: unknown) => {
          // 進捗更新ロジック（簡略化）
          const currentState = get();
          const newProgressStages = currentState.progressStages.map((s) =>
            s.stage === stage
              ? { ...s, status: status as 'pending' | 'active' | 'completed' | 'error', message }
              : s
          );
          
          // ステージデータ更新
          let newStageData = { ...currentState.stageData };
          if (data) {
            const stageData = data as Record<string, unknown>;
            
            if (stage === 2 && stageData.categories) {
              newStageData.categories = stageData.categories as Record<string, unknown[]>;
            } else if (stage === 3) {
              const translatedData = stageData.translatedCategories || stageData.translated_categories;
              if (translatedData) {
                newStageData.translatedCategories = translatedData as Record<string, unknown[]>;
              }
              if (status === 'completed') {
                newStageData.stage3_completed = true;
                newStageData.show_translated_menu = true;
              }
            } else if (stage === 4) {
              // 最終結果の処理
              const finalData = stageData.final_menu || stageData.finalMenu;
              if (finalData) {
                newStageData.finalMenu = finalData as Record<string, unknown[]>;
              }
              
              // 部分結果の処理（従来）
              if (stageData.partial_results) {
                newStageData.partialResults = stageData.partial_results as Record<string, unknown[]>;
              }
              if (stageData.partial_menu) {
                newStageData.partialMenu = stageData.partial_menu as Record<string, unknown[]>;
              }
              
              // リアルタイム部分結果の処理（新）
              if (!newStageData.realtimePartialResults) {
                newStageData.realtimePartialResults = {};
              }
              if (!newStageData.completedCategories) {
                newStageData.completedCategories = new Set<string>();
              }
              
              // 処理中カテゴリの更新
              if (stageData.processing_category) {
                newStageData.processingCategory = stageData.processing_category as string;
              }
              
              // チャンク進捗の更新
              if (stageData.chunk_progress) {
                const chunkInfo = stageData.chunk_progress as string;
                const match = chunkInfo.match(/(\d+)\/(\d+)/);
                if (match && newStageData.processingCategory) {
                  newStageData.chunkProgress = {
                    category: newStageData.processingCategory,
                    completed: parseInt(match[1]),
                    total: parseInt(match[2])
                  };
                }
              }
              
              // カテゴリ完了時の処理
              if (stageData.category_completed) {
                const categoryName = stageData.category_completed as string;
                newStageData.completedCategories.add(categoryName);
                
                // 完了したカテゴリのアイテムを取得
                let completedItems: unknown[] = [];
                if (stageData.completed_category_items) {
                  completedItems = stageData.completed_category_items as unknown[];
                } else if (stageData.final_menu && (stageData.final_menu as any)[categoryName]) {
                  completedItems = (stageData.final_menu as any)[categoryName];
                }
                
                // リアルタイム部分結果に追加
                if (completedItems.length > 0) {
                  newStageData.realtimePartialResults[categoryName] = completedItems;
                  
                  // カテゴリ完了通知を設定
                  newStageData.categoryCompleted = {
                    name: categoryName,
                    items: completedItems,
                    timestamp: Date.now()
                  };
                  
                  console.log(`🎯 [Store] Category completed: ${categoryName} (${completedItems.length} items)`);
                }
              }
              
              // チャンク結果の処理
              if (stageData.chunk_result) {
                const chunkData = stageData.chunk_result as unknown[];
                if (newStageData.processingCategory && chunkData.length > 0) {
                  // 既存のデータに追加
                  if (!newStageData.realtimePartialResults[newStageData.processingCategory]) {
                    newStageData.realtimePartialResults[newStageData.processingCategory] = [];
                  }
                  newStageData.realtimePartialResults[newStageData.processingCategory].push(...chunkData);
                  
                  console.log(`📦 [Store] Chunk result added: ${newStageData.processingCategory} (+${chunkData.length} items)`);
                }
              }
            }
          }
          
          set({ 
            currentStage: stage,
            progressStages: newProgressStages,
            stageData: newStageData
          });
        },
        useSessionId
      );
      
      // セッションIDを保存
      if (result.session_id) {
        set({ result, isLoading: false, sessionId: result.session_id });
      } else {
        set({ result, isLoading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  clearResult: () => {
    set({ result: null, error: null });
    get().resetProgress();
  },

  clearError: () => {
    set({ error: null });
  },

  resetProgress: () => {
    set({
      currentStage: 0,
      progressStages: [
        { stage: 1, status: 'pending', message: 'OCR - 画像からテキストを抽出' },
        { stage: 2, status: 'pending', message: 'カテゴリ分析 - 日本語メニューを分析' },
        { stage: 3, status: 'pending', message: '翻訳 - 英語に翻訳' },
        { stage: 4, status: 'pending', message: '詳細説明 - 詳細な説明を追加' },
      ],
      stageData: {
        // リアルタイム部分結果もリセット
        realtimePartialResults: {},
        completedCategories: new Set<string>(),
        processingCategory: undefined,
        chunkProgress: undefined,
        categoryCompleted: undefined
      }
    });
  },

  // === UI Actions ===
  setSelectedCategory: (category: string) => {
    set((state) => ({ ui: { ...state.ui, selectedCategory: category } }));
  },

  showItemDetail: (itemId: string) => {
    set((state) => ({ 
      ui: { ...state.ui, showItemDetail: true, selectedItemId: itemId } 
    }));
  },

  hideItemDetail: () => {
    set((state) => ({ 
      ui: { ...state.ui, showItemDetail: false, selectedItemId: null } 
    }));
  },

  toggleFavorite: (itemId: string) => {
    set((state) => {
      const newFavorites = new Set(state.ui.favorites);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return { ui: { ...state.ui, favorites: newFavorites } };
    });
  },

  toggleDebugMonitor: () => {
    set((state) => ({ 
      ui: { ...state.ui, showDebugMonitor: !state.ui.showDebugMonitor } 
    }));
  },

  toggleRawMenu: () => {
    set((state) => ({ 
      ui: { ...state.ui, showRawMenu: !state.ui.showRawMenu } 
    }));
  },

  setCurrentView: (view: 'categories' | 'items' | 'generated') => {
    set((state) => ({ ui: { ...state.ui, currentView: view } }));
  },

  // === Utility Functions ===
  getEmojiForCategory: (category: string) => {
    const lowerCategory = category.toLowerCase();
    for (const [key, emoji] of Object.entries(categoryEmojiMap)) {
      if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
        return emoji;
      }
    }
    return '🍽️'; // デフォルト
  },

  getCurrentMenuData: () => {
    const { stageData, currentStage } = get();
    
    // Stage 4: 完全版（詳細説明付き）
    if (currentStage >= 4 && stageData.finalMenu) {
      return stageData.finalMenu;
    }
    
    // Stage 4進行中: リアルタイム部分結果をマージして表示
    if (currentStage === 4) {
      // リアルタイム部分結果があればそれを基にマージ
      if (stageData.realtimePartialResults && Object.keys(stageData.realtimePartialResults).length > 0) {
        const baseData = stageData.translatedCategories || {};
        const mergedData: Record<string, unknown[]> = {};
        
        // 全カテゴリをベースにマージ
        for (const [category, items] of Object.entries(baseData)) {
          // リアルタイム結果があればそれを使用、なければ翻訳結果を使用
          if (stageData.realtimePartialResults[category]) {
            mergedData[category] = stageData.realtimePartialResults[category];
            console.log(`📊 [Store] Using realtime data for ${category}: ${stageData.realtimePartialResults[category].length} items`);
          } else {
            mergedData[category] = items;
          }
        }
        
        return mergedData;
      }
      
      // リアルタイム結果がない場合は従来の部分結果を使用
      if (stageData.partialMenu) {
        return stageData.partialMenu;
      }
      
      // 部分結果もない場合は翻訳結果を表示
      if (stageData.translatedCategories && stageData.show_translated_menu) {
        return stageData.translatedCategories;
      }
    }
    
    // Stage 3: 翻訳版
    if (currentStage >= 3 && stageData.translatedCategories && stageData.show_translated_menu) {
      return stageData.translatedCategories;
    }
    
    // Stage 2: カテゴリ分析版
    if (currentStage >= 2 && stageData.categories) {
      return stageData.categories;
    }
    
    return null;
  },

  getFilteredItems: () => {
    const { ui } = get();
    const menuData = get().getCurrentMenuData();
    
    if (!menuData) return [];
    
    let allItems: unknown[] = [];
    
    // カテゴリフィルタリング
    if (ui.selectedCategory === 'all') {
      allItems = Object.values(menuData).flat();
    } else {
      allItems = menuData[ui.selectedCategory] || [];
    }
    
    return allItems;
  },

  getCategoryList: () => {
    const menuData = get().getCurrentMenuData();
    return menuData ? Object.keys(menuData) : [];
  },

  // === Stage 4リアルタイム状態判定ユーティリティ ===
  getMenuItemStatus: (item: any, categoryName: string) => {
    const { stageData, currentStage } = get();
    
    // Stage 4未満では基本状態のみ
    if (currentStage < 4) {
      return {
        isTranslated: currentStage >= 3 && Boolean(item.english_name),
        isComplete: false,
        isPartiallyComplete: false,
        isCurrentlyProcessing: false
      };
    }
    
    // Stage 4での詳細判定
    const isComplete = Boolean(item.description && item.description !== 'N/A' && item.description.length > 20);
    const isCurrentlyProcessing = stageData.processingCategory === categoryName;
    const isCategoryCompleted = stageData.completedCategories?.has(categoryName) || false;
    
    return {
      isTranslated: Boolean(item.english_name),
      isComplete: isComplete && isCategoryCompleted,
      isPartiallyComplete: Boolean(item.description) && !isComplete,
      isCurrentlyProcessing: isCurrentlyProcessing && !isCategoryCompleted
    };
  },

  getCategoryProgress: (categoryName: string) => {
    const { stageData, currentStage } = get();
    
    if (currentStage < 4) return null;
    
    const menuData = get().getCurrentMenuData();
    if (!menuData || !menuData[categoryName]) return null;
    
    const items = menuData[categoryName];
    const total = items.length;
    let completed = 0;
    let partial = 0;
    
    items.forEach(item => {
      const status = get().getMenuItemStatus(item, categoryName);
      if (status.isComplete) completed++;
      else if (status.isPartiallyComplete) partial++;
    });
    
    return {
      total,
      completed,
      partial,
      processing: stageData.processingCategory === categoryName,
      isCompleted: stageData.completedCategories?.has(categoryName) || false
    };
  },

  getOverallProgress: () => {
    const { currentStage } = get();
    const menuData = get().getCurrentMenuData();
    
    if (!menuData || currentStage < 4) return null;
    
    let totalItems = 0;
    let completedItems = 0;
    let partialItems = 0;
    
    Object.keys(menuData).forEach(categoryName => {
      const progress = get().getCategoryProgress(categoryName);
      if (progress) {
        totalItems += progress.total;
        completedItems += progress.completed;
        partialItems += progress.partial;
      }
    });
    
    return {
      totalItems,
      completedItems,
      partialItems,
      progressPercent: totalItems > 0 ? Math.round(((completedItems + partialItems * 0.5) / totalItems) * 100) : 0
    };
  },
}));

// 旧ストアとの互換性のためのエイリアス
export const useTranslationStore = useMenuStore; 