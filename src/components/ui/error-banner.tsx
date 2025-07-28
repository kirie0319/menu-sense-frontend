import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBannerProps } from '@/types/ui';

const variantConfig = {
  error: {
    containerClass: 'bg-red-50 border-red-200 text-red-800',
    iconBg: 'bg-red-500',
    icon: XCircle,
    buttonClass: 'bg-red-500 hover:bg-red-600'
  },
  warning: {
    containerClass: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    iconBg: 'bg-yellow-500',
    icon: AlertTriangle,
    buttonClass: 'bg-yellow-500 hover:bg-yellow-600'
  },
  info: {
    containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    iconBg: 'bg-blue-500',
    icon: Info,
    buttonClass: 'bg-blue-500 hover:bg-blue-600'
  }
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  onRetry,
  retryText = 'Retry',
  variant = 'error',
  isVisible = true,
  className,
  dismissible = false,
  onDismiss
}) => {
  const config = variantConfig[variant as keyof typeof variantConfig];
  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'border rounded-lg p-4 mb-6',
            config.containerClass,
            className
          )}
        >
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                config.iconBg
              )}>
                <IconComponent className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              {title && (
                <p className="font-medium mb-1">{title}</p>
              )}
              <p className={cn(
                'text-sm',
                title ? 'opacity-90' : 'font-medium'
              )}>
                {message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={cn(
                    'text-white px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    config.buttonClass
                  )}
                >
                  {retryText}
                </button>
              )}
              
              {dismissible && onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 