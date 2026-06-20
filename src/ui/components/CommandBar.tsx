'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface CommandBarProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export const CommandBar = forwardRef<HTMLDivElement, CommandBarProps>(
  ({ title, children, actions, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `0 ${tokens.spacing.edgePad}`,
          height: '48px',
          background: `linear-gradient(180deg, rgba(12, 14, 26, 0.96) 0%, rgba(6, 6, 12, 0.98) 100%)`,
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: '1px solid transparent',
          boxShadow: `0 1px 0 rgba(212, 175, 55, 0.08) inset, 0 4px 24px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.3)`,
          zIndex: 500,
          fontFamily: tokens.fonts.hud,
          flexShrink: 0,
          ...props.style,
        }}
        {...props}
      >
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent 0%, ${tokens.colors.gold.dim} 15%, ${tokens.colors.gold.primary} 50%, ${tokens.colors.gold.dim} 85%, transparent 100%)`, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: `linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.12), transparent)`, pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: tokens.colors.text.heading }}>
            {title}
          </div>
          {children}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {actions}
        </div>
      </div>
    );
  }
);

CommandBar.displayName = 'CommandBar';