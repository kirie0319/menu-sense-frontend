// ===============================================
// 🎯 Menu Sensor API Library - Main Index
// ===============================================

// 📋 Configuration & Setup
export { 
  api, 
  API_BASE_URL, 
  DEFAULT_API_CONFIG, 
  DEFAULT_SSE_CONFIG,
  getEnvironmentConfig,
  validateApiConfig 
} from './config';

// 🏥 Health Check Functions
export { 
  checkPipelineHealth, 
  checkSSEHealth 
} from './health';

// 📡 SSE Functions
export { 
  connectToSSE, 
  createSimpleSSEConnection 
} from './sse';



// 🛠️ Utility Functions
export { cn } from './utils';
export * from './i18n';

// ===============================================
// 🔧 Quick Start Example
// ===============================================

/**
 * 基本的な使用例：
 * 
 * // 汎用インフラ機能
 * import { checkPipelineHealth, checkSSEHealth, connectToSSE, api } from '@/lib';
 * 
 * // 個別ヘルスチェック
 * const pipelineOk = await checkPipelineHealth();
 * const sseOk = await checkSSEHealth();
 * 
 * // SSE接続
 * const cleanup = connectToSSE(sessionId, onMessage);
 * 
 * // 直接Axios使用
 * const response = await api.get('/some-endpoint');
 * 
 * // メニュー処理は専用featureを使用:
 * import { processMenuWithProgress } from '@/features/menu';
 * const result = await processMenuWithProgress(file, onProgress);
 */ 