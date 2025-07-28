'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { checkPipelineHealth } from '@/lib/health';

interface ServerStatusProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

const ServerStatus = ({ onStatusChange }: ServerStatusProps) => {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [isChecking, setIsChecking] = useState(false);

  const checkServerHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      await checkPipelineHealth();
      setStatus('healthy');
      onStatusChange?.(true);
    } catch (error) {
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
        return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    
    switch (status) {
      case 'healthy':
        return 'Server Online';
      case 'error':
        return 'Server Offline';
      default:
        return 'Checking...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div 
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${getStatusColor()}`}
      title={status === 'error' ? 'Click to retry' : undefined}
      onClick={status === 'error' ? checkServerHealth : undefined}
      style={{ cursor: status === 'error' ? 'pointer' : 'default' }}
    >
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
};

export default ServerStatus; 