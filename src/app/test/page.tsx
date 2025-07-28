'use client';

import React, { useState, useRef, useCallback } from 'react';
import { MenuCard } from '@/components/ui';

interface ImageTestLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'image_data';
  message: string;
  data?: any;
}

interface MenuItem {
  id: string;
  name: string;
  translation: string;
  price?: string;
  category?: string;
  image_url?: string;
  image_urls?: string[];
  search_engine?: string;
}

export default function ImageProcessingTestPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState('image-test-' + Date.now());
  const [logs, setLogs] = useState<ImageTestLog[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [receivedImageUrls, setReceivedImageUrls] = useState<Record<string, string[]>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

  // デバッグ用: receivedImageUrls の変更を監視
  React.useEffect(() => {
    console.log(`[ImageTest] 🔄 DEBUG: receivedImageUrls state changed:`, receivedImageUrls);
    console.log(`[ImageTest] 🔄 DEBUG: Total items with images:`, Object.keys(receivedImageUrls).length);
  }, [receivedImageUrls]);

  const addLog = useCallback((type: ImageTestLog['type'], message: string, data?: any) => {
    const log: ImageTestLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [log, ...prev.slice(0, 50)]); // 最新10件まで保持（統計用）
    
    // メインはコンソール出力
    console.log(`[ImageTest] ${type.toUpperCase()}: ${message}`, data || '');
  }, []);

  // SSE接続関数（画像処理専用）
  const createImageTestSSEConnection = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const sseUrl = `${apiUrl}/api/v1/sse/stream/${encodeURIComponent(sessionId)}`;
    
    addLog('info', `🔗 Starting SSE connection for image processing test`);
    console.log(`[ImageTest] SSE URL: ${sseUrl}`);
    
    let eventSource: EventSource | null = null;
    let isCleanedUp = false;

    const cleanup = (reason: string) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      
      addLog('info', `🧹 SSE connection closed: ${reason}`);
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        addLog('success', '✅ SSE connection established');
        setIsConnected(true);
      };

      // 汎用メッセージ受信
      eventSource.onmessage = (event) => {
        if (isCleanedUp) return;
        
        try {
          const parsedData = JSON.parse(event.data);
          processSSEMessage(parsedData);
        } catch (parseError) {
          addLog('error', 'Failed to parse SSE message', { originalData: event.data, error: parseError });
        }
      };

      // 名前付きイベント
      const eventTypes = ['menu_update', 'stage_completed', 'search_image_completed'];
      eventTypes.forEach(eventName => {
        eventSource!.addEventListener(eventName, (event: any) => {
          if (isCleanedUp) return;
          
          try {
            const parsedData = JSON.parse(event.data);
            addLog('info', `📨 Named Event: ${eventName}`, parsedData);
            processSSEMessage(parsedData);
          } catch (parseError) {
            addLog('error', `Failed to parse named event: ${eventName}`, { error: parseError });
          }
        });
      });

      eventSource.onerror = (error) => {
        addLog('error', '❌ SSE connection error', error);
        setIsConnected(false);
      };

    } catch (error) {
      addLog('error', 'Failed to create SSE connection', error);
    }

    return () => cleanup('manual_cleanup');
  }, [sessionId]);

  // SSEメッセージ処理（画像データに特化）
  const processSSEMessage = useCallback((data: any) => {
    console.log(`[ImageTest] 🔍 DEBUG: Processing SSE message:`, data);
    
    // 🖼️ 画像検索タスク完了
    if (data.task_type === 'search_image' && data.status === 'completed') {
      console.log(`[ImageTest] ✅ DEBUG: Search image task completed detected`);
      addLog('image_data', `🖼️ Search Image Completed: ${data.original_name || data.item_id}`, data);
      
      if (data.search_engine) {
        console.log(`[ImageTest] 🔍 DEBUG: search_engine field found:`, data.search_engine);
        console.log(`[ImageTest] 🔍 DEBUG: item_id:`, data.item_id);
        
        try {
          const imageUrls = JSON.parse(data.search_engine);
          console.log(`[ImageTest] ✅ DEBUG: JSON.parse successful, parsed:`, imageUrls);
          
          if (Array.isArray(imageUrls)) {
            console.log(`[ImageTest] ✅ DEBUG: Array validation passed, length:`, imageUrls.length);
            
            // State更新をデバッグ
            setReceivedImageUrls(prev => {
              const newState = {
                ...prev,
                [data.item_id]: imageUrls
              };
              console.log(`[ImageTest] 🔄 DEBUG: Updating receivedImageUrls state:`, newState);
              return newState;
            });
            
            addLog('success', `📷 Image URLs received for ${data.original_name}: ${imageUrls.length} images`, {
              item_id: data.item_id,
              urls: imageUrls,
              total_count: imageUrls.length
            });
            
            // コンソールに詳細出力
            console.log(`[ImageTest] 🖼️ IMAGE URLS RECEIVED:`);
            console.log(`  Item: ${data.original_name} (${data.item_id})`);
            console.log(`  Total Images: ${imageUrls.length}`);
            imageUrls.forEach((url: string, idx: number) => {
              console.log(`  Image ${idx + 1}: ${url}`);
            });
            
            // メニューアイテムを更新
            updateMenuItem(data.item_id, {
              image_urls: imageUrls,
              image_url: imageUrls[0] || '',
              search_engine: data.search_engine
            });
          } else {
            console.log(`[ImageTest] ❌ DEBUG: Parsed data is not an array:`, typeof imageUrls, imageUrls);
          }
        } catch (error) {
          console.log(`[ImageTest] ❌ DEBUG: JSON.parse failed:`, error);
          addLog('error', `Failed to parse search_engine JSON for ${data.item_id}`, error);
        }
      } else {
        console.log(`[ImageTest] ❌ DEBUG: No search_engine field found in data`);
      }
    }
    // 🎯 メニューアイテム更新
    else if (data.type === 'menu_update' && data.data) {
      console.log(`[ImageTest] 🔍 DEBUG: Menu update detected`);
      const menuData = data.data;
      addLog('info', `📝 Menu Item Update: ${menuData.original_name || menuData.name}`, menuData);
      processMenuUpdate(menuData);
    }
    // 📋 カテゴライズ結果（初期メニューアイテム作成）
    else if (data.categories && Array.isArray(data.categories)) {
      console.log(`[ImageTest] 🔍 DEBUG: Categorize result detected`);
      addLog('info', `📋 Categorize Result Received`, data);
      const items = data.categories.flatMap((category: any) => category.items || []);
      items.forEach((item: any) => {
        addMenuItem({
          id: item.id,
          name: item.name || '',
          translation: item.translation || '',
          price: item.price || '',
          category: item.category || ''
        });
      });
    }
    else {
      console.log(`[ImageTest] 🔍 DEBUG: Unhandled message type:`, data);
    }
  }, []);

  const addMenuItem = useCallback((item: Partial<MenuItem>) => {
    const newItem: MenuItem = {
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || 'Unknown Item',
      translation: item.translation || '',
      price: item.price || '',
      category: item.category || '',
      image_url: '',
      image_urls: [],
      search_engine: ''
    };
    
    setMenuItems(prev => [...prev, newItem]);
    addLog('info', `➕ Added menu item: ${newItem.name}`);
  }, [addLog]);

  const updateMenuItem = useCallback((itemId: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => {
      const index = prev.findIndex(item => item.id === itemId);
      if (index !== -1) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...updates };
        return updated;
      }
      return prev;
    });
  }, []);

  const processMenuUpdate = useCallback((data: any) => {
    const itemId = data.item_id || data.id;
    if (!itemId) return;

    const updates: Partial<MenuItem> = {
      name: data.name || data.original_name,
      translation: data.translation,
      price: data.price,
      category: data.category
    };

    // search_engineがある場合は画像URLを処理
    if (data.search_engine) {
      try {
        const imageUrls = JSON.parse(data.search_engine);
        if (Array.isArray(imageUrls)) {
          updates.image_urls = imageUrls;
          updates.image_url = imageUrls[0] || '';
          updates.search_engine = data.search_engine;
        }
      } catch (error) {
        addLog('error', `Failed to parse search_engine in menu update for ${itemId}`, error);
      }
    }

    updateMenuItem(itemId, updates);
  }, [addLog, updateMenuItem]);

  const handleConnect = () => {
    if (isConnected) {
      addLog('info', 'Already connected');
      return;
    }

    const cleanup = createImageTestSSEConnection();
    cleanupRef.current = cleanup;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      addLog('info', `📁 File selected: ${file.name} (${Math.round(file.size / 1024)}KB)`);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) {
      addLog('error', 'No file selected');
      return;
    }

    if (!isConnected) {
      addLog('error', 'SSE not connected. Connect first!');
      return;
    }

    setIsProcessing(true);
    addLog('info', '🚀 Starting menu processing...');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const processUrl = `${apiUrl}/api/v1/pipeline/process-with-session?session_id=${encodeURIComponent(sessionId)}`;
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(processUrl, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        addLog('success', '✅ Menu processing started successfully', result);
        addLog('info', '⏳ Waiting for image search results via SSE...');
      } else {
        addLog('error', `❌ API Error: ${response.status} ${response.statusText}`, result);
      }
    } catch (error) {
      addLog('error', `Processing failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🖼️ Image Processing & SSE Test
        </h1>
        <p className="text-gray-600 mb-6">
          画像アップロード → OCR処理 → 画像検索 → SSE経由でのURL受信をテスト
        </p>
        
        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session ID
              </label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                disabled={isConnected}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Connection Status
              </label>
              <div className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium ${
                isConnected 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleConnect}
              disabled={isConnected}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Connect SSE
            </button>
          </div>

          {/* File Upload */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Image Upload & Processing</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Menu Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                {selectedFile && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)}KB)
                  </p>
                )}
              </div>
              
              <button
                onClick={handleStartProcessing}
                disabled={!selectedFile || !isConnected || isProcessing}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-400"
              >
                {isProcessing ? 'Processing...' : 'Start Image Processing Test'}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items with Images */}
        {menuItems.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">🍽️ Menu Items with Images</h2>
              <p className="text-sm text-gray-600 mt-1">
                {menuItems.length} items • {Object.keys(receivedImageUrls).length} with images
              </p>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item, index) => (
                  <div key={item.id} className="relative">
                    <MenuCard
                      item={{
                        id: item.id,
                        name: item.name,
                        translation: item.translation,
                        price: item.price,
                        category: item.category,
                        description: '',
                        allergens: '',
                        ingredients: '',
                        image_url: item.image_url,
                        image_urls: item.image_urls
                      }}
                      onItemClick={(item) => addLog('info', `Menu clicked: ${item.name}`)}
                      onToggleFavorite={(id) => addLog('info', `Favorite: ${id}`)}
                      isFavorite={false}
                      showImages={true}
                      index={index}
                    />
                    {/* Image Count Badge */}
                    {item.image_urls && item.image_urls.length > 0 && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {item.image_urls.length} images
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Received Images Display */}
        {Object.keys(receivedImageUrls).length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">📷 Received Images</h2>
              <p className="text-sm text-gray-600 mt-1">
                SSE経由で受信した画像の表示テスト
              </p>
            </div>
            
            <div className="p-4">
              <div className="space-y-6">
                {Object.entries(receivedImageUrls).map(([itemId, urls]) => {
                  const item = menuItems.find(m => m.id === itemId);
                  return (
                    <div key={itemId} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-4">
                        {item?.name || 'Unknown Item'} - {urls.length} images
                      </h3>
                      
                      {/* 画像グリッド表示 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {urls.map((url, idx) => (
                          <div key={idx} className="relative">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                              <img 
                                src={url}
                                alt={`Image ${idx + 1} for ${item?.name || 'Unknown'}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23f3f4f6"/><text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="Arial" font-size="14" fill="%23666">Failed to load</text></svg>';
                                }}
                              />
                            </div>
                            <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* URL一覧（詳細確認用） */}
                      <details className="mt-4">
                        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                          Show URLs ({urls.length} items)
                        </summary>
                        <div className="mt-2 space-y-1">
                          {urls.map((url, idx) => (
                            <div key={idx} className="text-xs text-gray-500 break-all">
                              <span className="font-medium">#{idx + 1}:</span> {url}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
