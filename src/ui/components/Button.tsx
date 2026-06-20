'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { tokens } from '@/ui/tokens';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'tactical' | 'tactical-cyan' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'tactical', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles: React.CSSProperties = {
      fontFamily: tokens.fonts.hud,
      fontSize: size === 'sm' ? '10px' : size === 'lg' ? '12px' : '11px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      borderRadius: tokens.borderRadius.button,
      cursor: 'pointer',
      transition: `transform ${tokens.transitions.fast}, box-shadow ${tokens.transitions.normal}, border-color ${tokens.transitions.normal}, background ${tokens.transitions.normal}`,
      willChange: 'transform',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      tactical: {
        color: tokens.colors.text.primary,
        background: 'rgba(212, 175, 55, 0.08)',
        border: `1px solid ${tokens.colors.border.primary}`,
        padding: size === 'sm' ? '8px 14px' : size === 'lg' ? '12px 24px' : '10px 20px',
      },
      'tactical-cyan': {
        color: tokens.colors.text.primary,
        background: 'rgba(0, 229, 255, 0.08)',
        border: `1px solid ${tokens.colors.border.cyan}`,
        padding: size === 'sm' ? '8px 14px' : size === 'lg' ? '12px 24px' : '10px 20px',
      },
      ghost: {
        color: tokens.colors.text.secondary,
        background: 'transparent',
        border: `1px solid ${tokens.colors.border.secondary}`,
        padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 18px' : '8px 16px',
      },
      icon: {
        color: tokens.colors.text.secondary,
        background: 'transparent',
        border: `1px solid ${tokens.colors.border.secondary}`,
        borderRadius: '50%',
        width: size === 'sm' ? '32px' : size === 'lg' ? '44px' : '36px',
        height: size === 'sm' ? '32px' : size === 'lg' ? '44px' : '36px',
        padding: 0,
      },
    };

    const hoverStyles: Record<string, React.CSSProperties> = {
      tactical: {
        background: 'rgba(212, 175, 55, 0.14)',
        borderColor: tokens.colors.border.active,
        boxShadow: '0 0 20px rgba(212, 175, 55, 0.12), 0 0 50px rgba(212, 175, 55, 0.06)',
      },
      'tactical-cyan': {
        background: 'rgba(0, 229, 255, 0.14)',
        borderColor: 'rgba(0, 229, 255, 0.4)',
        boxShadow: '0 0 20px rgba(0, 229, 255, 0.12), 0 0 50px rgba(0, 229, 255, 0.06)',
      },
      ghost: {
        background: 'rgba(255, 255, 255, 0.04)',
        borderColor: tokens.colors.border.primary,
      },
      icon: {
        background: 'rgba(255, 255, 255, 0.04)',
        borderColor: tokens.colors.border.primary,
      },
    };

    return (
      <button
        ref={ref}
        className={className}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
        }}
        onMouseEnter={(e) => {
          Object.assign(e.currentTarget.style, hoverStyles[variant]);
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e) => {
          Object.assign(e.currentTarget.style, variantStyles[variant]);
          props.onMouseLeave?.(e);
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.97)';
          e.currentTarget.style.transitionDuration = '0.08s';
          props.onMouseDown?.(e);
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.transitionDuration = tokens.transitions.fast;
          props.onMouseUp?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';