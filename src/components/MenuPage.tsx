'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/lib/store';
import { useUIStore } from '@/lib/stores/uiStore';
import { useProgressStore } from '@/lib/stores/progressStore';
import { MenuCategories } from './menu/MenuCategories';
import { MenuItemsGrid } from './menu/MenuItemsGrid';
import { MenuItemDetail } from './menu/MenuItemDetail';
import { DebugPanel } from './menu/DebugPanel';
import { MenuPageSkeleton } from './menu/MenuSkeleton';

interface MenuPageProps {
  onBackToHome: () => void;
  onNavigateToProcess?: () => void;
  file?: File | null;
  sessionId?: string;
}

export const MenuPage: React.FC<MenuPageProps> = ({ 
  onBackToHome, 
  onNavigateToProcess, 
  file: externalFile, 
  sessionId: externalSessionId 
}) => {
  // UI関連は新しいUIStoreから取得
  const { ui } = useUIStore();
  
  // Progress関連は新しいProgressStoreから取得
  const { currentStage } = useProgressStore();
  
  // データ関連は既存ストアから継続取得
  const {
    selectedFile,
    error,
    isLoading,
    // Actions
    setFile,
    translateMenu,
    clearError,
    // Utility functions
    getCurrentMenuData,
    getFilteredItems,
    getCategoryList
  } = useMenuStore();

  // Handle external file processing
  useEffect(() => {
    if (externalFile && externalFile !== selectedFile) {
      setFile(externalFile);
      // Automatically start translation
      if (externalFile) {
        handleStartTranslation();
      }
    }
  }, [externalFile, selectedFile, setFile]);

  // Start translation (considering external session ID)
  const handleStartTranslation = useCallback(async () => {
    try {
      await translateMenu(externalSessionId);
    } catch (error) {
      console.error('Translation failed:', error);
    }
  }, [translateMenu, externalSessionId]);

  // Get current menu data
  const menuData = getCurrentMenuData();

  // Show skeleton screen if no menu data or still loading translations
  const shouldShowSkeleton = !menuData || (isLoading && currentStage < 3);
  
  if (shouldShowSkeleton) {
    return <MenuPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main content - Mobile optimized */}
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border-2 border-red-200 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <div className="text-red-600 font-semibold text-base md:text-lg">⚠️ Error</div>
                  <div className="text-red-700 text-sm md:text-base">{error}</div>
                </div>
                <button
                  onClick={clearError}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg md:rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu display section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 md:space-y-8"
        >
          {/* Category selection */}
          <MenuCategories />

          {/* Menu items grid */}
          <MenuItemsGrid />

          {/* Debug panel */}
          <AnimatePresence>
            {ui.showDebugMonitor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <DebugPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Menu item detail modal */}
        <AnimatePresence>
          {ui.showItemDetail && <MenuItemDetail />}
        </AnimatePresence>
      </div>
    </div>
  );
};