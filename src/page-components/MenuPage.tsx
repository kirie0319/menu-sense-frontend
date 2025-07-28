'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Download, Share, Wifi, WifiOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { MenuCategoriesHeader } from '@/features/menu/components/MenuCategoriesHeader';
import { MenuItemsGrid } from '@/features/menu/components/MenuItemsGrid';
import { MenuPageSkeleton } from '@/features/menu/components/MenuSkeleton';
import { MenuItemDetail } from '@/features/menu/components/MenuItemDetail';
import { SimpleMenuItem } from '@/features/menu/types';
import { Alert } from '@/components/ui';

interface MenuPageProps {
  onBackToHome?: () => void;
  onNavigateToProcess?: () => void;
  file?: File | null;
  sessionId?: string;
}

interface MenuItemData {
  id: string;
  name: string;
  translation?: string;
  category?: string;
  category_translation?: string;
  price?: string;
  description?: string;
  allergy?: string;
  ingredient?: string;
  search_engine?: string;
  gen_image?: string;
  created_at?: string;
  updated_at?: string;
}

interface SSEUpdateLog {
  id: string;
  timestamp: string;
  type: 'stage_completed' | 'batch_completed' | 'menu_update' | 'info' | 'error';
  message: string;
  data?: any;
}

// SSE接続関数（テストページから流用）
function createSSEConnection(
  sessionId: string,
  onMessage: (event: any) => void,
  onError?: (error: any) => void,
  onOpen?: () => void
): () => void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const sseUrl = `${apiUrl}/api/v1/sse/stream/${encodeURIComponent(sessionId)}`;
  
  console.log(`[MenuPage SSE] 🔗 Starting SSE connection to: ${sseUrl}`);
  
  let eventSource: EventSource | null = null;
  let isCleanedUp = false;

  const cleanup = (reason: string) => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    
    console.log(`[MenuPage SSE] 🧹 Cleaning up SSE connection: ${reason}`);
    
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  try {
    eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log(`[MenuPage SSE] ✅ SSE connection established for session: ${sessionId}`);
      if (onOpen) onOpen();
    };

    // 汎用メッセージ受信（event: フィールドなし）
    eventSource.onmessage = (event) => {
      if (isCleanedUp) return;
      
      console.log('[MenuPage SSE] 📨 Generic message received:', event);
      onMessage({
        type: 'generic_message',
        eventType: 'onmessage',
        data: event.data,
        lastEventId: event.lastEventId,
        origin: event.origin
      });
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
        
        console.log(`[MenuPage SSE] 📨 Named event received: ${eventName}`, event);
        onMessage({
          type: 'named_event',
          eventType: eventName,
          data: event.data,
          lastEventId: event.lastEventId,
          origin: event.origin
        });
      });
    });

    eventSource.onerror = (error) => {
      console.error(`[MenuPage SSE] ❌ SSE connection error for session ${sessionId}:`, error);
      if (onError) onError(error);
    };

  } catch (error) {
    console.error('[MenuPage SSE] Failed to create SSE connection:', error);
    if (onError) onError(error);
  }

  return () => cleanup('manual_cleanup');
}

