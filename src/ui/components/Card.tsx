'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'cyan' | 'alert';
  interactive?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', interactive = false, className = '', children, ...props }, ref) => {
    const borderColor = {
      default: tokens.colors.gold.dim,
      cyan: tokens.colors.cyan.dim,
      alert: 'rgba(255, 61, 61, 0.4)',
    }[variant];

    const hoverBorderColor = {
      default: tokens.colors.gold.primary,
      cyan: tokens.colors.cyan.primary,
      alert: tokens.colors.alert.red,
    }[variant];

    const hoverShadow = {
      default: tokens.shadows.panelHover,
      cyan: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(0, 229, 255, 0.05), 0 1px 0 rgba(0, 229, 255, 0.06) inset',
      alert: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 61, 61, 0.06)',
    }[variant];

    const baseStyles: React.CSSProperties = {
      position: 'relative',
      padding: '20px 22px',
      background: tokens.colors.bg.panel,
      backdropFilter: 'blur(16px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
      border: `1px solid ${tokens.colors.border.secondary}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: tokens.borderRadius.card,
      boxShadow: tokens.shadows.panel,
      transition: interactive
        ? `transform ${tokens.transitions.spring}, box-shadow ${tokens.transitions.slow}, border-color ${tokens.transitions.normal}`
        : 'none',
      willChange: interactive ? 'transform' : 'auto',
    };

    const hoverStyles: React.CSSProperties = interactive
      ? {
          transform: 'translateY(-2px)',
          borderLeftColor: hoverBorderColor,
          boxShadow: hoverShadow,
        }
      : {};

    return (
      <div
        ref={ref}
        className={className}
        style={{
          ...baseStyles,
          ...(interactive ? hoverStyles : {}),
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';