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

const CLAUSES = [
  {
    heading: 'Responsible Use',
    body: 'Users agree to use UNSNWOOZE responsibly. The app is intended to help you wake up on time. Misuse of alarm features that disturbs others is the sole responsibility of the user.',
  },
  {
    heading: 'Missed Alarms',
    body: 'UNSNWOOZE cannot guarantee alarm delivery in all conditions. Missed alarms may occur due to disabled notifications, device power-saving restrictions, operating system interruptions, or the device being powered off.',
  },
  {
    heading: 'No Warranty',
    body: 'The app is provided as-is without warranty of any kind. We do not guarantee uninterrupted or error-free operation.',
  },
  {
    heading: 'Updates',
    body: 'We may update these terms at any time. Continued use of the app after updates constitutes acceptance of the revised terms.',
  },
  {
    heading: 'Contact',
    body: 'For support or questions regarding these terms, contact us at support@unsnwooze.app',
  },
] as const;

export default function TermsScreen() {
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

      <Text style={[styles.title, { color: textPrimary }]}>Terms of Use</Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          By using UNSNWOOZE you agree to the following terms. Please read them carefully.
        </Text>
        <Text style={[styles.updated, { color: colors.textMuted }]}>
          Last updated: March 2026
        </Text>
      </View>

      {CLAUSES.map((clause, idx) => (
        <View key={idx} style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <View style={styles.clauseHeader}>
            <View style={[styles.indexBadge, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
              <Text style={[styles.indexText, { color: Colors.primary }]}>{idx + 1}</Text>
            </View>
            <Text style={[styles.clauseHeading, { color: textPrimary }]}>{clause.heading}</Text>
          </View>
          <Text style={[styles.clauseBody, { color: colors.textSecondary }]}>{clause.body}</Text>
        </View>
      ))}
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
  clauseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  clauseHeading: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  clauseBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
});
