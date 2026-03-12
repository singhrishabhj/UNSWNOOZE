import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export function useTheme() {
  const systemScheme = useColorScheme();
  const { data } = useApp();

  const scheme = data.theme === 'system' ? (systemScheme ?? 'dark') : data.theme;
  const isDark = scheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return { isDark, colors, scheme, primary: Colors.primary };
}
