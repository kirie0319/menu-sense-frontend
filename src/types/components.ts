import React, { ReactNode } from 'react';

// ServerStatus component types
export interface ServerStatusProps {
  onStatusChange?: (isHealthy: boolean) => void;
}

// Header component types  
export interface HeaderProps {
  // ページ固有の情報
  title?: string;
  subtitle?: string;
  showServerStatus?: boolean;
  showMobileMenu?: boolean; // モバイルメニューの表示制御
  
  // カスタマイズ可能な部分
  rightContent?: ReactNode;
  centerContent?: ReactNode;
  leftContent?: ReactNode; // 戻るボタンなどのためのleftContent
  
  // サーバーステータス関連
  onServerStatusChange?: (isHealthy: boolean) => void;
  
  // スタイリング
  className?: string;
  variant?: 'default' | 'minimal' | 'compact';
}

// CameraCapture component types
export interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isOpen: boolean;
}

 