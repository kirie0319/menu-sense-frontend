'use client';

import { ReactNode, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServerStatus } from '@/features/debug';

interface HeaderProps {
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

const Header = ({
  title = 'MenuSense',
  subtitle,
  showServerStatus = true,
  showMobileMenu = true,
  rightContent,
  centerContent,
  leftContent,
  onServerStatusChange,
  className = '',
  variant = 'default'
}: HeaderProps) => {
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const baseClasses = 'bg-white border-b border-gray-200';
  const variantClasses = {
    default: 'py-4 sm:py-6 md:py-8',
    minimal: 'py-3 sm:py-4 md:py-5',
    compact: 'py-2 sm:py-3 md:py-4'
  };

  const renderLogo = () => (
    <div className="flex items-center space-x-3 sm:space-x-4">
      {leftContent}
      <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
        <span className="text-white text-xl sm:text-2xl">🍽️</span>
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  // 統一されたServerStatusレンダー関数
  const renderServerStatus = (scale?: boolean) => (
    showServerStatus && (
      <div className={scale ? 'scale-75 origin-right' : ''}>
        <ServerStatus onStatusChange={onServerStatusChange} />
      </div>
    )
  );

  return (
    <header className={`${baseClasses} ${variantClasses[variant]} ${className} fixed top-0 left-0 right-0 z-50`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {/* デスクトップレイアウト */}
        <div className="hidden md:flex items-center justify-between">
          {renderLogo()}
          
          {centerContent && (
            <div className="flex-1 mx-8">
              {centerContent}
            </div>
          )}
          
          <div className="flex items-center">
            {rightContent}
          </div>
        </div>

        {/* タブレットレイアウト */}
        <div className="hidden sm:flex md:hidden items-center justify-between">
          {renderLogo()}
          
          {centerContent && (
            <div className="flex-1 mx-6">
              {centerContent}
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            {rightContent || renderServerStatus()}
          </div>
        </div>

        {/* モバイルレイアウト */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {leftContent}
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🍽️</span>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs text-gray-500">{subtitle}</p>
                )}
              </div>
            </div>
            
            {showMobileMenu ? (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                {isMobileMenuOpen ? (
                  <X size={20} className="text-gray-700" />
                ) : (
                  <Menu size={20} className="text-gray-700" />
                )}
              </button>
            ) : (
              rightContent || renderServerStatus(true)
            )}
          </div>
          
          {centerContent && (
            <div className="mt-3">
              {centerContent}
            </div>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
            >
              <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 space-y-4">
                {/* Server Status */}
                {renderServerStatus() && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Server Status</h3>
                    {renderServerStatus()}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Header; 