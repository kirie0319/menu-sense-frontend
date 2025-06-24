// Data Store - メニューデータ処理・変換の専用ストア
import { create } from 'zustand';
import { useProgressStore } from './progressStore';
import { useUIStore } from './uiStore';

// データ処理関連の型定義
interface MenuData {
  [category: string]: unknown[];
}

interface DataStore {
  // === データ処理メソッド ===
  getCurrentMenuData: () => MenuData | null;
  getFilteredItems: () => unknown[];
  getCategoryList: () => string[];
  
  // === カテゴリ関連 ===
  getEmojiForCategory: (category: string) => string;
  
  // === 画像生成関連 ===
  getGeneratedImageUrl: (item: any) => string | null;
  hasGeneratedImages: () => boolean;
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

export const useDataStore = create<DataStore>(() => ({
  // === データ処理メソッド ===
  getCurrentMenuData: () => {
    const { stageData, currentStage } = useProgressStore.getState();
    
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

  // === 画像生成関連 ===
  getGeneratedImageUrl: (item: any) => {
    const { stageData } = useProgressStore.getState();
    
    if (!stageData.imagesGenerated) {
      console.log(`🖼️ [DataStore] No images generated yet`);
      return null;
    }

    // アイテム名から画像ファイル名を推測
    const itemName = item.english_name || item.name_english || item.name || '';
    if (!itemName) {
      console.log(`🖼️ [DataStore] No item name found for:`, item);
      return null;
    }
    
    // 画像マッピングから対応する画像パスを探す
    const normalizedItemName = itemName.toLowerCase().replace(/\s+/g, '_');
    
    console.log(`🔍 [DataStore] Looking for image: "${itemName}" (normalized: "${normalizedItemName}")`);
    console.log(`🔍 [DataStore] Available categories:`, Object.keys(stageData.imagesGenerated));
    
    // カテゴリごとに配列を検索
    for (const [categoryName, categoryImages] of Object.entries(stageData.imagesGenerated)) {
      if (Array.isArray(categoryImages)) {
        console.log(`🔍 [DataStore] Checking category: "${categoryName}" (${categoryImages.length} items)`);
        
        for (let i = 0; i < categoryImages.length; i++) {
          const imageItem = categoryImages[i] as any;
          const imageItemName = imageItem.english_name || imageItem.name || imageItem.item_name || '';
          const imageUrl = imageItem.image_url || imageItem.url || imageItem.path || '';
          
          if (imageItemName && imageUrl) {
            const normalizedImageName = imageItemName.toLowerCase().replace(/\s+/g, '_');
            console.log(`🔍 [DataStore] Comparing "${normalizedItemName}" with "${normalizedImageName}" (${categoryName}[${i}])`);
            
            // 名前の一致チェック（完全一致優先、部分一致もサポート）
            if (normalizedImageName === normalizedItemName || 
                normalizedImageName.includes(normalizedItemName) || 
                normalizedItemName.includes(normalizedImageName)) {
              
              // 静的ファイル配信用のURLを構築（メインルートの /uploads/ を使用）
              const baseUrl = 'http://localhost:8000';
              // imageUrl が /uploads/ で始まる場合はそのまま使用、そうでなければ /uploads/ を追加
              const imagePath = imageUrl.startsWith('/uploads/') ? imageUrl : `/uploads/${imageUrl}`;
              const fullUrl = `${baseUrl}${imagePath}`;
              console.log(`✅ [DataStore] Image match found: "${itemName}" → "${fullUrl}"`);
              return fullUrl;
            }
          } else {
            console.log(`🔍 [DataStore] Invalid image item in ${categoryName}[${i}]:`, imageItem);
          }
        }
      } else {
        console.log(`🔍 [DataStore] ${categoryName} is not an array:`, typeof categoryImages);
      }
    }
    
    console.log(`❌ [DataStore] No image match found for: "${itemName}"`);
    return null;
  },

  hasGeneratedImages: () => {
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
            console.log(`🖼️ [DataStore] Images found in category: ${categoryName}`);
            return true;
          }
        }
      }
    }
    
    console.log(`🖼️ [DataStore] No valid images found`);
    return false;
  },
})); 