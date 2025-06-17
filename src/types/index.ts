export interface MenuItem {
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
  
  // 基本的なメニューアイテム (旧型定義との互換性)
  japanese_name?: string;
  english_name?: string;
}

export interface Category {
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

export interface StageData {
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

export interface MenuItemState {
  japanese_name?: string;
  english_name?: string;
  description?: string;
  price?: string;
  stage: number; // どの段階まで完了しているか
}

// API用の基本的なメニューアイテム
export interface ApiMenuItem {
  japanese_name?: string;
  english_name?: string;
  description?: string;
  price?: string;
}

export interface TranslationResponse {
  extracted_text: string;
  menu_items: ApiMenuItem[];
  message?: string;
}

export interface TranslationState {
  isLoading: boolean;
  result: TranslationResponse | null;
  error: string | null;
  selectedFile: File | null;
}

export interface ApiError {
  detail: string;
}

export interface MenuCategoryListProps {
  categories: Category[];
  selectedCategory: string;
  onCategorySelect: (categoryId: string) => void;
  currentStage: number;
  stageData?: StageData;
}

export interface MenuItemCardProps {
  item: MenuItem;
  isFavorite: boolean;
  onToggleFavorite: (itemId: number) => void;
  onItemClick: (item: MenuItem) => void;
  newItemAnimations?: Set<number>;
  streamingUpdates?: Set<string>;
}

export interface TranslationStatusProps {
  isAnalyzing: boolean;
  currentStage: number;
  stageData?: StageData;
  stage1Progress: number;
  stage2Progress: number;
  detectedItems: Array<{text: string, delay: number}>;
  analysisItems: Array<{text: string, delay: number}>;
  onCancelAnalysis: () => void;

  realtimeMenuItems?: MenuItem[];
  stage3Completed?: boolean;
  isDebugVisible?: boolean;
  lastUpdateTime?: number;
}

export interface IncrementalMenuProps {
  categories?: Record<string, any[]>;
  translatedCategories?: Record<string, any[]>;
  finalMenu?: Record<string, any[]>;
  currentStage: number;
} 