// Data Store - メニューデータ処理・変換の専用ストア
import { create } from 'zustand';
import { useProgressStore } from './progressStore';
import { useUIStore } from './uiStore';
import { MenuTranslationApi } from '../api';

// データ処理関連の型定義
interface MenuData {
  [category: string]: unknown[];
}

// S3画像キャッシュの型定義
interface S3ImageCache {
  [itemName: string]: {
    url: string;
    timestamp: number;
    filename: string;
  };
}

interface DataStore {
  // === データ処理メソッド ===
  getCurrentMenuData: () => MenuData | null;
  getFilteredItems: () => unknown[];
  getCategoryList: () => string[];
  
  // === カテゴリ関連 ===
  getEmojiForCategory: (category: string) => string;
  
  // === 画像生成関連（互換性対応） ===
  getGeneratedImageUrl: (item: any) => string | null;
  getGeneratedImageUrlAsync: (item: any) => Promise<string | null>;
  hasGeneratedImages: () => boolean;
  
  // === S3画像キャッシュ管理 ===
  clearImageCache: () => void;
  preloadRecentImages: () => Promise<void>;

  // === デバッグ用テストメソッド ===
  testS3ImageMatching: () => Promise<number>;
}

// カテゴリ絵文字マッピング
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

// S3画像キャッシュ（メモリキャッシュ）
let s3ImageCache: S3ImageCache = {};
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10分でキャッシュ期限切れ
let isPreloadingImages = false;
let hasPreloadedImages = false;

// 自動プリロード関数
const autoPreloadS3Images = async () => {
  if (isPreloadingImages || hasPreloadedImages) {
    return; // 既にプリロード中または完了済み
  }
  
  isPreloadingImages = true;
  console.log(`🚀 [DataStore] Auto-preloading S3 images...`);
  
  try {
    const { MenuTranslationApi } = await import('../api');
    const recentResult = await MenuTranslationApi.getRecentImages(50);
    
    if (recentResult.success && recentResult.images) {
      console.log(`📥 [DataStore] Auto-preloaded ${recentResult.images.length} S3 images`);
      
      // 最近の画像をキャッシュに追加
      recentResult.images.forEach((image: any) => {
        // ファイル名をそのままキーとして使用（fuzzy matchingで検索するため）
        const cacheKey = image.filename.toLowerCase();
        s3ImageCache[cacheKey] = {
          url: image.url,
          timestamp: Date.now(),
          filename: image.filename
        };
      });
      
      hasPreloadedImages = true;
      console.log(`📋 [DataStore] S3 cache auto-populated with ${Object.keys(s3ImageCache).length} images`);
    }
  } catch (error) {
    console.warn(`⚠️ [DataStore] Auto-preload failed (non-critical):`, error);
  } finally {
    isPreloadingImages = false;
  }
};

// ヘルパー関数: S3画像ファイル名から意味のある単語を抽出
const extractWordsFromFilename = (filename: string): string[] => {
  // ファイル名から拡張子と日付/タイムスタンプを除去
  let cleanName = filename.toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '') // 拡張子を除去
    .replace(/_\d{8}_\d{6}$/, '') // タイムスタンプパターンを除去 (_20250624_110654)
    .replace(/^menu_image_/, ''); // プレフィックスを除去
  
  // アンダースコアをスペースに変換して単語に分割
  return cleanName.split(/[_\s-]+/).filter(word => word.length > 2);
};

// ヘルパー関数: アイテム名を正規化して検索用単語を抽出
const extractWordsFromItemName = (itemName: string): string[] => {
  return itemName.toLowerCase()
    .replace(/[^\w\s]/g, '') // 特殊文字を除去
    .split(/\s+/)
    .filter(word => word.length > 2);
};

// ヘルパー関数: 2つの単語配列間で一致度を計算
const calculateMatchScore = (itemWords: string[], filenameWords: string[]): number => {
  let score = 0;
  
  for (const itemWord of itemWords) {
    for (const filenameWord of filenameWords) {
      if (itemWord === filenameWord) {
        score += 10; // 完全一致
      } else if (itemWord.includes(filenameWord) || filenameWord.includes(itemWord)) {
        score += 5; // 部分一致
      } else if (itemWord.startsWith(filenameWord) || filenameWord.startsWith(itemWord)) {
        score += 3; // 開始一致
      }
    }
  }
  
  return score;
};

