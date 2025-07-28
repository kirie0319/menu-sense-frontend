// 'use client';

// import { useEffect, useState, useRef } from 'react';
// import { useRouter } from 'next/navigation';
// import Header from '@/components/Header';
// import { motion } from 'framer-motion';
// import { ArrowLeft } from 'lucide-react';
// import { ErrorBanner } from '@/components/ui';
// import { connectToSSE } from '@/lib/sse';
// import { SSEEventType } from '@/types';
// import { generateSessionId, restoreFileFromStorage, clearStoredFile } from '@/lib/utils';
// import { MenuProcessingApiClient } from '@/features/menu/api/menuProcessingApi';

// interface ProgressState {
//   progress: number;
//   currentStage: string;
//   completedStages: string[];
//   sessionId: string | null;
//   error: string | null;
//   isCompleted: boolean;
//   isInitializing: boolean;
//   detailLogs: DetailLog[];
// }

// interface DetailLog {
//   id: string;
//   timestamp: string;
//   level: 'info' | 'success' | 'warning' | 'error';
//   emoji: string;
//   category: string;
//   message: string;
//   details?: any;
// }

// const ProcessPage = () => {
//   const router = useRouter();
  
//   const [progressState, setProgressState] = useState<ProgressState>({
//     progress: 0,
//     currentStage: 'ファイルを準備中...',
//     completedStages: [],
//     sessionId: null,
//     error: null,
//     isCompleted: false,
//     isInitializing: true,
//     detailLogs: []
//   });

//   // SSE接続のクリーンアップ関数を保存
//   const [sseCleanup, setSseCleanup] = useState<(() => void) | null>(null);
  
//   // 現在のセッションIDを追跡するためのref
//   const currentSessionIdRef = useRef<string | null>(null);

//   // 詳細ログを追加するヘルパー関数
//   const addDetailLog = (
//     level: 'info' | 'success' | 'warning' | 'error',
//     emoji: string,
//     category: string,
//     message: string,
//     details?: any
//   ) => {
//     const log: DetailLog = {
//       id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//       timestamp: new Date().toLocaleTimeString(),
//       level,
//       emoji,
//       category,
//       message,
//       details
//     };

//     setProgressState(prev => ({
//       ...prev,
//       detailLogs: [log, ...prev.detailLogs.slice(0, 49)] // 最新50件まで保持
//     }));
//   };

//   // 進捗計算ロジック
//   const calculateProgress = (completedStages: string[]): number => {
//     const stageProgress = {
//       'ocr': 20,          // バックエンドの実際の値に合わせる
//       'mapping': 40, 
//       'categorize': 60,
//       'parallel_tasks_started': 80,
//       'all_tasks_completed': 100
//     };

//     let maxProgress = 0;
//     completedStages.forEach(stage => {
//       if (stageProgress[stage as keyof typeof stageProgress]) {
//         maxProgress = Math.max(maxProgress, stageProgress[stage as keyof typeof stageProgress]);
//       }
//     });

//     return maxProgress;
//   };

//   // SSE イベントハンドラー
//   const handleSSEEvent = (event: SSEEventType) => {
//     console.log('[ProcessPage] 📨 SSE Event received:', event);

//     setProgressState(prev => {
//       const newCompletedStages = [...prev.completedStages];
//       let newCurrentStage = prev.currentStage;
//       let newProgress = prev.progress;
//       const newDetailLogs = [...prev.detailLogs];

//       // 詳細ログを追加するローカル関数
//       const addLog = (level: 'info' | 'success' | 'warning' | 'error', emoji: string, category: string, message: string, details?: any) => {
//         const log: DetailLog = {
//           id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//           timestamp: new Date().toLocaleTimeString(),
//           level,
//           emoji,
//           category,
//           message,
//           details
//         };
//         newDetailLogs.unshift(log);
//         if (newDetailLogs.length > 50) newDetailLogs.pop();
//       };

