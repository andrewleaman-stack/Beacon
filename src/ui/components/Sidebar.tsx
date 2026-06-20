'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface SidebarProps extends HTMLAttributes<HTMLAsideElement> {
  width?: number;
  children: ReactNode;
}

export const Sidebar = forwardRef<HTMLAsideElement, SidebarProps>(
  ({ width = 280, className = '', children, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          height: '100%',
          background: `linear-gradient(180deg, ${tokens.colors.bg.primary} 0%, ${tokens.colors.bg.secondary} 100%)`,
          borderRight: `1px solid ${tokens.colors.border.secondary}`,
          overflowY: 'auto',
          overflowX: 'hidden',
          flexShrink: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: `${tokens.colors.border.primary} transparent`,
          ...props.style,
        }}
        {...props}
      >
        {children}
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';