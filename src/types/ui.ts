import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  variant?: 'center' | 'bottom' | 'bottom-sheet';
  showOverlay?: boolean;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
}

export interface BottomSheetProps extends Omit<ModalProps, 'variant'> {
  snapPoints?: string[];
  initialSnap?: number;
  showHandle?: boolean;
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message?: string;
  onClose?: () => void;
  closable?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost';
  hoverable?: boolean;
}

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: number;
  value?: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
}

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'white' | 'gray';
}

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  variant?: 'error' | 'warning' | 'info';
  isVisible?: boolean;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export interface MenuCardProps {
  item: {
    id: string;
    name: string;
    translation: string;
    price?: string;
    category?: string;
    description?: string;
    allergens?: string;
    ingredients?: string;
    image_url?: string;           // 🖼️ メイン画像URL
    image_urls?: string[];        // 🖼️ 複数画像URL配列
  };
  onItemClick: (item: any) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  showImages?: boolean;
  index?: number;
}
