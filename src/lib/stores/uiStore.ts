import { create } from 'zustand'

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

// UI Store の型定義
interface UIStore {
  ui: UIState;
  
  // UI Actions
  setSelectedCategory: (category: string) => void;
  showItemDetail: (itemId: string) => void;
  hideItemDetail: () => void;
  toggleFavorite: (itemId: string) => void;
  toggleDebugMonitor: () => void;
  toggleRawMenu: () => void;
  setCurrentView: (view: 'categories' | 'items' | 'generated') => void;
}

// Emojiマッピング（Data Storeに移動済み）

// UI Store の実装
export const useUIStore = create<UIStore>((set, get) => ({
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
}));

// 型をエクスポート
export type { UIState, UIStore }; 