//       switch (event.type) {
//         case 'connection_established':
//           console.log('[ProcessPage] 🔗 Connection established');
//           newCurrentStage = 'SSE接続確立 - 処理開始を待機中...';
//           addLog('success', '📡', 'SSE', `接続確立: session=${event.session_id}`, {
//             connection_id: event.data?.connection_id,
//             active_connections: event.data?.active_connections
//           });
//           break;

//         case 'stage_completed':
//           console.log('[ProcessPage] ✅ Stage completed:', event.data?.stage);
//           const stage = event.data?.stage;
//           if (stage && !newCompletedStages.includes(stage)) {
//             newCompletedStages.push(stage);
//             newProgress = calculateProgress(newCompletedStages);
            
//             // ステージ名を日本語に変換
//             const stageNames = {
//               'ocr': 'OCR処理完了',
//               'mapping': 'マッピング処理完了',
//               'categorize': 'カテゴライズ処理完了',
//               'parallel_tasks_started': '並列タスク開始'
//             };
//             newCurrentStage = stageNames[stage as keyof typeof stageNames] || stage;

//             // 段階別の詳細ログ
//             if (stage === 'ocr') {
//               const ocrData = event.data?.completion_data;
//               addLog('success', '🔍', 'OCR', `OCR処理完了: ${ocrData?.elements_extracted || 0}個のテキスト要素を抽出`, ocrData);
//               if (ocrData?.preview_elements) {
//                 ocrData.preview_elements.forEach((element: any, index: number) => {
//                   addLog('info', '📝', 'OCR', `要素${index + 1}: "${element.text}" (${element.position.x}, ${element.position.y})`, element);
//                 });
//               }
//             } else if (stage === 'mapping') {
//               const mappingData = event.data?.completion_data;
//               addLog('success', '🗺️', 'Mapping', `マッピング処理完了: ${mappingData?.formatted_data_length || 0}バイトのデータをフォーマット`, mappingData);
//             } else if (stage === 'categorize') {
//               const categorizeData = event.data?.completion_data;
//               addLog('success', '🗂️', 'Categorize', `カテゴライズ処理完了: ${categorizeData?.categories_detected || 0}カテゴリ、${categorizeData?.items_categorized || 0}アイテム`, categorizeData);
              
//               // カテゴリ詳細を表示
//               if (categorizeData?.categories_info) {
//                 categorizeData.categories_info.forEach((cat: any) => {
//                   addLog('info', '🏷️', 'Category', `カテゴリ: ${cat.japanese_name || cat.name} (${cat.items_count}アイテム)`, cat);
//                 });
//               }
//             }
//           }
//           break;

//         case 'progress_update':
//           console.log('[ProcessPage] 📊 Progress update:', event.data);
//           if (event.data?.message) {
//             newCurrentStage = event.data.message;
//           }

//           // 進捗更新の詳細ログ
//           const taskName = event.data?.task_name || 'unknown';
//           const status = event.data?.status || 'unknown';
//           addLog('info', '⏳', 'Progress', `${taskName}: ${status}`, event.data);

//           if (event.data?.progress_data) {
//             const progressData = event.data.progress_data;
//             if (progressData.progress !== undefined) {
//               addLog('info', '📊', 'Progress', `進捗: ${progressData.progress}%`, progressData);
//             }
//           }
          
//           // progress_updateイベントから並列タスク開始を検知
//           if (event.data?.message && event.data.message.includes('parallel')) {
//             if (!newCompletedStages.includes('parallel_tasks_started')) {
//               newCompletedStages.push('parallel_tasks_started');
//               newProgress = calculateProgress(newCompletedStages);
//               newCurrentStage = '並列タスク実行中...';
//               addLog('info', '🚀', 'Parallel', '並列タスクを開始しました', event.data);
//             }
//           }
//           break;

//         case 'translation_batch_completed':
//         case 'description_batch_completed':
//         case 'allergen_batch_completed':
//         case 'ingredient_batch_completed':
//         case 'search_image_batch_completed':
//         case 'batch_completed':
//           console.log('[ProcessPage] ✅ Batch completed:', event.data?.task_type);
//           const batchData = event.data;
//           const taskType = batchData?.task_type || event.type.replace('_batch_completed', '');
          
