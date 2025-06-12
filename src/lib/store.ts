import { create } from 'zustand';
import { TranslationState } from '@/types';
import { MenuTranslationApi } from './api';

interface ProgressStage {
  stage: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  message: string;
}

interface TranslationStore extends TranslationState {
  // 進捗関連
  currentStage: number;
  progressStages: ProgressStage[];
  
  // 段階的メニューデータ
  stageData: {
    categories?: Record<string, unknown[]>; // Stage 2
    translatedCategories?: Record<string, unknown[]>; // Stage 3
    finalMenu?: Record<string, unknown[]>; // Stage 4
    partialResults?: Record<string, unknown[]>; // Stage 4 partial
    partialMenu?: Record<string, unknown[]>; // Stage 4 partial
  };
  
  // アクション
  setFile: (file: File | null) => void;
  translateMenu: () => Promise<void>;
  setProgressStage: (stage: number, status: string, message: string) => void;
  setStageData: (stage: number, data: unknown) => void;
  clearResult: () => void;
  clearError: () => void;
  resetProgress: () => void;
}

export const useTranslationStore = create<TranslationStore>((set, get) => ({
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
  
  // 段階的メニューデータの初期状態
  stageData: {},

  // ファイルを設定
  setFile: (file: File | null) => {
    set({ 
      selectedFile: file, 
      error: null,
      // ファイルが変更されたら前の結果と進捗をクリア
      result: file === null ? null : get().result 
    });
    if (file) {
      get().resetProgress();
    }
  },

  // メニューを翻訳（リアルタイム進捗付き + デバッグ強化）
  translateMenu: async () => {
    const { selectedFile } = get();
    
    if (!selectedFile) {
      set({ error: 'Please select a file first' });
      return;
    }

    console.log('[Store] 🚀 Starting progress translation');
    set({ isLoading: true, error: null });
    get().resetProgress();

    const startTime = Date.now();
    let lastProgressTime = startTime;

    try {
      const result = await MenuTranslationApi.translateMenuWithProgress(
        selectedFile,
        (stage: number, status: string, message: string, data?: unknown) => {
          const now = Date.now();
          const timeSinceStart = now - startTime;
          const timeSinceLastProgress = now - lastProgressTime;
          lastProgressTime = now;
          
          console.log(`[Store] 📊 Progress update:`, {
            stage,
            status,
            message,
            timeSinceStart: `${timeSinceStart}ms`,
            timeSinceLastProgress: `${timeSinceLastProgress}ms`,
            dataKeys: data ? Object.keys(data as Record<string, unknown>) : []
          });

          // Stage 3の特別な監視（Google Translate強化）
          if (stage === 3) {
            const stageData = data as Record<string, unknown>;
            console.log(`[Store] 🌍 Stage 3 detailed update:`, {
              status,
              processing_category: stageData?.processing_category,
              progress_percent: stageData?.progress_percent,
              translation_method: stageData?.translation_method,
              total_categories: stageData?.total_categories
            });
            
            // 翻訳方法のログ
            if (stageData?.translation_method === 'google_translate') {
              console.log(`[Store] ✅ Stage 3 using Google Translate API for fast translations`);
            } else if (stageData?.translation_method === 'openai_fallback') {
              console.warn(`[Store] ⚠️ Stage 3 fallback to OpenAI Function Calling`);
            }
          }

          // Stage 4の特別な監視
          if (stage === 4) {
            const stageData = data as Record<string, unknown>;
            console.log(`[Store] 🍽️ Stage 4 detailed update:`, {
              status,
              processing_category: stageData?.processing_category,
              category_completed: stageData?.category_completed,
              progress_percent: stageData?.progress_percent,
              chunk_progress: stageData?.chunk_progress,
              partial_results_count: stageData?.partial_results 
                ? Object.keys(stageData.partial_results as Record<string, unknown>).length 
                : 0,
              partial_menu_count: stageData?.partial_menu
                ? Object.keys(stageData.partial_menu as Record<string, unknown>).length
                : 0,
              heartbeat: stageData?.heartbeat,
              elapsed_time: stageData?.elapsed_time
            });
            
            // Stage 4の長時間監視アラート
            if (timeSinceStart > 3 * 60 * 1000) { // 3分経過
              console.warn(`[Store] ⚠️ Stage 4 is taking longer than 3 minutes (${Math.round(timeSinceStart / 1000)}s)`);
            }
          }
          
          get().setProgressStage(stage, status, message);
          
          // 段階的データを設定（キー名の修正 + リアルタイム反映強化）
          if (data) {
            const stageData = data as Record<string, unknown>;
            
            // 受信したデータの詳細ログ
            console.log(`[Store] 🔍 Raw stage data keys:`, Object.keys(stageData));
            
            if (stage === 2 && stageData.categories) {
              console.log(`[Store] 📋 Setting Stage 2 data: ${Object.keys(stageData.categories as Record<string, unknown>).length} categories`);
              get().setStageData(2, stageData.categories);
            } else if (stage === 3) {
              // Stage 3では複数のキー名でデータが送信される可能性がある
              const translatedData = stageData.translatedCategories || stageData.translated_categories;
              if (translatedData) {
                console.log(`[Store] 🌍 Setting Stage 3 data: ${Object.keys(translatedData as Record<string, unknown>).length} categories`);
                console.log(`[Store] 🌍 Stage 3 data source:`, stageData.translatedCategories ? 'translatedCategories' : 'translated_categories');
                get().setStageData(3, translatedData);
                
                // リアルタイム反映のため、現在のstageDataを即座に更新
                const currentStageData = get().stageData;
                set({ 
                  stageData: { 
                    ...currentStageData, 
                    translatedCategories: translatedData as Record<string, unknown[]> 
                  } 
                });
              } else {
                console.log(`[Store] ⚠️ Stage 3 data not found in keys:`, Object.keys(stageData));
              }
            } else if (stage === 4) {
              // Stage 4では複数のキー名でデータが送信される
              const finalData = stageData.final_menu || stageData.finalMenu;
              const partialResults = stageData.partial_results;
              const partialMenu = stageData.partial_menu;
              
              if (finalData) {
                console.log(`[Store] 📝 Setting Stage 4 final data: ${Object.keys(finalData as Record<string, unknown>).length} categories`);
                get().setStageData(4, finalData);
              }
              
              // リアルタイム部分結果の反映
              if (partialResults || partialMenu) {
                console.log(`[Store] 🔄 Setting Stage 4 partial data:`, {
                  partialResults: partialResults ? Object.keys(partialResults as Record<string, unknown>).length : 0,
                  partialMenu: partialMenu ? Object.keys(partialMenu as Record<string, unknown>).length : 0
                });
                
                const currentStageData = get().stageData;
                const updatedStageData = { ...currentStageData };
                
                // partial_resultsとpartial_menuの両方を反映
                if (partialResults) {
                  updatedStageData.partialResults = partialResults as Record<string, unknown[]>;
                }
                if (partialMenu) {
                  updatedStageData.partialMenu = partialMenu as Record<string, unknown[]>;
                }
                
                set({ stageData: updatedStageData });
              }
            }
          }
        }
      );
      
      const totalTime = Date.now() - startTime;
      console.log(`[Store] ✅ Translation completed in ${totalTime}ms`);
      set({ result, isLoading: false });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Translation failed';
      
      console.error(`[Store] ❌ Translation failed after ${totalTime}ms:`, {
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        currentStage: get().currentStage
      });
      
      set({ error: errorMessage, isLoading: false });
      
      // エラー時は現在のステージをエラー状態に
      const { currentStage } = get();
      if (currentStage > 0) {
        get().setProgressStage(currentStage, 'error', errorMessage);
      }
    }
  },

  // 進捗ステージを設定
  setProgressStage: (stage: number, status: string, message: string) => {
    const { progressStages } = get();
    const newStages = progressStages.map((s) =>
      s.stage === stage
        ? { ...s, status: status as 'pending' | 'active' | 'completed' | 'error', message }
        : s
    );
    
    set({ 
      currentStage: stage,
      progressStages: newStages 
    });
  },

  // 段階的データを設定
  setStageData: (stage: number, data: unknown) => {
    const { stageData } = get();
    const newStageData = { ...stageData };
    
    switch (stage) {
      case 2:
        newStageData.categories = data as Record<string, unknown[]>;
        break;
      case 3:
        newStageData.translatedCategories = data as Record<string, unknown[]>;
        break;
      case 4:
        newStageData.finalMenu = data as Record<string, unknown[]>;
        break;
    }
    
    set({ stageData: newStageData });
  },

  // 進捗をリセット
  resetProgress: () => {
    set({
      currentStage: 0,
      progressStages: [
        { stage: 1, status: 'pending', message: 'OCR - 画像からテキストを抽出' },
        { stage: 2, status: 'pending', message: 'カテゴリ分析 - 日本語メニューを分析' },
        { stage: 3, status: 'pending', message: '翻訳 - 英語に翻訳' },
        { stage: 4, status: 'pending', message: '詳細説明 - 詳細な説明を追加' },
      ],
      stageData: {}
    });
  },

  // 結果をクリア
  clearResult: () => {
    set({ result: null, error: null });
    get().resetProgress();
  },

  // エラーをクリア
  clearError: () => {
    set({ error: null });
  },
})); 