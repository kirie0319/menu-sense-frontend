import axios from 'axios';
import { TranslationResponse, ApiError, ApiMenuItem } from '@/types';

// バックエンドのベースURL（環境変数から取得、バージョン含む）
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const apiVersion = process.env.NEXT_PUBLIC_API_VERSION || 'v1';
export const API_BASE_URL = `${baseUrl}/${apiVersion}`;

// Axiosインスタンスを作成
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 60秒タイムアウト（画像処理には時間がかかる場合があるため）
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
   * リアルタイム進捗付きメニュー翻訳（SSE使用 + デバッグログ強化）
   */
  static async translateMenuWithProgress(
    file: File,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void
  ): Promise<TranslationResponse> {
    const startTime = Date.now();
    console.log(`[API] 🔄 Starting progress translation for file: ${file.name} (${file.size} bytes)`);
    
    // まずファイルをアップロードしてセッションIDを取得
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[API] ⏰ Upload timeout after 5 minutes`);
      abortController.abort();
    }, 5 * 60 * 1000); // 5分タイムアウト（延長）

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[API] 📤 Uploading file to /process`);
      
      // セッション開始
      const startResponse = await api.post('/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: abortController.signal,
        timeout: 60000, // 60秒（アップロードタイムアウト延長）
      });

      const sessionId = startResponse.data.session_id;
      console.log(`[API] 🆔 Session started with ID: ${sessionId}`);

      // Server-Sent Eventsで進捗を監視
      const result = await this.monitorProgress(sessionId, onProgress, abortController, startTime);
      
      const totalDuration = Date.now() - startTime;
      console.log(`[API] ✅ Progress translation completed in ${totalDuration}ms`);
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`[API] ❌ Progress translation failed after ${duration}ms`);
      
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        console.log(`[API] 🛑 Upload request was aborted (timeout)`);
        throw new Error('Upload request timed out. Please check your internet connection and try again.');
      }
      
      if (axios.isAxiosError(error)) {
        console.log(`[API] 🔍 Upload error details:`, {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
        
        if (error.code === 'ECONNABORTED') {
          throw new Error('Upload timed out. Please try again with a smaller image.');
        }
        
        if (error.response?.data) {
          const apiError = error.response.data as ApiError;
          throw new Error(apiError.detail || 'Upload failed');
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error('Backend server is not running. Please start the backend server.');
        }
      }
      
      console.log(`[API] 🔍 Unknown upload error:`, error);
      throw new Error('Failed to start menu processing');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Server-Sent Eventsで進捗を監視（Stage 4安定性強化版）
   */
  private static async monitorProgress(
    sessionId: string,
    onProgress: (stage: number, status: string, message: string, data?: unknown) => void,
    abortController: AbortController,
    startTime: number
  ): Promise<TranslationResponse> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(`${API_BASE_URL}/progress/${sessionId}`);
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
          case 4: return 300 * 1000; // 5分 - 詳細説明（最も時間がかかる）
          default: return 120 * 1000;
        }
      };
      
      // ハートビート監視
      const checkHeartbeat = () => {
        const timeout = getStageTimeout(currentStage);
        const elapsed = Date.now() - lastHeartbeat;
        
        if (elapsed > timeout) {
          clearInterval(heartbeatInterval);
          eventSource.close();
          
          // Stage 4で部分結果がある場合は、それを返す
          if (currentStage === 4 && Object.keys(stage4PartialResults).length > 0) {
            console.warn('⚠️ Stage 4 timeout detected, but partial results available');
            
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
              resolve(finalResult);
            } else {
              reject(new Error('Stage 4 timeout: Partial results available but incomplete translation data.'));
            }
          } else {
            reject(new Error(`Stage ${currentStage} timeout (${timeout/1000}s). No response from server.`));
          }
        }
      };
      
      const heartbeatInterval = setInterval(checkHeartbeat, 10000); // 10秒ごとにチェック

      // AbortControllerでキャンセル
      abortController.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        eventSource.close();
        reject(new Error('Translation was cancelled'));
      });

      eventSource.onmessage = (event) => {
        lastHeartbeat = Date.now();
        console.log(`[SSE] 📨 Message received at ${new Date().toLocaleTimeString()}`);
        
        try {
          const progressData = JSON.parse(event.data);
          
          // Pingメッセージの検知とPong送信
          if (progressData.type === 'ping') {
            console.log(`[SSE] 🏓 Ping received from server, sending Pong...`);
            
            // 非同期でPongを送信（SSE処理をブロックしない）
            MenuTranslationApi.sendPong(sessionId).catch(error => {
              console.error(`[SSE] ❌ Failed to send Pong:`, error);
            });
            
            // Pingメッセージは通常の進捗処理をスキップ
            return;
          }
          
          const { stage, status, message, ...data } = progressData;
          
          console.log(`[SSE] 📋 Parsed data:`, {
            stage,
            status,
            message,
            dataKeys: Object.keys(data),
            hasPartialResults: !!(data.partial_results || data.partial_menu),
            isHeartbeat: !!data.heartbeat,
            isPing: progressData.type === 'ping'
          });
          
          // Stage変更追跡
          if (stage !== currentStage) {
            const stageDuration = currentStage > 0 ? Date.now() - (stage4StartTime || lastHeartbeat) : 0;
            console.log(`[SSE] 🔄 Stage transition: ${currentStage} → ${stage} (previous stage took ${stageDuration}ms)`);
            
            if (stage === 4 && currentStage !== 4) {
              stage4StartTime = Date.now();
              console.log('[SSE] ⏱️ Stage 4 started - enabling extended monitoring');
            }
            
            currentStage = stage;
          }
          
          // Stage 4の詳細ログ
          if (stage === 4) {
            const elapsed = stage4StartTime ? Date.now() - stage4StartTime : 0;
            console.log(`[SSE] 🍽️ Stage 4 update (${elapsed}ms elapsed):`, {
              status,
              message,
              processing_category: data.processing_category,
              category_completed: data.category_completed,
              progress_percent: data.progress_percent,
              chunk_progress: data.chunk_progress,
              partial_categories: data.partial_results ? Object.keys(data.partial_results).length : 0,
              heartbeat: data.heartbeat,
              elapsed_time: data.elapsed_time
            });
          }
          
          onProgress(stage, status, message, data);
          
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
          
          // Stage 4の部分結果を監視・蓄積
          if (stage === 4) {
            if (data.partial_results) {
              console.log('🔄 Stage 4 partial results received:', Object.keys(data.partial_results));
              stage4PartialResults = { ...stage4PartialResults, ...data.partial_results };
            }
            
            if (data.partial_menu) {
              console.log('🔄 Stage 4 partial menu received:', Object.keys(data.partial_menu));
              stage4PartialResults = { ...stage4PartialResults, ...data.partial_menu };
            }
            
            if (data.category_completed) {
              console.log(`✅ Stage 4 category completed: ${data.category_completed}`);
            }
            
            // Stage 4の進捗ログ
            if (stage4StartTime) {
              const elapsed = (Date.now() - stage4StartTime) / 1000;
              if (elapsed > 60) { // 1分経過後
                console.log(`⏰ Stage 4 progress: ${elapsed.toFixed(0)}s elapsed, ${Object.keys(stage4PartialResults).length} categories processed`);
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
          
          // 完了判定の拡張
          if ((stage === 4 && status === 'completed') || (stage === 5 && status === 'completed')) {
            console.log('🎉 Translation process completed!');
            clearInterval(heartbeatInterval);
            eventSource.close();
            
            if (finalResult && finalResult.menu_items.length > 0) {
              resolve(finalResult);
            } else if (Object.keys(stage4PartialResults).length > 0) {
              // 部分結果がある場合はそれを使用
              console.warn('⚠️ Using partial Stage 4 results as final result');
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
            } else {
              reject(new Error('Translation completed but no menu data received'));
            }
          }
          
          // エラー処理の強化
          if (status === 'error') {
            console.error(`❌ Stage ${stage} error:`, message);
            
            // Stage 4エラー時の復旧処理
            if (stage === 4 && Object.keys(stage4PartialResults).length > 0) {
              console.warn('⚠️ Stage 4 error detected, but partial results available');
              
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
              
              clearInterval(heartbeatInterval);
              eventSource.close();
              resolve(finalResult);
              return;
            }
            
            clearInterval(heartbeatInterval);
            eventSource.close();
            reject(new Error(`Stage ${stage} failed: ${message}`));
          }
          
        } catch (parseError) {
          console.error('❌ Failed to parse progress data:', parseError, 'Raw data:', event.data);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        
        // エラーの詳細情報を収集
        const errorDetails = {
          type: 'SSE_CONNECTION_ERROR',
          readyState: eventSource.readyState,
          url: eventSource.url,
          currentStage,
          elapsedTime: Date.now() - startTime,
          lastHeartbeat: new Date(lastHeartbeat).toISOString(),
          stage4PartialResults: Object.keys(stage4PartialResults).length,
          error: error
        };
        
        console.error('❌ SSE Error Details:', errorDetails);
        
        clearInterval(heartbeatInterval);
        eventSource.close();
        
        // Stage 4で部分結果がある場合は復旧を試行
        if (currentStage === 4 && Object.keys(stage4PartialResults).length > 0) {
          console.warn('⚠️ Connection error during Stage 4, attempting recovery with partial results');
          
          const menuItems: ApiMenuItem[] = [];
          for (const items of Object.values(stage4PartialResults)) {
            const itemArray = items as Record<string, string>[];
            for (const item of itemArray) {
              menuItems.push({
                japanese_name: item.japanese_name || 'N/A',
                english_name: item.english_name || 'N/A',
                description: item.description || 'Description incomplete due to connection error.',
                price: item.price || ''
              });
            }
          }
          
          if (finalResult) {
            finalResult.menu_items = menuItems;
            resolve(finalResult);
          } else {
            reject(new Error(`SSE connection error during Stage 4. Partial results recovered but translation incomplete. Error details: ${JSON.stringify(errorDetails)}`));
          }
        } else {
          // 接続エラーの具体的な原因を特定
          let errorMessage = `SSE connection error occurred during Stage ${currentStage}`;
          
          if (eventSource.readyState === EventSource.CLOSED) {
            errorMessage += ' (Connection closed by server)';
          } else if (eventSource.readyState === EventSource.CONNECTING) {
            errorMessage += ' (Connection failed to establish)';
          }
          
          errorMessage += `. Please check:\n• Backend server is running\n• Network connection is stable\n• CORS configuration allows SSE`;
          
          reject(new Error(errorMessage));
        }
      };
    });
  }

  /**
   * Pongを送信（Ping/Pong機能）
   */
  static async sendPong(sessionId: string): Promise<boolean> {
    try {
      const response = await api.post(`/pong/${sessionId}`);
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
    } catch {
      throw new Error('Backend server is not responding');
    }
  }
} 