'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslationStore } from '@/lib/store';
import TranslationStatus from './TranslationStatus';
import DebugMonitor from './DebugMonitor';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const ProcessPage = () => {
  const router = useRouter();
  const { 
    selectedFile, 
    isLoading, 
    error,
    currentStage,
    stageData,
    sessionId,
    clearError,
    translateMenu
  } = useTranslationStore();

  useEffect(() => {
    // ファイルが選択されていない場合はホームページにリダイレクト
    if (!selectedFile) {
      router.push('/');
      return;
    }

    // 分析を自動開始
    if (!isLoading && currentStage === 0) {
      translateMenu();
    }
  }, [selectedFile, isLoading, currentStage, translateMenu, router]);

  useEffect(() => {
    // Stage 3以降はメニューページに遷移
    if (currentStage >= 3) {
      router.push('/menu');
    }
  }, [currentStage, router]);

  const handleBack = () => {
    router.push('/');
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleRetry = () => {
    clearError();
    translateMenu();
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🍽️</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                MenuSense
              </h1>
            </div>
            <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Processing</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* メインプロセス表示エリア */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Analyzing Your Menu 🔍
            </h2>
            <p className="text-gray-600">
              Our AI is carefully examining each dish to provide you with detailed translations
            </p>
          </div>

          {/* ファイル情報 */}
          {selectedFile && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📷</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <div className="text-green-600">
                  ✅ Uploaded
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 分析状況表示 */}
        {isLoading && currentStage <= 2 && (
          <TranslationStatus
            isAnalyzing={isLoading}
            currentStage={currentStage}
            stageData={stageData}
            stage1Progress={currentStage >= 1 ? 100 : 50}
            stage2Progress={currentStage >= 2 ? 100 : 50}
            detectedItems={[]}
            analysisItems={[]}
            onCancelAnalysis={handleCancel}
          />
        )}

        {/* エラー表示 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6"
          >
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Analysis Failed
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBack}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* プロセスの説明 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            What&apos;s happening during analysis?
          </h3>
          
          <div className="space-y-4">
            <div className={`flex items-start space-x-3 ${currentStage >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStage >= 1 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {currentStage >= 1 ? '✓' : '1'}
              </div>
              <div>
                <p className="font-medium">Text Recognition</p>
                <p className="text-sm text-gray-600">
                  Using Google Vision API to extract Japanese text from your menu image
                </p>
              </div>
            </div>

            <div className={`flex items-start space-x-3 ${currentStage >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStage >= 2 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {currentStage >= 2 ? '✓' : '2'}
              </div>
              <div>
                <p className="font-medium">Menu Organization</p>
                <p className="text-sm text-gray-600">
                  Intelligently categorizing and structuring the detected menu items
                </p>
              </div>
            </div>

            <div className={`flex items-start space-x-3 ${currentStage >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStage >= 3 ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {currentStage >= 3 ? '✓' : '3'}
              </div>
              <div>
                <p className="font-medium">Translation & Details</p>
                <p className="text-sm text-gray-600">
                  Providing detailed translations, ingredients, and cultural context
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* キャンセルボタン */}
        {isLoading && (
          <div className="text-center mt-8">
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel Analysis
            </button>
          </div>
        )}
      </div>

      {/* デバッグモニター */}
      <DebugMonitor
        sessionId={sessionId || undefined}
        isVisible={false}
        onToggle={() => {}}
      />
    </div>
  );
};

export default ProcessPage; 