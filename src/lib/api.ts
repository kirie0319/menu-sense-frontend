import axios from 'axios';
import { 
  TranslationResponse, 
  ApiError, 
  ApiMenuItem,
  DBSessionResponse,
  DBSessionDetail,
  DBProgressResponse,
  DBProgressEvent,
  DBSearchResponse,
  DBMenuItem,
  DBSearchOptions
} from '@/types';
import { 
  config, 
  shouldUseDatabase, 
  getOptimalDataSource,
  isFallbackEnabled,
  startPerformanceTracking,
  endPerformanceTracking,
  logDebug,
  logError,
  logWarning,
  isEmergencyRedisMode
} from './config';
import { 
  transformDatabaseToTranslationResponse,
  transformDatabaseProgressToUIProgress
} from './utils/dataTransformation';

// バックエンドのベースURL（環境変数から取得、バージョン含む）
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${baseUrl}/api/${apiVersion}`;

// Axiosインスタンスを作成
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分タイムアウト（並列処理には時間がかかる場合があるため）
});

export class MenuTranslationApi {
  /**
   * メニュー画像を翻訳する（タイムアウト機能付き + デバッグログ）
   */
  static async translateMenu(file: File): Promise<TranslationResponse> {
    const startTime = Date.now();
    console.log(`[API] 🚀 Starting translation for file: ${file.name} (${file.size} bytes)`);
    
    // AbortControllerで5分タイムアウトを設定（延長）
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[API] ⏰ Translation timeout after 5 minutes`);
      abortController.abort();
    }, 5 * 60 * 1000); // 5分タイムアウト

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[API] 📤 Sending request to /translate endpoint`);
      
      const response = await api.post<TranslationResponse>('/translate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
        timeout: 5 * 60 * 1000, // 5分タイムアウト
      });

      const duration = Date.now() - startTime;
      console.log(`[API] ✅ Translation completed in ${duration}ms`);
      
      clearTimeout(timeoutId);
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[API] ❌ Translation failed after ${duration}ms`);
      
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        console.log(`[API] 🛑 Request was aborted (timeout)`);
        throw new Error('Translation request timed out (5 minutes). The menu image might be too complex or the server is overloaded. Please try again with a simpler image.');
      }
      
      if (axios.isAxiosError(error)) {
        console.log(`[API] 🔍 Axios error details:`, {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Translation request timed out. Please try again with a simpler image or check your internet connection.');
        }
        
        if (error.response?.data) {
          const apiError = error.response.data as ApiError;
          throw new Error(apiError.detail || 'Translation failed');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('Backend server is not running. Please start the backend server.');
        } else {
          throw new Error(`Network error: ${error.message}`);
        }
      }
      
      console.log(`[API] 🔍 Unknown error:`, error);
      throw new Error('An unexpected error occurred during translation');
    }
  }

  /**
   * 新しい並列処理API統合（OCR → 並列処理統合）
   */
  static async translateMenuWithProgress(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    existingSessionId?: string
  ): Promise<TranslationResponse> {
    const startTime = Date.now();
    console.log(`[API] 🚀 Starting new parallel processing for file: ${file.name} (${file.size} bytes)`);
    
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[API] ⏰ Parallel processing timeout after 10 minutes`);
      abortController.abort();
    }, 10 * 60 * 1000); // 10分タイムアウト（並列処理のため延長）

    try {
      let sessionId: string;

      if (existingSessionId) {
        // 既存のセッションIDを使用
        sessionId = existingSessionId;
        console.log(`[API] 🔄 Using existing session ID: ${sessionId}`);
        
        // 既存セッションの場合は、直接SSE監視を開始
        const result = await this.monitorParallelProgress(sessionId, onProgress, abortController, startTime);
        return { ...result, session_id: sessionId };
      } else {
        // 新しいOCR→並列処理統合フロー
        const formData = new FormData();
        formData.append('file', file);
        formData.append('use_real_apis', 'true');

        console.log(`[API] 📤 Starting OCR-to-Parallel processing`);
        
        // OCR→並列処理統合エンドポイントを呼び出し
        const startResponse = await api.post('/menu-parallel/ocr-to-parallel', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: abortController.signal,
          timeout: 60000, // 60秒（初期処理タイムアウト）
        });

        sessionId = startResponse.data.session_id;
        console.log(`[API] 🆔 Parallel processing started with session ID: ${sessionId}`);
        console.log(`[API] 📊 OCR result: ${startResponse.data.ocr_result?.extracted_text?.length || 0} characters`);
        console.log(`[API] 📋 Categories: ${Object.keys(startResponse.data.categorization_result?.categories || {}).length} found`);

        // 初期進捗を通知（Stage 1, 2完了）
        if (startResponse.data.ocr_result?.extracted_text) {
          onProgress(1, 'completed', 'OCR completed', {
            extracted_text: startResponse.data.ocr_result.extracted_text
          });
        }

        if (startResponse.data.categorization_result?.categories) {
          onProgress(2, 'completed', 'Menu categorization completed', {
            categories: startResponse.data.categorization_result.categories
          });
        }

        // 並列処理の進捗をSSEで監視
        const result = await this.monitorParallelProgress(sessionId, onProgress, abortController, startTime);
        
        const totalDuration = Date.now() - startTime;
        console.log(`[API] ✅ Parallel processing completed in ${totalDuration}ms`);
        
        return {
          ...result,
          session_id: sessionId,
          extracted_text: startResponse.data.ocr_result?.extracted_text || result.extracted_text
        };
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[API] ❌ Parallel processing failed after ${duration}ms`);
      
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        console.log(`[API] 🛑 Request was aborted (timeout)`);
        throw new Error('Processing request timed out. Please try again.');
      }
      
      if (axios.isAxiosError(error)) {
        console.log(`[API] 🔍 Error details:`, {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. Please try again with a smaller image.');
        }
        
        if (error.response?.data) {
          const apiError = error.response.data as ApiError;
          throw new Error(apiError.detail || 'Processing failed');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('Backend server is not running. Please start the backend server.');
        }
      }
      
      console.log(`[API] 🔍 Unknown error:`, error);
      throw new Error('Failed to start parallel processing');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 新しい並列処理API用のSSE監視（menu-parallel/stream/{session_id}）
   */
  private static async monitorParallelProgress(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    abortController: AbortController,
    startTime: number
  ): Promise<TranslationResponse> {
    return new Promise((resolve, reject) => {
      const encodedSessionId = encodeURIComponent(sessionId);
      const sseUrl = `${API_BASE_URL}/menu-parallel/stream/${encodedSessionId}`;
      
      console.log(`[SSE] 🔗 Starting parallel processing SSE connection to: ${sseUrl}`);
      
      let eventSource: EventSource | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let isCleanedUp = false;
      
      const cleanup = (reason: string) => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        console.log(`[SSE] 🧹 Cleaning up parallel SSE connection: ${reason}`);
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
      
      try {
        eventSource = new EventSource(sseUrl);
      } catch (error) {
        console.error(`[SSE] ❌ Failed to create parallel EventSource:`, error);
        reject(new Error(`Failed to create parallel SSE connection: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return;
      }
      
      let lastHeartbeat = Date.now();
      let currentStage = 3; // 並列処理はStage 3から開始
      let finalResult: TranslationResponse | null = null;
      let completedItems: ApiMenuItem[] = [];
      
      // ハートビート監視
      const checkHeartbeat = () => {
        if (isCleanedUp) return;
        
        const timeout = 300000; // 5分タイムアウト
        const elapsed = Date.now() - lastHeartbeat;
        
        if (elapsed > timeout) {
          cleanup(`Parallel processing timeout (${timeout/1000}s)`);
          
          if (completedItems.length > 0) {
            // 部分結果で完了
            console.log(`[SSE] ⚠️ Timeout but returning ${completedItems.length} completed items`);
            resolve({
              extracted_text: finalResult?.extracted_text || '',
              menu_items: completedItems
            });
          } else {
            reject(new Error('Parallel processing timeout. No completed items found.'));
          }
        }
      };
      
      heartbeatInterval = setInterval(checkHeartbeat, 10000);

      // AbortController対応
      const abortHandler = () => {
        cleanup('User cancellation');
        reject(new Error('Parallel processing was cancelled'));
      };
      
      abortController.signal.addEventListener('abort', abortHandler, { once: true });

      // SSE接続成功
      eventSource.onopen = () => {
        console.log(`[SSE] ✅ Parallel processing connection established`);
        lastHeartbeat = Date.now();
      };

      // メッセージ受信処理
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        lastHeartbeat = Date.now();
        
        let eventData: any;
        try {
          eventData = JSON.parse(event.data);
        } catch (parseError) {
          console.error('❌ Failed to parse parallel SSE data:', parseError);
          return;
        }
        
        const eventType = eventData.type;
        
        // ハートビート処理
        if (eventType === 'heartbeat' || eventType === 'connection_established') {
          console.log(`[SSE] 💓 ${eventType} received`);
          return;
        }
        
        // 並列処理開始イベント
        if (eventType === 'parallel_processing_started') {
          console.log(`[SSE] 🚀 Parallel processing started with OCR & Categorization complete`);
          
          // OCR結果をprogressに通知（Stage 1完了）
          if (eventData.ocr_result?.extracted_text) {
            onProgress(1, 'completed', 'OCR completed', {
              extracted_text: eventData.ocr_result.extracted_text
            });
            
            if (!finalResult) {
              finalResult = {
                extracted_text: eventData.ocr_result.extracted_text,
                menu_items: []
              };
            } else {
              finalResult.extracted_text = eventData.ocr_result.extracted_text;
            }
          }
          
          // カテゴリ分析結果をprogressに通知（Stage 2完了）
          if (eventData.categorization_result?.categories) {
            onProgress(2, 'completed', 'Menu categorization completed', {
              categories: eventData.categorization_result.categories
            });
          }
          
          // 並列処理開始をStage 3として通知
          onProgress(3, 'active', `Starting parallel processing for ${eventData.total_items} items`, {
            total_items: eventData.total_items,
            completed_items: 0,
            progress_percentage: 0
          });
          
          return;
        }
        
        // 個別アイテムタスクキューイベント（リアルタイムメニューアイテム表示用）
        if (eventType === 'item_task_queued') {
          console.log(`[SSE] 📤 Item queued: ${eventData.item_text} (${eventData.category})`);
          
          // リアルタイムでメニューアイテムを蓄積
          if (!finalResult) {
            finalResult = { extracted_text: '', menu_items: [] };
          }
          
          // アイテム情報をリアルタイムアイテムリストに追加
          onProgress(3, 'active', `Queuing item: ${eventData.item_text}`, {
            queued_item: {
              item_id: eventData.item_id,
              japanese_name: eventData.item_text,
              english_name: eventData.item_text, // 初期状態では日本語名をコピー
              description: 'Processing...',
              category: eventData.category,
              price: '',
              status: 'queued'
            },
            total_items: eventData.total_items || 0,
            completed_items: 0,
            progress_percentage: 0
          });
          
          return;
        }
        
        // 進捗更新イベント
        if (eventType === 'progress_update') {
          const stage = this.determineStageFromApiStats(eventData);
          const message = `Processing ${eventData.completed_items}/${eventData.total_items} items (${Math.round(eventData.progress_percentage)}%)`;
          
          console.log(`[SSE] 📊 Progress: ${message}`);
          
          onProgress(stage, 'active', message, {
            completed_items: eventData.completed_items,
            total_items: eventData.total_items,
            progress_percentage: eventData.progress_percentage,
            items_status: eventData.items_status
          });
          
          // 完了したアイテムを蓄積（より柔軟なアプローチ）
          if (eventData.items_status && Array.isArray(eventData.items_status)) {
            completedItems = [];
            eventData.items_status.forEach((item: any) => {
              // 翻訳と説明の両方が完了しているか、少なくとも翻訳が完了しているアイテムを含める
              if ((item.translation_completed && item.description_completed) || 
                  (item.translation_completed && item.english_text)) {
                completedItems.push({
                  japanese_name: item.japanese_text || item.original_text || 'Unknown',
                  english_name: item.english_text || item.translated_text || 'Unknown',
                  description: item.description || 'Description in progress...',
                  price: item.price || ''
                });
              }
            });
            
            console.log(`[SSE] 📦 Items accumulated: ${completedItems.length}/${eventData.items_status.length}`);
            
            // リアルタイムアイテム状態更新情報も送信
            onProgress(stage, status, message, {
              completed_items: eventData.completed_items,
              total_items: eventData.total_items,
              progress_percentage: eventData.progress_percentage,
              items_status: eventData.items_status,
              update_realtime_items: true // リアルタイムアイテム更新フラグ
            });
            
            return;
          }
          
          return;
        }
        
        // 処理完了イベント
        if (eventType === 'processing_completed') {
          console.log(`[SSE] 🎉 Parallel processing completed`);
          
          onProgress(6, 'completed', 'All menu items processed successfully', {
            total_items: eventData.final_stats?.total_items,
            completed_items: eventData.final_stats?.completed_items,
            success_rate: eventData.final_stats?.success_rate
          });
          
          cleanup('Processing completed');
          
          // 最終結果を構築 - 最後のitems_statusから完成したアイテムを取得
          let finalMenuItems: ApiMenuItem[] = [];
          
          // 最新のitems_statusからすべてのアイテムを構築
          if (eventData.items_status && Array.isArray(eventData.items_status)) {
            finalMenuItems = eventData.items_status.map((item: any) => ({
              japanese_name: item.japanese_text || item.original_text || 'Unknown',
              english_name: item.english_text || item.translated_text || 'Unknown',
              description: item.description || 'Description not available',
              price: item.price || ''
            }));
          } else if (completedItems.length > 0) {
            // フォールバック：蓄積されたcompletedItemsを使用
            finalMenuItems = completedItems;
          }
          
          console.log(`[SSE] 📋 Final menu items count: ${finalMenuItems.length}`);
          
          // 最終結果を構築
          if (!finalResult) {
            finalResult = {
              extracted_text: '',
              menu_items: finalMenuItems
            };
          } else {
            finalResult.menu_items = finalMenuItems;
          }
          
          resolve(finalResult);
          return;
        }
        
        // 個別アイテム完了イベント
        if (eventType === 'item_completed') {
          console.log(`[SSE] ✅ Item completed: ${eventData.english_name}`);
          return;
        }
        
        // エラーイベント
        if (eventType === 'stream_error') {
          console.error(`[SSE] ❌ Stream error:`, eventData.error);
          cleanup('Stream error');
          reject(new Error(`Parallel processing error: ${eventData.error}`));
          return;
        }
        
        // その他のイベント
        console.log(`[SSE] 📨 Unhandled parallel event type: ${eventType}`, eventData);
      };

      // SSE接続エラー
      eventSource.onerror = (error) => {
        console.error(`[SSE] ❌ Parallel connection error:`, error);
        cleanup('Connection error');
        reject(new Error('Lost connection to parallel processing stream'));
      };
    });
  }

  /**
   * API統計からステージを推定
   */
  private static determineStageFromApiStats(eventData: any): number {
    const { api_stats } = eventData;
    
    if (!api_stats) return 3;
    
    const { translation_completed, description_completed, image_completed } = api_stats;
    
    if (image_completed > 0) return 5; // 画像生成中
    if (description_completed > 0) return 4; // 詳細説明中
    if (translation_completed > 0) return 3; // 翻訳中
    
    return 3; // デフォルト
  }

  /**
   * Server-Sent Eventsで進捗を監視（安定性強化版）
   */
  private static async monitorProgress(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    abortController: AbortController,
    startTime: number
  ): Promise<TranslationResponse> {
    return new Promise((resolve, reject) => {
      // URL安全性の確保
      const encodedSessionId = encodeURIComponent(sessionId);
      const sseUrl = `${API_BASE_URL}/progress/${encodedSessionId}`;
      
      console.log(`[SSE] 🔗 Starting SSE connection to: ${sseUrl}`);
      
      let eventSource: EventSource | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      let isCleanedUp = false;
      
      // クリーンアップ関数
      const cleanup = (reason: string) => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        
        console.log(`[SSE] 🧹 Cleaning up SSE connection: ${reason}`);
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
      };
      
      try {
        eventSource = new EventSource(sseUrl);
      } catch (error) {
        console.error(`[SSE] ❌ Failed to create EventSource:`, error);
        reject(new Error(`Failed to create SSE connection: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return;
      }
      
      let lastHeartbeat = Date.now();
      let currentStage = 1;
      let stage4StartTime: number | null = null;
      let finalResult: TranslationResponse | null = null;
      let stage4PartialResults: Record<string, unknown[]> = {};
      
      // Stage別のタイムアウト設定
      const getStageTimeout = (stage: number): number => {
        switch (stage) {
          case 1: return 60 * 1000;  // 1分 - OCR
          case 2: return 90 * 1000;  // 1.5分 - カテゴリ分析
          case 3: return 120 * 1000; // 2分 - 翻訳
          case 4: return 300 * 1000; // 5分 - 詳細説明
          default: return 120 * 1000;
        }
      };
      
      // ハートビート監視（安全性強化）
      const checkHeartbeat = () => {
        if (isCleanedUp) return;
        
        const timeout = getStageTimeout(currentStage);
        const elapsed = Date.now() - lastHeartbeat;
        
        if (elapsed > timeout) {
          // Stage 4で部分結果がある場合は、それを返す
          if (currentStage === 4 && Object.keys(stage4PartialResults).length > 0) {
            console.warn('⚠️ Stage 4 timeout detected, but partial results available');
            
            try {
              // 部分結果で最終レスポンスを構築
              const menuItems: ApiMenuItem[] = [];
              for (const items of Object.values(stage4PartialResults)) {
                const itemArray = items as Record<string, string>[];
                for (const item of itemArray) {
                  menuItems.push({
                    japanese_name: item.japanese_name || 'N/A',
                    english_name: item.english_name || 'N/A',
                    description: item.description || 'Description generation incomplete due to timeout.',
                    price: item.price || ''
                  });
                }
              }
              
              if (finalResult) {
                finalResult.menu_items = menuItems;
                cleanup('Stage 4 timeout with partial results');
                resolve(finalResult);
              } else {
                cleanup('Stage 4 timeout without final result');
                reject(new Error('Stage 4 timeout: Partial results available but incomplete translation data.'));
              }
            } catch (partialError) {
              cleanup('Stage 4 timeout with partial result error');
              reject(new Error(`Stage 4 timeout and partial result processing failed: ${partialError instanceof Error ? partialError.message : 'Unknown error'}`));
            }
          } else {
            cleanup(`Stage ${currentStage} timeout`);
            reject(new Error(`Stage ${currentStage} timeout (${timeout/1000}s). No response from server.`));
          }
        }
      };
      
      heartbeatInterval = setInterval(checkHeartbeat, 10000); // 10秒ごとにチェック

      // AbortControllerでキャンセル（1回だけ設定）
      const abortHandler = () => {
        cleanup('User cancellation');
        reject(new Error('Translation was cancelled'));
      };
      
      abortController.signal.addEventListener('abort', abortHandler, { once: true });

      // EventSource接続成功
      eventSource.onopen = (event) => {
        console.log(`[SSE] ✅ Connection established`, event);
        lastHeartbeat = Date.now();
      };

      // メッセージ受信処理（安全性強化）
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        lastHeartbeat = Date.now();
        console.log(`[SSE] 📨 Message received at ${new Date().toLocaleTimeString()}`);
        
        let progressData: any;
        try {
          progressData = JSON.parse(event.data);
        } catch (parseError) {
          console.error('❌ Failed to parse progress data:', parseError, 'Raw data:', event.data);
          // パースエラーは致命的ではないので継続
          return;
        }
        
        // Pingメッセージの検知とPong送信
        if (progressData.type === 'ping') {
          console.log(`[SSE] 🏓 Ping received from server, sending Pong...`);
          
          // 非同期でPongを送信（SSE処理をブロックしない）
          MenuTranslationApi.sendPong(sessionId).catch(error => {
            console.error(`[SSE] ❌ Failed to send Pong:`, error);
          });
          
          return;
        }
        
        // ハートビートメッセージやstageフィールドのないメッセージをスキップ
        if (progressData.type === 'heartbeat' || progressData.heartbeat || typeof progressData.stage === 'undefined') {
          // Stage 4中は頻繁なハートビートのためログを控えめに
          if (currentStage === 4) {
            if (Date.now() - lastHeartbeat > 30000) { // 30秒に1回ログ
              console.log(`[SSE] 💓 Stage 4 heartbeat (frequent mode)`);
            }
          } else {
            console.log(`[SSE] 💓 Heartbeat received, maintaining connection...`);
          }
          return;
        }
        
        const { stage, status, message, ...data } = progressData;
        
        // 接続警告メッセージ（Stage 0）を特別処理
        if (stage === 0 && progressData.connection_warning) {
          console.warn(`⚠️ [SSE] Connection warning received:`, {
            message: message,
            currentStage: currentStage,
            data: data
          });
          // 接続警告はステージ遷移として扱わない
          return;
        }
        
        // 受信データの詳細ログ（Stage 5の問題を特定するため）
        if (stage === 5 || stage === 0 || (currentStage === 5 && stage !== 5)) {
          console.log(`🔍 [SSE] Critical stage data received:`, {
            receivedStage: stage,
            currentStage: currentStage,
            status: status,
            message: message,
            rawProgressData: progressData,
            dataKeys: Object.keys(data),
            timestamp: new Date().toISOString()
          });
        }
        
        // Stage変更追跡
        if (stage !== currentStage) {
          const stageDuration = currentStage > 0 ? Date.now() - (stage4StartTime || lastHeartbeat) : 0;
          console.log(`[SSE] 🔄 Stage transition: ${currentStage} → ${stage} (previous stage took ${stageDuration}ms)`);
          
          // Stage 5からの異常な遷移を詳細追跡
          if (currentStage === 5 && stage !== 5 && stage !== 6) {
            console.warn(`⚠️ [SSE] ABNORMAL Stage transition from 5 to ${stage}!`, {
              previousStage: currentStage,
              newStage: stage,
              status: status,
              message: message,
              fullData: progressData
            });
          }
          
          if (stage === 4 && currentStage !== 4) {
            stage4StartTime = Date.now();
            console.log('[SSE] ⏱️ Stage 4 started - enabling extended monitoring');
          }
          
          currentStage = stage;
        }
        
        // 進捗コールバック実行
        try {
          onProgress(stage, status, message, data);
        } catch (callbackError) {
          console.error(`[SSE] ❌ Progress callback error:`, callbackError);
          // コールバックエラーは継続
        }
        
        // 結果データの蓄積
        if (data.extracted_text) {
          if (!finalResult) {
            finalResult = {
              extracted_text: '',
              menu_items: []
            };
          }
          finalResult.extracted_text = data.extracted_text;
        }
        
        // Stage 4の部分結果を監視・蓄積（簡素化版）
        if (stage === 4) {
          // 部分結果の収集
          if (data.partial_results) {
            Object.assign(stage4PartialResults, data.partial_results);
            console.log('🔄 Stage 4 partial results updated:', Object.keys(data.partial_results));
          }
          
          if (data.partial_menu) {
            Object.assign(stage4PartialResults, data.partial_menu);
            console.log('🔄 Stage 4 partial menu updated:', Object.keys(data.partial_menu));
          }
          
          // カテゴリ完了時の処理
          if (data.category_completed) {
            const completedCategory = data.category_completed;
            
            // 完了したカテゴリのデータを探す
            if (data.completed_category_items && Array.isArray(data.completed_category_items)) {
              stage4PartialResults[completedCategory] = data.completed_category_items;
              console.log(`✅ Stage 4 category completed: ${completedCategory} (${data.completed_category_items.length} items)`);
            } else if (data.final_menu && data.final_menu[completedCategory]) {
              stage4PartialResults[completedCategory] = data.final_menu[completedCategory];
              console.log(`✅ Stage 4 category completed: ${completedCategory} (from final_menu)`);
            }
          }
        }
        
        // 最終メニューの処理
        if (data.final_menu) {
          console.log('📝 Final menu received:', Object.keys(data.final_menu));
          
          if (!finalResult) {
            finalResult = {
              extracted_text: '',
              menu_items: []
            };
          }
          
          // final_menuを menu_items 形式に変換
          const menuItems: ApiMenuItem[] = [];
          for (const items of Object.values(data.final_menu)) {
            const itemArray = items as Record<string, string>[];
            for (const item of itemArray) {
              menuItems.push({
                japanese_name: item.japanese_name || 'N/A',
                english_name: item.english_name || 'N/A',
                description: item.description || 'No description available',
                price: item.price || ''
              });
            }
          }
          finalResult.menu_items = menuItems;
        }
        
        // 完了判定（Stage 6の完了まで待つ）
        if (stage === 6 && status === 'completed') {
          console.log('🎉 Translation process completed!');
          cleanup('Translation completed');
          
          if (finalResult && finalResult.menu_items.length > 0) {
            resolve(finalResult);
          } else if (Object.keys(stage4PartialResults).length > 0) {
            // 部分結果がある場合はそれを使用
            console.warn('⚠️ Using partial Stage 4 results as final result');
            
            try {
              const menuItems: ApiMenuItem[] = [];
              for (const items of Object.values(stage4PartialResults)) {
                const itemArray = items as Record<string, string>[];
                for (const item of itemArray) {
                  menuItems.push({
                    japanese_name: item.japanese_name || 'N/A',
                    english_name: item.english_name || 'N/A',
                    description: item.description || 'Description partially generated.',
                    price: item.price || ''
                  });
                }
              }
              
              if (!finalResult) {
                finalResult = { extracted_text: '', menu_items: [] };
              }
              finalResult.menu_items = menuItems;
              resolve(finalResult);
            } catch (partialError) {
              reject(new Error(`Translation completed but partial result processing failed: ${partialError instanceof Error ? partialError.message : 'Unknown error'}`));
            }
          } else {
            reject(new Error('Translation completed but no menu data received'));
          }
        }
        
        // エラー処理
        if (status === 'error') {
          console.error(`❌ Stage ${stage} error:`, message);
          
          // Stage 4エラー時の復旧処理
          if (stage === 4 && Object.keys(stage4PartialResults).length > 0) {
            console.warn('⚠️ Stage 4 error detected, but partial results available');
            
            try {
              const menuItems: ApiMenuItem[] = [];
              for (const items of Object.values(stage4PartialResults)) {
                const itemArray = items as Record<string, string>[];
                for (const item of itemArray) {
                  menuItems.push({
                    japanese_name: item.japanese_name || 'N/A',
                    english_name: item.english_name || 'N/A',
                    description: item.description || 'Description generation failed, but item identified.',
                    price: item.price || ''
                  });
                }
              }
              
              if (!finalResult) {
                finalResult = { extracted_text: '', menu_items: [] };
              }
              finalResult.menu_items = menuItems;
              
              cleanup('Stage 4 error with partial recovery');
              resolve(finalResult);
              return;
            } catch (partialError) {
              console.error(`[SSE] ❌ Partial recovery failed:`, partialError);
            }
          }
          
          cleanup(`Stage ${stage} error`);
          reject(new Error(`Stage ${stage} failed: ${message}`));
        }
      };

      // SSE接続エラー処理（簡素化版）
      eventSource.onerror = (error) => {
        if (isCleanedUp) return;
        
        console.error('❌ SSE connection error:', error);
        
        // エラーの詳細情報を収集
        const errorDetails = {
          type: 'SSE_CONNECTION_ERROR',
          readyState: eventSource?.readyState,
          url: sseUrl,
          currentStage,
          elapsedTime: Date.now() - startTime,
          lastHeartbeat: new Date(lastHeartbeat).toISOString()
        };
        
        console.error('❌ SSE Error Details:', errorDetails);
        
        // Stage 4で部分結果がある場合は復旧を試行
        if (currentStage === 4 && Object.keys(stage4PartialResults).length > 0) {
          console.warn('⚠️ Connection error during Stage 4, attempting recovery with partial results');
          
          try {
            const menuItems: ApiMenuItem[] = [];
            let totalItems = 0;
            
            for (const [categoryName, items] of Object.entries(stage4PartialResults)) {
              const itemArray = items as Record<string, string>[];
              console.log(`   📂 Category "${categoryName}": ${itemArray.length} items`);
              
              for (const item of itemArray) {
                menuItems.push({
                  japanese_name: item.japanese_name || 'N/A',
                  english_name: item.english_name || 'N/A',
                  description: item.description || 'Description incomplete due to connection error.',
                  price: item.price || ''
                });
                totalItems++;
              }
            }
            
            console.log(`🔄 Stage 4 recovery: Constructed ${totalItems} menu items from partial results`);
            
            if (finalResult) {
              finalResult.menu_items = menuItems;
              cleanup('Stage 4 connection error with recovery');
              resolve(finalResult);
            } else {
              // finalResultが無い場合でも、部分結果で復旧
              const recoveredResult: TranslationResponse = {
                extracted_text: '',
                menu_items: menuItems
              };
              console.log(`💡 Stage 4 recovery: Created result from partial data only`);
              cleanup('Stage 4 connection error with partial recovery');
              resolve(recoveredResult);
            }
            return;
          } catch (recoveryError) {
            console.error(`[SSE] ❌ Recovery failed:`, recoveryError);
          }
        }
        
        // 接続エラーの具体的な原因を特定
        let errorMessage = `SSE connection error occurred during Stage ${currentStage}`;
        
        if (eventSource?.readyState === EventSource.CLOSED) {
          errorMessage += ' (Connection closed by server)';
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          errorMessage += ' (Connection failed to establish)';
        }
        
        errorMessage += `\n\nPlease check:\n• Backend server is running\n• Network connection is stable\n• CORS configuration allows SSE`;
        
        cleanup('SSE connection error');
        reject(new Error(errorMessage));
      };
    });
  }

  /**
   * Pongを送信（Ping/Pong機能）
   */
  static async sendPong(sessionId: string): Promise<boolean> {
    try {
      const encodedSessionId = encodeURIComponent(sessionId);
      const response = await api.post(`/pong/${encodedSessionId}`);
      console.log(`[API] 🏓 Pong sent for session: ${sessionId}`, response.data);
      return response.data.status === 'pong_received';
    } catch (error) {
      console.error(`[API] ❌ Failed to send Pong for session: ${sessionId}`, error);
      return false;
    }
  }

  /**
   * ヘルスチェック
   */
  static async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend server is not responding');
    }
  }

  // === S3 Image Management API ===
  
  /**
   * S3から最新の画像を取得
   */
  static async getRecentImages(limit: number = 20): Promise<any> {
    try {
      const response = await api.get(`/images/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get recent images:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get recent images');
      }
      throw new Error('Failed to get recent images');
    }
  }

  /**
   * S3から画像リストを取得
   */
  static async listImages(prefix?: string, maxKeys: number = 100): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (prefix) params.append('prefix', prefix);
      params.append('max_keys', maxKeys.toString());
      
      const response = await api.get(`/images/list?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to list images:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to list images');
      }
      throw new Error('Failed to list images');
    }
  }

  /**
   * ファイル名で画像を検索
   */
  static async searchImages(filename: string): Promise<any> {
    try {
      const response = await api.get(`/images/search?filename=${encodeURIComponent(filename)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to search images:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to search images');
      }
      throw new Error('Failed to search images');
    }
  }

  /**
   * 日付で画像を取得
   */
  static async getImagesByDate(date: string): Promise<any> {
    try {
      const response = await api.get(`/images/by-date?date=${encodeURIComponent(date)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get images by date:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get images by date');
      }
      throw new Error('Failed to get images by date');
    }
  }

  /**
   * S3画像ギャラリーを取得（ページネーション付き）
   */
  static async getImageGallery(
    page: number = 1, 
    perPage: number = 20, 
    sortBy: 'recent' | 'name' | 'size' = 'recent'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        sort_by: sortBy
      });
      
      const response = await api.get(`/images/gallery?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get image gallery:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get image gallery');
      }
      throw new Error('Failed to get image gallery');
    }
  }

  /**
   * S3画像統計情報を取得
   */
  static async getImageStats(): Promise<any> {
    try {
      const response = await api.get('/images/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get image stats:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get image stats');
      }
      throw new Error('Failed to get image stats');
    }
  }

  /**
   * S3接続状態を確認
   */
  static async getS3Status(): Promise<any> {
    try {
      const response = await api.get('/images/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get S3 status:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get S3 status');
      }
      throw new Error('Failed to get S3 status');
    }
  }

  /**
   * 特定の画像情報を取得
   */
  static async getImageInfo(key: string): Promise<any> {
    try {
      const response = await api.get(`/images/info/${encodeURIComponent(key)}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get image info:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get image info');
      }
      throw new Error('Failed to get image info');
    }
  }

  // ===============================================
  // 🗄️ Database Integration API Methods
  // ===============================================

  /**
   * Create a new database session
   */
  static async createDatabaseSession(menuItems: string[], metadata?: Record<string, any>): Promise<DBSessionResponse> {
    const trackingId = startPerformanceTracking('database', 'createSession');
    
    try {
      logDebug('Creating database session with', menuItems.length, 'items');
      
      const sessionId = `db_session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      const response = await api.post(`${config.api.databaseEndpointBase}/sessions`, {
        session_id: sessionId,
        menu_items: menuItems,
        metadata: {
          source: 'web_app',
          frontend_version: '2.0',
          created_via: 'database_integration',
          ...metadata
        }
      });

      endPerformanceTracking(trackingId, true);
      logDebug('Database session created:', response.data.session_id);
      
      return response.data;
    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      logError('Failed to create database session:', error);
      throw error;
    }
  }

  /**
   * Get complete database session with all items
   */
  static async getDatabaseSession(sessionId: string): Promise<DBSessionDetail> {
    const trackingId = startPerformanceTracking('database', 'getSession');
    
    try {
      logDebug('Fetching database session:', sessionId);
      
      const response = await api.get(`${config.api.databaseEndpointBase}/sessions/${encodeURIComponent(sessionId)}`);
      
      endPerformanceTracking(trackingId, true);
      logDebug('Database session fetched:', sessionId, 'with', response.data.menu_items?.length || 0, 'items');
      
      return response.data;
    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      logError('Failed to get database session:', error);
      throw error;
    }
  }

  /**
   * Get database session progress
   */
  static async getDatabaseProgress(sessionId: string): Promise<DBProgressResponse> {
    const trackingId = startPerformanceTracking('database', 'getProgress');
    
    try {
      logDebug('Fetching database progress:', sessionId);
      
      const response = await api.get(`${config.api.databaseEndpointBase}/sessions/${encodeURIComponent(sessionId)}/progress`);
      
      endPerformanceTracking(trackingId, true);
      logDebug('Database progress fetched:', sessionId);
      
      return response.data;
    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      logError('Failed to get database progress:', error);
      throw error;
    }
  }

  /**
   * Stream database progress via SSE
   */
  static async streamDatabaseProgress(
    sessionId: string,
    onEvent: (event: DBProgressEvent) => void
  ): Promise<() => void> {
    logDebug('Starting database SSE stream for session:', sessionId);
    
    const sseUrl = `${API_BASE_URL}${config.api.databaseEndpointBase}/sessions/${encodeURIComponent(sessionId)}/stream`;
    
    let eventSource: EventSource | null = null;
    let isCleanedUp = false;
    
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      logDebug('Cleaning up database SSE connection for:', sessionId);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
    
    try {
      eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        logDebug('Database SSE connection established for:', sessionId);
      };
      
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        try {
          const eventData = JSON.parse(event.data) as DBProgressEvent;
          logDebug('Database SSE event received:', eventData.type);
          
          onEvent(eventData);
        } catch (parseError) {
          logError('Failed to parse database SSE event:', parseError);
        }
      };
      
      eventSource.onerror = (error) => {
        logError('Database SSE connection error:', error);
        cleanup();
      };
      
    } catch (error) {
      logError('Failed to create database SSE connection:', error);
      cleanup();
      throw error;
    }
    
    return cleanup;
  }

  /**
   * Search database menu items
   */
  static async searchDatabaseMenuItems(
    query: string,
    category?: string,
    limit: number = 10,
    page: number = 1
  ): Promise<DBSearchResponse> {
    const trackingId = startPerformanceTracking('database', 'search');
    
    try {
      logDebug('Searching database menu items:', query);
      
      const params = new URLSearchParams({
        query,
        limit: limit.toString(),
        page: page.toString()
      });
      
      if (category) {
        params.append('category', category);
      }
      
      const response = await api.get(`${config.api.databaseEndpointBase}/search?${params.toString()}`);
      
      endPerformanceTracking(trackingId, true);
      logDebug('Database search completed:', response.data.total_results, 'results');
      
      return response.data;
    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      logError('Failed to search database menu items:', error);
      throw error;
    }
  }

  /**
   * Migrate Redis session to database
   */
  static async migrateRedisToDatabase(sessionId: string, itemCount: number): Promise<any> {
    const trackingId = startPerformanceTracking('database', 'migration');
    
    try {
      logDebug('Migrating Redis session to database:', sessionId);
      
      const response = await api.post(`${config.api.databaseEndpointBase}/migrate/${encodeURIComponent(sessionId)}`, {
        item_count: itemCount,
        force_migration: false
      });
      
      endPerformanceTracking(trackingId, true);
      logDebug('Migration completed for session:', sessionId);
      
      return response.data;
    } catch (error) {
      endPerformanceTracking(trackingId, false, error instanceof Error ? error.message : 'Unknown error');
      logError('Failed to migrate session:', error);
      throw error;
    }
  }

  /**
   * Health check for database API
   */
  static async healthCheckDatabase(): Promise<{ status: string; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await api.get('/health', { timeout: config.api.healthCheckTimeout });
      const responseTime = Date.now() - startTime;
      
      logDebug('Database health check passed:', responseTime + 'ms');
      
      return {
        status: response.data.status || 'ok',
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logError('Database health check failed:', error);
      
      throw {
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ===============================================
  // 🔄 Smart Translation with Database Integration
  // ===============================================

  /**
   * Enhanced translateMenuWithProgress that chooses optimal data source
   * Maintains backward compatibility with existing UI components
   */
  static async translateMenuWithEnhancedProgress(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    existingSessionId?: string
  ): Promise<TranslationResponse> {
    // Check for emergency Redis mode
    if (isEmergencyRedisMode()) {
      logWarning('Emergency Redis mode active - using Redis flow');
      return this.translateMenuWithProgress(file, onProgress, existingSessionId);
    }

    const dataSource = getOptimalDataSource();
    logDebug('Using data source:', dataSource);

    switch (dataSource) {
      case 'database':
        return this.translateMenuWithDatabaseFlow(file, onProgress, existingSessionId);
      
      case 'hybrid':
        return this.translateMenuWithHybridFlow(file, onProgress, existingSessionId);
      
      default:
        return this.translateMenuWithProgress(file, onProgress, existingSessionId);
    }
  }

  /**
   * Database-first translation flow
   */
  private static async translateMenuWithDatabaseFlow(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    existingSessionId?: string
  ): Promise<TranslationResponse> {
    logDebug('Starting database translation flow');
    
    try {
      // Use existing Redis flow for initial processing but prepare for database storage
      const redisResult = await this.translateMenuWithProgress(file, (stage, status, message, data) => {
        // Transform progress events if needed and forward to UI
        onProgress(stage, status, message, data);
      }, existingSessionId);

      // If we have a session ID, try to migrate to database for future queries
      if (redisResult.session_id && redisResult.menu_items) {
        try {
          await this.createDatabaseSession(
            redisResult.menu_items.map(item => item.japanese_name || ''),
            { 
              migrated_from_redis: true,
              redis_session_id: redisResult.session_id
            }
          );
          logDebug('Session data prepared for database storage');
        } catch (dbError) {
          logWarning('Failed to create database session, continuing with Redis result:', dbError);
        }
      }

      return redisResult;
    } catch (error) {
      logError('Database flow failed, no fallback available:', error);
      throw error;
    }
  }

  /**
   * Hybrid translation flow with intelligent fallback
   */
  private static async translateMenuWithHybridFlow(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    existingSessionId?: string
  ): Promise<TranslationResponse> {
    logDebug('Starting hybrid translation flow');
    
    // First, try to check if we have database connectivity
    let databaseAvailable = false;
    
    try {
      await this.healthCheckDatabase();
      databaseAvailable = true;
      logDebug('Database is available for hybrid flow');
    } catch (error) {
      logWarning('Database not available, using Redis-only flow:', error);
    }

    if (databaseAvailable) {
      try {
        return await this.translateMenuWithDatabaseFlow(file, onProgress, existingSessionId);
      } catch (dbError) {
        logWarning('Database flow failed in hybrid mode, falling back to Redis:', dbError);
      }
    }

    // Fallback to Redis
    return this.translateMenuWithProgress(file, onProgress, existingSessionId);
  }

  // ===============================================
  // 🔧 Utility Methods
  // ===============================================

  /**
   * Transform database session to existing TranslationResponse format
   * Ensures zero impact on existing UI components
   */
  static transformDatabaseSessionToResponse(session: DBSessionDetail): TranslationResponse {
    return transformDatabaseToTranslationResponse(session);
  }

  /**
   * Test database connectivity and performance
   */
  static async testDatabasePerformance(): Promise<{
    available: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      const healthResult = await this.healthCheckDatabase();
      return {
        available: true,
        responseTime: healthResult.responseTime
      };
    } catch (error) {
      return {
        available: false,
        responseTime: -1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const menuTranslationApi = new MenuTranslationApi();

// ===== Database API Integration =====
// 新しいDB APIクライアント（既存機能に影響なし）

export class MenuTranslationDBApi {
  /**
   * データベースに新しいセッションを作成
   */
  static async createSession(sessionId: string, menuItems: string[]): Promise<DBSessionResponse> {
    try {
      const response = await api.post<DBSessionResponse>('/menu-translation/sessions', {
        session_id: sessionId,
        menu_items: menuItems,
        metadata: {
          source: 'web_app',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log(`[DB API] ✅ Session created: ${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('[DB API] ❌ Failed to create session:', error);
      throw error;
    }
  }

  /**
   * セッションの完全なデータを取得
   */
  static async getSession(sessionId: string): Promise<DBSessionDetail | null> {
    try {
      const response = await api.get<DBSessionDetail>(`/menu-translation/sessions/${sessionId}`);
      console.log(`[DB API] ✅ Session retrieved: ${sessionId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log(`[DB API] ℹ️ Session not found: ${sessionId}`);
        return null;
      }
      console.error('[DB API] ❌ Failed to get session:', error);
      throw error;
    }
  }

  /**
   * セッションの進捗を取得
   */
  static async getProgress(sessionId: string): Promise<DBProgressResponse | null> {
    try {
      const response = await api.get<DBProgressResponse>(`/menu-translation/sessions/${sessionId}/progress`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('[DB API] ❌ Failed to get progress:', error);
      throw error;
    }
  }

  /**
   * 特定のメニューアイテムを取得
   */
  static async getMenuItem(sessionId: string, itemId: number): Promise<DBMenuItem | null> {
    try {
      const response = await api.get<DBMenuItem>(`/menu-translation/sessions/${sessionId}/items/${itemId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('[DB API] ❌ Failed to get menu item:', error);
      throw error;
    }
  }

  /**
   * メニューアイテムを検索
   */
  static async searchMenuItems(query: string, options?: DBSearchOptions): Promise<DBSearchResponse> {
    try {
      const params = new URLSearchParams({ query });
      if (options?.category) params.append('category', options.category);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.page) params.append('page', options.page.toString());

      const response = await api.get<DBSearchResponse>(`/menu-translation/search?${params}`);
      return response.data;
    } catch (error) {
      console.error('[DB API] ❌ Failed to search menu items:', error);
      throw error;
    }
  }

  /**
   * セッションを完了としてマーク
   */
  static async completeSession(sessionId: string): Promise<void> {
    try {
      await api.post(`/menu-translation/sessions/${sessionId}/complete`);
      console.log(`[DB API] ✅ Session marked as complete: ${sessionId}`);
    } catch (error) {
      console.error('[DB API] ❌ Failed to complete session:', error);
      throw error;
    }
  }

  /**
   * RedisからDBへデータを移行
   */
  static async migrateFromRedis(sessionId: string, itemCount: number): Promise<boolean> {
    try {
      const response = await api.post(`/menu-translation/migrate/${sessionId}`, {
        item_count: itemCount,
        force_migration: false
      });
      
      console.log(`[DB API] ✅ Migration completed: ${sessionId}`);
      return response.data.success;
    } catch (error) {
      console.error('[DB API] ❌ Failed to migrate from Redis:', error);
      return false;
    }
  }
} 