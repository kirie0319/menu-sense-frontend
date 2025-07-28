import axios from 'axios';
import { api } from '@/lib/config';
import { connectToSSE } from '@/lib/sse';
import { 
  PipelineProcessResponse, 
  SessionStatusResponse,
  SSEEventType,
  SSEError
} from '@/types';

// ===============================================
// 🍽️ Menu Processing API Client
// ===============================================

export class MenuProcessingApiClient {
  /**
   * メニュー画像を処理する
   */
  static async processMenuImage(file: File): Promise<PipelineProcessResponse> {
    const startTime = Date.now();
    console.log(`[MenuAPI] 🚀 Starting pipeline processing for file: ${file.name} (${file.size} bytes)`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[MenuAPI] 📤 Sending request to /pipeline/process`);
      
      const response = await api.post<PipelineProcessResponse>('/pipeline/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const duration = Date.now() - startTime;
      console.log(`[MenuAPI] ✅ Pipeline processing completed in ${duration}ms`);
      console.log(`[MenuAPI] 📊 Processing result:`, {
        session_id: response.data.session_id,
        status: response.data.status,
        processing_steps: Object.keys(response.data.processing_steps || {})
      });
      
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[MenuAPI] ❌ Pipeline processing failed after ${duration}ms:`, error);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || 'Pipeline processing failed';
        throw new Error(errorMessage);
      }
      
      throw new Error('Unknown error occurred during pipeline processing');
    }
  }

  /**
   * 指定されたセッションIDでメニュー画像を処理する（フロントエンド連携用）
   */
  static async processMenuImageWithSessionId(file: File, sessionId: string): Promise<PipelineProcessResponse> {
    const startTime = Date.now();
    console.log(`[MenuAPI] 🚀 Starting pipeline processing with session ID: ${sessionId}, file: ${file.name} (${file.size} bytes)`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[MenuAPI] 📤 Sending request to /pipeline/process-with-session with session: ${sessionId}`);
      
      const response = await api.post<PipelineProcessResponse>(`/pipeline/process-with-session?session_id=${sessionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const duration = Date.now() - startTime;
      console.log(`[MenuAPI] ✅ Pipeline processing completed in ${duration}ms`);
      console.log(`[MenuAPI] 📊 Processing result:`, {
        session_id: response.data.session_id,
        status: response.data.status,
        processing_steps: Object.keys(response.data.processing_steps || {})
      });
      
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[MenuAPI] ❌ Pipeline processing failed after ${duration}ms:`, error);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.detail || 'Pipeline processing failed';
        throw new Error(errorMessage);
      }
      
      throw new Error('Unknown error occurred during pipeline processing');
    }
  }

  /**
   * セッションの状況を取得
   */
  static async getSessionStatus(sessionId: string): Promise<SessionStatusResponse> {
    console.log(`[MenuAPI] 📊 Getting session status: ${sessionId}`);
    
    try {
      const response = await api.get<SessionStatusResponse>(`/pipeline/session/${encodeURIComponent(sessionId)}/status`);
      
      console.log(`[MenuAPI] ✅ Session status retrieved:`, {
        session_id: response.data.session_id,
        status: response.data.status,
        current_stage: response.data.current_stage
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      console.error('[MenuAPI] ❌ Failed to get session status:', error);
      throw new Error('Failed to retrieve session status');
    }
  }

  /**
   * メニュー画像処理とSSE監視を統合した処理
   */
  static async processMenuWithProgress(
    file: File,
    onProgress: (event: SSEEventType) => void,
    onError?: (error: SSEError) => void,
    autoCleanupMs: number = 30000
  ): Promise<PipelineProcessResponse> {
    console.log(`[MenuAPI] 🚀 Starting integrated menu processing for: ${file.name}`);
    
    try {
      // パイプライン処理を開始
      const processResult = await MenuProcessingApiClient.processMenuImage(file);
      const sessionId = processResult.session_id;
      
      console.log(`[MenuAPI] 📊 Processing started, session ID: ${sessionId}`);
      
      // SSE接続を開始
      const cleanup = connectToSSE(
        sessionId,
        (event) => {
          console.log(`[MenuAPI] 📨 SSE event: ${event.type}`);
          onProgress(event);
        },
        (error) => {
          console.error(`[MenuAPI] ❌ SSE error:`, error);
          onError?.(error);
        },
        () => {
          console.log(`[MenuAPI] 📡 SSE connection established for session: ${sessionId}`);
        }
      );
      
      // 自動クリーンアップ
      if (autoCleanupMs > 0) {
        setTimeout(() => {
          cleanup();
          console.log(`[MenuAPI] 🧹 Auto-cleanup SSE connection after ${autoCleanupMs}ms`);
        }, autoCleanupMs);
      }
      
      return processResult;
    } catch (error) {
      console.error('[MenuAPI] Failed to start integrated menu processing:', error);
      throw error;
    }
  }

  /**
   * セッション監視機能
   */
  static monitorSession(
    sessionId: string,
    onProgress: (event: SSEEventType) => void,
    onError?: (error: SSEError) => void
  ): () => void {
    console.log(`[MenuAPI] 👁️ Starting session monitoring: ${sessionId}`);
    
    const cleanup = connectToSSE(
      sessionId,
      onProgress,
      onError,
      () => {
        console.log(`[MenuAPI] 📡 Session monitoring established: ${sessionId}`);
      }
    );
    
    return cleanup;
  }
}

// ===============================================
// 🎯 Convenience Exports
// ===============================================

export const {
  processMenuImage,
  getSessionStatus,
  processMenuWithProgress,
  monitorSession
} = MenuProcessingApiClient; 