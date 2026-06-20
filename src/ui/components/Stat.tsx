'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface StatProps extends HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label: string;
  variant?: 'gold' | 'cyan' | 'alert';
  delta?: string | number;
  deltaNegative?: boolean;
  compact?: boolean;
  children?: ReactNode;
}

export const Stat = forwardRef<HTMLDivElement, StatProps>(
  ({ value, label, variant = 'gold', delta, deltaNegative, compact = false, className = '', children, ...props }, ref) => {
    const valueColor = {
      gold: tokens.colors.gold.primary,
      cyan: tokens.colors.cyan.primary,
      alert: tokens.colors.alert.red,
    }[variant];

    const valueShadow = {
      gold: tokens.shadows.statValueGold,
      cyan: tokens.shadows.statValueCyan,
      alert: tokens.shadows.statValueAlert,
    }[variant];

    const hoverShadow = {
      gold: tokens.shadows.statValueGoldHover,
      cyan: tokens.shadows.statValueCyanHover,
      alert: '0 0 12px rgba(255, 61, 61, 0.4), 0 0 30px rgba(255, 61, 61, 0.2), 0 0 50px rgba(255, 61, 61, 0.1)',
    }[variant];

    const deltaColor = deltaNegative ? tokens.colors.alert.red : tokens.colors.alert.green;

    return (
      <div
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: compact ? 'center' : 'flex-start',
          gap: compact ? '3px' : '6px',
          padding: compact ? '8px 12px' : '16px 18px',
          ...props.style,
        }}
        {...props}
      >
        <div
          style={{
            fontFamily: tokens.fonts.hud,
            fontSize: compact ? '20px' : '32px',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            color: valueColor,
            textShadow: valueShadow,
            letterSpacing: '-0.02em',
            transition: `text-shadow ${tokens.transitions.normal}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textShadow = hoverShadow[variant as keyof typeof hoverShadow])}
          onMouseLeave={(e) => (e.currentTarget.style.textShadow = valueShadow)}
        >
          {value}
          {children && <span style={{ marginLeft: '8px', fontSize: compact ? '14px' : '20px' }}>{children}</span>}
        </div>
        <div
          style={{
            fontFamily: tokens.fonts.hud,
            fontSize: compact ? '7px' : '8px',
            fontWeight: 500,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: tokens.colors.text.muted,
          }}
        >
          {label}
        </div>
        {delta !== undefined && (
          <div
            style={{
              fontFamily: tokens.fonts.hud,
              fontSize: compact ? '9px' : '10px',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color: deltaColor,
              letterSpacing: '0.04em',
            }}
          >
            {deltaNegative ? '▼' : '▲'} {delta}
          </div>
        )}
      </div>
    );
  }
);

Stat.displayName = 'Stat';