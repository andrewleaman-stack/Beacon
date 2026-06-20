'use client';

import { type HTMLAttributes } from 'react';
import { tokens } from '@/ui/tokens';

interface PulseRingProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'gold' | 'cyan' | 'alert' | 'nominal';
  size?: number;
}

const variantColors: Record<string, { primary: string; glow: string }> = {
  gold: { primary: tokens.colors.gold.primary, glow: tokens.colors.gold.glow },
  cyan: { primary: tokens.colors.cyan.primary, glow: tokens.colors.cyan.glow },
  alert: { primary: tokens.colors.alert.red, glow: 'rgba(255, 61, 61, 0.4)' },
  nominal: { primary: tokens.colors.alert.green, glow: 'rgba(0, 230, 118, 0.3)' },
};

export const PulseRing = ({ variant = 'gold', size = 12, className = '', ...props }: PulseRingProps) => {
  const colors = variantColors[variant];

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        ...props.style,
      }}
      {...props}
    >
      <div
        style={{
          position: 'absolute',
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: '50%',
          background: colors.primary,
          boxShadow: `0 0 ${size * 0.5}px ${colors.glow}`,
          zIndex: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${colors.primary}`,
          animation: `gotham-ring-expand 2.8s cubic-bezier(0, 0.4, 0.4, 1) infinite`,
          willChange: 'transform, opacity',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${colors.primary}`,
          animation: `gotham-ring-expand 2.8s cubic-bezier(0, 0.4, 0.4, 1) infinite`,
          animationDelay: '0.9s',
          willChange: 'transform, opacity',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${colors.primary}`,
          animation: `gotham-ring-expand 2.8s cubic-bezier(0, 0.4, 0.4, 1) infinite`,
          animationDelay: '1.8s',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
};