'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { useProgressStore } from '@/lib/stores/progressStore';

const ProgressStages = () => {
  const { progressStages } = useProgressStore();

  const burgerStages = [
    { id: 1, name: "Preparing Buns", emoji: "🍞", layer: "bottom-bun" },
    { id: 2, name: "Grilling Patty", emoji: "🥩", layer: "patty" },
    { id: 3, name: "Preparing Vegetables", emoji: "🥬", layer: "lettuce" },
    { id: 4, name: "Melting Cheese", emoji: "🧀", layer: "cheese" },
    { id: 5, name: "Preparing Sauce", emoji: "🥫", layer: "sauce" },
    { id: 6, name: "Assembling Burger", emoji: "🍔", layer: "top-bun" }
  ];

  const getBurgerLayer = (stageId: number, isCompleted: boolean, isActive: boolean) => {
    const layerVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.8 },
      visible: { 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: { 
          type: "spring" as const, 
          damping: 15, 
          stiffness: 300,
          delay: 0.3 
        }
      },
      bounce: {
        scale: [1, 1.1, 1],
        transition: { 
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse" as const
        }
      }
    };

    const getLayerStyle = () => {
      switch (stageId) {
        case 1: // Bottom Bun
          return "w-20 h-6 bg-gradient-to-b from-yellow-600 to-yellow-700 rounded-full shadow-lg";
        case 2: // Patty
          return "w-16 h-4 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full shadow-md mt-1";
        case 3: // Lettuce
          return "w-18 h-3 bg-gradient-to-b from-green-400 to-green-500 rounded-full shadow-sm mt-1";
        case 4: // Cheese
          return "w-17 h-2 bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-full shadow-sm mt-1";
        case 5: // Sauce
          return "w-15 h-1 bg-gradient-to-b from-red-500 to-red-600 rounded-full shadow-sm mt-1";
        case 6: // Top Bun
          return "w-20 h-6 bg-gradient-to-b from-yellow-500 to-yellow-600 rounded-full shadow-lg mt-1";
        default:
          return "";
      }
    };

    if (!isCompleted && !isActive) return null;

    return (
      <motion.div
        variants={layerVariants}
        initial="hidden"
        animate={isActive ? "bounce" : "visible"}
        className={getLayerStyle()}
      />
    );
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
            className="h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full"
          />
        );
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStageStyle = (status: string) => {
    const baseClasses = "flex items-center justify-between p-4 rounded-xl transition-all duration-300";
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-50 border-2 border-green-200 shadow-sm`;
      case 'error':
        return `${baseClasses} bg-red-50 border-2 border-red-200 shadow-sm`;
      case 'active':
        return `${baseClasses} bg-orange-50 border-2 border-orange-200 shadow-lg transform scale-105`;
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
        return 'text-orange-800';
      default:
        return 'text-gray-600';
    }
  };

  const completedStages = progressStages.filter(s => s.status === 'completed').length;
  const progressPercentage = Math.round((completedStages / progressStages.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ヘッダー */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">🍔 Cooking Your Menu</h3>
        <p className="text-gray-600">Watch your burger being assembled step by step!</p>
      </div>
      
      {/* ハンバーガーアニメーション */}
      <div className="flex justify-center items-end min-h-[200px] bg-gradient-to-b from-sky-100 to-green-100 rounded-2xl p-8 relative overflow-hidden">
        {/* キッチン背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-green-50 opacity-50"></div>
        
        {/* グリル効果 */}
        {progressStages[1]?.status === 'active' && (
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute bottom-4 w-24 h-2 bg-red-400 rounded-full blur-sm"
          />
        )}
        
        {/* ハンバーガーの組み立て */}
        <div className="flex flex-col-reverse items-center space-y-reverse space-y-1 relative z-10">
          <AnimatePresence>
            {burgerStages.map((stage, index) => {
              const stageData = progressStages[index];
              const isCompleted = stageData?.status === 'completed';
              const isActive = stageData?.status === 'active';
              
              return (
                <div key={stage.id}>
                  {getBurgerLayer(stage.id, isCompleted, isActive)}
                </div>
              );
            })}
          </AnimatePresence>
          
          {/* 完成エフェクト */}
          {progressPercentage === 100 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute -top-8 text-4xl"
            >
              ✨
            </motion.div>
          )}
        </div>
        
        {/* 煙エフェクト */}
        {(progressStages[1]?.status === 'active' || progressStages[1]?.status === 'completed') && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -30],
                  opacity: [0.6, 0],
                  scale: [0.5, 1.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeOut"
                }}
                className="absolute w-4 h-4 bg-gray-300 rounded-full blur-sm"
                style={{ left: `${i * 10}px` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ステージリスト */}
      <div className="space-y-3">
        {progressStages.map((stage, index) => {
          const burgerStage = burgerStages[index];
          
          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={getStageStyle(stage.status)}
            >
              <div className="flex items-center space-x-4">
                {/* ステージアイコン */}
                <div className={`p-3 rounded-full text-2xl ${
                  stage.status === 'completed' ? 'bg-green-100' :
                  stage.status === 'error' ? 'bg-red-100' :
                  stage.status === 'active' ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  {burgerStage?.emoji}
                </div>
                
                {/* ステージ情報 */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold text-lg ${getTextStyle(stage.status)}`}>
                      {burgerStage?.name}
                    </span>
                  </div>
                  <p className={`text-sm ${getTextStyle(stage.status)} opacity-80`}>
                    {stage.message}
                  </p>
                </div>
              </div>
              
              {/* ステータスアイコン */}
              <div className="flex items-center">
                {getStatusIcon(stage.status)}
              </div>
              
              {/* アクティブステージの進行バー */}
              {stage.status === 'active' && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="absolute bottom-0 left-0 h-1 bg-orange-300 rounded-b-xl overflow-hidden"
                >
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-full w-1/2 bg-orange-500"
                  />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
      
      {/* 全体の進捗率 */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
        <div className="flex justify-between items-center mb-3">
          <span className="text-lg font-semibold text-gray-800">Cooking Progress</span>
          <span className="text-2xl font-bold text-orange-600">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-orange-400 to-red-500 h-3 rounded-full relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ 
              width: `${progressPercentage}%` 
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* プログレスバーのキラキラエフェクト */}
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              style={{ width: '30%' }}
            />
          </motion.div>
        </div>
        
        {progressPercentage === 100 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            <p className="text-green-600 font-semibold text-lg">
              🎉 Your menu is ready to serve! 🍔
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ProgressStages; 