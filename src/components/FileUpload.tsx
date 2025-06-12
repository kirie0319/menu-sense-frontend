'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslationStore } from '@/lib/store';
import { validateFile, formatFileSize } from '@/lib/utils';
import clsx from 'clsx';

const FileUpload = () => {
  const { selectedFile, setFile, isLoading } = useTranslationStore();
  const [validationError, setValidationError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setValidationError(null);
    
    if (rejectedFiles.length > 0) {
      setValidationError('File was rejected. Please check the file format and size.');
      return;
    }
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file');
        return;
      }
      
      setFile(file);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false,
    disabled: isLoading,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropRejected: (files: FileRejection[]) => {
      const errors = files.map(f => f.errors.map(e => e.message).join(', ')).join('; ');
      setValidationError(errors);
    }
  });

  const removeFile = () => {
    setFile(null);
    setValidationError(null);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {selectedFile ? (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <ImageIcon className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* 画像プレビュー */}
              <div className="mt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="max-w-full max-h-64 mx-auto rounded-lg shadow-md object-contain"
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={clsx(
                'border-4 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300',
                {
                  'border-blue-400 bg-blue-50': isDragActive,
                  'border-gray-300 hover:border-blue-400 hover:bg-gray-50': !isDragActive && !isLoading,
                  'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50': isLoading
                }
              )}
            >
              <input {...getInputProps()} />
              
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center space-y-4"
              >
              <div className={clsx(
                'p-4 rounded-full',
                isDragActive ? 'bg-blue-100' : 'bg-gray-100'
              )}>
                <Upload className={clsx(
                  'h-12 w-12',
                  isDragActive ? 'text-blue-500' : 'text-gray-400'
                )} />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isDragActive ? 'Drop your menu image here' : 'Upload Menu Image'}
                </h3>
                <p className="text-gray-600 mb-2">
                  Drag & drop your Japanese restaurant menu image, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, GIF files (max 10MB)
                </p>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading}
              >
                Choose File
              </motion.button>
              </motion.div>
            </div>
          </motion.div>
                  )}
        </AnimatePresence>
        
        {/* バリデーションエラーメッセージ */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3"
            >
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Upload Error</h4>
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
              <button
                onClick={() => setValidationError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

export default FileUpload; 