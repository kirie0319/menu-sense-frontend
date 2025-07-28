// ===============================================
// 🍽️ Menu Feature - Main Export Index
// ===============================================

// 🔧 API Functions
export * from './api';

// 📋 Type Definitions
export * from './types';

// 🎯 Quick Start Guide for Menu Feature
// ===============================================

/**
 * メニューfeature使用例：
 * 
 * // メニュー処理API
 * import { processMenuWithProgress } from '@/features/menu';
 * 
 * const result = await processMenuWithProgress(
 *   file,
 *   (event) => {
 *     console.log(`Stage: ${event.type}`, event.data);
 *   },
 *   (error) => {
 *     console.error('Processing error:', error);
 *   }
 * );
 * 
 * // 個別API機能
 * import { processMenuImage, monitorSession } from '@/features/menu';
 * 
 * const result = await processMenuImage(file);
 * const cleanup = monitorSession(sessionId, onProgress);
 * 
 * // 型定義
 * import type { MenuItem, TranslationResponse } from '@/features/menu';
 */ 