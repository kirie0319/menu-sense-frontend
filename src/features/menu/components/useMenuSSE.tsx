'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimpleMenuItem } from '@/features/menu/types';

// SSE更新ログの型定義
interface SSEUpdateLog {
  id: string;
  timestamp: string;
  type: 'stage_completed' | 'batch_completed' | 'menu_update' | 'progress_update' | 'info' | 'error';
  message: string;
  data?: any;
}

// 処理統計の型定義
interface ProcessingStats {
  totalItems: number;
  translatedItems: number;
  descriptionItems: number;
  allergenItems: number;
  ingredientItems: number;
  imageItems: number;
}

// SSE接続状態の型定義
interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionCount: number;
  lastEventTime: number | null;
}

// カスタムフックの戻り値型
interface UseMenuSSEReturn {
  // データ状態
  menuItems: SimpleMenuItem[];
  processingStats: ProcessingStats;
  updateLogs: SSEUpdateLog[];
  
  // 接続状態
  connectionState: SSEConnectionState;
  
  // メソッド
  connectSSE: () => void;
  disconnectSSE: () => void;
  clearLogs: () => void;
  
  // フラグ
  hasReceivedMenuData: boolean;
  isProcessing: boolean;
}

export const useMenuSSE = (sessionId: string): UseMenuSSEReturn => {
  // データ状態
  const [menuItems, setMenuItems] = useState<SimpleMenuItem[]>([]);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    totalItems: 0,
    translatedItems: 0,
    descriptionItems: 0,
    allergenItems: 0,
    ingredientItems: 0,
    imageItems: 0
  });
  const [updateLogs, setUpdateLogs] = useState<SSEUpdateLog[]>([]);
  
  // 接続状態
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionCount: 0,
    lastEventTime: null
  });
  
  // フラグ
  const [hasReceivedMenuData, setHasReceivedMenuData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 参照
  const cleanupRef = useRef<(() => void) | null>(null);

  // ログ追加関数
  const addUpdateLog = useCallback((type: SSEUpdateLog['type'], message: string, data?: any) => {
    const log: SSEUpdateLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setUpdateLogs(prev => [log, ...prev.slice(0, 19)]); // 最新20件まで保持
  }, []);

  // メニューデータをSimpleMenuItemに変換
  const convertToSimpleMenuItem = useCallback((item: any): SimpleMenuItem => {
    // 画像URLの処理（search_engineとgen_imageの両方を考慮）
    let imageUrl = item.gen_image || '';
    let imageUrls: string[] = [];

    // search_engineフィールドからURLリストを抽出
    if (item.search_engine) {
      try {
        // JSON配列として解析を試行
        const parsed = JSON.parse(item.search_engine);
        if (Array.isArray(parsed)) {
          imageUrls = parsed;
          // gen_imageがない場合は最初のURLを使用
          if (!imageUrl && imageUrls.length > 0) {
            imageUrl = imageUrls[0];
          }
        }
      } catch (e) {
        console.warn(`Failed to parse search_engine for item ${item.id}:`, e);
      }
    }

    return {
      id: item.id,
      name: item.name,
      translation: item.translation || '',
      price: item.price,
      category: item.category,
      description: item.description,
      allergens: item.allergy,
      ingredients: item.ingredient,
      image_url: imageUrl,
      image_urls: imageUrls
    };
  }, []);

  // 統計更新関数
  const updateProcessingStats = useCallback((items: any[]) => {
    setProcessingStats({
      totalItems: items.length,
      translatedItems: items.filter(item => item.translation).length,
      descriptionItems: items.filter(item => item.description).length,
      allergenItems: items.filter(item => item.allergy).length,
      ingredientItems: items.filter(item => item.ingredient).length,
      imageItems: items.filter(item => {
        // gen_imageまたはsearch_engineのいずれかが存在する場合
        if (item.gen_image) return true;
        if (item.search_engine) {
          try {
            const parsed = JSON.parse(item.search_engine);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch (e) {
            return false;
          }
        }
        return false;
      }).length,
    });
  }, []);

  // メニューデータ取得関数
  const fetchMenuData = useCallback(async (skipError = false) => {
    if (!sessionId) {
      if (!skipError) {
        setConnectionState(prev => ({ ...prev, error: 'Session ID not found' }));
      }
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const menuUrl = `${apiUrl}/api/v1/menu-images/menus/${sessionId}`;
      
      console.log('[useMenuSSE] 📊 Fetching menu data:', { sessionId, url: menuUrl });
      
      const response = await fetch(menuUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[useMenuSSE] ✅ Menu data received:', { menuCount: data.menus?.length || 0 });
        
        const rawMenuItems = data.menus || [];
        const convertedItems = rawMenuItems.map(convertToSimpleMenuItem);
        
        setMenuItems(convertedItems);
        updateProcessingStats(rawMenuItems);
        
        // メニューデータを受信したことを記録
        if (convertedItems.length > 0) {
          setHasReceivedMenuData(true);
          addUpdateLog('info', `Menu data loaded: ${convertedItems.length} items`);
        }
        
      } else if (response.status === 404 && skipError) {
        console.log('[useMenuSSE] ℹ️ Session not found (skip error mode)');
        setMenuItems([]);
      } else if (response.status === 404) {
        console.log('[useMenuSSE] ℹ️ Session not found, waiting for processing...');
        setMenuItems([]);
        addUpdateLog('info', 'No existing session found - waiting for processing to start');
      } else {
        throw new Error(`Failed to fetch menu data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[useMenuSSE] ❌ Menu data fetch error:', error);
      if (!skipError) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load menu data';
        setConnectionState(prev => ({ ...prev, error: errorMessage }));
        addUpdateLog('error', 'Failed to load menu data', { error: errorMessage });
      }
    }
  }, [sessionId, convertToSimpleMenuItem, updateProcessingStats, addUpdateLog]);

  // SSEイベントハンドラー
  const handleSSEEvent = useCallback((eventData: any, eventType?: string) => {
    const type = eventData.type || eventType;
    
    console.log('[useMenuSSE] Processing event:', type, eventData);
    
    // 最後のイベント時刻を更新
    setConnectionState(prev => ({ ...prev, lastEventTime: Date.now() }));
    
    switch (type) {
      case 'connection_established':
        addUpdateLog('info', 'SSE connection established');
        setConnectionState(prev => ({ 
          ...prev, 
          connectionCount: eventData.data?.active_connections || 0 
        }));
        break;
        
      case 'stage_completed':
        const stage = eventData.data?.stage;
        addUpdateLog('stage_completed', `Stage completed: ${stage}`, eventData.data);
        
        // カテゴライズステージ完了時の特別処理
        if (stage === 'categorize' || stage === 'categorization') {
          console.log('[useMenuSSE] ✅ Categorization completed - fetching menu data');
          addUpdateLog('info', 'Categorization completed - loading menu data...');
          fetchMenuData(true);
        }
        break;
        
      case 'parallel_tasks_started':
        addUpdateLog('info', 'Parallel tasks started', eventData.data);
        setIsProcessing(true);
        break;
        
      case 'batch_completed':
      case 'translation_batch_completed':
      case 'description_batch_completed':
      case 'allergen_batch_completed':
      case 'ingredient_batch_completed':
      case 'search_image_batch_completed':
        addUpdateLog('batch_completed', `Batch completed: ${type}`, eventData.data);
        // バッチ完了時にメニューデータを再取得
        fetchMenuData(true);
        break;
        
      case 'menu_update':
        addUpdateLog('menu_update', 'Menu item updated', eventData.data);
        // 個別メニュー更新処理
        handleIndividualMenuUpdate(eventData.data);
        break;
        
      case 'progress_update':
        addUpdateLog('progress_update', eventData.data?.message || 'Progress update', eventData.data);
        break;
        
      case 'error':
        addUpdateLog('error', eventData.data?.message || 'Error occurred', eventData.data);
        setConnectionState(prev => ({ 
          ...prev, 
          error: eventData.data?.message || 'Unknown error' 
        }));
        break;
        
      default:
        addUpdateLog('info', `Unknown event: ${type}`, eventData);
    }
  }, [addUpdateLog, fetchMenuData]);

  // 個別メニュー更新処理
  const handleIndividualMenuUpdate = useCallback((updateData: any) => {
    const menuId = updateData.menu_id || updateData.item_id;
    if (!menuId) return;

    setMenuItems(prevItems => {
      const updatedItems = prevItems.map(item => {
        if (item.id === menuId) {
          const updatedItem = { ...item };
          
          // 翻訳データの更新
          if (updateData.menu_data?.translation) {
            updatedItem.translation = updateData.menu_data.translation;
          }
          
          // 説明データの更新
          if (updateData.menu_data?.description) {
            updatedItem.description = updateData.menu_data.description;
          }
          
          // アレルギー情報の更新
          if (updateData.menu_data?.allergen_info) {
            updatedItem.allergens = updateData.menu_data.allergen_info;
          }
          
          // 成分情報の更新
          if (updateData.menu_data?.ingredient_info) {
            updatedItem.ingredients = updateData.menu_data.ingredient_info;
          }
          
          // 画像URLの更新
          if (updateData.menu_data?.image_url) {
            updatedItem.image_url = updateData.menu_data.image_url;
          }
          
          return updatedItem;
        }
        return item;
      });
      
      // 統計を更新
      updateProcessingStats(updatedItems);
      
      return updatedItems;
    });
  }, [updateProcessingStats]);

  // SSE接続関数
  const createSSEConnection = useCallback((
    sessionId: string,
    onMessage: (event: any) => void,
    onError?: (error: any) => void,
    onOpen?: () => void
  ): () => void => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const sseUrl = `${apiUrl}/api/v1/sse/stream/${encodeURIComponent(sessionId)}`;
    
    console.log(`[useMenuSSE] 🔗 Starting SSE connection to: ${sseUrl}`);
    
    let eventSource: EventSource | null = null;
    let isCleanedUp = false;

    const cleanup = (reason: string) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      console.log(`[useMenuSSE] 🧹 Cleaning up SSE connection: ${reason}`);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        console.log(`[useMenuSSE] ✅ SSE connection established for session: ${sessionId}`);
        if (onOpen) onOpen();
      };

      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        try {
          const parsedData = JSON.parse(event.data);
          onMessage({
            type: 'generic_message',
            eventType: 'onmessage',
            data: event.data,
            parsedData
          });
        } catch (parseError) {
          console.error('[useMenuSSE] Failed to parse generic message:', parseError);
        }
      };

      // 名前付きイベントリスナーを追加
      const namedEvents = [
        'connection_established',
        'stage_completed',
        'progress_update',
        'parallel_tasks_started',
        'batch_completed',
        'translation_batch_completed',
        'description_batch_completed',
        'allergen_batch_completed',
        'ingredient_batch_completed',
        'search_image_batch_completed',
        'menu_update',
        'error'
      ];

      namedEvents.forEach(eventName => {
        eventSource!.addEventListener(eventName, (event: any) => {
          if (isCleanedUp) return;
          
          try {
            const parsedData = JSON.parse(event.data);
            onMessage({
              type: 'named_event',
              eventType: eventName,
              data: event.data,
              parsedData
            });
          } catch (parseError) {
            console.error(`[useMenuSSE] Failed to parse named event ${eventName}:`, parseError);
          }
        });
      });

      eventSource.onerror = (error) => {
        console.error(`[useMenuSSE] ❌ SSE connection error for session ${sessionId}:`, error);
        if (onError) onError(error);
      };

    } catch (error) {
      console.error('[useMenuSSE] Failed to create SSE connection:', error);
      if (onError) onError(error);
    }

    return () => cleanup('manual_cleanup');
  }, []);

  // SSE接続開始
  const connectSSE = useCallback(() => {
    if (!sessionId) return;

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
    addUpdateLog('info', 'Starting SSE connection...');
    
    const cleanup = createSSEConnection(
      sessionId,
      (event) => {
        // SSEイベント処理
        if (event.type === 'generic_message' && event.parsedData) {
          handleSSEEvent(event.parsedData);
        } else if (event.type === 'named_event' && event.parsedData) {
          handleSSEEvent(event.parsedData, event.eventType);
        }
      },
      (error) => {
        console.error('[useMenuSSE] Connection error:', error);
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: 'SSE connection error'
        }));
        addUpdateLog('error', 'SSE connection error', error);
      },
      () => {
        setConnectionState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false 
        }));
        addUpdateLog('info', 'SSE connection established');
      }
    );

    cleanupRef.current = cleanup;
  }, [sessionId, addUpdateLog, createSSEConnection, handleSSEEvent]);

  // SSE接続切断
  const disconnectSSE = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
      setConnectionState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isConnecting: false 
      }));
      addUpdateLog('info', 'SSE connection disconnected');
    }
  }, [addUpdateLog]);

  // ログクリア
  const clearLogs = useCallback(() => {
    setUpdateLogs([]);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return {
    // データ状態
    menuItems,
    processingStats,
    updateLogs,
    
    // 接続状態
    connectionState,
    
    // メソッド
    connectSSE,
    disconnectSSE,
    clearLogs,
    
    // フラグ
    hasReceivedMenuData,
    isProcessing
  };
}; 