// ヘルパー関数: S3キャッシュから最適な画像を検索
const findBestMatchingImage = (itemName: string): string | null => {
  if (!itemName || Object.keys(s3ImageCache).length === 0) {
    return null;
  }
  
  const itemWords = extractWordsFromItemName(itemName);
  if (itemWords.length === 0) {
    return null;
  }
  
  let bestMatch: { url: string; score: number } | null = null;
  
  // 全S3キャッシュエントリに対してマッチングスコアを計算
  for (const [cacheKey, cacheEntry] of Object.entries(s3ImageCache)) {
    // キャッシュの有効性をチェック
    if (Date.now() - cacheEntry.timestamp > CACHE_EXPIRY_TIME) {
      continue;
    }
    
    const filenameWords = extractWordsFromFilename(cacheEntry.filename);
    if (filenameWords.length === 0) {
      continue;
    }
    
    const score = calculateMatchScore(itemWords, filenameWords);
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { url: cacheEntry.url, score };
    }
  }
  
  if (bestMatch && bestMatch.score >= 5) { // 最小スコア閾値
    console.log(`✅ [DataStore] S3 image match found: "${itemName}" → "${bestMatch.url}" (score: ${bestMatch.score})`);
    return bestMatch.url;
  }
  
  console.log(`❌ [DataStore] No suitable S3 image match for: "${itemName}"`);
  return null;
};

// ヘルパー関数: 従来のローカル画像検索（フォールバック用）
const getLegacyImageUrl = (item: any, stageData: any): string | null => {
  const itemName = item.english_name || item.name_english || item.name || '';
  if (!itemName || !stageData.imagesGenerated) {
    return null;
  }
  
  const normalizedItemName = itemName.toLowerCase().replace(/\s+/g, '_');
  
  // カテゴリごとに配列を検索
  for (const [categoryName, categoryImages] of Object.entries(stageData.imagesGenerated)) {
    if (Array.isArray(categoryImages)) {
      for (let i = 0; i < categoryImages.length; i++) {
        const imageItem = categoryImages[i] as any;
        const imageItemName = imageItem.english_name || imageItem.name || imageItem.item_name || '';
        const imageUrl = imageItem.image_url || imageItem.url || imageItem.path || '';
        
        if (imageItemName && imageUrl) {
          const normalizedImageName = imageItemName.toLowerCase().replace(/\s+/g, '_');
          
          if (normalizedImageName === normalizedItemName || 
              normalizedImageName.includes(normalizedItemName) || 
              normalizedItemName.includes(normalizedImageName)) {
            
            const baseUrl = 'http://localhost:8000';
            const imagePath = imageUrl.startsWith('/uploads/') ? imageUrl : `/uploads/${imageUrl}`;
            const fullUrl = `${baseUrl}${imagePath}`;
            console.log(`✅ [DataStore] Legacy image match found: "${itemName}" → "${fullUrl}"`);
            return fullUrl;
          }
        }
      }
    }
  }
  
  return null;
};

