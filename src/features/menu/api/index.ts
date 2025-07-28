// ===============================================
// 🍽️ Menu Processing API - Export Index
// ===============================================

// メニュー処理APIクライアント
export { 
  MenuProcessingApiClient,
  processMenuImage,
  getSessionStatus,
  processMenuWithProgress,
  monitorSession 
} from './menuProcessingApi';

// ===============================================
// 🔧 Quick Start Guide
// ===============================================

/**
 * メニューAPI使用例：
 * 
 * import { processMenuWithProgress } from '@/features/menu/api';
 * 
 * // 進捗監視付きでメニュー処理
 * const result = await processMenuWithProgress(
 *   file,
 *   (event) => console.log('Progress:', event.type),
 *   (error) => console.error('Error:', error)
 * );
 * 
 * // 個別機能を使用
 * import { processMenuImage, monitorSession } from '@/features/menu/api';
 * 
 * const result = await processMenuImage(file);
 * const cleanup = monitorSession(sessionId, onProgress);
 */ 