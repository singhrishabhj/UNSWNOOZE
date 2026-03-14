/**
 * app/(tabs)/streak.tsx
 * Dedicated Streak page showing current/best streak, 7-day weekly tracker,
 * milestone progress and achievement badges.
 */
import { Feather } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Colors } from '@/constants/colors';
import { DayOutcome, DayRecord, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/hooks/useTranslation';

// ─── Constants ────────────────────────────────────────────────────────────────

const MILESTONES = [3, 7, 10, 30];

// ─── Helper: build exactly 7-day window ending today ─────────────────────────

function buildWeekWindow(history: DayRecord[]): Array<{ dayIndex: number; date: string; outcome: DayOutcome }> {
  const result: Array<{ dayIndex: number; date: string; outcome: DayOutcome }> = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const record = history.find(r => r.date === dateStr);
    result.push({ dayIndex: d.getDay(), date: dateStr, outcome: record?.outcome ?? 'none' });
  }
  return result;
}

// ─── Stat Box ─────────────────────────────────────────────────────────────────

const StatBox = memo(function StatBox({
  value,
  label,
  isDark,
  textMuted,
  highlight,
}: {
  value: number | string;
  label: string;
  isDark: boolean;
  textMuted: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[
        styles.statValue,
        { color: highlight ? Colors.primary : (isDark ? '#fff' : '#111') },
      ]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: textMuted }]}>{label}</Text>
    </View>
  );
});

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const MilestoneBar = memo(function MilestoneBar({
  current,
  target,
  borderColor,
  trackColor,
}: {
  current: number;
  target: number;
  borderColor: string;
  trackColor: string;
}) {
  const pct = Math.min(current / target, 1);
  return (
    <View style={[styles.barTrack, { backgroundColor: trackColor }]}>
      <View
        style={[
          styles.barFill,
          { width: `${pct * 100}%` as any, backgroundColor: Colors.primary },
        ]}
      />
    </View>
  );
});

// ─── Day Dot (weekly tracker) ─────────────────────────────────────────────────

const OUTCOME_CONFIG: Record<DayOutcome, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.5)', icon: 'check', color: '#22c55e' },
  snoozed: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.5)', icon: 'alert-circle', color: '#fbbf24' },
  missed:  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.5)',  icon: 'x',     color: '#ef4444' },
  none:    { bg: 'transparent',           border: 'transparent',          icon: '',      color: 'transparent' },
};

const DayDot = memo(function DayDot({
  dayName,
  outcome,
  isToday,
  mutedColor,
  trackColor,
}: {
  dayName: string;
  outcome: DayOutcome;
  isToday: boolean;
  mutedColor: string;
  trackColor: string;
}) {
  const cfg = OUTCOME_CONFIG[outcome];
  return (
    <View style={styles.dayDotCol}>
      <View style={[
        styles.dayDotCircle,
        {
          backgroundColor: outcome !== 'none' ? cfg.bg : trackColor,
          borderColor: isToday ? Colors.primary : (outcome !== 'none' ? cfg.border : 'transparent'),
          borderWidth: isToday || outcome !== 'none' ? 1.5 : 0,
        },
      ]}>
        {outcome !== 'none' && (
          <Feather name={cfg.icon as any} size={14} color={cfg.color} />
        )}
      </View>
      <Text style={[styles.dayName, { color: isToday ? Colors.primary : mutedColor }]}>
        {dayName}
      </Text>
    </View>
  );
});

// ─── Milestone Badge ──────────────────────────────────────────────────────────

const MilestoneBadge = memo(function MilestoneBadge({
  days,
  reached,
  isNext,
  current,
  isDark,
  colors,
}: {
  days: number;
  reached: boolean;
  isNext: boolean;
  current: number;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View style={[
      styles.milestoneBadge,
      {
        backgroundColor: reached
          ? 'rgba(255,107,0,0.12)'
          : (isDark ? colors.surfaceElevated : colors.surface),
        borderColor: reached
          ? 'rgba(255,107,0,0.4)'
          : isNext ? Colors.primary : colors.border,
        borderWidth: isNext && !reached ? 1.5 : 1,
      },
    ]}>
      <Feather
        name={reached ? 'award' : 'lock'}
        size={18}
        color={reached ? Colors.primary : isNext ? Colors.primary : colors.textMuted}
      />
      <Text style={[
        styles.milestoneDays,
        { color: reached || isNext ? (isDark ? '#fff' : '#111') : colors.textMuted },
      ]}>
        {days}
      </Text>
      <Text style={[styles.milestoneUnit, { color: colors.textSecondary }]}>days</Text>
      {reached && (
        <View style={styles.milestoneCheck}>
          <Feather name="check-circle" size={12} color={Colors.primary} />
        </View>
      )}
    </View>
  );
});

// ─── StreakScreen ─────────────────────────────────────────────────────────────

