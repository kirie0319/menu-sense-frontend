import { create } from 'zustand'

// 進捗ステージの型定義
interface ProgressStage {
  stage: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  message: string;
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
  
  // Stage 5: 画像生成関連
  imagesGenerated?: Record<string, Array<{
    english_name?: string;
    image_url?: string;
    prompt_used?: string;
    error?: string;
    generation_success?: boolean;
  }>>;
  finalMenuWithImages?: Record<string, unknown[]>;
  imageGenerationSkipped?: string;
  
  // 新しい並列処理システムのデータ
  completed_items?: number;
  total_items?: number;
  progress_percentage?: number;
  api_stats?: {
    translation_completed?: number;
    description_completed?: number;
    image_completed?: number;
  };
  api_integration?: string;
  elapsed_time?: number;
  items_status?: Array<{
    item_id?: number;
    translation_completed?: boolean;
    description_completed?: boolean;
    image_completed?: boolean;
    japanese_text?: string;
    english_text?: string;
    description?: string;
    image_url?: string;
  }>;
  
  // リアルタイムアイテムキュー
  realtime_items?: Record<string, Array<{
    item_id: number;
    japanese_name: string;
    english_name: string;
    description: string;
    category: string;
    price: string;
    status: 'queued' | 'translating' | 'describing' | 'generating_image' | 'completed';
  }>>;
  
  // キューイングされたアイテム
  queued_item?: {
    item_id: number;
    japanese_name: string;
    english_name: string;
    description: string;
    category: string;
    price: string;
    status: string;
  };
  
  // リアルタイムアイテム状態更新フラグ
  update_realtime_items?: boolean;
}

// Progress Store の型定義
interface ProgressStore {
  // 進捗状態
  currentStage: number;
  progressStages: ProgressStage[];
  stageData: StageData;
  sessionId: string | null;
  
