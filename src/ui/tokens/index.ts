// Design tokens extracted from globals.css for Figma/Storybook sync
export const tokens = {
  colors: {
    bg: {
      void: '#04040A',
      primary: '#06060C',
      secondary: '#0C0E1A',
      tertiary: '#121628',
      panel: 'rgba(8, 10, 20, 0.88)',
      panelSolid: '#0C0E1A',
    },
    gold: {
      primary: '#D4AF37',
      light: '#F0D060',
      dim: '#8B7325',
      glow: 'rgba(212, 175, 55, 0.3)',
    },
    cyan: {
      primary: '#00E5FF',
      dim: '#006B7A',
      glow: 'rgba(0, 229, 255, 0.15)',
    },
    alert: {
      red: '#FF3D3D',
      orange: '#FF9500',
      green: '#00E676',
      blue: '#448AFF',
    },
    accent: {
      weather: '#E040FB',
      nuclear: '#76FF03',
    },
    border: {
      primary: 'rgba(212, 175, 55, 0.15)',
      secondary: 'rgba(212, 175, 55, 0.08)',
      active: 'rgba(212, 175, 55, 0.4)',
      cyan: 'rgba(0, 229, 255, 0.2)',
    },
    text: {
      primary: '#E8E6E0',
      secondary: '#9B978E',
      muted: '#5C5A54',
      heading: '#F5F0E0',
      gold: '#D4AF37',
      cyan: '#00E5FF',
    },
  },
  fonts: {
    hud: "'JetBrains Mono', 'Courier New', monospace",
    body: "'Inter', -apple-system, sans-serif",
  },
  spacing: {
    panelGap: '12px',
    edgePad: '20px',
  },
  borderRadius: {
    panel: '14px',
    panelSm: '10px',
    card: '10px',
    button: '8px',
    badge: '4px',
    tag: '100px',
  },
  shadows: {
    panel: '0 4px 30px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(212, 175, 55, 0.06) inset, 0 -1px 0 rgba(0, 0, 0, 0.3) inset',
    panelHover: '0 8px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.08), 0 1px 0 rgba(212, 175, 55, 0.1) inset, 0 -1px 0 rgba(0, 0, 0, 0.3) inset',
    glow: '0 0 20px rgba(212, 175, 55, 0.12), 0 0 60px rgba(212, 175, 55, 0.06), 0 4px 30px rgba(0, 0, 0, 0.5)',
    glowCyan: '0 0 20px rgba(0, 229, 255, 0.1), 0 0 60px rgba(0, 229, 255, 0.05)',
  },
  transitions: {
    fast: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  breakpoints: {
    mobile: '390px',
    tablet: '768px',
    desktop: '1024px',
    ultrawide: '2560px',
  },
};

export type Tokens = typeof tokens;