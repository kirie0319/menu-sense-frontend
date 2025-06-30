'use client';

import React, { useState } from 'react';
import { MenuTranslationDBApi } from '@/lib/api';
import { useHybridDataStore } from '@/lib/stores/hybridDataStore';
import config from '@/lib/config';

export const DBIntegrationTest: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const hybridStore = useHybridDataStore();

  const runTest = async () => {
    setIsLoading(true);
    setTestResult('Testing DB Integration...\n');
    
    try {
      // 1. 設定確認
      setTestResult(prev => prev + `\n1. Configuration Check:\n`);
      setTestResult(prev => prev + `   - DB Enabled: ${config.features.useDatabase}\n`);
      setTestResult(prev => prev + `   - Hybrid Mode: ${config.features.hybridMode}\n`);
      setTestResult(prev => prev + `   - API Enabled: ${config.api.enableDatabaseAPI}\n`);
      
      // 2. DB API接続テスト
      setTestResult(prev => prev + `\n2. Testing DB API Connection:\n`);
      try {
        const testSessionId = `test_${Date.now()}`;
        const response = await MenuTranslationDBApi.createSession(testSessionId, ['テスト']);
        setTestResult(prev => prev + `   ✅ Session created: ${response.session_id}\n`);
        
        // 3. セッション取得テスト
        const session = await MenuTranslationDBApi.getSession(testSessionId);
        if (session) {
          setTestResult(prev => prev + `   ✅ Session retrieved successfully\n`);
        } else {
          setTestResult(prev => prev + `   ❌ Failed to retrieve session\n`);
        }
      } catch (error) {
        setTestResult(prev => prev + `   ❌ DB API Error: ${error}\n`);
      }
      
      // 4. ハイブリッドストアテスト
      setTestResult(prev => prev + `\n3. Testing Hybrid Store:\n`);
      const testKey = 'test:123';
      hybridStore.setSSEData(testKey, { test: true, timestamp: Date.now() });
      const dataSource = hybridStore.getDataSource(testKey);
      setTestResult(prev => prev + `   - Data source for ${testKey}: ${dataSource}\n`);
      
      setTestResult(prev => prev + `\n✅ Test completed!`);
      
    } catch (error) {
      setTestResult(prev => prev + `\n❌ Test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!config.debugging.showDataSource) {
    return null; // デバッグモードでない場合は表示しない
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md z-50">
      <h3 className="text-lg font-bold mb-2">DB Integration Test</h3>
      <button
        onClick={runTest}
        disabled={isLoading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400 mb-2"
      >
        {isLoading ? 'Testing...' : 'Run Test'}
      </button>
      <pre className="text-xs bg-gray-100 p-2 rounded max-h-64 overflow-auto">
        {testResult || 'Click "Run Test" to start'}
      </pre>
    </div>
  );
}; 