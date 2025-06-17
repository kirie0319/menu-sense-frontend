import { create } from 'zustand';
import { TranslationState } from '@/types';
import { MenuTranslationApi, API_BASE_URL } from './api';

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
          
          // 全ての状態更新を1回のset()呼び出しにまとめる（無限ループ防止）
          const currentState = get();
          const newProgressStages = currentState.progressStages.map((s) =>
            s.stage === stage
              ? { ...s, status: status as 'pending' | 'active' | 'completed' | 'error', message }
              : s
          );
          
          // 新しいstageDataを構築
          let newStageData = { ...currentState.stageData };
          
          // 段階的データを設定（キー名の修正 + リアルタイム反映強化）
          if (data) {
            const stageData = data as Record<string, unknown>;
            
            // 受信したデータの詳細ログ
            console.log(`[Store] 🔍 Raw stage data keys:`, Object.keys(stageData));
            
            if (stage === 2 && stageData.categories) {
              console.log(`[Store] 📋 Setting Stage 2 data: ${Object.keys(stageData.categories as Record<string, unknown>).length} categories`);
              newStageData.categories = stageData.categories as Record<string, unknown[]>;
            } else if (stage === 3) {
              // Stage 3では複数のキー名でデータが送信される可能性がある
              const translatedData = stageData.translatedCategories || stageData.translated_categories;
              if (translatedData) {
                console.log(`[Store] 🌍 Setting Stage 3 data: ${Object.keys(translatedData as Record<string, unknown>).length} categories`);
                console.log(`[Store] 🌍 Stage 3 data source:`, stageData.translatedCategories ? 'translatedCategories' : 'translated_categories');
                newStageData.translatedCategories = translatedData as Record<string, unknown[]>;
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
                newStageData.finalMenu = finalData as Record<string, unknown[]>;
              }
              
              // リアルタイム部分結果の反映
                if (partialResults) {
                console.log(`[Store] 🔄 Setting Stage 4 partial results: ${Object.keys(partialResults as Record<string, unknown>).length} categories`);
                newStageData.partialResults = partialResults as Record<string, unknown[]>;
                }
                if (partialMenu) {
                console.log(`[Store] 🔄 Setting Stage 4 partial menu: ${Object.keys(partialMenu as Record<string, unknown>).length} categories`);
                newStageData.partialMenu = partialMenu as Record<string, unknown[]>;
                }
            }
            
            // その他のstageDataもコピー（streaming_update, newly_processed_itemsなど）
            const {
              categories, translated_categories, translatedCategories,
              final_menu, finalMenu, partial_results, partial_menu,
              ...otherData
            } = stageData;
            
            // その他のデータを直接stageDataに含める（リアルタイム情報用）
            newStageData = { ...newStageData, ...otherData };
              }
          
          // 全ての更新を1回で実行（無限ループ防止）
          set({ 
            currentStage: stage,
            progressStages: newProgressStages,
            stageData: newStageData
          });
        }
      );
      
      const totalTime = Date.now() - startTime;
      console.log(`[Store] ✅ Translation completed in ${totalTime}ms`);
      set({ result, isLoading: false });
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      // エラーの詳細情報を収集
      let errorDetails: Record<string, unknown> = {};
      let errorMessage = 'Translation failed';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500), // スタックトレースの一部
          constructor: error.constructor.name
        };
      } else if (typeof error === 'object' && error !== null) {
        // オブジェクトエラーの場合
        errorDetails = {
          type: 'object',
          keys: Object.keys(error),
          stringified: JSON.stringify(error),
          value: error
        };
        errorMessage = JSON.stringify(error);
      } else {
        // プリミティブ値の場合
        errorDetails = {
          type: typeof error,
          value: error,
          stringified: String(error)
        };
        errorMessage = String(error);
      }
      
      // 現在の状態情報も含める
      const currentState = get();
      const debugInfo = {
        totalTime,
        currentStage: currentState.currentStage,
        hasStageData: Object.keys(currentState.stageData).length > 0,
        stageDataKeys: Object.keys(currentState.stageData),
        selectedFile: currentState.selectedFile ? {
          name: currentState.selectedFile.name,
          size: currentState.selectedFile.size,
          type: currentState.selectedFile.type
        } : null,
        apiBaseUrl: API_BASE_URL,
        timestamp: new Date().toISOString()
      };
      
      console.error(`[Store] ❌ Translation failed after ${totalTime}ms:`, {
        error: errorDetails,
        errorMessage,
        debugInfo
      });
      
      // より具体的なエラーメッセージを生成
      let userFriendlyMessage = errorMessage;
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = `Network connection failed. Please check:\n• Backend server is running\n• Internet connection is stable\n• CORS configuration is correct`;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        userFriendlyMessage = `Request timed out after ${Math.round(totalTime/1000)}s. The image might be too complex or the server is busy.`;
      } else if (errorMessage.includes('Stage 1') || errorMessage.includes('OCR')) {
        userFriendlyMessage = `Image processing failed. Please try:\n• Using a clearer image\n• Ensuring the image contains text\n• Checking that the image is not too large`;
      } else if (currentState.currentStage === 0) {
        userFriendlyMessage = `Failed to start translation. Please check:\n• Backend server is running on ${API_BASE_URL}\n• Network connection\n• Selected image is valid`;
      }
      
      set({ error: userFriendlyMessage, isLoading: false });
      
      // エラー時は現在のステージをエラー状態に
      const { currentStage } = get();
      if (currentStage > 0) {
        get().setProgressStage(currentStage, 'error', userFriendlyMessage);
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

  // setStageData関数は不要になりました（統合されたため）

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