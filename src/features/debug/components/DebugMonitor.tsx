'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Zap, AlertTriangle, CheckCircle, Clock, X, Activity } from 'lucide-react';
// import { API_BASE_URL } from '@/lib/api'; // REMOVED

interface DebugMonitorProps {
  isVisible?: boolean;
  onToggle?: () => void;
  sessionId?: string;
}

interface DebugEvent {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  data?: any;
}

const DebugMonitor: React.FC<DebugMonitorProps> = ({ 
  isVisible = false, 
  onToggle = () => {}, 
  sessionId 
}) => {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [serverHealth, setServerHealth] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

  // REMOVED: EventSource and health check functionality
  // Placeholder implementation

  const addEvent = useCallback((type: DebugEvent['type'], message: string, data?: any) => {
    const newEvent: DebugEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      data
    };
    
    setEvents(prev => [newEvent, ...prev.slice(0, 99)]); // Keep last 100 events
  }, []);

  useEffect(() => {
    if (isVisible) {
      addEvent('info', 'Debug Monitor initialized (placeholder mode)');
    }
  }, [isVisible, addEvent]);

  const clearEvents = () => {
    setEvents([]);
    addEvent('info', 'Event log cleared');
  };

  const getEventIcon = (type: DebugEvent['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getEventColor = (type: DebugEvent['type']) => {
    switch (type) {
      case 'success': return 'border-l-green-500 bg-green-50';
      case 'warning': return 'border-l-yellow-500 bg-yellow-50';
      case 'error': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      default: return 'text-red-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <motion.button
        onClick={onToggle}
        className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
          isVisible 
            ? 'bg-orange-500 text-white' 
            : 'bg-white text-gray-600 hover:bg-gray-50'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-96 max-h-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Debug Monitor</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                  <span className="text-xs text-gray-500 capitalize">{connectionStatus}</span>
                </div>
              </div>
              
              {/* Status Info */}
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                <div>Session: {sessionId || 'None'}</div>
                <div>Server: <span className={`font-medium ${serverHealth === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>{serverHealth}</span></div>
                <div>Events: {events.length}</div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-2 border-b border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={clearEvents}
                  className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
                {/* REMOVED: Ping button and other server interactions */}
                <button
                  onClick={() => addEvent('info', 'Manual test event')}
                  className="flex-1 px-3 py-1 text-xs bg-blue-200 text-blue-700 rounded hover:bg-blue-300 transition-colors"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Events List */}
            <div className="max-h-64 overflow-y-auto">
              {events.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No debug events yet
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {events.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-2 border-l-4 rounded-r ${getEventColor(event.type)}`}
                    >
                      <div className="flex items-start space-x-2">
                        {getEventIcon(event.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {event.message}
                          </div>
                          <div className="text-xs text-gray-500">
                            {event.timestamp.toLocaleTimeString()}
                          </div>
                          {event.data && (
                            <details className="mt-1">
                              <summary className="text-xs text-gray-600 cursor-pointer">Data</summary>
                              <pre className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebugMonitor; 