'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
  children: ReactNode;
}

export const Grid = ({ columns = 3, className = '', children, ...props }: GridProps) => {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gap: tokens.spacing.panelGap,
        width: '100%',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        ...props.style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};