// ===============================================
// 🔧 Simple Server Status - Export Index
// ===============================================

// シンプルなサーバーステータス監視のみ
export { default as ServerStatus } from './components/ServerStatus';

// 🎯 Simple Usage Guide
// ===============================================

/**
 * シンプルなサーバーステータス確認：
 * 
 * import { ServerStatus } from '@/features/debug';
 * 
 * <ServerStatus onStatusChange={(isHealthy) => {
 *   console.log(isHealthy ? 'Server Online' : 'Server Offline');
 * }} />
 * 
 * // エラー時はクリックでリトライ可能
 */ 