'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Code, Database, Zap } from 'lucide-react';
// import { useMenuStore } from '@/lib/store'; // REMOVED
// import { useProgressStore } from '@/lib/stores/progressStore'; // REMOVED

interface DebugPanelProps {
  isVisible?: boolean;
  data?: any;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  isVisible = true,
  data = null
}) => {
  // REMOVED: State management dependencies
  // Placeholder data
  const placeholderResult = null;
  const placeholderError = null;
  const placeholderIsLoading = false;
  const placeholderSelectedFile = null;
  const placeholderCurrentStage = 0;
  const placeholderStageData = null;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm"
    >
      <div className="flex items-center gap-2 mb-3 border-b border-gray-700 pb-2">
        <Code className="w-4 h-4" />
        <span className="text-green-300 font-semibold">Debug Panel</span>
        <span className="text-gray-500 text-xs">(State Management Removed)</span>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-blue-400 text-xs mb-1">📁 File Status</div>
            <div className="text-gray-300">
              Selected: {placeholderSelectedFile ? 'Yes' : 'None'}
            </div>
          </div>
          
          <div>
            <div className="text-purple-400 text-xs mb-1">⚡ Processing</div>
            <div className="text-gray-300">
              Loading: {placeholderIsLoading ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        <div>
          <div className="text-yellow-400 text-xs mb-1">🎯 Current Stage</div>
          <div className="text-gray-300">
            Stage: {placeholderCurrentStage} / 6
          </div>
        </div>

        <div>
          <div className="text-orange-400 text-xs mb-1">📊 Stage Data</div>
          <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs text-gray-400">
              {placeholderStageData ? JSON.stringify(placeholderStageData, null, 2) : 'No stage data'}
            </pre>
          </div>
        </div>

        <div>
          <div className="text-green-400 text-xs mb-1">✅ Results</div>
          <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs text-gray-400">
              {placeholderResult ? JSON.stringify(placeholderResult, null, 2) : 'No results'}
            </pre>
          </div>
        </div>

        {placeholderError && (
          <div>
            <div className="text-red-400 text-xs mb-1">❌ Error</div>
            <div className="bg-red-900/20 border border-red-700 rounded p-2">
              <div className="text-red-300 text-xs">{placeholderError}</div>
            </div>
          </div>
        )}

        {/* Custom data passed via props */}
        {data && (
          <div>
            <div className="text-cyan-400 text-xs mb-1">🔍 External Data</div>
            <div className="bg-gray-800 rounded p-2 max-h-32 overflow-y-auto">
              <pre className="text-xs text-gray-400">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700">
          <div className="text-gray-500 text-xs">
            💡 State management removed - using placeholder data
          </div>
        </div>
      </div>
    </motion.div>
  );
};