export const MenuPage: React.FC<MenuPageProps> = ({ 
  onBackToHome, 
  onNavigateToProcess, 
  file: externalFile, 
  sessionId: externalSessionId 
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // セッションIDの取得（URLパラメータ or props or 安全な新規生成）
  const [sessionId, setSessionId] = useState<string>(() => {
    const urlSessionId = searchParams.get('sessionId');
    if (urlSessionId) {
      return urlSessionId;
    }
    if (externalSessionId) {
      return externalSessionId;
    }
    
    // 安全なセッションID生成
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // フォールバック: より安全な生成
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 12);
    const additional = Math.random().toString(36).substr(2, 6);
    return `session-${timestamp}-${random}-${additional}`;
  });
  
  // 状態管理
  const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasReceivedMenuData, setHasReceivedMenuData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateLogs, setUpdateLogs] = useState<SSEUpdateLog[]>([]);
  const [processingStats, setProcessingStats] = useState({
    totalItems: 0,
    translatedItems: 0,
    descriptionItems: 0,
    allergenItems: 0,
    ingredientItems: 0,
    imageItems: 0
  });

  // メニューアイテム詳細表示用の状態
  const [selectedMenuItem, setSelectedMenuItem] = useState<SimpleMenuItem | null>(null);
  const [showItemDetail, setShowItemDetail] = useState(false);

  // スケルトン表示の判定
  const shouldShowSkeleton = isInitializing || (!hasReceivedMenuData && menuItems.length === 0);

  // MenuItemDataをSimpleMenuItemに変換（test/page.tsx準拠版）
  const convertToSimpleMenuItems = (items: MenuItemData[]): SimpleMenuItem[] => {
    console.log(`[MenuPage] 🔄 Converting ${items.length} MenuItemData to SimpleMenuItem`);
    
    return items.map((item, index) => {
      console.log(`[MenuPage] 🔍 Processing item ${index + 1}/${items.length}: ${item.name} (${item.id})`);
      console.log(`[MenuPage] 🔍 Raw image data:`, {
        gen_image: item.gen_image,
        search_engine: item.search_engine
      });
      
      // 画像URLの処理（test/page.tsx準拠）
      let imageUrl = item.gen_image || '';
      let imageUrls: string[] = [];

      // search_engineフィールドからURLリストを抽出
      if (item.search_engine) {
        console.log(`[MenuPage] 🔍 search_engine field found for ${item.id}:`, item.search_engine);
        try {
          // JSON配列として解析を試行
          const parsed = JSON.parse(item.search_engine);
          console.log(`[MenuPage] ✅ JSON.parse successful for ${item.id}:`, parsed);
          
          if (Array.isArray(parsed)) {
            imageUrls = parsed;
            console.log(`[MenuPage] ✅ Array validation passed, length: ${imageUrls.length}`);
            
            // 詳細なURLログ出力（test/page.tsx準拠）
            console.log(`[MenuPage] 🖼️ IMAGE URLS for ${item.name}:`);
            imageUrls.forEach((url: string, idx: number) => {
              console.log(`  Image ${idx + 1}: ${url}`);
            });
            
            // gen_imageがない場合は最初のURLを使用
            if (!imageUrl && imageUrls.length > 0) {
              imageUrl = imageUrls[0];
              console.log(`[MenuPage] ✅ Set primary image_url from search results: ${imageUrl}`);
            }
          } else {
            console.log(`[MenuPage] ❌ Parsed data is not an array:`, typeof parsed, parsed);
          }
        } catch (e) {
          console.log(`[MenuPage] ❌ JSON.parse failed for item ${item.id}:`, e);
        }
      } else {
        console.log(`[MenuPage] ❌ No search_engine field for item ${item.id}`);
      }

      const result = {
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
      
      console.log(`[MenuPage] ✅ Converted item ${item.id}:`, {
        name: result.name,
        translation: result.translation,
        image_url: result.image_url,
        image_urls_count: result.image_urls.length
      });
      
      return result;
    });
  };

  // メニューアイテムクリックハンドラー
  const handleItemClick = (item: SimpleMenuItem) => {
    setSelectedMenuItem(item);
    setShowItemDetail(true);
    console.log('Menu item clicked:', item);
  };

  // メニューアイテム詳細を閉じる
  const handleCloseItemDetail = () => {
    setShowItemDetail(false);
    setSelectedMenuItem(null);
  };
  
  const cleanupRef = useRef<(() => void) | null>(null);

  const addUpdateLog = (type: SSEUpdateLog['type'], message: string, data?: any) => {
    const log: SSEUpdateLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setUpdateLogs(prev => [log, ...prev.slice(0, 19)]); // 最新20件まで保持
  };

  // SSEから受信したメニューアイテムデータを処理（並列タスク対応強化版）
  const handleMenuItemUpdate = (data: any) => {
    console.log('[MenuPage] 📝 Processing menu item update:', data);
    
    // 並列処理タスクからの更新の場合
    if (data.task_type && data.item_id && data.status === 'completed') {
      handleParallelTaskUpdate(data);
      return;
    }
    
    // カテゴライズ結果（categories配列）の場合
    if (data.categories && Array.isArray(data.categories)) {
      handleCategorizeResult(data);
      return;
    }
    
    // menu_dataプロパティがある場合（SSEのmenu_updateイベント）
    if (data.menu_data) {
      handleMenuItemUpdate(data.menu_data);
      return;
    }
    
    // 単一のメニューアイテムの場合
    if (data.name || data.translation || data.original_name) {
      const newItem: MenuItemData = {
        id: data.id || data.item_id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: data.name || data.original_name || 'Unknown Item',
        translation: data.translation || data.name || '',
        category: data.category || '',
        category_translation: data.category_translation || '',
        price: data.price || '',  // 価格情報の適切な処理
        description: data.description || '',
        allergy: data.allergy || data.allergen_info || '',
        ingredient: data.ingredient || data.ingredient_info || '',
        search_engine: data.search_engine || '', // 複数URL対応は後で処理
        gen_image: data.gen_image || data.primary_image || '',
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      };

      setMenuItems(prev => {
        const existingIndex = prev.findIndex(item => item.id === newItem.id);
        if (existingIndex !== -1) {
          // 既存アイテムを部分更新（既存データを保持しながら新しいデータをマージ）
          const updated = [...prev];
          updated[existingIndex] = { 
            ...updated[existingIndex], 
            ...Object.fromEntries(
              Object.entries(newItem).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
            )
          };
          console.log(`[MenuPage] ✏️ Updated existing item: ${newItem.name} (${newItem.translation})`);
          return updated;
        } else {
          // 新しいアイテムを追加
          console.log(`[MenuPage] ➕ Added new item: ${newItem.name} (${newItem.translation})`);
          return [...prev, newItem];
        }
      });

      setHasReceivedMenuData(true);
      setIsInitializing(false);
    } 
    // 複数のメニューアイテムの配列の場合
    else if (Array.isArray(data)) {
      const newItems: MenuItemData[] = data.map((item: any) => ({
        id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: item.name || 'Unknown Item',
        translation: item.translation || '',
        category: item.category || '',
        category_translation: item.category_translation || '',
        price: item.price || '',  // 価格情報必須
        description: item.description || '',
        allergy: item.allergy || '',
        ingredient: item.ingredient || '',
        search_engine: item.search_engine || '',
        gen_image: item.gen_image || '',
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      }));

      setMenuItems(prev => {
        const updatedItems = [...prev];
        newItems.forEach(newItem => {
          const existingIndex = updatedItems.findIndex(item => item.id === newItem.id);
          if (existingIndex !== -1) {
            updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...newItem };
          } else {
            updatedItems.push(newItem);
          }
        });
        console.log(`[MenuPage] 📋 Processed ${newItems.length} menu items`);
        return updatedItems;
      });

      setHasReceivedMenuData(true);
      setIsInitializing(false);
    }
  };

  // 並列処理タスクの更新を処理
  const handleParallelTaskUpdate = (taskData: any) => {
    console.log(`[MenuPage] 🔄 Processing ${taskData.task_type} task update for item: ${taskData.item_id}`);
    
    setMenuItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === taskData.item_id);
      if (existingIndex === -1) {
        console.warn(`[MenuPage] ⚠️ Item not found for task update: ${taskData.item_id}`);
        return prev;
      }

      const updated = [...prev];
      const currentItem = { ...updated[existingIndex] };

      // タスクタイプ別の処理
      switch (taskData.task_type) {
        case 'translation':
          if (taskData.translation) currentItem.translation = taskData.translation;
          if (taskData.category_translation) currentItem.category_translation = taskData.category_translation;
          console.log(`[MenuPage] 🌐 Translation updated: ${taskData.translation}`);
          break;
          
        case 'description':
          if (taskData.description) currentItem.description = taskData.description;
          console.log(`[MenuPage] 📝 Description updated: ${taskData.description?.substring(0, 50)}...`);
          break;
          
        case 'allergen':
          if (taskData.allergen_info) currentItem.allergy = taskData.allergen_info;
          console.log(`[MenuPage] ⚠️ Allergen info updated: ${taskData.allergen_info}`);
          break;
          
        case 'ingredient':
          if (taskData.ingredient_info) currentItem.ingredient = taskData.ingredient_info;
          console.log(`[MenuPage] 🧪 Ingredient info updated: ${taskData.ingredient_info}`);
          break;
          
        case 'search_image':
          // test/page.tsx完全準拠処理
          console.log(`[MenuPage] 🔍 DEBUG: Processing SSE search_image message:`, taskData);
          console.log(`[MenuPage] ✅ DEBUG: Search image task completed detected`);
          
          if (taskData.search_engine) {
            console.log(`[MenuPage] 🔍 DEBUG: search_engine field found:`, taskData.search_engine);
            console.log(`[MenuPage] 🔍 DEBUG: item_id:`, taskData.item_id);
            
            try {
              const imageUrls = JSON.parse(taskData.search_engine);
              console.log(`[MenuPage] ✅ DEBUG: JSON.parse successful, parsed:`, imageUrls);
              
              if (Array.isArray(imageUrls)) {
                console.log(`[MenuPage] ✅ DEBUG: Array validation passed, length:`, imageUrls.length);
                
                // test/page.tsx準拠の詳細ログ出力
                console.log(`[MenuPage] 🖼️ IMAGE URLS RECEIVED:`);
                console.log(`  Item: ${taskData.original_name} (${taskData.item_id})`);
                console.log(`  Total Images: ${imageUrls.length}`);
                imageUrls.forEach((url: string, idx: number) => {
                  console.log(`  Image ${idx + 1}: ${url}`);
                });
                
                // test/page.tsx完全準拠のデータ設定
                currentItem.search_engine = taskData.search_engine; // JSON文字列のまま保存
                // 新しい処理：image_urlsとimage_urlの直接設定は行わない（convertToSimpleMenuItemsで処理）
                
              } else {
                console.log(`[MenuPage] ❌ DEBUG: Parsed data is not an array:`, typeof imageUrls, imageUrls);
              }
            } catch (error) {
              console.log(`[MenuPage] ❌ DEBUG: JSON.parse failed:`, error);
            }
          } else {
            console.log(`[MenuPage] ❌ DEBUG: No search_engine field found in data`);
          }
          
          if (taskData.primary_image) {
            currentItem.gen_image = taskData.primary_image;
            console.log(`[MenuPage] ✅ Set primary image:`, taskData.primary_image);
          }
          
          console.log(`[MenuPage] 🖼️ Image search updated for ${taskData.item_id}`);
          break;
          
        default:
          console.log(`[MenuPage] ❓ Unknown task type: ${taskData.task_type}`);
      }

      // 更新時刻を記録
      currentItem.updated_at = new Date().toISOString();
      updated[existingIndex] = currentItem;
      
      return updated;
    });
  };

  // カテゴライズ結果の処理（価格情報含む）
  const handleCategorizeResult = (categorizeData: any) => {
    console.log('[MenuPage] 🗂️ Processing categorize result with price info');
    
    if (!categorizeData.categories) return;
    
    const newItems: MenuItemData[] = [];
    
    categorizeData.categories.forEach((category: any) => {
      if (category.items && Array.isArray(category.items)) {
        category.items.forEach((item: any) => {
          const menuItem: MenuItemData = {
            id: `cat-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || 'Unknown Item',
            translation: item.name || '', // 初期値として元の名前を使用
            category: category.name || '',
            category_translation: category.japanese_name || '',
            price: item.price || '', // カテゴライズからの価格情報
            description: '',
            allergy: '',
            ingredient: '',
            search_engine: '',
            gen_image: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          newItems.push(menuItem);
        });
      }
    });
    
    if (newItems.length > 0) {
      setMenuItems(prev => [...prev, ...newItems]);
      console.log(`[MenuPage] 📋 Added ${newItems.length} items from categorize result with prices`);
      setHasReceivedMenuData(true);
      setIsInitializing(false);
    }
  };

  // localStorageからファイルを復元
  const restoreFileFromStorage = (): File | null => {
    try {
      const storedData = localStorage.getItem('uploadedFile');
      if (!storedData) {
        console.log('[MenuPage] No file found in localStorage');
        return null;
      }

      const fileData = JSON.parse(storedData);
      
      // Base64をBlobに変換
      const base64Data = fileData.data.split(',')[1]; // data:image/jpeg;base64, を除去
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: fileData.type });
      const file = new File([blob], fileData.name, { type: fileData.type });
      
      console.log('[MenuPage] File restored from localStorage:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      return file;
    } catch (error) {
      console.error('[MenuPage] Failed to restore file from localStorage:', error);
      return null;
    }
  };

  // メニュー処理を開始
  const startMenuProcessing = async () => {
    // 既に処理中の場合は実行しない
    if (isProcessing) {
      console.log('[MenuPage] ⚠️ Processing already in progress, skipping...');
      return;
    }
    
    const file = restoreFileFromStorage();
    if (!file) {
      setError('No uploaded file found. Please go back and upload a file.');
      setIsInitializing(false);
      return;
    }

    setIsProcessing(true);
    addUpdateLog('info', `Starting menu processing with file: ${file.name} (${file.size} bytes)`);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const processUrl = `${apiUrl}/api/v1/pipeline/process-with-session?session_id=${encodeURIComponent(sessionId)}`;
      
      const formData = new FormData();
      formData.append('file', file);

      addUpdateLog('info', `Calling processing API with session: ${sessionId}`);
      console.log('[MenuPage] 📤 Sending processing request:', { sessionId, fileName: file.name, fileSize: file.size });

      const response = await fetch(processUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        addUpdateLog('info', 'Menu processing started successfully', result);
        console.log('[MenuPage] ✅ Processing started successfully:', result);
        
        // ファイルをクリーンアップ（処理開始後）
        try {
          localStorage.removeItem('uploadedFile');
          console.log('[MenuPage] 🧹 Uploaded file data cleaned from localStorage');
        } catch (cleanupError) {
          console.warn('[MenuPage] ⚠️ Failed to cleanup file data:', cleanupError);
        }
      } else {
        const errorMessage = result?.detail || `API Error: ${response.status} ${response.statusText}`;
        console.error('[MenuPage] ❌ API Error:', { status: response.status, statusText: response.statusText, detail: result });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[MenuPage] ❌ Failed to start menu processing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start menu processing';
      setError(errorMessage);
      addUpdateLog('error', 'Failed to start menu processing', { error: errorMessage });
    } finally {
      setIsProcessing(false);
    }
  };

  // 初期メニューデータの取得
  const fetchMenuData = useCallback(async (skipError = false) => {
    if (!sessionId) {
      if (!skipError) {
        setError('Session ID not found');
        setIsInitializing(false);
      }
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const menuUrl = `${apiUrl}/api/v1/menu-images/menus/${sessionId}`;
      
      console.log('[MenuPage] 📊 Fetching menu data:', { sessionId, url: menuUrl });
      
      const response = await fetch(menuUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MenuPage] ✅ Menu data received:', { menuCount: data.menus?.length || 0, totalCount: data.total_count });
        
        setMenuItems(data.menus || []);
        
        // メニューデータを受信したことを記録
        if (data.menus && data.menus.length > 0) {
          setHasReceivedMenuData(true);
          addUpdateLog('info', `Menu data loaded: ${data.menus.length} items - switching to menu view`);
        }
        
        setProcessingStats({
          totalItems: data.menus?.length || 0,
          translatedItems: data.menus?.filter((item: MenuItemData) => item.translation).length || 0,
          descriptionItems: data.menus?.filter((item: MenuItemData) => item.description).length || 0,
          allergenItems: data.menus?.filter((item: MenuItemData) => item.allergy).length || 0,
          ingredientItems: data.menus?.filter((item: MenuItemData) => item.ingredient).length || 0,
          imageItems: data.menus?.filter((item: MenuItemData) => item.gen_image).length || 0,
        });
        
        setIsInitializing(false);
      } else if (response.status === 404 && skipError) {
        // セッションが存在しない場合（新規処理の場合）
        console.log('[MenuPage] ℹ️ Session not found (skip error mode), will create new session');
        setMenuItems([]);
        setIsInitializing(false);
      } else if (response.status === 404) {
        // セッションが存在しない場合
        console.log('[MenuPage] ℹ️ Session not found, keeping skeleton active');
        setMenuItems([]);
        addUpdateLog('info', 'No existing session found - waiting for processing to start');
        // 注意: isInitializingはfalseにしない（スケルトンを継続表示）
      } else {
        const errorText = await response.text();
        console.error('[MenuPage] ❌ Failed to fetch menu data:', { 
          status: response.status, 
          statusText: response.statusText, 
          responseText: errorText 
        });
        throw new Error(`Failed to fetch menu data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[MenuPage] ❌ Menu data fetch error:', error);
      if (!skipError) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load menu data';
        setError(errorMessage);
        addUpdateLog('error', 'Failed to load menu data', { error: errorMessage });
      }
      setIsInitializing(false);
    }
  }, [sessionId]);

  // SSE接続の開始
  const startSSEConnection = useCallback(() => {
    if (!sessionId) return;

    addUpdateLog('info', 'Starting SSE connection...');
    
    const cleanup = createSSEConnection(
      sessionId,
      (event) => {
        // SSEイベント処理
        if (event.type === 'generic_message') {
          try {
            const parsedData = JSON.parse(event.data);
            handleSSEEvent(parsedData);
          } catch (parseError) {
            console.error('[MenuPage SSE] Failed to parse generic message:', parseError);
          }
        } else if (event.type === 'named_event') {
          try {
            const parsedData = JSON.parse(event.data);
            handleSSEEvent(parsedData, event.eventType);
          } catch (parseError) {
            console.error('[MenuPage SSE] Failed to parse named event:', parseError);
          }
        }
      },
      (error) => {
        console.error('[MenuPage SSE] Connection error:', error);
        setIsSSEConnected(false);
        addUpdateLog('error', 'SSE connection error', error);
      },
      () => {
        setIsSSEConnected(true);
        addUpdateLog('info', 'SSE connection established');
      }
    );

    cleanupRef.current = cleanup;
  }, [sessionId]);

  // SSEイベントハンドラー（test/page.tsx準拠版）
  const handleSSEEvent = (eventData: any, eventType?: string) => {
    const type = eventData.type || eventType;
    
    console.log('[MenuPage SSE] 🔍 DEBUG: Processing SSE message:', eventData);
    
    // 🖼️ 画像検索タスク完了（test/page.tsx完全準拠）
    if (eventData.task_type === 'search_image' && eventData.status === 'completed') {
      console.log(`[MenuPage SSE] ✅ DEBUG: Search image task completed detected`);
      addUpdateLog('info', `🖼️ Search Image Completed: ${eventData.original_name || eventData.item_id}`, eventData);
      
      if (eventData.search_engine) {
        console.log(`[MenuPage SSE] 🔍 DEBUG: search_engine field found:`, eventData.search_engine);
        console.log(`[MenuPage SSE] 🔍 DEBUG: item_id:`, eventData.item_id);
        
        try {
          const imageUrls = JSON.parse(eventData.search_engine);
          console.log(`[MenuPage SSE] ✅ DEBUG: JSON.parse successful, parsed:`, imageUrls);
          
          if (Array.isArray(imageUrls)) {
            console.log(`[MenuPage SSE] ✅ DEBUG: Array validation passed, length:`, imageUrls.length);
            
            addUpdateLog('info', `📷 Image URLs received for ${eventData.original_name}: ${imageUrls.length} images`, {
              item_id: eventData.item_id,
              urls: imageUrls,
              total_count: imageUrls.length
            });
            
            // test/page.tsx準拠の詳細ログ出力
            console.log(`[MenuPage SSE] 🖼️ IMAGE URLS RECEIVED:`);
            console.log(`  Item: ${eventData.original_name} (${eventData.item_id})`);
            console.log(`  Total Images: ${imageUrls.length}`);
            imageUrls.forEach((url: string, idx: number) => {
              console.log(`  Image ${idx + 1}: ${url}`);
            });
            
            // test/page.tsx準拠のメニューアイテム更新
            setMenuItems(prev => {
              console.log(`[MenuPage SSE] 🔍 DEBUG: Current menuItems before update:`, prev.map(item => ({
                id: item.id,
                name: item.name,
                search_engine: item.search_engine,
                gen_image: item.gen_image
              })));
              
              const existingIndex = prev.findIndex(item => item.id === eventData.item_id);
              console.log(`[MenuPage SSE] 🔍 DEBUG: Finding item ${eventData.item_id}, found at index: ${existingIndex}`);
              
              if (existingIndex !== -1) {
                const updated = [...prev];
                const beforeUpdate = { ...updated[existingIndex] };
                
                updated[existingIndex] = {
                  ...updated[existingIndex],
                  search_engine: eventData.search_engine, // JSON文字列として保存
                  gen_image: imageUrls[0] || updated[existingIndex].gen_image // 最初のURLをプライマリ画像に
                };
                
                console.log(`[MenuPage SSE] ✅ DEBUG: Updated menu item comparison:`);
                console.log(`  Before:`, {
                  id: beforeUpdate.id,
                  name: beforeUpdate.name,
                  search_engine: beforeUpdate.search_engine,
                  gen_image: beforeUpdate.gen_image
                });
                console.log(`  After:`, {
                  id: updated[existingIndex].id,
                  name: updated[existingIndex].name,
                  search_engine: updated[existingIndex].search_engine,
                  gen_image: updated[existingIndex].gen_image
                });
                
                return updated;
              } else {
                console.log(`[MenuPage SSE] ❌ DEBUG: Item ${eventData.item_id} not found in menuItems`);
              }
              return prev;
            });
            
          } else {
            console.log(`[MenuPage SSE] ❌ DEBUG: Parsed data is not an array:`, typeof imageUrls, imageUrls);
          }
        } catch (error) {
          console.log(`[MenuPage SSE] ❌ DEBUG: JSON.parse failed:`, error);
          addUpdateLog('error', `Failed to parse search_engine JSON for ${eventData.item_id}`, error);
        }
      } else {
        console.log(`[MenuPage SSE] ❌ DEBUG: No search_engine field found in data`);
      }
      return; // 早期リターンして他の処理をスキップ
    }
    
    console.log('[MenuPage SSE] Processing event type:', type, eventData);
    
    switch (type) {
      case 'connection_established':
        addUpdateLog('info', 'SSE connection established');
        break;
        
      case 'stage_completed':
        const stage = eventData.data?.stage;
        addUpdateLog('stage_completed', `Stage completed: ${stage}`, eventData.data);
        
        // カテゴライズステージ完了時の特別処理
        if (stage === 'categorize' || stage === 'categorization') {
          console.log('[MenuPage SSE] ✅ Categorization completed - fetching menu data');
          addUpdateLog('info', 'Categorization completed - loading menu data...');
          // カテゴライズ完了時に即座にメニューデータを取得
          fetchMenuData(true);
        }
        break;
        
      case 'batch_completed':
      case 'translation_batch_completed':
      case 'description_batch_completed':
      case 'allergen_batch_completed':
      case 'ingredient_batch_completed':
      case 'search_image_batch_completed':
        addUpdateLog('batch_completed', `Batch completed: ${type}`, eventData.data);
        // バッチ完了時にもSSEから受信したデータを直接処理
        if (eventData.data && eventData.data.updated_items) {
          handleMenuItemUpdate(eventData.data.updated_items);
        } else if (eventData.data) {
          handleMenuItemUpdate(eventData.data);
        }
        break;
        
      case 'menu_update':
        addUpdateLog('menu_update', 'Menu data updated', eventData.data);
        // SSEから受信したデータを直接menuItemsに追加
        if (eventData.data) {
          handleMenuItemUpdate(eventData.data);
        }
        break;
        
      case 'progress_update':
        addUpdateLog('info', eventData.data?.message || 'Progress update', eventData.data);
        break;
        
      case 'error':
        addUpdateLog('error', eventData.data?.message || 'Error occurred', eventData.data);
        break;
        
      default:
        addUpdateLog('info', `Unknown event: ${type}`, eventData);
        // 不明なイベントでもメニューデータらしきものがあれば処理を試行
        if (eventData.data && (eventData.data.name || eventData.data.translation || typeof eventData.data === 'string')) {
          // 文字列の場合はシンプルなメニューアイテムとして処理
          if (typeof eventData.data === 'string') {
            handleMenuItemUpdate({
              name: eventData.data,
              translation: eventData.data
            });
          } else {
            handleMenuItemUpdate(eventData.data);
          }
        }
    }
  };

  // 初期化処理
  useEffect(() => {
    let isInitializing = false; // 重複実行防止フラグ
    
    const initializeMenuPage = async () => {
      // 重複実行チェック
      if (isInitializing) {
        console.log('[MenuPage] ⚠️ Initialization already in progress, skipping...');
        return;
      }
      
      isInitializing = true;
      
      try {
        if (!sessionId) {
          setError('Session ID not found');
          setIsInitializing(false);
          return;
        }

        console.log('[MenuPage] 🚀 Initializing with session:', sessionId);

        // SSE接続を開始
        startSSEConnection();

        // URLパラメータからセッションIDが来ている場合は既存セッション
        const urlSessionId = searchParams.get('sessionId');
        
        if (urlSessionId) {
          // 既存セッション：セッション状態をチェック
          addUpdateLog('info', `Loading existing session: ${urlSessionId}`);
          
          try {
            // セッションの有効性を確認
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const statusResponse = await fetch(`${apiUrl}/api/v1/pipeline/session/${encodeURIComponent(urlSessionId)}/status`);
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log('[MenuPage] ✅ Session is valid:', statusData);
              addUpdateLog('info', `Session status: ${statusData.status || 'unknown'}`);
            } else {
              console.log('[MenuPage] ⚠️ Session status check failed, proceeding with data fetch');
            }
          } catch (statusError) {
            console.log('[MenuPage] ⚠️ Failed to check session status:', statusError);
          }
          
          // メニューデータを取得
          await fetchMenuData();
        } else {
          // 新規セッション：ファイル処理を開始
          addUpdateLog('info', `Starting new session: ${sessionId}`);
          console.log('[MenuPage] 🆕 New session, checking for uploaded file...');
          
          // アップロードされたファイルがあるかチェック
          const storedFile = localStorage.getItem('uploadedFile');
          if (storedFile) {
            console.log('[MenuPage] 📁 Found uploaded file, starting processing...');
            addUpdateLog('info', 'Found uploaded file - starting processing...');
            // ファイル処理を開始（スケルトンは継続表示）
            await startMenuProcessing();
          } else {
            console.log('[MenuPage] ⚠️ No uploaded file found');
            addUpdateLog('info', 'No uploaded file found - please upload a file first');
            setIsInitializing(false);
          }
        }
      } catch (error) {
        console.error('[MenuPage] ❌ Initialization failed:', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
        addUpdateLog('error', 'Initialization failed', error);
        setIsInitializing(false);
      } finally {
        isInitializing = false;
      }
    };

    initializeMenuPage();

    // クリーンアップ
    return () => {
      isInitializing = false; // フラグをリセット
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [sessionId]); // searchParamsを依存配列から削除（無限ループ防止）

  // ファイル処理（外部から渡された場合）
  useEffect(() => {
    if (externalFile) {
      console.log('[MenuPage] External file provided:', externalFile.name);
    }
  }, [externalFile]);

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      router.push('/');
    }
  };

  // スケルトン表示
  if (shouldShowSkeleton) {
    return <MenuPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        subtitle="Menu Translation Results"
        showServerStatus={false}
        leftContent={
          <button 
            onClick={handleBackToHome}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mr-3"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
        }
        centerContent={
          <div className="flex-1 max-w-3xl mx-auto px-2 flex items-center justify-center">

          </div>
        }
        rightContent={
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Share size={16} className="text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Download size={16} className="text-gray-600" />
            </button>
          </div>
        }
      />
      
      {/* Header spacer */}
      <div className="h-24 sm:h-28 md:h-32"></div>
      {/* Main content */}
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Error display */}
        <AnimatePresence>
          {error && (
            <Alert
              variant="error"
              title="Error"
              message={error}
              dismissible
              onDismiss={() => setError(null)}
            />
          )}
        </AnimatePresence>

        {/* Menu display section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 md:space-y-8"
        >
          {/* Menu items grid */}
          <MenuItemsGrid 
            items={convertToSimpleMenuItems(menuItems)} 
            onItemClick={handleItemClick}
            favorites={new Set()}
            showImages={true}
            showPrices={true}
            groupByCategory={false}
            categories={[]}
          />
        </motion.div>

        {/* Menu item detail modal */}
        <MenuItemDetail
          item={selectedMenuItem}
          isVisible={showItemDetail}
          onClose={handleCloseItemDetail}
        />
      </div>
    </div>
  );
};