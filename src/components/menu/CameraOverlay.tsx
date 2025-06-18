'use client';

import React from 'react';
import { X } from 'lucide-react';

interface CameraOverlayProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export const CameraOverlay: React.FC<CameraOverlayProps> = ({ 
  onCapture, 
  onClose 
}) => {
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            カメラで撮影
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-gray-600 mb-4">
              メニューの写真を撮影してください
            </p>
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInput}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
