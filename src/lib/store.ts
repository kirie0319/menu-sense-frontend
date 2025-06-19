// 統合された軽量ストア - Progress Store 統合版
import { create } from 'zustand';
import { TranslationState } from '@/types';
import { MenuTranslationApi } from './api';
import { useProgressStore } from './stores/progressStore';
import { useDataStore } from './stores/dataStore';
import { UIState } from './stores/uiStore';

// 統合された状態管理ストア (Progress機能をProgressStoreに移管)
interface MenuStore extends TranslationState {
  // UI状態
  ui: UIState;
  
  // Core Actions
  setFile: (file: File | null) => void;
  translateMenu: (existingSessionId?: string) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  
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
  
  // === 画像生成関連のヘルパー ===
  getGeneratedImageUrl: (item: any) => string | null;
  hasGeneratedImages: () => boolean;
}

// Emojiマッピング（Data Storeに移動済み）

export const useMenuStore = create<MenuStore>((set, get) => ({
  // 初期状態
  isLoading: false,
  result: null,
  error: null,
  selectedFile: null,
  
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
      // Progress Store のリセットを使用
      useProgressStore.getState().resetProgress();
    }
  },

  translateMenu: async (existingSessionId?: string) => {
    const { selectedFile, isLoading } = get();
    const { sessionId } = useProgressStore.getState();
    
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
    useProgressStore.getState().resetProgress();

    try {
      const result = await MenuTranslationApi.translateMenuWithProgress(
        selectedFile,
        (stage: number, status: string, message: string, data?: unknown) => {
          // Progress Store の更新機能を使用
          useProgressStore.getState().updateProgress(stage, status, message, data);
        },
        useSessionId
      );
      
      // セッションIDを保存
      if (result.session_id) {
        useProgressStore.getState().setSessionId(result.session_id);
        set({ result, isLoading: false });
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
    useProgressStore.getState().resetProgress();
  },

  clearError: () => {
    set({ error: null });
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

  // === Utility Functions (Data Store Proxies) ===
  getEmojiForCategory: (category: string) => {
    return useDataStore.getState().getEmojiForCategory(category);
  },

  getCurrentMenuData: () => {
    return useDataStore.getState().getCurrentMenuData();
  },

  getFilteredItems: () => {
    return useDataStore.getState().getFilteredItems();
  },

  getCategoryList: () => {
    return useDataStore.getState().getCategoryList();
  },

  // === 画像生成関連のヘルパー (Data Store Proxies) ===
  getGeneratedImageUrl: (item: any) => {
    return useDataStore.getState().getGeneratedImageUrl(item);
  },

  hasGeneratedImages: () => {
    return useDataStore.getState().hasGeneratedImages();
  },
}));

// Legacy alias for backward compatibility
export const useTranslationStore = useMenuStore; 