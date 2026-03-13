import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementBadge } from '@/components/AchievementBadge';
import { AlarmCard } from '@/components/AlarmCard';
import { DigitalClock } from '@/components/DigitalClock';
import { DisciplineRing } from '@/components/DisciplineRing';
import { StreakRing } from '@/components/StreakRing';
import { Colors } from '@/constants/colors';
import { Alarm, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

// ─── helpers ─────────────────────────────────────────────────────────────────

function getNextAlarm(alarms: Alarm[]): { alarm: Alarm; nextMs: number } | null {
  const enabled = alarms.filter(a => a.enabled);
  if (!enabled.length) return null;
  const now = Date.now();
  const candidates = enabled.map(alarm => {
    const [h, m] = alarm.time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return { alarm, nextMs: d.getTime() };
  });
  candidates.sort((a, b) => a.nextMs - b.nextMs);
  return candidates[0];
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatCountdown(ms: number): string {
  const totalMins = Math.ceil(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `in ${m}m`;
  if (m === 0) return `in ${h}h`;
  return `in ${h}h ${m}m`;
}

function getGreetingKey(): 'goodMorning' | 'stayFocused' | 'goodEvening' | 'restWellTonight' {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'goodMorning';
  if (h >= 12 && h < 17) return 'stayFocused';
  if (h >= 17 && h < 22) return 'goodEvening';
  return 'restWellTonight';
}

// ─── NextAlarmBanner ──────────────────────────────────────────────────────────

function NextAlarmBanner({ alarms }: { alarms: Alarm[] }) {
  const { isDark, colors } = useTheme();
  const { t, fonts } = useTranslation();
  const [, forceUpdate] = useState(0);

  // Refresh countdown every 30s
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const next = getNextAlarm(alarms);

  if (!next) {
    return (
      <View style={[styles.nextAlarmCard, {
        backgroundColor: isDark ? colors.surface : colors.card,
        borderColor: colors.border,
      }]}>
        <Feather name="bell-off" size={20} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.nextAlarmLabel, { color: colors.textMuted, fontFamily: fonts.medium }]}>
            {t.noActiveAlarms}
          </Text>
          <Text style={[styles.nextAlarmSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>
            {t.tapToCreateFirst}
          </Text>
        </View>
      </View>
    );
  }

  const countdown = formatCountdown(next.nextMs - Date.now());

  return (
    <View style={[styles.nextAlarmCard, {
      backgroundColor: isDark ? colors.surface : colors.card,
      borderColor: colors.border,
    }]}>
      <View style={styles.nextAlarmIconWrap}>
        <Feather name="bell" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.nextAlarmLabel, { color: colors.textSecondary, fontFamily: fonts.medium }]}>
          {t.nextAlarm}
        </Text>
        <View style={styles.nextAlarmRow}>
          <Text style={[styles.nextAlarmTime, { color: isDark ? '#fff' : '#111' }]}>
            {formatTime12(next.alarm.time)}
          </Text>
          <Text style={[styles.nextAlarmCountdown, { color: Colors.primary }]}>
            {countdown}
          </Text>
        </View>
        {next.alarm.title !== 'Wake Up' && (
          <Text style={[styles.nextAlarmTitle, { color: colors.textMuted }]}>
            {next.alarm.title}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, achievements, deleteAlarm, toggleAlarm } = useApp();
  const { t, fonts } = useTranslation();
  const fabScale = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/alarm/create');
  };

  const bg = colors.background;
  const cardBg = isDark ? colors.surface : colors.card;

  const disciplineScore = data.disciplineScore;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.inner, { paddingTop: topPad, paddingBottom: bottomPad + 100 }]}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t[getGreetingKey()]}
              </Text>
              <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#111' }]}>
                UNSNWOOZE
              </Text>
              <Text style={[styles.headerTagline, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                {t.tagline}
              </Text>
            </View>
            <View style={styles.ringWrap}>
              <DisciplineRing score={disciplineScore} />
              <Text style={[styles.ringLabel, { color: colors.textMuted, fontFamily: fonts.medium }]}>
                {t.discipline}
              </Text>
            </View>
          </View>

          {/* Clock */}
          <View style={[styles.clockCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <DigitalClock large />
          </View>

          {/* Next Alarm Banner */}
          <NextAlarmBanner alarms={data.alarms} />

          {/* Streak */}
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
              {t.yourStreak}
            </Text>
            <View style={styles.streakCenter}>
              <StreakRing currentStreak={data.currentStreak} bestStreak={data.bestStreak} />
            </View>
          </View>

          {/* Achievements — always visible */}
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <View style={styles.achievementsHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
                {t.achievements}
              </Text>
              <Text style={[styles.achievementsSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                {achievements.filter(a => a.unlocked).length}/{achievements.length} {t.unlocked}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              <View style={styles.badgesRow}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Alarms list */}
          <View style={styles.alarmsHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
              {t.alarms}
            </Text>
            <Text style={[styles.alarmsCount, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              {data.alarms.filter(a => a.enabled).length} {t.active}
            </Text>
          </View>

          {data.alarms.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: colors.border }]}>
              <Feather name="bell-off" size={36} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.semiBold }]}>
                {t.noAlarmsSet}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {t.tapPlusToCreate}
              </Text>
            </View>
          ) : (
            data.alarms.map(alarm => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onToggle={() => toggleAlarm(alarm.id)}
                onPress={() => router.push({ pathname: '/alarm/create', params: { editId: alarm.id } })}
                onDelete={() => deleteAlarm(alarm.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={handleFabPress}
        onPressIn={() => Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true, tension: 100 }).start()}
        onPressOut={() => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true, tension: 100 }).start()}
        style={[styles.fabContainer, { bottom: Math.max(bottomPad, 34) + 70 }]}
      >
        <Animated.View style={{ transform: [{ scale: fabScale }] }}>
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Feather name="plus" size={28} color="#fff" />
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { alignItems: 'center' },
  inner: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  headerTagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
    letterSpacing: 0.1,
  },
  ringWrap: {
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
  ringLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Clock
  clockCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 12,
    alignItems: 'center',
  },

  // Next alarm banner
  nextAlarmCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  nextAlarmIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAlarmLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nextAlarmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  nextAlarmTime: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  nextAlarmCountdown: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  nextAlarmTitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  nextAlarmSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },

  // Cards
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.3,
  },
  streakCenter: { alignItems: 'center', marginTop: 4 },

  // Achievements
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  badgesScroll: { marginTop: -4 },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },

  // Alarms
  alarmsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmsCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
