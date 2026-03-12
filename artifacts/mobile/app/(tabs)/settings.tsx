import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, setTheme, setLanguage } = useApp();

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const bg = isDark ? colors.background : colors.background;
  const cardBg = isDark ? colors.surface : colors.card;

  const themeOptions: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
    { label: 'Light', value: 'light', icon: 'sun' },
    { label: 'Dark', value: 'dark', icon: 'moon' },
    { label: 'System', value: 'system', icon: 'smartphone' },
  ];

  const langOptions: Array<{ label: string; value: 'en' | 'hi' }> = [
    { label: 'English', value: 'en' },
    { label: 'Hindi', value: 'hi' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 80, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: isDark ? '#fff' : '#111' }]}>Settings</Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={styles.optionRow}>
          {themeOptions.map(opt => {
            const active = data.theme === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setTheme(opt.value);
                  Haptics.selectionAsync();
                }}
                style={[styles.themeChip, {
                  backgroundColor: active ? Colors.primary : (isDark ? colors.surfaceElevated : colors.surface),
                  borderColor: active ? Colors.primary : colors.border,
                }]}
              >
                <Feather name={opt.icon as any} size={15} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>LANGUAGE</Text>
        {langOptions.map(opt => {
          const active = data.language === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => {
                setLanguage(opt.value);
                Haptics.selectionAsync();
              }}
              style={[styles.listItem, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111' }]}>{opt.label}</Text>
              {active && <Feather name="check" size={18} color={Colors.primary} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>ABOUT</Text>
        <View style={styles.listItem}>
          <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111' }]}>Version</Text>
          <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
        <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
          <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111' }]}>UNSNWOOZE</Text>
          <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>Smart Alarm</Text>
        </View>
      </View>

      <View style={[styles.brandCard, { borderColor: 'rgba(255,107,0,0.2)' }]}>
        <View style={[styles.brandIcon, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
          <Feather name="bell" size={20} color={Colors.primary} />
        </View>
        <Text style={[styles.brandName, { color: isDark ? '#fff' : '#111' }]}>UNSNWOOZE</Text>
        <Text style={[styles.brandTagline, { color: colors.textMuted }]}>Wake up. Take action.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listItemText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  listItemValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  brandCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
});
