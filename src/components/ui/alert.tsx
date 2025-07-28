import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertProps } from '@/types/ui';

const alertVariants = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800'
};

const defaultIcons = {
  success: <CheckCircle className="h-5 w-5" />,
  error: <AlertCircle className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  dismissible = false,
  onDismiss,
  icon,
  className
}) => {
  const displayIcon = icon || defaultIcons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'border-2 rounded-xl p-4 md:p-6 shadow-lg',
        alertVariants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {displayIcon && (
            <div className="flex-shrink-0 mt-0.5">
              {displayIcon}
            </div>
          )}
          <div className="flex-1">
            {title && (
              <h3 className="font-semibold text-base md:text-lg mb-1">
                {title}
              </h3>
            )}
            <p className="text-sm md:text-base">{message}</p>
          </div>
        </div>
        
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-2 hover:bg-black/10 rounded-lg transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}; 