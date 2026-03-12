import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef } from 'react';
import {
  Alert,
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
import { StreakRing } from '@/components/StreakRing';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, achievements, deleteAlarm, toggleAlarm } = useApp();
  const fabScale = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleDelete = (id: string) => {
    Alert.alert('Delete Alarm', 'Remove this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAlarm(id);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/alarm/create');
  };

  const bg = isDark ? colors.background : colors.background;
  const cardBg = isDark ? colors.surface : colors.card;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: bottomPad + 100, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Good morning</Text>
            <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#111' }]}>UNSNWOOZE</Text>
          </View>
        </View>

        <View style={[styles.clockCard, { backgroundColor: cardBg, borderColor: isDark ? colors.border : colors.border }]}>
          <DigitalClock large />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: isDark ? colors.border : colors.border }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>Your Streak</Text>
          <View style={styles.streakCenter}>
            <StreakRing currentStreak={data.currentStreak} bestStreak={data.bestStreak} />
          </View>
        </View>

        {achievements.some(a => a.unlocked) && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: isDark ? colors.border : colors.border }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>Achievements</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              <View style={styles.badgesRow}>
                {achievements.map(a => (
                  <AchievementBadge key={a.id} achievement={a} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.alarmsHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#111' }]}>Alarms</Text>
          <Text style={[styles.alarmsCount, { color: colors.textMuted }]}>
            {data.alarms.filter(a => a.enabled).length} active
          </Text>
        </View>

        {data.alarms.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: cardBg, borderColor: colors.border }]}>
            <Feather name="bell-off" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#111' }]}>No alarms set</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Tap the + button to create your first alarm
            </Text>
          </View>
        ) : (
          data.alarms.map(alarm => (
            <AlarmCard
              key={alarm.id}
              alarm={alarm}
              onToggle={() => toggleAlarm(alarm.id)}
              onPress={() => router.push({ pathname: '/alarm/create', params: { editId: alarm.id } })}
              onDelete={() => handleDelete(alarm.id)}
            />
          ))
        )}
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  clockCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  streakCenter: {
    alignItems: 'center',
  },
  badgesScroll: {
    marginTop: -4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
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
  fabContainer: {
    position: 'absolute',
    right: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
