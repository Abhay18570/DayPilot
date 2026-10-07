import { useColorScheme } from 'react-native';
export const palette = {
  light: { background: '#F8FAFC', surface: '#FFFFFF', text: '#111827', muted: '#64748B', border: '#E2E8F0', primary: '#4F46E5', tint: '#EEEDFF', success: '#167344', error: '#C53030', warning: '#925B0B', button: '#4F46E5', onPrimary: '#FFFFFF' },
  dark: { background: '#0F172A', surface: '#182338', text: '#F8FAFC', muted: '#A7B6CC', border: '#334155', primary: '#A5A2FF', tint: '#28264A', success: '#6EE7A0', error: '#FF9898', warning: '#F6CA75', button: '#4F46E5', onPrimary: '#FFFFFF' },
};
export const brand = '#4F46E5';
export function useDayPilotTheme() { return palette[useColorScheme() === 'dark' ? 'dark' : 'light']; }
