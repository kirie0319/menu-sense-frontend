import { useState, useEffect, useCallback } from 'react';
import { useTranslationStore } from '@/lib/store';
import { API_BASE_URL } from '@/lib/api';
import { StageData } from '@/types';

// 進捗アイテムの型定義
interface ProgressItem {
  text: string;
  delay: number;
}

// カスタムフックの戻り値の型定義
interface UseMenuTranslationProgressReturn {
  // 状態
  isAnalyzing: boolean;
  stage1Progress: number;
  stage2Progress: number;
  detectedItems: ProgressItem[];
  analysisItems: ProgressItem[];
  stage3Completed: boolean;
  translatedMenuVisible: boolean;
  currentSessionId: string | undefined;
  
  // アクション関数
  startAnalysis: () => Promise<void>;
  cancelAnalysis: () => void;
  resetProgress: () => void;
  setStage3Completed: (completed: boolean) => void;
  setTranslatedMenuVisible: (visible: boolean) => void;
}

export const useMenuTranslationProgress = (): UseMenuTranslationProgressReturn => {
  // 進捗関連の状態
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stage1Progress, setStage1Progress] = useState(0);
  const [stage2Progress, setStage2Progress] = useState(0);
  const [detectedItems, setDetectedItems] = useState<ProgressItem[]>([]);
  const [analysisItems, setAnalysisItems] = useState<ProgressItem[]>([]);
  const [stage3Completed, setStage3Completed] = useState(false);
  const [translatedMenuVisible, setTranslatedMenuVisible] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);

  // useTranslationStoreから必要な状態とアクションを取得
  const { 
    selectedFile, 
    isLoading, 
    result, 
    error,
    currentStage,
    stageData,
    translateMenu,
    clearResult,
    clearError,
    setFile 
  } = useTranslationStore();

  // Stage 1とStage 2のアイテムデータ
  const stage1Items: ProgressItem[] = [
    { text: "Scanning menu image...", delay: 500 },
    { text: "Detecting Japanese text...", delay: 1200 },
    { text: "Found: 焼き鳥", delay: 1800 },
    { text: "Found: 麻婆豆腐", delay: 2200 },
    { text: "Found: 海老フライ", delay: 2600 },
    { text: "Extracting prices...", delay: 3000 },
    { text: "OCR complete ✓", delay: 3400 }
  ];

  const stage2Items: ProgressItem[] = [
    { text: "Initializing AI translator...", delay: 500 },
    { text: "Analyzing dish contexts...", delay: 1000 },
    { text: "Identifying ingredients...", delay: 1500 },
    { text: "Detecting allergens...", delay: 2000 },
    { text: "Calculating spice levels...", delay: 2500 },
    { text: "Adding cultural context...", delay: 3000 },
    { text: "Finalizing translations...", delay: 3500 }
  ];

  // 翻訳が完了したときに分析画面を閉じる
  useEffect(() => {
    if (result && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [result, isAnalyzing]);

  // エラーが発生したときに分析画面を閉じる
  useEffect(() => {
    if (error && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [error, isAnalyzing]);

  // Stage3完了時の翻訳メニュー表示制御
  useEffect(() => {
    if (stageData && (stageData as any).show_translated_menu && currentStage === 3) {
      setStage3Completed(true);
      setTranslatedMenuVisible(true);
      console.log('🌍 Stage3 completed! Showing translated menu');
    }
  }, [stageData, currentStage]);

  // Stage 1の進捗更新
  useEffect(() => {
    if (isAnalyzing && currentStage === 1 && isLoading) {
      // Stage 1アイテムを段階的に追加（実際のOCR検出に基づく）
      const currentDetectedCount = detectedItems.length;
      if (currentDetectedCount < stage1Items.length) {
        const nextItem = stage1Items[currentDetectedCount];
        const timeoutId = setTimeout(() => {
          setDetectedItems(prev => [...prev, nextItem]);
        }, 500);
        return () => clearTimeout(timeoutId);
      }

      // 進捗バーを現在のステージの進行状況に基づいて更新
      if (currentStage === 1) {
        // バックエンドから進捗パーセンテージが来ている場合はそれを使用
        const backendProgress = stageData && (stageData as StageData).progress_percent;
        if (backendProgress !== undefined && backendProgress > 0) {
          setStage1Progress(Math.min(100, backendProgress));
        } else {
          // フォールバック: 検出されたアイテム数に基づく
          setStage1Progress(Math.min(85, (detectedItems.length / stage1Items.length) * 100));
        }
      }
    }
  }, [isAnalyzing, currentStage, isLoading, detectedItems.length, stageData, stage1Items]);

  // Stage 2の進捗更新
  useEffect(() => {
    if (isAnalyzing && currentStage === 2 && isLoading) {
      // Stage 2アイテムを段階的に追加
      const currentAnalysisCount = analysisItems.length;
      if (currentAnalysisCount < stage2Items.length) {
        const nextItem = stage2Items[currentAnalysisCount];
        const timeoutId = setTimeout(() => {
          setAnalysisItems(prev => [...prev, nextItem]);
        }, 700);
        return () => clearTimeout(timeoutId);
      }

      // 進捗バーを現在のステージの進行状況に基づいて更新
      if (currentStage === 2) {
        // バックエンドから進捗パーセンテージが来ている場合はそれを使用
        const backendProgress = stageData && (stageData as StageData).progress_percent;
        if (backendProgress !== undefined && backendProgress > 0) {
          setStage2Progress(Math.min(100, backendProgress));
        } else {
          // フォールバック: 分析アイテム数に基づく
          setStage2Progress(Math.min(85, (analysisItems.length / stage2Items.length) * 100));
        }
      }
    }
  }, [isAnalyzing, currentStage, isLoading, analysisItems.length, stageData, stage2Items]);

  // ステージ完了時の進捗バー完了
  useEffect(() => {
    if (currentStage > 1) {
      setStage1Progress(100);
    }
    if (currentStage > 2) {
      setStage2Progress(100);
    }
  }, [currentStage]);

  // バックエンドからの詳細進捗データを活用
  useEffect(() => {
    if (stageData && isAnalyzing && isLoading) {
      // バックエンドからのリアルタイム進捗データをログ出力
      console.log(`[ProgressHook] Real-time progress data:`, {
        currentStage,
        progress_percent: (stageData as StageData).progress_percent,
        processing_category: (stageData as StageData).processing_category,
        heartbeat: (stageData as StageData).heartbeat,
        elapsed_time: (stageData as StageData).elapsed_time,
        chunk_progress: (stageData as Record<string, unknown>).chunk_progress
      });

      // Stage 3以降の進捗データがある場合
      if (currentStage >= 3 && (stageData as StageData).translatedCategories) {
        const categories = (stageData as StageData).categories as Record<string, unknown[]> || {};
        const translatedCategories = (stageData as StageData).translatedCategories as Record<string, unknown[]> || {};
        
        // 翻訳完了率を計算
        const totalCategories = Object.keys(categories).length;
        const translatedCount = Object.keys(translatedCategories).length;
        const translationProgressPercent = totalCategories > 0 ? (translatedCount / totalCategories) * 100 : 0;
        
        console.log(`[ProgressHook] Translation progress: ${translationProgressPercent}% (${translatedCount}/${totalCategories})`);
      }

      // Stage 4の詳細な進捗データがある場合
      if (currentStage >= 4 && (stageData as StageData).finalMenu) {
        const finalMenu = (stageData as StageData).finalMenu as Record<string, unknown[]> || {};
        const totalItems = Object.values(finalMenu).reduce((acc, items) => acc + items.length, 0);
        
        console.log(`[ProgressHook] Final menu processing: ${totalItems} items processed`);
      }
    }
  }, [stageData, currentStage, isAnalyzing, isLoading]);

  // リアルタイム進捗翻訳の開始（セッションID取得用）
  const startProgressTranslation = useCallback(async (): Promise<string> => {
    if (!selectedFile) throw new Error('No file selected');
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to start processing: ${response.status}`);
    }

    const data = await response.json();
    console.log('🆔 Session ID obtained:', data.session_id);
    
    // 通常の進捗付き翻訳を実行
    await translateMenu();
    
    return data.session_id;
  }, [selectedFile, translateMenu]);

  // 分析開始
  const startAnalysis = useCallback(async () => {
    if (!selectedFile) return;
    
    // 分析画面に遷移
    setIsAnalyzing(true);
    
    // 進捗をリセット
    setStage1Progress(0);
    setStage2Progress(0);
    setDetectedItems([]);
    setAnalysisItems([]);
    
    // セッションIDをクリア
    setCurrentSessionId(undefined);
    
    // リアルタイム進捗モードでセッションIDを取得
    try {
      const sessionId = await startProgressTranslation();
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Failed to start progress translation:', error);
      setIsAnalyzing(false); // エラー時は分析画面から戻る
    }
  }, [selectedFile, startProgressTranslation]);

  // 分析キャンセル
  const cancelAnalysis = useCallback(() => {
    setIsAnalyzing(false);
    setCurrentSessionId(undefined);
    // 進捗をリセット
    setStage1Progress(0);
    setStage2Progress(0);
    setDetectedItems([]);
    setAnalysisItems([]);
  }, []);

  // 進捗リセット
  const resetProgress = useCallback(() => {
    clearResult();
    clearError();
    setFile(null);
    setIsAnalyzing(false);
    setCurrentSessionId(undefined);
    
    // Stage3&4関連の状態もリセット
    setStage3Completed(false);
    setTranslatedMenuVisible(false);
    
    // 進捗をリセット
    setStage1Progress(0);
    setStage2Progress(0);
    setDetectedItems([]);
    setAnalysisItems([]);
  }, [clearResult, clearError, setFile]);

  return {
    // 状態
    isAnalyzing,
    stage1Progress,
    stage2Progress,
    detectedItems,
    analysisItems,
    stage3Completed,
    translatedMenuVisible,
    currentSessionId,
    
    // アクション関数
    startAnalysis,
    cancelAnalysis,
    resetProgress,
    setStage3Completed,
    setTranslatedMenuVisible,
  };
};
