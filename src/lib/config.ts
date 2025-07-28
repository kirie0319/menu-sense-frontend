import axios from 'axios';
import { APIConfig, SSEConfig } from '@/types';

// ===============================================
// 🔧 Environment & Base Configuration
// ===============================================

// バックエンドのベースURL（環境変数から取得）
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

export const API_BASE_URL = `${baseUrl}/api/${apiVersion}`;

// ===============================================
// 📋 Default Configurations
// ===============================================

export const DEFAULT_API_CONFIG: APIConfig = {
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分タイムアウト（並列処理には時間がかかる場合があるため）
  retryAttempts: 3,
  retryDelay: 1000
};

export const DEFAULT_SSE_CONFIG: SSEConfig = {
  reconnectAttempts: 3,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
  timeout: 300000
};

// ===============================================
// 🌐 Axios Instance
// ===============================================

// メインのAxiosインスタンスを作成
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_API_CONFIG.timeout,
});

// リクエストインターセプター（共通ヘッダーやログ用）
api.interceptors.request.use(
  (config) => {
    console.log(`[API] 📤 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] ❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（共通エラーハンドリング用）
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`[API] ❌ ${error.response?.status || 'ERR'} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
    return Promise.reject(error);
  }
);

// ===============================================
// 🛠️ Configuration Utilities
// ===============================================

/**
 * 環境変数の取得と検証
 */
export function getEnvironmentConfig() {
  return {
    apiUrl: baseUrl,
    apiVersion,
    fullApiUrl: API_BASE_URL,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

/**
 * API設定のバリデーション
 */
export function validateApiConfig(config: Partial<APIConfig>): boolean {
  if (config.timeout && config.timeout < 1000) {
    console.warn('[Config] Warning: Timeout too short, minimum 1000ms recommended');
    return false;
  }
  
  if (config.retryAttempts && config.retryAttempts < 0) {
    console.warn('[Config] Warning: Retry attempts cannot be negative');
    return false;
  }
  
  return true;
}
