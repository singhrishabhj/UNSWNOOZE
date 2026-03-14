import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StreakRingProps {
  currentStreak: number;
  bestStreak: number;
  targetStreak?: number;
}

export const StreakRing = React.memo(function StreakRing({ currentStreak, bestStreak, targetStreak = 30 }: StreakRingProps) {
  const { isDark, colors } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(currentStreak / targetStreak, 1);

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: progress,
      tension: 40,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const trackColor = isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated;
  const nextMilestone = [3, 7, 15, 30].find(m => m > currentStreak) ?? 30;
  const daysToNext = nextMilestone - currentStreak;

  return (
    <View style={styles.container}>
      <View style={[styles.ringWrapper, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${size / 2}, ${size / 2})`}
          />
        </Svg>
        <View style={styles.innerContent}>
          <Text style={[styles.streakNumber, { color: isDark ? '#fff' : '#111' }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.streakLabel, { color: Colors.primary }]}>
            Day Streak
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={[styles.metaValue, { color: isDark ? '#fff' : '#111' }]}>{bestStreak}</Text>
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Best</Text>
        </View>
        <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metaItem}>
          <Text style={[styles.metaValue, { color: isDark ? '#fff' : '#111' }]}>{daysToNext}</Text>
          <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>To next</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  streakNumber: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
    includeFontPadding: false,
    lineHeight: 44,
  },
  streakLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  metaItem: {
    alignItems: 'center',
    gap: 2,
  },
  metaValue: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  metaDivider: {
    width: 1,
    height: 28,
    opacity: 0.35,
  },
});
