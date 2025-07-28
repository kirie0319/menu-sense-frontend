import React from 'react';
import { cn } from '@/lib/utils';

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

const gridColsMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
};

const gridGapMap = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8'
};

export const Grid: React.FC<GridProps> = ({
  cols = 3,
  gap = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'grid',
        gridColsMap[cols],
        gridGapMap[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No items available",
  description = "Please try selecting a different category.",
  icon = "🍽️"
}) => {
  return (
    <div className="text-center py-12">
      <div className="text-gray-400 text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}; 