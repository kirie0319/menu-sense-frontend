'use client';

import { MenuPage } from '@/page-components/MenuPage';

export default function Menu() {
  return (
    <MenuPage 
      onBackToHome={() => window.location.href = '/'}
      onNavigateToProcess={() => window.location.href = '/process'}
    />
  );
} 