//           addLog('success', '✅', 'Batch', `${taskType}処理完了: ${batchData?.completed_items || 0}/${batchData?.total_items || 0} (${batchData?.success_rate || 0}%)`, batchData);
          
//           if (batchData?.processing_summary) {
//             const summary = batchData.processing_summary;
//             addLog('info', '📋', 'Summary', `${taskType}サマリー: ${summary.items_processed || 0}アイテム処理`, summary);
//           }

//           if (event.data?.task_type) {
//             newCurrentStage = `${event.data.task_type}処理完了`;
//           }
//           break;

//         case 'menu_update':
//           console.log('[ProcessPage] 📋 Menu update:', event.data);
//           newCurrentStage = 'メニューデータを更新中...';
//           addLog('info', '📋', 'Menu', 'メニューデータが更新されました', event.data);
//           break;

//         case 'parallel_tasks_started':
//           addLog('success', '🚀', 'Parallel', '並列タスクが開始されました', event.data);
//           break;

//         case 'error':
//           console.error('[ProcessPage] ❌ SSE Error:', event.data?.message);
//           addLog('error', '❌', 'Error', event.data?.message || 'Unknown error occurred', event.data);
//           return {
//             ...prev,
//             error: event.data?.message || 'Unknown error occurred',
//             detailLogs: newDetailLogs
//           };

//         default:
//           console.log('[ProcessPage] 📝 Other SSE event:', event.type, event.data);
//           addLog('info', '📝', 'SSE', `その他のイベント: ${event.type}`, event.data);
//       }

//       // 完了判定とメニューページ遷移
//       const isCompleted = newProgress >= 100;
//       if (isCompleted && !prev.isCompleted) {
//         console.log('[ProcessPage] ✅ Processing completed, preparing to navigate to menu');
//         addLog('success', '🎉', 'Complete', '処理が完了しました。メニューページに遷移します...', { progress: newProgress });
//         setTimeout(() => {
//           router.push(`/menu?sessionId=${prev.sessionId}`);
//         }, 2000); // 2秒後に遷移
//       }

//       return {
//         ...prev,
//         progress: newProgress,
//         currentStage: newCurrentStage,
//         completedStages: newCompletedStages,
//         isCompleted,
//         detailLogs: newDetailLogs
//       };
//     });
//   };

//   // SSE接続を開始する関数
//   const startSSEConnection = (sessionId: string) => {
//     console.log('[ProcessPage] 🔗 Starting SSE connection for session:', sessionId);

//     // 既存の接続があればクリーンアップ
//     if (sseCleanup) {
//       console.log('[ProcessPage] 🧹 Cleaning up previous SSE connection');
//       sseCleanup();
//     }

//     addDetailLog('info', '📡', 'SSE', 'SSE接続を開始中...', { sessionId });

//     // 新しいSSE接続を開始
//     const cleanup = connectToSSE(
//       sessionId,
//       handleSSEEvent,
//       (error) => {
//         console.error('[ProcessPage] ❌ SSE connection error:', error);
//         addDetailLog('error', '❌', 'SSE', `SSE接続エラー: ${error.message}`, error);
//         setProgressState(prev => ({
//           ...prev,
//           error: `接続エラー: ${error.message}`
//         }));
//       },
//       () => {
//         console.log('[ProcessPage] ✅ SSE connection established');
//         addDetailLog('success', '✅', 'SSE', 'SSE接続が確立されました', { sessionId });
//         setProgressState(prev => ({
//           ...prev,
//           currentStage: 'SSE接続確立 - 処理開始中...'
//         }));
//       }
//     );

//     setSseCleanup(() => cleanup);
//     return cleanup;
//   };

//   // メイン初期化処理
//   useEffect(() => {
//     let isInitializing = false; // 重複実行防止フラグ
    
