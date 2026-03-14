import { Feather } from '@expo/vector-icons';
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
import { useTheme } from '@/hooks/useTheme';

const SECTIONS = [
  {
    heading: 'Information Collected',
    icon: 'database',
    items: ['Alarm titles you create', 'Alarm schedules and repeat days', 'Device permission status (camera, notifications)'],
  },
  {
    heading: 'Data Usage',
    icon: 'cpu',
    items: ['All collected data is used exclusively for alarm functionality.', 'No data is used for advertising or analytics.'],
  },
  {
    heading: 'Data Storage',
    icon: 'hard-drive',
    items: ['All data is stored locally on your device using AsyncStorage.', 'No data is transmitted to any external server.'],
  },
  {
    heading: 'No Data Sharing',
    icon: 'shield',
    items: ['UNSNWOOZE does not sell, share, or transfer user data to any third party.'],
  },
] as const;

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bg = colors.background;
  const cardBg = isDark ? colors.surface : colors.card;
  const textPrimary = isDark ? '#fff' : '#111';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentContainerStyle={{ paddingTop: topPad, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={Colors.primary} />
        <Text style={[styles.backText, { color: Colors.primary }]}>Settings</Text>
      </Pressable>

      <Text style={[styles.title, { color: textPrimary }]}>Privacy Policy</Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Your privacy matters. UNSNWOOZE is designed to work entirely on your device.
          We do not collect or transmit any personal information.
        </Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>
          Last updated: March 2026
        </Text>
      </View>

      {SECTIONS.map(sec => (
        <View key={sec.heading} style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <View style={styles.secHeader}>
            <View style={[styles.secIcon, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
              <Feather name={sec.icon} size={16} color={Colors.primary} />
            </View>
            <Text style={[styles.secHeading, { color: textPrimary }]}>{sec.heading}</Text>
          </View>
          {sec.items.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          If you have questions about this policy, contact us at{' '}
          <Text style={{ color: Colors.primary }}>support@unsnwooze.app</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  title: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  intro: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
    marginBottom: 8,
  },
  updated: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  secIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secHeading: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 9,
  },
  bulletText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    flex: 1,
  },
  body: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
