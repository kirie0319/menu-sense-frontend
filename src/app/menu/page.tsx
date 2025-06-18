'use client';

import { MenuPage } from '@/components/MenuPage';

export default function Menu() {
  return (
    <MenuPage 
      onBackToHome={() => window.location.href = '/'}
      onNavigateToProcess={() => window.location.href = '/process'}
    />
  );
} 