export const useDataStore = create<DataStore>(() => ({
  // === データ処理メソッド ===
  getCurrentMenuData: () => {
    const { stageData, currentStage } = useProgressStore.getState();
    
    // デバッグ用：S3画像テスト用のダミーデータ
    const createTestMenuData = (): MenuData => {
      console.log(`🧪 [DataStore] Creating test menu data for S3 image testing`);
      return {
        'Desserts': [
          {
            id: 'test-gelato',
            english_name: '2 Types of Gelato',
            japanese_name: '2種類のジェラート',
            name: '2 Types of Gelato',
            description: 'Delicious artisan gelato in two flavors',
            price: '¥800',
            tags: ['Dessert', 'Cold'],
            image: '🍨'
          },
          {
            id: 'test-apple',
            english_name: 'Apple Dessert',
            japanese_name: 'アップルデザート',
            name: 'Apple Dessert',
            description: 'Fresh apple-based dessert',
            price: '¥600',
            tags: ['Dessert', 'Fruit'],
            image: '🍎'
          }
        ],
        'Vegetables': [
          {
            id: 'test-carrot',
            english_name: 'Carrot Dish',
            japanese_name: 'キャロット料理',
            name: 'Carrot Dish',
            description: 'Fresh carrot preparation',
            price: '¥500',
            tags: ['Vegetarian', 'Healthy'],
            image: '🥕'
          }
        ],
        'Beverages': [
          {
            id: 'test-herbal-tea',
            english_name: 'Herbal Tea',
            japanese_name: 'ハーブティー',
            name: 'Herbal Tea',
            description: 'Relaxing herbal tea blend',
            price: '¥400',
            tags: ['Hot', 'Healthy'],
            image: '🍵'
          },
          {
            id: 'test-cappuccino',
            english_name: 'Cappuccino',
            japanese_name: 'カプチーノ',
            name: 'Cappuccino',
            description: 'Rich espresso with steamed milk',
            price: '¥450',
            tags: ['Hot', 'Coffee'],
            image: '☕'
          }
        ]
      };
    };
    
    // S3画像テスト用の条件追加：stageDataが空またはメニューデータがない場合
    if (!stageData || Object.keys(stageData).length === 0 || currentStage < 2) {
      console.log(`🧪 [DataStore] No real menu data found, returning test data for S3 image testing`);
      return createTestMenuData();
    }
    
    // 新しい並列処理システム：MenuStoreの結果を最優先で確認
    const menuStoreState = (() => {
      try {
        // 循環参照を避けるため、直接ストアから取得
        const stores = require('../store');
        return stores.useMenuStore.getState();
      } catch (error) {
        console.warn('[DataStore] Failed to access MenuStore:', error);
        return null;
      }
    })();
    
    // リアルタイムアイテムキューを最優先で確認（処理中の表示）
    if (currentStage >= 3 && stageData.realtime_items && Object.keys(stageData.realtime_items).length > 0) {
      console.log(`📤 [DataStore] Using realtime queued items: ${Object.keys(stageData.realtime_items).length} categories`);
      
      // リアルタイムアイテムキューをそのまま返す
      const realtimeMenu: MenuData = {};
      for (const [categoryName, items] of Object.entries(stageData.realtime_items)) {
        realtimeMenu[categoryName] = items as unknown[];
      }
      
      return realtimeMenu;
    }
    
    // 並列処理完了後の最終結果がある場合はそれを使用
    if (menuStoreState?.result?.menu_items && Array.isArray(menuStoreState.result.menu_items) && menuStoreState.result.menu_items.length > 0) {
      console.log(`📋 [DataStore] Using parallel processing result: ${menuStoreState.result.menu_items.length} items`);
      
      // menu_itemsをカテゴリ別にグループ化（フォールバック：すべてを"メニュー"カテゴリに配置）
      const groupedMenu: MenuData = {};
      
      // ProgressStoreからカテゴリ情報を取得してグループ化を試行
      if (stageData.categories && Object.keys(stageData.categories).length > 0) {
        // 既存のカテゴリ構造を使用してグループ化
        const categoryNames = Object.keys(stageData.categories);
        menuStoreState.result.menu_items.forEach((item: any, index: number) => {
          // アイテムをカテゴリに割り当て（簡単な分散方法）
          const categoryIndex = index % categoryNames.length;
          const categoryName = categoryNames[categoryIndex];
          
          if (!groupedMenu[categoryName]) {
            groupedMenu[categoryName] = [];
          }
          groupedMenu[categoryName].push(item);
        });
      } else {
        // カテゴリ情報がない場合はアイテムの内容から推測
        menuStoreState.result.menu_items.forEach((item: any) => {
          const itemName = (item.japanese_name || item.english_name || '').toLowerCase();
          let category = 'メニュー'; // デフォルトカテゴリ
          
          // 簡単なカテゴリ分類
          if (itemName.includes('コーヒー') || itemName.includes('tea') || itemName.includes('ドリンク') || 
              itemName.includes('coffee') || itemName.includes('juice') || itemName.includes('ティー')) {
            category = 'ドリンク';
          } else if (itemName.includes('ケーキ') || itemName.includes('プリン') || itemName.includes('ジェラート') || 
                     itemName.includes('cake') || itemName.includes('dessert') || itemName.includes('sweet')) {
            category = 'デザート';
          }
          
          if (!groupedMenu[category]) {
            groupedMenu[category] = [];
          }
          groupedMenu[category].push(item);
        });
      }
      
      return groupedMenu;
    }
    
    // Stage 5: 画像付き完全版
    if (currentStage >= 5 && stageData.finalMenuWithImages) {
      return stageData.finalMenuWithImages;
    }
    
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
            console.log(`📊 [DataStore] Using realtime data for ${category}: ${stageData.realtimePartialResults[category].length} items`);
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
    const { ui } = useUIStore.getState();
    
    // getCurrentMenuDataを再利用して統一的なデータ取得
    const dataStore = useDataStore.getState();
    const menuData = dataStore.getCurrentMenuData();
    
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

  getCategoryList: (): string[] => {
    // getCurrentMenuDataを再利用して統一的なデータ取得
    const dataStore = useDataStore.getState();
    const menuData = dataStore.getCurrentMenuData();
    
    return menuData ? Object.keys(menuData) : [];
  },

  // === カテゴリ関連 ===
  getEmojiForCategory: (category: string) => {
    const lowerCategory = category.toLowerCase();
    for (const [key, emoji] of Object.entries(categoryEmojiMap)) {
      if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
        return emoji;
      }
    }
    return '🍽️'; // デフォルト
  },

  // === 画像生成関連（互換性対応） ===
  getGeneratedImageUrl: (item: any) => {
    // 同期版：アイテム直接のimage_url、キャッシュ済みS3画像、またはローカル画像
    const { stageData } = useProgressStore.getState();
    
    // 最優先：アイテム自体にimage_urlが含まれている場合
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim()) {
      console.log(`✅ [DataStore] Using direct image_url: "${item.english_name || item.name || 'item'}" → "${item.image_url}"`);
      return item.image_url;
    }
    
    // S3画像の自動プリロードを開始（非同期、非ブロッキング）
    if (!hasPreloadedImages && !isPreloadingImages) {
      autoPreloadS3Images();
    }
    
    // アイテム名を取得
    const itemName = item.english_name || item.name_english || item.name || '';
    if (!itemName) {
      return null;
    }

    // S3キャッシュからファジーマッチングで画像を検索
    const s3ImageUrl = findBestMatchingImage(itemName);
    if (s3ImageUrl) {
      return s3ImageUrl;
    }

    // S3に一致がない場合はローカル画像のフォールバック
    if (stageData.imagesGenerated) {
      return getLegacyImageUrl(item, stageData);
    }
    
    return null;
  },

  getGeneratedImageUrlAsync: async (item: any) => {
    // 非同期版：S3 API検索を含む完全版
    const { stageData } = useProgressStore.getState();
    
    // 最優先：アイテム自体にimage_urlが含まれている場合
    if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim()) {
      console.log(`✅ [DataStore] Using direct image_url (async): "${item.english_name || item.name || 'item'}" → "${item.image_url}"`);
      return item.image_url;
    }
    
    // アイテム名を取得
    const itemName = item.english_name || item.name_english || item.name || '';
    if (!itemName) {
      console.log(`🖼️ [DataStore] No item name found for S3 search:`, item);
      return null;
    }

    console.log(`🔍 [DataStore] Searching S3 for image: "${itemName}"`);

    // まずキャッシュからファジーマッチングで検索
    const cachedImageUrl = findBestMatchingImage(itemName);
    if (cachedImageUrl) {
      console.log(`📋 [DataStore] Using cached S3 image from fuzzy match: "${itemName}" → "${cachedImageUrl}"`);
      return cachedImageUrl;
    }

    try {
      // S3から画像を検索
      console.log(`🌐 [DataStore] Fetching from S3 API for: "${itemName}"`);
      const searchResult = await MenuTranslationApi.searchImages(itemName);
      
      if (searchResult.success && searchResult.images && searchResult.images.length > 0) {
        const foundImage = searchResult.images[0]; // 最初の結果を使用
        console.log(`✅ [DataStore] S3 image found: "${itemName}" → "${foundImage.url}"`);
        
        // キャッシュに保存
        const newCacheKey = foundImage.filename.toLowerCase();
        s3ImageCache[newCacheKey] = {
          url: foundImage.url,
          timestamp: Date.now(),
          filename: foundImage.filename
        };
        
        return foundImage.url;
      }

      // 名前の一部で再検索を試行
      const words = itemName.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 2) { // 3文字以上の単語のみ
          try {
            const partialResult = await MenuTranslationApi.searchImages(word);
            if (partialResult.success && partialResult.images && partialResult.images.length > 0) {
              const foundImage = partialResult.images[0];
              console.log(`✅ [DataStore] S3 partial match found: "${itemName}" (searched: "${word}") → "${foundImage.url}"`);
              
              // キャッシュに保存
              const partialCacheKey = foundImage.filename.toLowerCase();
              s3ImageCache[partialCacheKey] = {
                url: foundImage.url,
                timestamp: Date.now(),
                filename: foundImage.filename
              };
              
              return foundImage.url;
            }
          } catch (partialError) {
            console.log(`⚠️ [DataStore] Partial search failed for word "${word}":`, partialError);
          }
        }
      }

      console.log(`❌ [DataStore] No S3 image found for: "${itemName}"`);
      return null;

    } catch (error) {
      console.error(`❌ [DataStore] S3 search error for "${itemName}":`, error);
      
      // エラー時はローカル画像のフォールバック（従来の実装）
      if (stageData.imagesGenerated) {
        console.log(`🔄 [DataStore] Falling back to local image search for: "${itemName}"`);
        return getLegacyImageUrl(item, stageData);
      }
      
      return null;
    }
  },

  hasGeneratedImages: () => {
    // S3画像の自動プリロードを開始（非同期、非ブロッキング）
    if (!hasPreloadedImages && !isPreloadingImages) {
      autoPreloadS3Images();
    }
    
    // S3キャッシュをチェック
    if (Object.keys(s3ImageCache).length > 0) {
      console.log(`🖼️ [DataStore] S3 images found in cache: ${Object.keys(s3ImageCache).length} items`);
      return true;
    }

    // 従来のローカル画像チェック
    const { stageData } = useProgressStore.getState();
    
    if (!stageData.imagesGenerated || Object.keys(stageData.imagesGenerated).length === 0) {
      return false;
    }
    
    // カテゴリごとに配列をチェック
    for (const [categoryName, categoryImages] of Object.entries(stageData.imagesGenerated)) {
      if (Array.isArray(categoryImages) && categoryImages.length > 0) {
        // 有効な画像アイテムがあるかチェック
        for (const imageItem of categoryImages) {
          const imageUrl = (imageItem as any).image_url || (imageItem as any).url || (imageItem as any).path;
          if (imageUrl) {
            console.log(`🖼️ [DataStore] Legacy images found in category: ${categoryName}`);
            return true;
          }
        }
      }
    }
    
    console.log(`🖼️ [DataStore] No images found (S3 or legacy)`);
    return false;
  },

  // === S3画像キャッシュ管理 ===
  clearImageCache: () => {
    console.log(`🧹 [DataStore] Clearing S3 image cache (${Object.keys(s3ImageCache).length} items)`);
    s3ImageCache = {};
  },

  preloadRecentImages: async () => {
    try {
      console.log(`🚀 [DataStore] Preloading recent S3 images...`);
      const recentResult = await MenuTranslationApi.getRecentImages(50);
      
      if (recentResult.success && recentResult.images) {
        console.log(`📥 [DataStore] Preloaded ${recentResult.images.length} recent S3 images`);
        
        // 最近の画像をキャッシュに追加
        recentResult.images.forEach((image: any) => {
          // ファイル名をそのままキーとして使用（fuzzy matchingで検索するため）
          const cacheKey = image.filename.toLowerCase();
          s3ImageCache[cacheKey] = {
            url: image.url,
            timestamp: Date.now(),
            filename: image.filename
          };
        });
        
        console.log(`📋 [DataStore] S3 cache now contains ${Object.keys(s3ImageCache).length} images`);
      }
    } catch (error) {
            console.error(`❌ [DataStore] Failed to preload S3 images:`, error);
    }
  },

  // === デバッグ用テストメソッド ===
  testS3ImageMatching: async () => {
    console.log(`🧪 [DataStore] Testing S3 image matching functionality...`);
    
    // まずS3画像をプリロード
    const dataStore = useDataStore.getState();
    await dataStore.preloadRecentImages();
    
    // テストアイテム名
    const testItems = [
      'Gelato',
      '2 Types of Gelato',
      'Apple',
      'Apple Dessert',
      'Carrot',
      'Carrot Dish',
      'Herbal Tea',
      'Cappuccino'
    ];
    
    console.log(`🔍 [DataStore] Testing image matching for ${testItems.length} items...`);
    
    for (const itemName of testItems) {
      const mockItem = { english_name: itemName, name: itemName };
      const imageUrl = dataStore.getGeneratedImageUrl(mockItem);
      console.log(`🖼️ [DataStore] "${itemName}" → ${imageUrl ? 'FOUND' : 'NOT FOUND'}:`, imageUrl);
    }
    
    console.log(`📊 [DataStore] S3 cache contents:`, Object.keys(s3ImageCache));
    return Object.keys(s3ImageCache).length;
  },
})); 