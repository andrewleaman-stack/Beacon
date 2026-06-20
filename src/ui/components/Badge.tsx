'use client';

import { type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'cyan' | 'live' | 'alert';
  dot?: boolean;
  children: ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  gold: {
    color: tokens.colors.gold.primary,
    background: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  cyan: {
    color: tokens.colors.cyan.primary,
    background: 'rgba(0, 229, 255, 0.06)',
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },
  live: {
    color: tokens.colors.alert.green,
    background: 'rgba(255, 255, 255, 255, 255) rgba(0, 230, 118, 0.06)',
    borderColor: 'rgba(0, 230, 118, 0.15)',
  },
  alert: {
    color: tokens.colors.alert.red,
    background: 'rgba(255, 61, 61, 0.08)',
    borderColor: 'rgba(255, 61, 61, 0.2)',
  },
};

export const Badge = ({ variant = 'gold', dot = false, className = '', children, ...props }: BadgeProps & { children: ReactNode }) => {
  const style = variantStyles[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: dot ? '5px' : 0,
        padding: '2px 8px',
        fontFamily: tokens.fonts.hud,
        fontSize: '7px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: tokens.colors.text.muted,
        background: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${tokens.colors.border.secondary}`,
        borderRadius: '4px',
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
        ...props.style,
      }}
      {...props}
    >
      {dot && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor', marginRight: '5px', flexShrink: 0 }} />}
      {children}
    </span>
  );
};