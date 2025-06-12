'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { MenuTranslationApi } from '@/lib/api';

interface ServerStatusProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

interface HealthCheckResponse {
  status: string;
  version: string;
  services: {
    vision_api: boolean;
    translate_api: boolean;
    openai_api: boolean;
  };
  ping_pong_sessions: number;
}

const ServerStatus = ({ onStatusChange }: ServerStatusProps) => {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [isChecking, setIsChecking] = useState(false);
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkServerHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await MenuTranslationApi.healthCheck();
      setHealthData(response as HealthCheckResponse);
      setStatus('healthy');
      onStatusChange?.(true);
      console.log('[ServerStatus] Health check passed:', response);
    } catch (error) {
      console.error('[ServerStatus] Health check failed:', error);
      setHealthData(null);
      setStatus('error');
      onStatusChange?.(false);
    } finally {
      setIsChecking(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    checkServerHealth();
    
    // 30秒ごとにヘルスチェックを実行
    const interval = setInterval(checkServerHealth, 30000);
    
    return () => clearInterval(interval);
  }, [checkServerHealth]);

  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking server...';
    
    switch (status) {
      case 'healthy':
        if (healthData) {
          const { services } = healthData;
          const readyServices = Object.values(services).filter(Boolean).length;
          const totalServices = Object.keys(services).length;
          return `Backend ready (${readyServices}/${totalServices} APIs)`;
        }
        return 'Backend server is running';
      case 'error':
        return 'Backend server is not responding';
      default:
        return 'Checking server status...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getServiceIcon = (isAvailable: boolean) => {
    return isAvailable 
      ? <CheckCircle className="h-3 w-3 text-green-500" />
      : <XCircle className="h-3 w-3 text-red-500" />;
  };

  const getServiceName = (key: string) => {
    switch (key) {
      case 'vision_api': return 'Vision API';
      case 'translate_api': return 'Google Translate';
      case 'openai_api': return 'OpenAI GPT-4';
      default: return key;
    }
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border text-sm font-medium ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        
        {status === 'healthy' && healthData && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="ml-2 p-1 hover:bg-green-100 rounded transition-colors"
            title="Show API details"
          >
            {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        )}
        
        {status === 'error' && (
          <button
            onClick={checkServerHealth}
            disabled={isChecking}
            className="ml-2 text-xs underline hover:no-underline disabled:opacity-50"
          >
            Retry
          </button>
        )}
      </motion.div>

      {/* 詳細パネル */}
      <AnimatePresence>
        {showDetails && healthData && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">API Services</h3>
                <span className="text-xs text-gray-500">v{healthData.version}</span>
              </div>
              
              {Object.entries(healthData.services).map(([key, isAvailable]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(isAvailable)}
                    <span className="text-sm text-gray-700">{getServiceName(key)}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    isAvailable 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {isAvailable ? 'Ready' : 'Not configured'}
                  </span>
                </div>
              ))}
              
              {healthData.ping_pong_sessions > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>🏓 Active Ping/Pong sessions:</span>
                    <span className="font-medium">{healthData.ping_pong_sessions}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  <div className="font-medium mb-1">🌍 Stage 3 Enhancement:</div>
                  <div className="text-gray-600">
                    {healthData.services.translate_api 
                      ? 'Using Google Translate API for faster translations with OpenAI fallback'
                      : 'Using OpenAI Function Calling for translations'
                    }
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServerStatus; 