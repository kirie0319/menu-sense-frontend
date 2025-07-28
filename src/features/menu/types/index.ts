// バックエンドのMenuEntityに完全対応したメニューアイテム型定義
export interface MenuEntity {
  id: string;                          // 必須 - メニューID
  name: string;                        // 必須 - 元言語の料理名
  translation: string;                 // 必須 - 翻訳済み料理名
  category?: string;                   // 元言語のカテゴリー
  category_translation?: string;       // 翻訳済みカテゴリー
  price?: string;                      // 価格情報
  description?: string;                // GPT生成の詳細説明
  allergy?: string;                    // アレルゲン情報（複数可）
  ingredient?: string;                 // 主な含有成分
  search_engine?: string;              // Google画像検索結果（複数URL対応）
  gen_image?: string;                  // 生成画像URL
}

// 複数URL対応の検索エンジン結果
export interface SearchEngineResults {
  urls: string[];                      // 複数の検索結果URL
  primary_url?: string;                // メイン画像URL
  search_query?: string;               // 検索に使用したクエリ
  search_timestamp?: string;           // 検索実行時刻
}

// 並列処理タスクの進捗状況
export interface ParallelTaskProgress {
  translation: TaskStatus;
  description: TaskStatus;
  allergy: TaskStatus;
  ingredient: TaskStatus;
  search_image: TaskStatus;
}

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;                   // 0-100の進捗率
  updated_at?: string;                 // 最終更新時刻
  data?: any;                          // タスク固有のデータ
}

// カテゴライズ結果（バックエンドのschemaに対応）
export interface CategoryStructure {
  name: string;                        // カテゴリ名（英語）
  japanese_name: string;              // カテゴリ名（日本語）
  header_y_coordinate: number;        // ヘッダーのY座標
  subcategories?: SubCategory[];       // サブカテゴリ
  items: CategoryMenuItem[];           // カテゴリ内のメニューアイテム
  category_notes?: string;             // カテゴリの注記
}

export interface SubCategory {
  name: string;
  japanese_name: string;
  x_coordinate: number;
  y_coordinate: number;
}

export interface CategoryMenuItem {
  name: string;                        // 商品名
  price: string;                       // 価格 - 必須
  notes?: string;                      // 備考
}

// SSEメッセージ用の並列タスク更新データ
export interface ParallelTaskUpdateData {
  task_type: 'translation' | 'description' | 'allergen' | 'ingredient' | 'search_image';
  status: 'completed' | 'failed' | 'processing';
  batch_idx: number;
  item_id: string;
  original_name: string;
  category?: string;
  
  // 翻訳タスク固有データ
  translation?: string;
  category_translation?: string;
  translation_language?: string;
  
  // 詳細説明タスク固有データ
  description?: string;
  description_language?: string;
  description_length?: number;
  
  // アレルギー解析タスク固有データ
  allergen_info?: string;
  allergen_details?: AllergenInfo[];
  allergen_free?: boolean;
  safety_level?: 'safe' | 'check_required' | 'warning';
  
  // 内容物解析タスク固有データ
  ingredient_info?: string;
  main_ingredients?: IngredientInfo[];
  dietary_info?: DietaryInfo;
  cuisine_category?: string;
  
  // 画像検索タスク固有データ
  search_results?: SearchEngineResults;
  image_urls?: string[];
  primary_image?: string;
}

export interface AllergenInfo {
  name: string;                        // アレルゲン名
  severity?: 'low' | 'medium' | 'high'; // 重要度
  notes?: string;                      // 備考
}

export interface IngredientInfo {
  ingredient: string;                  // 成分名
  category?: string;                   // 成分カテゴリ
  primary?: boolean;                   // 主要成分か
}

export interface DietaryInfo {
  vegetarian?: boolean;
  vegan?: boolean;
  gluten_free?: boolean;
  dairy_free?: boolean;
  halal?: boolean;
  kosher?: boolean;
  spicy_level?: number;                // 0-5の辛さレベル
}

// 表示用のシンプルなメニューアイテム（既存互換性維持）
export interface SimpleMenuItem {
  id: string;
  name: string;
  translation: string;
  price?: string;                      // 価格追加
  category?: string;
  description?: string;
  allergens?: string;
  ingredients?: string;
  image_url?: string;
  image_urls?: string[];               // 複数画像URL対応
  task_progress?: Partial<ParallelTaskProgress>; // 並列処理の進捗
}

// MenuItemsGrid用のプロパティ型
export interface MenuItemsGridProps {
  items?: SimpleMenuItem[];
  onItemClick?: (item: SimpleMenuItem) => void;
  onToggleFavorite?: (itemId: string) => void;
  favorites?: Set<string>;
  showImages?: boolean;
  showPrices?: boolean;                // 価格表示フラグ
  groupByCategory?: boolean;           // カテゴリ別グループ表示
  categories?: CategoryStructure[];    // カテゴリ構造
}

// カテゴリヘッダー用プロパティ
export interface MenuCategoriesHeaderProps {
  categories?: CategoryStructure[];
  selectedCategory?: string;
  onCategorySelect?: (categoryName: string) => void;
  showItemCounts?: boolean;
}

// 統計情報
export interface MenuProcessingStats {
  totalItems: number;
  translatedItems: number;
  descriptionItems: number;
  allergenItems: number;
  ingredientItems: number;
  imageItems: number;
  categorizedItems: number;
  completedItems: number;              // 全タスク完了アイテム数
} 