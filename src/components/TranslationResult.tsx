'use client';

import { motion } from 'framer-motion';
import { FileText, Globe, Utensils, DollarSign } from 'lucide-react';
import { TranslationResponse } from '@/types';

interface TranslationResultProps {
  result: TranslationResponse;
}

const TranslationResult = ({ result }: TranslationResultProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* 抽出されたテキストセクション */}
      {result.extracted_text && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="h-6 w-6 text-blue-500" />
            <h3 className="text-xl font-semibold text-gray-900">Extracted Text</h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {result.extracted_text}
            </pre>
          </div>
        </motion.div>
      )}

      {/* 翻訳されたメニューセクション */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-2 mb-6">
          <Globe className="h-6 w-6 text-green-500" />
          <h3 className="text-xl font-semibold text-gray-900">Translated Menu</h3>
        </div>

        {result.menu_items && result.menu_items.length > 0 ? (
          <div className="space-y-6">
            {result.menu_items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 rounded-r-lg p-6"
              >
                <div className="space-y-3">
                  {/* 日本語名 */}
                  {item.japanese_name && (
                    <div className="flex items-center space-x-2">
                      <Utensils className="h-4 w-4 text-gray-600" />
                      <span className="text-lg font-medium text-gray-900">
                        {item.japanese_name}
                      </span>
                    </div>
                  )}

                  {/* 英語名 */}
                  {item.english_name && (
                    <h4 className="text-xl font-bold text-blue-600">
                      {item.english_name}
                    </h4>
                  )}

                  {/* 説明 */}
                  {item.description && (
                    <p className="text-gray-700 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {/* 価格 */}
                  {item.price && (
                    <div className="flex items-center space-x-2 pt-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600 text-lg">
                        {item.price}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-8"
          >
            <div className="text-gray-400 mb-4">
              <Utensils className="h-16 w-16 mx-auto" />
            </div>
            <p className="text-gray-600">
              {result.message || 'No menu items could be detected. Please try with a clearer image or check if the image contains Japanese text.'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default TranslationResult; 