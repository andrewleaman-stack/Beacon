'use client';

import { type HTMLAttributes } from 'react';
import { tokens } from '@/ui/tokens';

interface NotificationPulseProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'red' | 'gold' | 'cyan';
  count?: number;
}

const variantStyles: Record<string, React.CSSProperties> = {
  red: {
    background: tokens.colors.alert.red,
    boxShadow: `0 0 6px ${tokens.colors.alert.red}80`,
    ringColor: tokens.colors.alert.red,
  },
  gold: {
    background: tokens.colors.gold.primary,
    boxShadow: `0 0 6px ${tokens.colors.gold.glow}`,
    ringColor: tokens.colors.gold.primary,
  },
  cyan: {
    background: tokens.colors.cyan.primary,
    boxShadow: `0 0 6px ${tokens.colors.cyan.glow}`,
    ringColor: tokens.colors.cyan.primary,
  },
};

export const NotificationPulse = ({ variant = 'red', count, className = '', ...props }: NotificationPulseProps) => {
  const style = variantStyles[variant];
  const hasCount = count !== undefined && count > 0;
  const size = hasCount ? 18 : 10;

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
        borderRadius: '50%',
        fontFamily: tokens.fonts.hud,
        fontSize: hasCount ? '8px' : undefined,
        fontWeight: hasCount ? 700 : undefined,
        color: hasCount ? '#fff' : undefined,
        background: style.background,
        boxShadow: style.boxShadow,
        ...props.style,
      }}
      {...props}
    >
      {hasCount && count > 99 ? '99+' : hasCount && String(count)}
      <div
        style={{
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: style.ringColor,
          animation: 'notification-ring 1.6s cubic-bezier(0, 0.55, 0.45, 1) infinite',
          willChange: 'transform, opacity',
        }}
      />
    </div>
  );
};