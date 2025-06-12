'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Activity, Wifi, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

interface DebugLog {
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  stage?: number;
  message: string;
  data?: unknown;
}

interface NetworkStatus {
  sseConnected: boolean;
  lastHeartbeat: string | null;
  connectionDuration: number;
  messagesReceived: number;
  errorsCount: number;
  pingsReceived: number;
  pongsSent: number;
  lastPing: string | null;
  lastPong: string | null;
}

interface DebugMonitorProps {
  sessionId?: string;
  isVisible: boolean;
  onToggle: () => void;
}

const DebugMonitor = ({ sessionId, isVisible, onToggle }: DebugMonitorProps) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    sseConnected: false,
    lastHeartbeat: null,
    connectionDuration: 0,
    messagesReceived: 0,
    errorsCount: 0,
    pingsReceived: 0,
    pongsSent: 0,
    lastPing: null,
    lastPong: null
  });
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [stageTimings, setStageTimings] = useState<Record<number, { start: number; duration?: number }>>({});

  // ログ追加関数
  const addLog = (type: DebugLog['type'], message: string, stage?: number, data?: unknown) => {
    const newLog: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      stage,
      message,
      data
    };
    
    setLogs(prev => [...prev.slice(-99), newLog]); // 最新100件を保持
    console.log(`[DebugMonitor] ${type.toUpperCase()}: ${message}`, data);
  };

  // SSE接続監視
  useEffect(() => {
    if (!sessionId) return;

    addLog('info', `Starting SSE monitoring for session: ${sessionId}`);
    
    const eventSource = new EventSource(`${API_BASE_URL}/progress/${sessionId}`);
    const connectionStart = Date.now();
    
    setNetworkStatus(prev => ({
      ...prev,
      sseConnected: true,
      connectionDuration: 0
    }));

    // 接続時間の更新
    const durationInterval = setInterval(() => {
      setNetworkStatus(prev => ({
        ...prev,
        connectionDuration: Date.now() - connectionStart
      }));
    }, 1000);

    eventSource.onopen = (event) => {
      addLog('success', 'SSE connection established', undefined, event);
      setNetworkStatus(prev => ({ ...prev, sseConnected: true }));
    };

    eventSource.onmessage = (event) => {
      const now = new Date().toLocaleTimeString();
      setNetworkStatus(prev => ({
        ...prev,
        lastHeartbeat: now,
        messagesReceived: prev.messagesReceived + 1
      }));

      try {
        const data = JSON.parse(event.data);
        
        // Pingメッセージの検知
        if (data.type === 'ping') {
          const now = new Date().toLocaleTimeString();
          setNetworkStatus(prev => ({
            ...prev,
            pingsReceived: prev.pingsReceived + 1,
            lastPing: now
          }));
          addLog('info', `Ping received from server`, undefined, { timestamp: data.timestamp });
          
          // Pongを送信 (非同期)
          if (sessionId) {
            fetch(`${API_BASE_URL}/pong/${sessionId}`, { method: 'POST' })
              .then(() => {
                const pongTime = new Date().toLocaleTimeString();
                setNetworkStatus(prev => ({
                  ...prev,
                  pongsSent: prev.pongsSent + 1,
                  lastPong: pongTime
                }));
                addLog('success', `Pong sent successfully`, undefined, { pongTime });
              })
              .catch(error => {
                addLog('error', `Failed to send Pong: ${error}`, undefined, error);
              });
          }
          return;
        }
        
        const { stage, status, message } = data;
        
        // Stage変更の追跡
        if (stage !== currentStage) {
          if (currentStage > 0 && stageTimings[currentStage]) {
            setStageTimings(prev => ({
              ...prev,
              [currentStage]: {
                ...prev[currentStage],
                duration: Date.now() - prev[currentStage].start
              }
            }));
          }
          
          setStageTimings(prev => ({
            ...prev,
            [stage]: { start: Date.now() }
          }));
          
          setCurrentStage(stage);
          addLog('info', `Stage transition: ${currentStage} → ${stage}`, stage);
        }

        // ステータス別ログ
        if (status === 'error') {
          addLog('error', `Stage ${stage} error: ${message}`, stage, data);
          setNetworkStatus(prev => ({ ...prev, errorsCount: prev.errorsCount + 1 }));
        } else if (status === 'completed') {
          addLog('success', `Stage ${stage} completed: ${message}`, stage, data);
        } else if (status === 'active') {
          addLog('info', `Stage ${stage} active: ${message}`, stage, data);
        }

        // Stage 3の詳細監視（Google Translate強化）
        if (stage === 3) {
          if (data.processing_category) {
            addLog('info', `Translating category: ${data.processing_category}`, 3);
          }
          
          if (data.progress_percent) {
            addLog('info', `Stage 3 progress: ${data.progress_percent}%`, 3);
          }
          
          if (data.translation_method) {
            if (data.translation_method === 'google_translate') {
              addLog('success', `Using Google Translate API for fast translations`, 3, { method: 'google_translate' });
            } else if (data.translation_method === 'openai_fallback') {
              addLog('warning', `Fallback to OpenAI Function Calling`, 3, { method: 'openai_fallback' });
            }
          }
        }

        // Stage 4の詳細監視
        if (stage === 4) {
          if (data.processing_category) {
            addLog('info', `Processing category: ${data.processing_category}`, 4);
          }
          
          if (data.category_completed) {
            addLog('success', `Category completed: ${data.category_completed}`, 4);
          }
          
          if (data.progress_percent) {
            addLog('info', `Stage 4 progress: ${data.progress_percent}%`, 4);
          }
          
          if (data.chunk_progress) {
            addLog('info', `Chunk progress: ${data.chunk_progress}`, 4);
          }
          
          if (data.partial_results || data.partial_menu) {
            const partialData = data.partial_results || data.partial_menu;
            addLog('info', `Partial results received: ${Object.keys(partialData).length} categories`, 4);
          }
          
          if (data.heartbeat) {
            addLog('info', `Heartbeat received: ${data.elapsed_time || 'no timing'}`, 4);
          }
        }

      } catch (error) {
        addLog('error', `Failed to parse SSE message: ${error}`, undefined, { rawData: event.data });
      }
    };

    eventSource.onerror = (error) => {
      addLog('error', 'SSE connection error', undefined, error);
      setNetworkStatus(prev => ({
        ...prev,
        sseConnected: false,
        errorsCount: prev.errorsCount + 1
      }));
    };

    return () => {
      clearInterval(durationInterval);
      eventSource.close();
      addLog('info', 'SSE connection closed');
      setNetworkStatus(prev => ({ ...prev, sseConnected: false }));
    };
  }, [sessionId, currentStage, stageTimings]);

  // ネットワーク接続テスト
  const testConnection = async () => {
    addLog('info', 'Testing backend connection...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        addLog('success', 'Backend health check passed', undefined, data);
      } else {
        addLog('warning', `Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      addLog('error', 'Backend connection failed', undefined, error);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const getLogIcon = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isVisible) {
    return (
      <motion.button
        onClick={onToggle}
        className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bug className="h-5 w-5" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-4 right-4 w-96 max-h-[80vh] bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
    >
      {/* ヘッダー */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bug className="h-5 w-5" />
          <span className="font-semibold">Debug Monitor</span>
        </div>
        <button
          onClick={onToggle}
          className="text-gray-300 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ネットワーク状態 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Network Status</span>
          <button
            onClick={testConnection}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            Test Connection
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center space-x-2">
            <Wifi className={`h-4 w-4 ${networkStatus.sseConnected ? 'text-green-500' : 'text-red-500'}`} />
            <span>SSE: {networkStatus.sseConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span>Duration: {formatDuration(networkStatus.connectionDuration)}</span>
          </div>
          
          <div className="text-gray-600">
            Messages: {networkStatus.messagesReceived}
          </div>
          
          <div className="text-gray-600">
            Errors: {networkStatus.errorsCount}
          </div>
          
          <div className="text-gray-600">
            🏓 Pings: {networkStatus.pingsReceived}
          </div>
          
          <div className="text-gray-600">
            📤 Pongs: {networkStatus.pongsSent}
          </div>
          
          {networkStatus.lastHeartbeat && (
            <div className="col-span-2 text-xs text-gray-500">
              Last heartbeat: {networkStatus.lastHeartbeat}
            </div>
          )}
          
          {networkStatus.lastPing && (
            <div className="col-span-2 text-xs text-gray-500">
              🏓 Last ping: {networkStatus.lastPing}
            </div>
          )}
          
          {networkStatus.lastPong && (
            <div className="col-span-2 text-xs text-gray-500">
              📤 Last pong: {networkStatus.lastPong}
            </div>
          )}
        </div>
      </div>

      {/* Stage タイミング */}
      {Object.keys(stageTimings).length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <span className="font-medium mb-2 block">Stage Timings</span>
          <div className="space-y-1 text-sm">
            {Object.entries(stageTimings).map(([stage, timing]) => (
              <div key={stage} className="flex justify-between">
                <span>Stage {stage}:</span>
                <span className={timing.duration ? 'text-green-600' : 'text-blue-600'}>
                  {timing.duration ? formatDuration(timing.duration) : 'In progress...'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ログ */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Debug Logs</span>
          <button
            onClick={() => setLogs([])}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
        </div>
        
        <div className="space-y-1 max-h-64 overflow-y-auto text-xs">
          <AnimatePresence>
            {logs.slice(-20).map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex items-start space-x-2 p-2 rounded ${
                  log.type === 'error' ? 'bg-red-50' :
                  log.type === 'warning' ? 'bg-yellow-50' :
                  log.type === 'success' ? 'bg-green-50' :
                  'bg-gray-50'
                }`}
              >
                {getLogIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">{log.timestamp}</span>
                    {log.stage && (
                      <span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        S{log.stage}
                      </span>
                    )}
                  </div>
                  <div className={`break-words ${
                    log.type === 'error' ? 'text-red-700' :
                    log.type === 'warning' ? 'text-yellow-700' :
                    log.type === 'success' ? 'text-green-700' :
                    'text-gray-700'
                  }`}>
                    {log.message}
                  </div>
                  {log.data != null && (
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">Data:</span> {typeof log.data === 'object' 
                        ? `${Object.keys(log.data as Record<string, unknown>).length} properties` 
                        : 'data available'}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default DebugMonitor; 