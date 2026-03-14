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

const FEATURES = [
  { icon: 'bell', text: 'Smart alarm scheduling' },
  { icon: 'mic', text: 'Alarm title voice reminder' },
  { icon: 'check-circle', text: 'Wake-up verification tasks' },
  { icon: 'smartphone', text: 'Reliable cross-platform alarms' },
] as const;

export default function AboutScreen() {
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

      <Text style={[styles.title, { color: textPrimary }]}>About</Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={[styles.logoRow]}>
          <View style={[styles.logoCircle, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
            <Feather name="bell" size={28} color={Colors.primary} />
          </View>
          <Text style={[styles.appName, { color: textPrimary }]}>UNSNWOOZE</Text>
          <Text style={[styles.version, { color: colors.textSecondary }]}>Version 1.0.0</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.body, { color: colors.textSecondary }]}>
          UNSNWOOZE is a smart alarm app designed to help users wake up on time and avoid snoozing.
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary, marginTop: 12 }]}>
          The app ensures accountability by requiring wake-up verification tasks before the alarm can be dismissed.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FEATURES</Text>

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        {FEATURES.map((f, i) => (
          <View
            key={f.icon}
            style={[
              styles.featureRow,
              { borderBottomColor: colors.border },
              i === FEATURES.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
              <Feather name={f.icon} size={16} color={Colors.primary} />
            </View>
            <Text style={[styles.featureText, { color: textPrimary }]}>{f.text}</Text>
          </View>
        ))}
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
  logoRow: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  version: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: 1,
    marginBottom: 20,
  },
  body: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
});
