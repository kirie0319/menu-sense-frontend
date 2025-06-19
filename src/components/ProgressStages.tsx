'use client';

import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle, Search, FileText, Globe, BookOpen } from 'lucide-react';
import { useProgressStore } from '@/lib/stores/progressStore';

const ProgressStages = () => {
  const { progressStages } = useProgressStore();

  const getStageIcon = (stage: number) => {
    const iconProps = { className: "h-5 w-5" };
    
    switch (stage) {
      case 1:
        return <Search {...iconProps} />;
      case 2:
        return <FileText {...iconProps} />;
      case 3:
        return <Globe {...iconProps} />;
      case 4:
        return <BookOpen {...iconProps} />;
      case 5:
        return <div className="h-5 w-5 text-lg">🎨</div>;
      case 6:
        return <div className="h-5 w-5 text-lg">✅</div>;
      default:
        return <Clock {...iconProps} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStageStyle = (stage: number, status: string) => {
    const baseClasses = "flex items-center space-x-4 p-4 rounded-lg transition-all duration-300";
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-50 border-2 border-green-200`;
      case 'error':
        return `${baseClasses} bg-red-50 border-2 border-red-200`;
      case 'active':
        return `${baseClasses} bg-blue-50 border-2 border-blue-200 shadow-lg`;
      default:
        return `${baseClasses} bg-gray-50 border-2 border-gray-200`;
    }
  };

  const getTextStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'active':
        return 'text-blue-800';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Progress</h3>
      
      <div className="space-y-3">
        {progressStages.map((stage, index) => (
          <motion.div
            key={stage.stage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={getStageStyle(stage.stage, stage.status)}
          >
            <div className="flex items-center space-x-3">
              {/* ステージアイコン */}
              <div className={`p-2 rounded-full ${
                stage.status === 'completed' ? 'bg-green-100' :
                stage.status === 'error' ? 'bg-red-100' :
                stage.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                {getStageIcon(stage.stage)}
              </div>
              
              {/* ステージ情報 */}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${getTextStyle(stage.status)}`}>
                    Stage {stage.stage}
                  </span>
                  {getStatusIcon(stage.status)}
                </div>
                <p className={`text-sm ${getTextStyle(stage.status)}`}>
                  {stage.message}
                </p>
              </div>
            </div>
            
            {/* 進行状況バー */}
            {stage.status === 'active' && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-1 bg-blue-200 rounded-full overflow-hidden"
              >
                <motion.div
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-full w-1/3 bg-blue-500 rounded-full"
                />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      
      {/* 全体の進捗率 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-medium text-gray-700">
            {Math.round((progressStages.filter(s => s.status === 'completed').length / progressStages.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ 
              width: `${(progressStages.filter(s => s.status === 'completed').length / progressStages.length) * 100}%` 
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProgressStages; 