//     const initializeProcessing = async () => {
//       // 重複実行チェック
//       if (isInitializing) {
//         console.log('[ProcessPage] ⚠️ Initialization already in progress, skipping...');
//         return;
//       }
      
//       isInitializing = true;
      
//       try {
//         console.log('[ProcessPage] 🚀 Initializing processing...');

//         // 既存のセッションIDをチェック
//         let sessionId = localStorage.getItem('currentSessionId');
        
//         if (sessionId) {
//           console.log('[ProcessPage] 🔄 Found existing session ID:', sessionId);
//           // 既存のセッション状態をチェック（オプション）
//           try {
//             // セッションが有効かどうかの簡易チェック
//             const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/pipeline/session/${sessionId}/status`);
//             if (response.ok) {
//               console.log('[ProcessPage] ✅ Existing session is valid, reusing:', sessionId);
//             } else {
//               console.log('[ProcessPage] ⚠️ Existing session invalid, generating new one');
//               sessionId = null;
//             }
//           } catch (error) {
//             console.log('[ProcessPage] ⚠️ Failed to check existing session, generating new one:', error);
//             sessionId = null;
//           }
//         }
        
//         // 新しいセッションIDを生成（必要な場合のみ）
//         if (!sessionId) {
//           sessionId = generateSessionId();
//           console.log('[ProcessPage] 🆔 Generated new session ID:', sessionId);
//           localStorage.setItem('currentSessionId', sessionId);
//         }

//         currentSessionIdRef.current = sessionId;

//         setProgressState(prev => ({ 
//           ...prev, 
//           sessionId,
//           currentStage: 'SSE接続を確立中...'
//         }));

//         // 初期化ログを追加
//         addDetailLog('info', '🚀', 'Init', '処理を初期化中...', { sessionId });
//         addDetailLog('success', '🆔', 'Session', `セッションID確定: ${sessionId}`, { sessionId });

//         // 1. 先にSSE接続を開始
//         startSSEConnection(sessionId);

//         // 2. 少し待ってからAPI呼び出し（重複防止のため状態チェック）
//         setTimeout(() => {
//           if (currentSessionIdRef.current === sessionId) {
//             startProcessing(sessionId);
//           } else {
//             console.log('[ProcessPage] ⚠️ Session ID changed during initialization, skipping API call');
//           }
//         }, 1000);

//       } catch (error) {
//         console.error('[ProcessPage] ❌ Initialization failed:', error);
//         addDetailLog('error', '❌', 'Init', '初期化に失敗しました', { error: error instanceof Error ? error.message : String(error) });
//         setProgressState(prev => ({
//           ...prev,
//           error: '初期化に失敗しました',
//           isInitializing: false
//         }));
//       } finally {
//         isInitializing = false;
//       }
//     };

//     initializeProcessing();

//     // クリーンアップ
//     return () => {
//       isInitializing = false; // フラグをリセット
//       if (sseCleanup) {
//         console.log('[ProcessPage] 🧹 Cleaning up SSE connection on unmount');
//         sseCleanup();
//       }
//     };
//   }, []); // 依存配列は空のまま（一度だけ実行）

//   // ファイル復元とAPI呼び出し
//   const startProcessing = async (sessionId: string) => {
//     try {
//       setProgressState(prev => ({
//         ...prev,
//         currentStage: 'ファイルを復元中...'
//       }));

//       addDetailLog('info', '📁', 'File', 'ファイルを復元中...', {});

//       // 保存されたファイルを復元
//       const file = await restoreFileFromStorage();
//       if (!file) {
//         throw new Error('アップロードされたファイルが見つかりません');
//       }

//       addDetailLog('success', '✅', 'File', `ファイル復元完了: ${file.name} (${file.size} bytes)`, {
//         name: file.name,
//         size: file.size,
//         type: file.type
//       });

//       setProgressState(prev => ({
//         ...prev,
//         currentStage: 'メニュー解析を開始中...'
//       }));

//       addDetailLog('info', '🔄', 'API', 'メニュー解析APIを呼び出し中...', { sessionId, filename: file.name });

