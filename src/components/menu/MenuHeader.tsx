'use client';

import React from 'react';
import { ArrowLeft, Home } from 'lucide-react';
import { useMenuStore } from '@/lib/store';
import { useProgressStore } from '@/lib/stores/progressStore';

interface MenuHeaderProps {
  onBackToHome: () => void;
  onNavigateToProcess?: () => void;
  debugInfo?: Record<string, unknown>;
}

export const MenuHeader: React.FC<MenuHeaderProps> = ({
  onBackToHome,
  onNavigateToProcess,
  debugInfo
}) => {
  // メインストアから基本状態とUI機能を取得
  const { 
    selectedFile,
    isLoading,
    ui,
    toggleDebugMonitor,
    toggleRawMenu
  } = useMenuStore();

  // Progress関連は新しいProgressStoreから
  const { currentStage, progressStages } = useProgressStore();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-lg border-b border-gray-100 z-40">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 左側：ナビゲーション */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToHome}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200 font-medium"
            >
              <Home className="h-5 w-5" />
              <span>ホーム</span>
            </button>
            {onNavigateToProcess && (
              <button
                onClick={onNavigateToProcess}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all duration-200 font-medium"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>処理画面</span>
              </button>
            )}
          </div>

          {/* 中央：ロゴ・タイトル */}
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🍽️</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Menu Sensor
            </h1>
          </div>

          {/* 右側：状態とデバッグコントロール */}
          <div className="flex items-center space-x-3">
            {/* 現在の状態表示 */}
            {selectedFile && (
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                {isLoading ? (
                  <span className="flex items-center space-x-2">
                    <span>Stage {currentStage}</span>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  </span>
                ) : (
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>準備完了</span>
                  </span>
                )}
              </div>
            )}

            {/* デバッグコントロール */}
            {debugInfo && (
              <>
                <button
                  onClick={toggleDebugMonitor}
                  className={`px-4 py-2 text-sm font-medium border-2 rounded-xl transition-all duration-200 ${
                    ui.showDebugMonitor 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {ui.showDebugMonitor ? '🐛 デバッグ非表示' : '🐛 デバッグ表示'}
                </button>
                <button
                  onClick={toggleRawMenu}
                  className={`px-4 py-2 text-sm font-medium border-2 rounded-xl transition-all duration-200 ${
                    ui.showRawMenu 
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {ui.showRawMenu ? '📋 Raw非表示' : '📋 Raw表示'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* 進捗インジケーター（簡略版） */}
        {isLoading && (
          <div className="mt-4 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="font-medium">翻訳進捗</span>
              <span>{Math.round(((currentStage - 1) / 4) * 100)}%</span>
            </div>
            <div className="flex items-center space-x-2">
              {progressStages.map((stage) => (
                <div
                  key={stage.stage}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    stage.status === 'completed'
                      ? 'bg-green-400'
                      : stage.status === 'active'
                      ? 'bg-orange-400 animate-pulse'
                      : stage.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