  // Progress Actions
  resetProgress: () => void;
  updateProgress: (stage: number, status: string, message: string, data?: unknown) => void;
  setSessionId: (sessionId: string | null) => void;
  
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

// Progress Store の実装
export const useProgressStore = create<ProgressStore>((set, get) => ({
  // 進捗関連の初期状態
  currentStage: 0,
  progressStages: [
    { stage: 1, status: 'pending', message: 'OCR - 画像からテキストを抽出' },
    { stage: 2, status: 'pending', message: 'カテゴリ分析 - 日本語メニューを分析' },
    { stage: 3, status: 'pending', message: '翻訳 - 英語に翻訳' },
    { stage: 4, status: 'pending', message: '詳細説明 - 詳細な説明を追加' },
    { stage: 5, status: 'pending', message: '画像生成 - AI画像を生成' },
    { stage: 6, status: 'pending', message: '完了 - 処理完了' },
  ],
  stageData: {},
  sessionId: null,

  // === Progress Actions ===
  resetProgress: () => {
    set({
      currentStage: 0,
      progressStages: [
        { stage: 1, status: 'pending', message: 'OCR - 画像からテキストを抽出' },
        { stage: 2, status: 'pending', message: 'カテゴリ分析 - 日本語メニューを分析' },
        { stage: 3, status: 'pending', message: '翻訳 - 英語に翻訳' },
        { stage: 4, status: 'pending', message: '詳細説明 - 詳細な説明を追加' },
        { stage: 5, status: 'pending', message: '画像生成 - AI画像を生成' },
        { stage: 6, status: 'pending', message: '完了 - 処理完了' },
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

  updateProgress: (stage: number, status: string, message: string, data?: unknown) => {
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
      
      // リアルタイムアイテムキューイングの処理
      if (stageData.queued_item) {
        const queuedItem = stageData.queued_item as StageData['queued_item'];
        if (queuedItem) {
          // リアルタイムアイテムデータの初期化
          if (!newStageData.realtime_items) {
            newStageData.realtime_items = {};
          }
          
          // カテゴリ別にアイテムを分類
          const categoryName = queuedItem.category;
          if (!newStageData.realtime_items[categoryName]) {
            newStageData.realtime_items[categoryName] = [];
          }
          
          // 重複チェック（同じitem_idがすでに存在するかチェック）
          const existingIndex = newStageData.realtime_items[categoryName].findIndex(
            item => item.item_id === queuedItem.item_id
          );
          
          if (existingIndex === -1) {
            // 新しいアイテムを追加
            newStageData.realtime_items[categoryName].push({
              item_id: queuedItem.item_id,
              japanese_name: queuedItem.japanese_name,
              english_name: queuedItem.english_name,
              description: queuedItem.description,
              category: queuedItem.category,
              price: queuedItem.price,
              status: queuedItem.status as any
            });
            
            console.log(`📤 [ProgressStore] Item queued: ${queuedItem.japanese_name} → ${categoryName} (${newStageData.realtime_items[categoryName].length} items)`);
          }
        }
      }
      
      // 新しい並列処理システムのデータ形式に対応
      if (stageData.completed_items !== undefined && stageData.total_items !== undefined) {
        newStageData.completed_items = typeof stageData.completed_items === 'number' ? stageData.completed_items : 0;
        newStageData.total_items = typeof stageData.total_items === 'number' ? stageData.total_items : 0;
        newStageData.progress_percentage = typeof stageData.progress_percentage === 'number' ? stageData.progress_percentage : 0;
        newStageData.api_stats = stageData.api_stats as StageData['api_stats'];
        newStageData.api_integration = typeof stageData.api_integration === 'string' ? stageData.api_integration : undefined;
        newStageData.elapsed_time = typeof stageData.elapsed_time === 'number' ? stageData.elapsed_time : undefined;
        
        // アイテム状況の詳細情報
        if (Array.isArray(stageData.items_status)) {
          newStageData.items_status = stageData.items_status as StageData['items_status'];
          
          // リアルタイムアイテム状態更新が必要な場合
          if (stageData.update_realtime_items && newStageData.realtime_items) {
            console.log(`🔄 [ProgressStore] Updating realtime item statuses from items_status`);
            
            // items_statusからリアルタイムアイテムの状態を更新
            stageData.items_status.forEach((statusItem: any) => {
              const itemId = statusItem.item_id;
              
              // 各カテゴリでitem_idが一致するアイテムを探して更新
              Object.keys(newStageData.realtime_items!).forEach(categoryName => {
                const categoryItems = newStageData.realtime_items![categoryName];
                const itemIndex = categoryItems.findIndex(item => item.item_id === itemId);
                
                if (itemIndex !== -1) {
                  // アイテムの状態を更新
                  const updatedItem = { ...categoryItems[itemIndex] };
                  
                  // 翻訳完了時の更新
                  if (statusItem.translation_completed && statusItem.english_text) {
                    updatedItem.english_name = statusItem.english_text;
                    updatedItem.status = 'translating';
                  }
                  
                  // 説明完了時の更新
                  if (statusItem.description_completed && statusItem.description) {
                    updatedItem.description = statusItem.description;
                    updatedItem.status = 'describing';
                  }
                  
                  // 完全完了時の更新
                  if (statusItem.translation_completed && statusItem.description_completed) {
                    updatedItem.status = 'completed';
                  }
                  
                  // 更新されたアイテムを配列に反映
                  newStageData.realtime_items![categoryName][itemIndex] = updatedItem;
                  
                  console.log(`🔄 [ProgressStore] Updated item ${itemId} (${updatedItem.japanese_name}) → ${updatedItem.status}`);
                }
              });
            });
          }
        }
        
        console.log(`🔄 [ProgressStore] Parallel processing update: ${newStageData.completed_items}/${newStageData.total_items} (${Math.round(newStageData.progress_percentage || 0)}%)`);
      }
      
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
            
            console.log(`🎯 [ProgressStore] Category completed: ${categoryName} (${completedItems.length} items)`);
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
            
            console.log(`📦 [ProgressStore] Chunk result added: ${newStageData.processingCategory} (+${chunkData.length} items)`);
          }
        }
      } else if (stage === 5) {
        // Stage 5: 画像生成の処理
        console.log(`🎨 [ProgressStore] Stage 5 data received:`, {
          stage: stage,
          status: status,
          message: message,
          dataKeys: Object.keys(data || {}),
          fullData: data
        });
        
        if ((data as any).images_generated) {
          console.log(`🔍 [ProgressStore] images_generated raw data:`, (data as any).images_generated);
          newStageData.imagesGenerated = (data as any).images_generated as Record<string, Array<{
            english_name?: string;
            image_url?: string;
            prompt_used?: string;
            error?: string;
            generation_success?: boolean;
          }>>;
          console.log(`🎨 [ProgressStore] Images generated: ${Object.keys((data as any).images_generated).length} items`);
        }
        if ((data as any).final_menu_with_images) {
          newStageData.finalMenuWithImages = (data as any).final_menu_with_images as Record<string, unknown[]>;
          console.log(`🖼️ [ProgressStore] Final menu with images received`);
        }
        if ((data as any).skipped_reason) {
          newStageData.imageGenerationSkipped = (data as any).skipped_reason as string;
          console.log(`⚠️ [ProgressStore] Image generation skipped: ${(data as any).skipped_reason}`);
        }
        
        // Stage 5の他のフィールドもチェック
        if ((data as any).processing_category) {
          console.log(`📂 [ProgressStore] Stage 5 processing category: ${(data as any).processing_category}`);
        }
        if ((data as any).category_completed) {
          console.log(`✅ [ProgressStore] Stage 5 category completed: ${(data as any).category_completed}`);
        }
        if ((data as any).chunk_progress) {
          console.log(`📦 [ProgressStore] Stage 5 chunk progress: ${(data as any).chunk_progress}`);
        }
      } else if (stage === 6) {
        // Stage 6: 完了処理
        console.log(`✅ [ProgressStore] Process completed at Stage 6`);
        console.log(`✅ [ProgressStore] Stage 6 data:`, data);
      }
    }
    
    set({ 
      currentStage: stage,
      progressStages: newProgressStages,
      stageData: newStageData
    });
  },

  setSessionId: (sessionId: string | null) => {
    set({ sessionId });
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

    // Stage 4以降のリアルタイム判定
    const itemId = String(item.id || item.english_name || item.name || '');
    const isInFinalMenu = stageData.finalMenu && 
                         stageData.finalMenu[categoryName] && 
                         stageData.finalMenu[categoryName].some((finalItem: any) => 
                           String(finalItem.id || finalItem.english_name || finalItem.name || '') === itemId
                         );

    const isInRealtimeResults = stageData.realtimePartialResults &&
                               stageData.realtimePartialResults[categoryName] &&
                               stageData.realtimePartialResults[categoryName].some((realtimeItem: any) => 
                                 String(realtimeItem.id || realtimeItem.english_name || realtimeItem.name || '') === itemId
                               );

    const isCurrentlyProcessing = stageData.processingCategory === categoryName &&
                                 !stageData.completedCategories?.has(categoryName);

    return {
      isTranslated: Boolean(item.english_name),
      isComplete: Boolean(isInFinalMenu),
      isPartiallyComplete: Boolean(isInRealtimeResults && !isInFinalMenu),
      isCurrentlyProcessing: Boolean(isCurrentlyProcessing && !isInRealtimeResults)
    };
  },

  getCategoryProgress: (categoryName: string) => {
    const { stageData, currentStage } = get();
    
    // Stage 4未満では詳細進捗なし
    if (currentStage < 4 || !stageData.translatedCategories || !stageData.translatedCategories[categoryName]) {
      return null;
    }

    const allItems = stageData.translatedCategories[categoryName] || [];
    const total = allItems.length;
    
    if (total === 0) return null;

    let completed = 0;
    let partial = 0;
    
    allItems.forEach((item: any) => {
      const status = get().getMenuItemStatus(item, categoryName);
      if (status.isComplete) {
        completed++;
      } else if (status.isPartiallyComplete) {
        partial++;
      }
    });

    const processing = stageData.processingCategory === categoryName && 
                      !stageData.completedCategories?.has(categoryName);
    const isCompleted = stageData.completedCategories?.has(categoryName) || false;

    return {
      total,
      completed,
      partial,
      processing,
      isCompleted
    };
  },

  getOverallProgress: () => {
    const { stageData, currentStage } = get();
    
    // Stage 4未満では全体進捗なし
    if (currentStage < 4 || !stageData.translatedCategories) {
      return null;
    }

    let totalItems = 0;
    let completedItems = 0;
    let partialItems = 0;

    Object.keys(stageData.translatedCategories).forEach(categoryName => {
      const categoryProgress = get().getCategoryProgress(categoryName);
      if (categoryProgress) {
        totalItems += categoryProgress.total;
        completedItems += categoryProgress.completed;
        partialItems += categoryProgress.partial;
      }
    });

    const progressPercent = totalItems > 0 ? 
      Math.round(((completedItems + partialItems * 0.5) / totalItems) * 100) : 0;

    return {
      totalItems,
      completedItems,
      partialItems,
      progressPercent
    };
  },
}));

// 型をエクスポート
export type { ProgressStage, StageData, ProgressStore }; 