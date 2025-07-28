import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/types/ui';

const buttonVariants = {
  primary: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  icon: 'p-2 text-gray-600 hover:bg-gray-100 focus:ring-gray-500 rounded-full'
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]',
        variant !== 'icon' && buttonSizes[size],
        buttonVariants[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {leftIcon}
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : null}
      {children}
      {rightIcon}
    </button>
  );
};