//       // API呼び出し（セッションIDは既に生成済み）
//       const result = await MenuProcessingApiClient.processMenuImageWithSessionId(file, sessionId);
      
//       console.log('[ProcessPage] ✅ API call successful:', result);
//       addDetailLog('success', '🎯', 'API', 'API呼び出し成功', result);
      
//       // ファイルデータをクリーンアップ
//       clearStoredFile();
//       addDetailLog('info', '🧹', 'Cleanup', 'ファイルデータをクリーンアップしました', {});

//     } catch (error) {
//       console.error('[ProcessPage] ❌ Processing failed:', error);
//       const errorMessage = error instanceof Error ? error.message : '処理に失敗しました';
//       addDetailLog('error', '❌', 'Error', errorMessage, { error: errorMessage });
//       setProgressState(prev => ({
//         ...prev,
//         error: errorMessage,
//         isInitializing: false
//       }));
//     }
//   };

//   const handleBackToHome = () => {
//     // SSE接続をクリーンアップ
//     if (sseCleanup) {
//       addDetailLog('info', '🧹', 'Cleanup', 'SSE接続をクリーンアップ中...', {});
//       sseCleanup();
//     }
    
//     // 保存されたファイルをクリーンアップ
//     clearStoredFile();
//     addDetailLog('info', '🗑️', 'Cleanup', 'ファイルデータをクリーンアップしました', {});
//     addDetailLog('info', '🏠', 'Navigation', 'ホームページに戻ります', {});
    
//     router.push('/');
//   };

//   const handleRestart = () => {
//     // SSE接続をリセット
//     if (sseCleanup) {
//       addDetailLog('info', '🔄', 'Restart', 'SSE接続をリセット中...', {});
//       sseCleanup();
//     }
    
//     // 状態をリセット
//     setProgressState({
//       progress: 0,
//       currentStage: 'ファイルを準備中...',
//       completedStages: [],
//       sessionId: null,
//       error: null,
//       isCompleted: false,
//       isInitializing: true,
//       detailLogs: []
//     });

//     // 処理を再開始
//     const sessionId = generateSessionId();
//     localStorage.setItem('currentSessionId', sessionId);
//     currentSessionIdRef.current = sessionId;
    
//     setProgressState(prev => ({ 
//       ...prev, 
//       sessionId,
//       currentStage: 'SSE接続を確立中...'
//     }));

//     addDetailLog('info', '🔄', 'Restart', '処理を再開始します', { newSessionId: sessionId });

//     startSSEConnection(sessionId);
//     setTimeout(() => {
//       startProcessing(sessionId);
//     }, 1000);
//   };



//   return (
//     <div className="bg-gray-50 min-h-screen">
//       <Header />
      
//       <div className="pt-16 sm:pt-20 md:pt-24">
//         <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          
//           {/* Back Button */}
//           <motion.button
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             onClick={handleBackToHome}
//             className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 sm:mb-8 group transition-colors"
//           >
//             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
//             <span>Back to home</span>
//           </motion.button>

//           {/* エラー表示 */}
//           {progressState.error && (
//             <ErrorBanner
//               title="Translation failed"
//               message={progressState.error || ""}
//               onRetry={handleRestart}
//               variant="error"
//               isVisible={!!progressState.error}
//             />
//           )}

//           {/* 詳細ログ表示 */}
//           <div className="bg-gray-900 rounded-lg p-4 mb-6">
//             <div className="flex items-center justify-between mb-3">
//               <h3 className="text-white font-semibold flex items-center">
//                 <span className="mr-2">🖥️</span>
//                 処理ログ
//               </h3>
//               <div className="text-xs text-gray-400">
//                 {progressState.detailLogs.length} / 50 件
//               </div>
//             </div>
            
