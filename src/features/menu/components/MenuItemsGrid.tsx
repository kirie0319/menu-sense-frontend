'use client';

import React from 'react';
import { MenuItemsGridProps, SimpleMenuItem, CategoryStructure } from '@/features/menu/types';
import { MenuCard, Grid, EmptyState } from '@/components/ui';

export const MenuItemsGrid: React.FC<MenuItemsGridProps> = ({
  items = [],
  onItemClick = () => {},
  onToggleFavorite = () => {},
  favorites = new Set(),
  showImages = true,
  showPrices = true,
  groupByCategory = false,
  categories = []
}) => {
  // データが存在しない場合はEmptyStateを表示
  if (items.length === 0) {
    return (
      <EmptyState 
        title="No menu items available"
        description="Menu data is being processed. Please wait for the translation to complete."
        icon="🍽️"
      />
    );
  }

  // 複数画像URLを処理する関数
  const getImageUrls = (item: SimpleMenuItem): string[] => {
    const urls: string[] = [];
    
    // image_urls配列がある場合はそれを使用（最優先）
    if (item.image_urls && item.image_urls.length > 0) {
      urls.push(...item.image_urls);
    }
    
    // image_urlがある場合は追加
    if (item.image_url) {
      // JSONとして解析可能かチェック
      if (item.image_url.startsWith('[') || item.image_url.startsWith('{')) {
        try {
          const parsed = JSON.parse(item.image_url);
          if (Array.isArray(parsed)) {
            // JSON配列の場合
            urls.push(...parsed);
          } else if (parsed.urls && Array.isArray(parsed.urls)) {
            // JSONオブジェクトでurlsプロパティがある場合
            urls.push(...parsed.urls);
          } else {
            // その他のJSONオブジェクトの場合はそのまま
            urls.push(item.image_url);
          }
        } catch (e) {
          // JSON解析失敗時はそのままURLとして扱う
          urls.push(item.image_url);
        }
      } else {
        // 単純なURL文字列の場合
        urls.push(item.image_url);
      }
    }
    
    return [...new Set(urls)]; // 重複を除去
  };

  // カテゴリ別グループ表示の場合
  if (groupByCategory && categories.length > 0) {
    const categorizedItems = categories.map(category => ({
      category,
      items: items.filter(item => 
        item.category === category.name || 
        item.category === category.japanese_name
      )
    })).filter(group => group.items.length > 0);

    const uncategorizedItems = items.filter(item => 
      !categories.some(cat => 
        item.category === cat.name || 
        item.category === cat.japanese_name
      )
    );

    return (
      <div className="space-y-8 pb-16 md:pb-20">
        {categorizedItems.map(({ category, items: categoryItems }) => (
          <div key={category.name} className="space-y-4">
            {/* カテゴリヘッダー */}
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {category.japanese_name || category.name}
              </h3>
              {category.name !== category.japanese_name && (
                <p className="text-sm text-gray-500">{category.name}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {categoryItems.length} items
              </p>
            </div>
            
            {/* カテゴリ内アイテム */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {categoryItems.map((item, index) => (
                                 <MenuCard
                   key={item.id || `${category.name}-${index}`}
                   item={item}
                   onItemClick={onItemClick}
                   onToggleFavorite={onToggleFavorite}
                   isFavorite={favorites.has(item.id)}
                   showImages={showImages}
                   index={index}
                 />
              ))}
            </div>
          </div>
        ))}
        
        {/* 未分類アイテム */}
        {uncategorizedItems.length > 0 && (
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-2">
              <h3 className="text-lg font-semibold text-gray-900">その他</h3>
              <p className="text-xs text-gray-400 mt-1">
                {uncategorizedItems.length} items
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 md:gap-4">
                             {uncategorizedItems.map((item, index) => (
                 <MenuCard
                   key={item.id || `uncategorized-${index}`}
                   item={item}
                   onItemClick={onItemClick}
                   onToggleFavorite={onToggleFavorite}
                   isFavorite={favorites.has(item.id)}
                   showImages={showImages}
                   index={index}
                 />
               ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 通常のグリッド表示（カテゴリ別でない場合）
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 pb-16 md:pb-20">
      {items.map((item, index) => (
        <MenuCard
          key={item.id || index}
          item={item}
          onItemClick={onItemClick}
          onToggleFavorite={onToggleFavorite}
          isFavorite={favorites.has(item.id)}
          showImages={showImages}
          index={index}
        />
      ))}
    </div>
  );
};