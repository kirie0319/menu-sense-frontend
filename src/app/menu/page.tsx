'use client';

import { Suspense } from 'react';
import { MenuPage } from '@/page-components/MenuPage';

function MenuPageWrapper() {
  return (
    <MenuPage 
      onBackToHome={() => window.location.href = '/'}
      onNavigateToProcess={() => window.location.href = '/process'}
    />
  );
}

export default function Menu() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuPageWrapper />
    </Suspense>
  );
} 