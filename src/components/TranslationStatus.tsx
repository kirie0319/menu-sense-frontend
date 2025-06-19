'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Camera, CheckCircle, Brain, Sparkles } from 'lucide-react';
import { MenuItem, StageData, TranslationStatusProps } from '@/types';
import { useMenuStore } from '@/lib/store';
import { useProgressStore } from '@/lib/stores/progressStore';

// ローディングスピナーコンポーネント
const LoadingSpinner = ({ color = "orange" }: { color?: string }) => (
  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 border-${color}-500`}></div>
);

// プログレスバーコンポーネント
const ProgressBar = ({ progress, color = "orange" }: { progress: number, color?: string }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
    <div 
      className={`h-2 bg-gradient-to-r from-${color}-500 to-red-500 rounded-full transition-all duration-300 ease-out`}
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

const TranslationStatus: React.FC<TranslationStatusProps> = ({
  isAnalyzing,
  currentStage,
  stageData,
  stage1Progress,
  stage2Progress,
  detectedItems,
  analysisItems,
  onCancelAnalysis,
  realtimeMenuItems = [],
  stage3Completed = false,
  isDebugVisible = false,
  lastUpdateTime
}) => {
  // Progress関連は新しいProgressStoreから取得
  const { getOverallProgress, stageData: storeStageData } = useProgressStore();
  // 分析画面のステータス表示
  if (isAnalyzing && currentStage <= 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              MenuSense
            </h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {currentStage === 1 ? 'Reading your menu...' : 'Understanding the dishes...'}
          </h2>
          <p className="text-gray-600">
            {currentStage === 1 
              ? 'Extracting text and identifying menu items' 
              : 'Adding context, ingredients, and cultural insights'
            }
          </p>
        </div>

        {/* Stage Indicators */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          {/* Stage 1 */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
              currentStage >= 1 
                ? (currentStage === 1 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white') 
                : 'bg-gray-200 text-gray-400'
            }`}>
              {currentStage === 1 ? (
                <Eye className="w-6 h-6" />
              ) : currentStage > 1 ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </div>
            <span className={`text-sm font-medium ${currentStage >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
              OCR Scan
            </span>
          </div>

          {/* Arrow */}
          <div className="flex-1 h-0.5 bg-gray-300 relative">
            <div 
              className={`absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000 ${
                currentStage >= 2 ? 'w-full' : 'w-0'
              }`}
            ></div>
          </div>

          {/* Stage 2 */}
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${
              currentStage >= 2 
                ? (currentStage === 2 ? 'bg-orange-500 text-white' : 'bg-green-500 text-white') 
                : 'bg-gray-200 text-gray-400'
            }`}>
              {currentStage === 2 ? (
                <Brain className="w-6 h-6" />
              ) : currentStage > 2 ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Brain className="w-6 h-6" />
              )}
            </div>
            <span className={`text-sm font-medium ${currentStage >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
              AI Analysis
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          {currentStage === 1 ? (
            // Stage 1: OCR & Text Detection
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <LoadingSpinner />
                <span className="text-lg font-semibold text-gray-900">Scanning Menu Image</span>
              </div>
              
              <ProgressBar progress={stage1Progress} />
              
              <div className="text-center text-sm text-gray-600 mb-6">
                {Math.round(stage1Progress)}% complete
                {stageData && (stageData as any).elapsed_time && (
                  <span className="text-xs text-gray-500 block">
                    Elapsed: {Math.round((stageData as any).elapsed_time / 1000)}s
                  </span>
                )}
              </div>

              {/* Detected Items */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-orange-500" />
                  Detected Items:
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                  {detectedItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center space-x-2 py-1 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className="text-green-500">✓</span>
                      <span className="text-sm text-gray-700">{item.text}</span>
                      {index === detectedItems.length - 1 && stageData && (stageData as any).heartbeat && (
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2"></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Simulated OCR Preview */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-200">
                <h4 className="font-medium text-gray-900 mb-2">Raw Text Detected:</h4>
                <div className="text-sm text-gray-600 font-mono">
                  焼き鳥 ¥300<br/>
                  麻婆豆腐 ¥600<br/>
                  海老フライ ¥450<br/>
                  <span className="animate-pulse">|</span>
                </div>
              </div>
            </div>
          ) : (
            // Stage 2: AI Analysis
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="relative">
                  <Brain className="w-8 h-8 text-orange-500 animate-pulse" />
                  <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                </div>
                <span className="text-lg font-semibold text-gray-900">AI Analysis in Progress</span>
              </div>

              <ProgressBar progress={stage2Progress} color="purple" />
              
              <div className="text-center text-sm text-gray-600 mb-6">
                {Math.round(stage2Progress)}% complete
                {stageData && (stageData as any).progress_percent && (
                  <span className="text-xs text-orange-600 block font-medium">
                    Backend: {Math.round((stageData as any).progress_percent)}%
                  </span>
                )}
                {stageData && (stageData as any).processing_category && (
                  <span className="text-xs text-gray-500 block">
                    Processing: {(stageData as any).processing_category}
                  </span>
                )}
              </div>

              {/* Analysis Steps */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-500" />
                  Processing Steps:
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[120px]">
                  {analysisItems.map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center space-x-2 py-1 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span className="text-purple-500">⚡</span>
                      <span className="text-sm text-gray-700">{item.text}</span>
                      {index === analysisItems.length - 1 && stageData && (stageData as any).heartbeat && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse ml-2"></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights Preview */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-2">AI Insights Preview:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-600">Yakitori: Traditional grilled chicken skewers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-gray-600">Mapo Tofu: Contains soy, very spicy 🌶️🌶️🌶️🌶️</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="text-gray-600">Ebi Fry: Breaded fried shrimp, contains shellfish</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Demo Controls */}
        <div className="text-center mt-6">
          <button 
            onClick={onCancelAnalysis}
            className="text-orange-600 hover:text-orange-800 font-medium text-sm"
          >
            ← Cancel Analysis
          </button>
        </div>
      </motion.div>
    );
  }

  // リアルタイムメニューのヘッダーステータス表示（Stage 3以降）
  if (currentStage >= 3) {
    return (
      <div className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
            {currentStage === 2 && 'Menu Structure Detected'}
            {currentStage === 3 && (stage3Completed ? '✅ Translation Complete!' : 'Translating Menu Items')}
            {currentStage >= 4 && 'Adding Detailed Information'}
          </h1>

          {/* リアルタイムデバッグ情報（強化版） */}
          {isDebugVisible && lastUpdateTime && (() => {
            const overallProgress = getOverallProgress();
            return (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <div className="text-left space-y-1">
                  <div>🔄 Updated at {new Date(lastUpdateTime).toLocaleTimeString()}</div>
                  
                  {/* 全体進捗情報 */}
                  {overallProgress && (
                    <div className="bg-blue-50 p-1 rounded">
                      📊 Overall Progress: {overallProgress.completedItems}✅ + {overallProgress.partialItems}🔄 / {overallProgress.totalItems} ({overallProgress.progressPercent}%)
                    </div>
                  )}
                  
                  {/* ストア状態 */}
                  <div className="bg-green-50 p-1 rounded">
                    🏪 Store State: Processing={storeStageData?.processingCategory || 'none'} | Completed={storeStageData?.completedCategories?.size || 0} categories
                  </div>
                  
                  {/* 旧データとの比較 */}
                  <div>📊 Legacy Items: {realtimeMenuItems.length} | 🌍 Translated: {realtimeMenuItems.filter(item => item.isTranslated).length} | 🔄 Partial: {realtimeMenuItems.filter(item => item.isPartiallyComplete).length} | ✅ Complete: {realtimeMenuItems.filter(item => item.isComplete).length}</div>
                  
                  {/* データソース情報 */}
                  <div>📋 Data Sources:</div>
                  <div className="ml-2 space-y-0.5">
                    <div>Raw Categories: {Object.keys((stageData as StageData)?.categories || {}).length}</div>
                    <div>Translated Categories: {Object.keys((stageData as StageData)?.translatedCategories || {}).length}</div>
                    <div>Realtime Partial: {Object.keys(storeStageData?.realtimePartialResults || {}).length}</div>
                    <div>Legacy Partial Results: {Object.keys((stageData as StageData)?.partialResults || {}).length}</div>
                    <div>Legacy Partial Menu: {Object.keys((stageData as StageData)?.partialMenu || {}).length}</div>
                  </div>
                  
                  {/* 処理状況 */}
                  {storeStageData?.processingCategory && (
                    <div>⚡ Current Processing: {storeStageData.processingCategory}</div>
                  )}
                  
                  {/* チャンク進捗 */}
                  {storeStageData?.chunkProgress && (
                    <div>📦 Chunk Progress: {storeStageData.chunkProgress.category} ({storeStageData.chunkProgress.completed}/{storeStageData.chunkProgress.total})</div>
                  )}
                  
                  {/* 最新完了 */}
                  {storeStageData?.categoryCompleted && (
                    <div>🎯 Latest Completion: {storeStageData.categoryCompleted.name} ({storeStageData.categoryCompleted.items.length} items)</div>
                  )}
                  
                  {/* サンプルアイテム状態 */}
                  {realtimeMenuItems.length > 0 && (
                    <div className="mt-1 text-xs text-gray-600">
                      🎯 Sample Item States: {realtimeMenuItems.slice(0, 3).map((item, i) => 
                        `${i+1}:${item.isTranslated?'T':''}${item.isPartiallyComplete?'P':''}${item.isComplete?'C':''}`
                      ).join(' ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {/* Stage3 詳細進捗表示 */}
          {currentStage === 3 && (
            <div className="space-y-1">
              {stage3Completed || (stageData as any)?.stage3_completed || (stageData as any)?.show_translated_menu ? (
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <p className="text-xs sm:text-sm text-green-800 font-medium">
                    🎉 All {realtimeMenuItems.length} items translated successfully!
                  </p>
                  {stageData && (stageData as any).translation_method && (
                    <p className="text-xs text-green-600">
                      Method: {(stageData as any).translation_method === 'google_translate' ? 'Google Translate API' : 'OpenAI'}
                    </p>
                  )}
                  <p className="text-xs text-green-600">
                    ✨ Now adding detailed descriptions...
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {realtimeMenuItems.filter(item => item.isTranslated).length} of {realtimeMenuItems.length} items translated
                  </p>
                  {stageData && (stageData as any).processing_category && (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                      <p className="text-xs text-orange-600 font-medium">
                        Translating: {(stageData as any).processing_category}
                      </p>
                    </div>
                  )}
                  {stageData && (stageData as any).progress_percent && (
                    <p className="text-xs text-blue-600">
                      {Math.round((stageData as any).progress_percent)}% complete
                    </p>
                  )}
                  {stageData && (stageData as any).elapsed_time && (
                    <p className="text-xs text-gray-500">
                      Elapsed: {Math.round((stageData as any).elapsed_time / 1000)}s
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Stage4 詳細進捗表示（リアルタイム強化） */}
          {currentStage >= 4 && (() => {
            const overallProgress = getOverallProgress();
            const currentProcessing = storeStageData?.processingCategory || (stageData as any)?.processing_category;
            const recentCompletion = storeStageData?.categoryCompleted;
            const chunkProgress = storeStageData?.chunkProgress;
            
            return (
              <div className="space-y-1">
                {/* 全体進捗表示（リアルタイム） */}
                {overallProgress ? (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-gray-600">
                      {overallProgress.completedItems + overallProgress.partialItems} of {overallProgress.totalItems} items processed
                    </p>
                    <p className="text-xs text-gray-500">
                      Complete: {overallProgress.completedItems} | 
                      Updating: {overallProgress.partialItems}
                    </p>
                    
                    {/* 全体進捗バー */}
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${overallProgress.progressPercent}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-green-600 font-medium">
                      {overallProgress.progressPercent}% complete
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-gray-600">
                      {realtimeMenuItems.filter(item => item.isComplete || item.isPartiallyComplete).length} of {realtimeMenuItems.length} items processed
                    </p>
                    <p className="text-xs text-gray-500">
                      Complete: {realtimeMenuItems.filter(item => item.isComplete).length} | 
                      Updating: {realtimeMenuItems.filter(item => item.isPartiallyComplete).length}
                    </p>
                  </div>
                )}
                
                {/* 現在処理中のカテゴリ */}
                {currentProcessing && (
                  <div className="flex items-center justify-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-green-600 font-medium">
                      Detailing: {currentProcessing}
                    </p>
                    {chunkProgress && (
                      <span className="text-xs text-gray-500">
                        (chunk {chunkProgress.completed}/{chunkProgress.total})
                      </span>
                    )}
                  </div>
                )}
                
                {/* 最新カテゴリ完了通知 */}
                {recentCompletion && Date.now() - recentCompletion.timestamp < 10000 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-green-50 rounded-lg p-2 border border-green-200"
                  >
                    <p className="text-xs text-green-800 font-medium">
                      🎯 {recentCompletion.name} completed!
                    </p>
                    <p className="text-xs text-green-600">
                      {recentCompletion.items.length} items with detailed descriptions
                    </p>
                  </motion.div>
                )}
                
                {/* チャンク進捗の表示 */}
                {chunkProgress && (
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">
                      📦 Processing {chunkProgress.category}: Chunk {chunkProgress.completed}/{chunkProgress.total}
                    </p>
                  </div>
                )}
                
                {/* フォールバック進捗 */}
                {!overallProgress && stageData && (stageData as any).progress_percent && (
                  <p className="text-xs text-green-600">
                    {Math.round((stageData as any).progress_percent)}% complete
                  </p>
                )}
              </div>
            );
          })()}

          {/* Stage2 簡易表示 */}
          {currentStage === 2 && (
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              {realtimeMenuItems.length} items detected, ready for translation
            </p>
          )}

          {/* 共通のハートビート表示 */}
          {stageData && (stageData as any).heartbeat && (
            <div className="mt-2 flex items-center justify-center space-x-1">
              <span className="text-xs text-gray-400">●</span>
              <span className="text-xs text-gray-400 animate-pulse">●</span>
              <span className="text-xs text-gray-400">●</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// CSS Animations
const animationStyles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
`;

// スタイルを挿入
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = animationStyles;
  document.head.appendChild(styleElement);
}

export default TranslationStatus;
