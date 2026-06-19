'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { tokens } from '@/ui/tokens';

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'classified';
  children: React.ReactNode;
}

const variantStyles: Record<string, React.CSSProperties> = {
  critical: {
    color: '#FF3D3D',
    background: 'rgba(255, 61, 61, 0.1)',
    borderColor: 'rgba(255, 61, 61, 0.25)',
    boxShadow: '0 0 8px rgba(255, 61, 61, 0.1)',
  },
  high: {
    color: '#FF9500',
    background: 'rgba(255, 149, 0, 0.08)',
    borderColor: 'rgba(255, 149, 0, 0.2)',
    boxShadow: '0 0 6px rgba(255, 149, 0, 0.08)',
  },
  medium: {
    color: '#D4AF37',
    background: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.18)',
  },
  low: {
    color: '#00E676',
    background: 'rgba(0, 230, 118, 0.07)',
    borderColor: 'rgba(0, 230, 118, 0.15)',
  },
  info: {
    color: '#00E5FF',
    background: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  classified: {
    color: '#D4AF37',
    background: 'rgba(212, 175, 55, 0.08)',
    borderColor: 'rgba(212, 175, 55, 0.25)',
    letterSpacing: '0.2em',
  },
};

const hoverStyles: Record<string, React.CSSProperties> = {
  critical: {
    background: 'rgba(255, 61, 61, 0.15)',
    borderColor: 'rgba(255, 61, 61, 0.35)',
    boxShadow: '0 0 14px rgba(255, 61, 61, 0.15)',
  },
  high: {
    background: 'rgba(255, 149, 0, 0.13)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
    boxShadow: '0 0 12px rgba(255, 149, 0, 0.12)',
  },
  medium: {
    background: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 5, 55, 0.28)',
  },
  low: {
    background: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  info: {
    background: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  classified: {
    background: 'rgba(212, 175, 55, 0.12)',
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
};

interface TagProps {
  variant?: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'classified';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Tag = ({ variant = 'medium', children, className = '', onClick, ...props }: TagProps) => {
  const style = variantStyles[variant];
  const hover = hoverStyles[variant];

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        fontFamily: tokens.fonts.hud,
        fontSize: '8px',
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: tokens.colors.text.secondary,
        background: 'rgba(255, 255, 255, 0.04)',
        border: `1px solid ${tokens.colors.border.secondary}`,
        borderRadius: '100px',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease',
        userSelect: 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
        ...props.style,
      }}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, hover)}
      onMouseLeave={(e) => Object.assign(e.currentTarget.style, style)}
      onClick={onClick}
      {...props}
    >
      {children}
    </span>
  );
};