export default function StreakScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, achievements } = useApp();
  const { t, fonts } = useTranslation();

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const { currentStreak, bestStreak, totalWakeUps, streakFreezeCount = 0, weeklyHistory = [] } = data;

  const cardBg = isDark ? colors.surface : colors.card;
  const trackColor = isDark ? colors.surfaceElevated : colors.surface;
  const mutedColor = colors.textMuted as string;

  // Next unreached milestone
  const nextMilestone = useMemo(
    () => MILESTONES.find(m => m > currentStreak) ?? MILESTONES[MILESTONES.length - 1],
    [currentStreak],
  );

  // Build the 7-day window
  const weekWindow = useMemo(() => buildWeekWindow(weeklyHistory), [weeklyHistory]);

  // Today's date string
  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topPad,
        paddingBottom: bottomPad + 80,
        paddingHorizontal: 20,
        maxWidth: 480,
        width: '100%',
        alignSelf: 'center',
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Page title */}
      <Text style={[styles.pageTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
        {t.streak}
      </Text>

      {/* ── Stats row ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.statsRow}>
          <StatBox
            value={currentStreak}
            label={t.currentStreakLabel}
            isDark={isDark}
            textMuted={mutedColor}
            highlight
          />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatBox
            value={bestStreak}
            label={t.bestStreakLabel}
            isDark={isDark}
            textMuted={mutedColor}
          />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatBox
            value={totalWakeUps}
            label={t.totalWakeUps}
            isDark={isDark}
            textMuted={mutedColor}
          />
        </View>
      </View>

      {/* ── Streak Freeze (Snap) card ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.freezeRow}>
          <View>
            <Text style={[styles.cardLabel, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
              STREAK FREEZE (SNAP)
            </Text>
            <Text style={[styles.freezeValue, { color: '#60a5fa', fontFamily: fonts.bold }]}>
              {streakFreezeCount} available
            </Text>
          </View>
          <View style={styles.freezeIconWrap}>
            <Feather name="shield" size={28} color="#60a5fa" />
          </View>
        </View>
        <Text style={[styles.freezeHint, { color: mutedColor, fontFamily: fonts.regular }]}>
          Earned every 3 days of streak. Protects your streak if you miss a day.
        </Text>
      </View>

      {/* ── Next milestone progress ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.milestoneHeader}>
          <View>
            <Text style={[styles.cardLabel, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>
              {t.nextMilestoneLabel}
            </Text>
            <Text style={[styles.milestoneTarget, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
              {nextMilestone} {t.dayStreak}
            </Text>
          </View>
          <Text style={[styles.daysMore, { color: Colors.primary, fontFamily: fonts.semiBold }]}>
            {currentStreak >= nextMilestone ? '✓' : t.daysMore(nextMilestone - currentStreak)}
          </Text>
        </View>
        <MilestoneBar
          current={currentStreak}
          target={nextMilestone}
          borderColor={colors.border}
          trackColor={trackColor}
        />
        <Text style={[styles.progressLabel, { color: mutedColor, fontFamily: fonts.regular }]}>
          {Math.min(currentStreak, nextMilestone)} / {nextMilestone}
        </Text>
      </View>

      {/* ── Weekly Tracker ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
          {t.weeklyActivity}
        </Text>

        <View style={styles.weekRow}>
          {weekWindow.map((day, idx) => (
            <DayDot
              key={idx}
              dayName={t.dayNames[day.dayIndex]}
              outcome={day.outcome}
              isToday={day.date === todayDateStr}
              mutedColor={mutedColor}
              trackColor={trackColor}
            />
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {(['success', 'snoozed', 'missed'] as DayOutcome[]).map(o => {
            const cfg = OUTCOME_CONFIG[o];
            const labels = { success: 'Success', snoozed: 'Snoozed', missed: 'Missed' };
            return (
              <View key={o} style={styles.legendItem}>
                <Feather name={cfg.icon as any} size={11} color={cfg.color} />
                <Text style={[styles.legendText, { color: mutedColor, fontFamily: fonts.regular }]}>
                  {labels[o]}
                </Text>
              </View>
            );
          })}
        </View>

        {weeklyHistory.length === 0 && (
          <Text style={[styles.noHistory, { color: mutedColor, fontFamily: fonts.regular }]}>
            {t.noHistoryYet}
          </Text>
        )}
      </View>

      {/* ── Milestones ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
          {t.milestones}
        </Text>
        <View style={styles.milestonesGrid}>
          {MILESTONES.map(m => (
            <MilestoneBadge
              key={m}
              days={m}
              reached={currentStreak >= m}
              isNext={m === nextMilestone && currentStreak < m}
              current={currentStreak}
              isDark={isDark}
              colors={colors}
            />
          ))}
        </View>
      </View>

      {/* ── Achievements ── */}
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
        <View style={styles.achievementsHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111', fontFamily: fonts.bold }]}>
            {t.achievements}
          </Text>
          <Text style={[styles.achievementsSub, { color: mutedColor, fontFamily: fonts.regular }]}>
            {achievements.filter(a => a.unlocked).length}/{achievements.length} {t.unlocked}
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.badgesRow}>
            {achievements.map(a => (
              <AchievementBadge key={a.id} achievement={a} />
            ))}
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: {
    fontSize: 30,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
    gap: 14,
  },
  cardLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    letterSpacing: -0.3,
    marginBottom: 2,
  },

  // Streak freeze card
  freezeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freezeValue: {
    fontSize: 22,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  freezeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(96,165,250,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezeHint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 36,
    opacity: 0.3,
  },

  // Progress bar
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  milestoneTarget: {
    fontSize: 20,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  daysMore: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    minWidth: 8,
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: -8,
  },

  // Weekly tracker
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  dayDotCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dayDotCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayName: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 11,
  },
  noHistory: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 8,
  },

  // Milestones grid
  milestonesGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  milestoneBadge: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 4,
    position: 'relative',
  },
  milestoneDays: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  milestoneUnit: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  milestoneCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Achievements
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementsSub: {
    fontSize: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
});
