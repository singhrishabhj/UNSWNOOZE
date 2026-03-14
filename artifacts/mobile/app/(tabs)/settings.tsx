import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, setTheme, setLanguage } = useApp();
  const { t, fonts } = useTranslation();

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const bg = colors.background;
  const cardBg = isDark ? colors.surface : colors.card;

  const themeOptions: Array<{ labelKey: 'light' | 'dark' | 'system'; value: 'light' | 'dark' | 'system'; icon: string }> = [
    { labelKey: 'light', value: 'light', icon: 'sun' },
    { labelKey: 'dark', value: 'dark', icon: 'moon' },
    { labelKey: 'system', value: 'system', icon: 'smartphone' },
  ];

  const langOptions: Array<{ labelKey: 'english' | 'hindi'; value: 'en' | 'hi' }> = [
    { labelKey: 'english', value: 'en' },
    { labelKey: 'hindi', value: 'hi' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 80, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
        {t.settings}
      </Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
          {t.appearance}
        </Text>
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
                <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary, fontFamily: fonts.medium }]}>
                  {t[opt.labelKey]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
          {t.language}
        </Text>
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
              <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111', fontFamily: fonts.medium }]}>
                {t[opt.labelKey]}
              </Text>
              {active && <Feather name="check" size={18} color={Colors.primary} />}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
          LEGAL &amp; SUPPORT
        </Text>
        {[
          { label: 'About UNSNWOOZE', route: '/settings/about', icon: 'info' },
          { label: 'Privacy Policy', route: '/settings/privacy', icon: 'shield' },
          { label: 'Terms of Use', route: '/settings/terms', icon: 'file-text' },
        ].map((item, idx, arr) => (
          <Pressable
            key={item.route}
            onPress={() => {
              Haptics.selectionAsync();
              router.push(item.route as any);
            }}
            style={[styles.listItem, idx === arr.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={styles.listItemLeft}>
              <Feather name={item.icon as any} size={16} color={Colors.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111', fontFamily: fonts.medium }]}>
                {item.label}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
          {t.about}
        </Text>
        <View style={styles.listItem}>
          <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111', fontFamily: fonts.medium }]}>
            {t.version}
          </Text>
          <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>1.0.0</Text>
        </View>
        <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
          <Text style={[styles.listItemText, { color: isDark ? '#fff' : '#111', fontFamily: fonts.medium }]}>
            UNSNWOOZE
          </Text>
          <Text style={[styles.listItemValue, { color: colors.textSecondary }]}>Smart Alarm</Text>
        </View>
      </View>

      <View style={[styles.brandCard, { borderColor: 'rgba(255,107,0,0.2)' }]}>
        <View style={[styles.brandIcon, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
          <Feather name="bell" size={20} color={Colors.primary} />
        </View>
        <Text style={[styles.brandName, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
          UNSNWOOZE
        </Text>
        <Text style={[styles.brandTagline, { color: colors.textMuted, fontFamily: fonts.regular }]}>
          {t.wakeUpAction}
        </Text>
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
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemText: {
    fontSize: 15,
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
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