//             <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-sm">
//               {progressState.detailLogs.length === 0 ? (
//                 <div className="text-gray-500 text-center py-4">
//                   処理開始をお待ちください...
//                 </div>
//               ) : (
//                 progressState.detailLogs.map((log) => (
//                   <div 
//                     key={log.id} 
//                     className={`p-2 rounded border-l-4 ${
//                       log.level === 'error' ? 'bg-red-950 border-red-500 text-red-200' :
//                       log.level === 'warning' ? 'bg-yellow-950 border-yellow-500 text-yellow-200' :
//                       log.level === 'success' ? 'bg-green-950 border-green-500 text-green-200' :
//                       'bg-gray-800 border-blue-500 text-gray-200'
//                     }`}
//                   >
//                     <div className="flex items-start">
//                       <span className="text-gray-400 text-xs mr-2 whitespace-nowrap">
//                         {log.timestamp}
//                       </span>
//                       <span className="mr-2">{log.emoji}</span>
//                       <div className="flex-1">
//                         <div className="flex items-center">
//                           <span className={`text-xs px-2 py-0.5 rounded mr-2 ${
//                             log.level === 'error' ? 'bg-red-600' :
//                             log.level === 'warning' ? 'bg-yellow-600' :
//                             log.level === 'success' ? 'bg-green-600' :
//                             'bg-blue-600'
//                           }`}>
//                             {log.category}
//                           </span>
//                           <span className="text-xs text-gray-400 uppercase tracking-wide">
//                             {log.level}
//                           </span>
//                         </div>
//                         <div className="mt-1">{log.message}</div>
//                         {log.details && (
//                           <details className="mt-1">
//                             <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
//                               詳細を表示
//                             </summary>
//                             <pre className="text-xs text-gray-400 mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
//                               {JSON.stringify(log.details, null, 2)}
//                             </pre>
//                           </details>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>

//           {/* Processing Status */}
//           {/* Basic placeholder progress display */}
//           <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8">
//             <div className="text-center mb-6">
//               <div className="flex items-center justify-center mb-4">
//                 <div className="relative w-16 h-16 bg-gray-100 rounded-full border-4 border-orange-500">
//                   <div className="absolute inset-0 flex items-center justify-center">
//                     <span className="text-sm font-bold text-orange-600">{progressState.progress}%</span>
//                   </div>
//                 </div>
//               </div>
              
//               <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
//                 {progressState.currentStage}
//               </h2>
              
//               <div className="text-sm text-gray-600 space-y-1">
//                 <p>Stage {progressState.completedStages.length + 1} of 5</p>
//               </div>
//             </div>

//             {/* Progress Bar */}
//             <div className="relative bg-gray-200 h-4 rounded-full mb-4">
//               <div 
//                 className="bg-gradient-to-r from-orange-500 to-red-500 h-4 rounded-full transition-all duration-700 ease-out relative"
//                 style={{ width: `${progressState.progress}%` }}
//               >
//                 <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
//               </div>
//               <div className="absolute inset-0 flex items-center justify-center">
//                 <span className="text-xs font-bold text-gray-700">{progressState.progress}%</span>
//               </div>
//             </div>

//             {/* Stats Grid - Dynamic */}
//             <div className="grid grid-cols-3 gap-4 mt-6">
//               <div className="text-center p-3 bg-blue-50 rounded-lg">
//                 <div className="text-2xl font-bold text-blue-600">{progressState.progress}%</div>
//                 <div className="text-xs text-blue-600 font-medium">Total Progress</div>
//               </div>
              
//               <div className="text-center p-3 bg-green-50 rounded-lg">
//                 <div className="text-2xl font-bold text-green-600">{progressState.completedStages.length}</div>
//                 <div className="text-xs text-green-600 font-medium">Completed Stages</div>
//               </div>
              
//               <div className="text-center p-3 bg-orange-50 rounded-lg">
//                 <div className="text-2xl font-bold text-orange-600">
//                   {progressState.isCompleted ? '✅' : '⏳'}
//                 </div>
//                 <div className="text-xs text-orange-600 font-medium">
//                   {progressState.isCompleted ? 'Completed' : 'Processing'}
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ProcessPage; 