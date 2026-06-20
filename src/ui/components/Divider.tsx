'use client';

import { type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface DividerProps {
  variant?: 'default' | 'cyan' | 'plain';
  label?: ReactNode;
  className?: string;
}

export const Divider = ({ variant = 'default', label, className = '' }: DividerProps) => {
  const isPlain = variant === 'plain';
  const isCyan = variant === 'cyan';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: isPlain ? '1px' : '24px',
        margin: isPlain ? '12px 0' : '8px 0',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: isPlain ? 0 : '50%',
          left: 0,
          right: 0,
          height: '1px',
          background: isCyan
            ? `linear-gradient(90deg, transparent 0%, ${tokens.colors.border.cyan} 20%, ${tokens.colors.cyan.dim} 50%, ${tokens.colors.border.cyan} 80%, transparent 100%)`
            : `linear-gradient(90deg, transparent 0%, ${tokens.colors.border.primary} 20%, ${tokens.colors.gold.dim} 50%, ${tokens.colors.border.primary} 80%, transparent 100%)`,
          pointerEvents: 'none',
        }}
      />
      {label && !isPlain && (
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '0 14px',
            background: tokens.colors.bg.secondary,
            fontFamily: tokens.fonts.hud,
            fontSize: '7px',
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: tokens.colors.text.muted,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
};