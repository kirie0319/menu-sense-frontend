import { DEFAULT_SSE_CONFIG, API_BASE_URL } from './config';
import { SSEEventType, SSEError, SSEConfig } from '@/types';

// ===============================================
// 📡 SSE Connection Management
// ===============================================

/**
 * SSE接続を開始する
 */
export function connectToSSE(
  sessionId: string,
  onMessage: (event: SSEEventType) => void,
  onError?: (error: SSEError) => void,
  onOpen?: () => void,
  config: Partial<SSEConfig> = {}
): () => void {
  const sseConfig = { ...DEFAULT_SSE_CONFIG, ...config };
  const sseUrl = `${API_BASE_URL}/sse/stream/${encodeURIComponent(sessionId)}`;
  
  console.log(`[SSE] 🔗 Starting SSE connection to: ${sseUrl}`);
  
  let eventSource: EventSource | null = null;
  let isCleanedUp = false;
  let reconnectAttempts = 0;

  const cleanup = (reason: string) => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    console.log(`[SSE] 🧹 Cleaning up SSE connection: ${reason}`);
    
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const connect = () => {
    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        console.log(`[SSE] ✅ SSE connection established for session: ${sessionId}`);
        reconnectAttempts = 0;
        if (onOpen) onOpen();
      };

      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        try {
          const eventData = JSON.parse(event.data) as SSEEventType;
          console.log(`[SSE] 📨 SSE event received: ${eventData.type}`);
          onMessage(eventData);
        } catch (parseError) {
          console.error('[SSE] Failed to parse SSE event:', parseError);
          if (onError) {
            onError({
              type: 'parse_error',
              message: 'Failed to parse SSE event data',
              session_id: sessionId
            });
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error(`[SSE] ❌ SSE connection error for session ${sessionId}:`, error);
        
        if (!isCleanedUp && reconnectAttempts < sseConfig.reconnectAttempts) {
          reconnectAttempts++;
          console.log(`[SSE] 🔄 Reconnecting SSE (attempt ${reconnectAttempts}/${sseConfig.reconnectAttempts})`);
          
          setTimeout(() => {
            if (!isCleanedUp) {
              cleanup('reconnection');
              connect();
            }
          }, sseConfig.reconnectDelay);
        } else {
          cleanup('connection_error');
          if (onError) {
            onError({
              type: 'connection_error',
              message: 'SSE connection failed after maximum retry attempts',
              session_id: sessionId
            });
          }
        }
      };

    } catch (error) {
      console.error('[SSE] Failed to create SSE connection:', error);
      if (onError) {
        onError({
          type: 'connection_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          session_id: sessionId
        });
      }
    }
  };

  // 初回接続
  connect();

  // クリーンアップ関数を返す
  return () => cleanup('manual_cleanup');
}

/**
 * シンプルなSSE接続（基本設定）
 */
export function createSimpleSSEConnection(
  sessionId: string,
  onMessage: (event: SSEEventType) => void
): () => void {
  return connectToSSE(
    sessionId,
    onMessage,
    (error) => console.error('[SSE] Connection error:', error),
    () => console.log('[SSE] Connected successfully')
  );
} 