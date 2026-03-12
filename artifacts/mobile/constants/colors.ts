export const Colors = {
  primary: '#FF6B00',
  primaryDim: 'rgba(255, 107, 0, 0.15)',
  primaryGlow: 'rgba(255, 107, 0, 0.35)',

  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceElevated: '#EBEBEB',
    text: '#111111',
    textSecondary: '#666666',
    textMuted: '#999999',
    border: '#E5E5E5',
    card: '#FFFFFF',
    tabBar: '#FFFFFF',
  },
  dark: {
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceElevated: '#242424',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    textMuted: '#666666',
    border: '#2A2A2A',
    card: '#1A1A1A',
    tabBar: '#0F0F0F',
  },
};

export type ColorScheme = 'light' | 'dark';

export default Colors;
