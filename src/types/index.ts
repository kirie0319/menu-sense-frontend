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
  session_id?: string;
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

// ===============================================
// 🗄️ Database Integration Types
// ===============================================

export interface DBMenuItem {
  id: string;
  session_id: string;
  item_id: number;
  japanese_text: string;
  english_text?: string;
  category?: string;
  description?: string;
  image_url?: string;
  translation_status: 'pending' | 'completed' | 'failed';
  description_status: 'pending' | 'completed' | 'failed';
  image_status: 'pending' | 'completed' | 'failed';
  providers: ProcessingProvider[];
  created_at: string;
  updated_at: string;
}

export interface ProcessingProvider {
  stage: 'translation' | 'description' | 'image';
  provider: string;
  processing_time_ms?: number;
  fallback_used: boolean;
  processed_at: string;
}

export interface DBSessionResponse {
  success: boolean;
  session_id: string;
  database_id: string;
  total_items: number;
  status: string;
  created_at: string;
  message: string;
}

export interface DBSessionDetail {
  session_id: string;
  total_items: number;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata: Record<string, any>;
  menu_items: DBMenuItem[];
  progress: DBProgressInfo;
}

export interface DBProgressInfo {
  total_items: number;
  translation_completed: number;
  description_completed: number;
  image_completed: number;
  fully_completed: number;
  progress_percentage: number;
}

export interface DBProgressResponse {
  session_id: string;
  progress: DBProgressInfo;
  last_updated: string;
}

export interface DBSearchOptions {
  category?: string;
  limit?: number;
  page?: number;
}

export interface DBSearchResponse {
  query: string;
  total_results: number;
  results: DBMenuItem[];
  pagination: {
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface DBProgressEvent {
  type: 'progress_update' | 'item_completed' | 'session_completed' | 'error';
  session_id: string;
  timestamp: string;
  data?: any;
}

export interface DataSourceConfig {
  source: 'redis' | 'database' | 'hybrid';
  fallbackEnabled: boolean;
  healthCheckInterval: number;
  maxLatency: number;
} 