'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { tokens } from '@/ui/tokens';

interface LayerToggleProps extends HTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'cyan';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const LayerToggle = forwardRef<HTMLButtonElement, LayerToggleProps>(
  ({ variant = 'gold', checked = false, onChange, className = '', ...props }, ref) => {
    const isCyan = variant === 'cyan';
    const activeBg = isCyan ? 'rgba(0, 229, 255, 0.15)' : 'rgba(212, 175, 55, 0.25)';
    const activeBorder = isCyan ? tokens.colors.cyan.primary : tokens.colors.gold.primary;
    const activeThumbBg = isCyan ? tokens.colors.cyan.primary : tokens.colors.gold.primary;
    const activeThumbGlow = isCyan
      ? '0 0 10px rgba(0, 229, 255, 0.6), 0 0 25px rgba(0, 229, 255, 0.2)'
      : '0 0 10px rgba(212, 175, 55, 0.6), 0 0 25px rgba(212, 175, 55, 0.2)';

    return (
      <button
        ref={ref}
        className={className}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange?.(!checked)}
        style={{
          position: 'relative',
          width: '28px',
          height: '14px',
          borderRadius: '7px',
          background: checked ? activeBg : 'rgba(255, 255, 255, 0.06)',
          border: `1px solid ${checked ? activeBorder : 'rgba(255, 255, 255, 0.08)'}`,
          boxShadow: checked ? `0 0 16px ${isCyan ? 'rgba(0, 229, 255, 0.12)' : 'rgba(212, 175, 55, 0.12)'}` : 'none',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          flexShrink: 0,
          ...props.style,
        }}
        {...props}
      >
        <span
          style={{
            content: '""',
            position: 'absolute',
            top: '1px',
            left: checked ? '15px' : '1px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: checked ? activeThumbBg : tokens.colors.text.muted,
            boxShadow: checked ? activeThumbGlow : 'none',
            transition: 'all 0.3s ease',
          }}
        />
      </button>
    );
  }
);

LayerToggle.displayName = 'LayerToggle';