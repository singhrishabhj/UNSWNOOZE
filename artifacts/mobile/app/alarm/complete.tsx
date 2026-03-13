import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

// ─── Confetti ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  Colors.primary,
  '#FFD700',
  '#FF8C33',
  '#00C896',
  '#4FC3F7',
  '#FF6B9D',
  '#A78BFA',
  '#FFFFFF',
];

const SHAPES = ['square', 'rect', 'circle'] as const;

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rot: Animated.Value;
  opacity: Animated.Value;
  scaleX: Animated.Value;
  color: string;
  size: number;
  shape: 'square' | 'rect' | 'circle';
}

function Confetti() {
  const pieces = useRef<ConfettiPiece[]>(
    Array.from({ length: 40 }, (_, i) => ({
      x: new Animated.Value(30 + (i / 40) * 360 + (Math.random() - 0.5) * 80),
      y: new Animated.Value(-30 - Math.random() * 80),
      rot: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scaleX: new Animated.Value(1),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.floor(Math.random() * 8),
      shape: SHAPES[i % 3],
    })),
  ).current;

  useEffect(() => {
    pieces.forEach((p, i) => {
      const delay = i * 40;
      const duration = 1600 + Math.random() * 900;
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: 900,
          duration,
          delay,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(p.rot, {
          toValue: 3 + Math.random() * 6,
          duration: duration * 0.9,
          delay,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(p.scaleX, {
              toValue: 0.2,
              duration: 220 + Math.random() * 80,
              useNativeDriver: true,
            }),
            Animated.timing(p.scaleX, {
              toValue: 1,
              duration: 220 + Math.random() * 80,
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.sequence([
          Animated.delay(delay + duration * 0.7),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: p.shape === 'rect' ? p.size * 0.5 : p.size,
            height: p.shape === 'rect' ? p.size * 1.6 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? p.size : 1,
            opacity: p.opacity,
            transform: [
              { translateX: p.x },
              { translateY: p.y },
              { scaleX: p.scaleX },
              {
                rotate: p.rot.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

// ─── AlarmCompleteScreen ───────────────────────────────────────────────────────

export default function AlarmCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useApp();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0.5)).current;
  const ringScale2 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.6)).current;
  const scorePillAnim = useRef(new Animated.Value(0)).current;
  const streakScaleAnim = useRef(new Animated.Value(1)).current;

  // Counting state
  const disciplineScore = data.disciplineScore;
  const prevScore = Math.max(0, disciplineScore - 5);
  const [displayScore, setDisplayScore] = useState(prevScore);

  const currentStreak = data.currentStreak;
  const [displayStreak, setDisplayStreak] = useState(Math.max(0, currentStreak - 1));

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    // Haptics sequence: success pulse + confirmation tap
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 300);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 600);

    // Entrance
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 40, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
    ]).start();

    // Ripple rings
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale1, { toValue: 2.8, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringScale1, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity1, { toValue: 0, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringOpacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringScale2, { toValue: 2.8, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringScale2, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity2, { toValue: 0, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringOpacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      ).start();
    }, 600);

    // Stats appear at 700ms then count up
    setTimeout(() => {
      Animated.spring(scorePillAnim, {
        toValue: 1, tension: 60, friction: 8, useNativeDriver: true,
      }).start();

      // Count score up: prevScore → disciplineScore over 900ms
      const scoreDiff = disciplineScore - prevScore;
      if (scoreDiff > 0) {
        const stepMs = 900 / scoreDiff;
        let cur = prevScore;
        const id = setInterval(() => {
          cur += 1;
          setDisplayScore(cur);
          if (cur >= disciplineScore) clearInterval(id);
        }, stepMs);
      }

      // Count streak up if it changed
      const streakDiff = currentStreak - Math.max(0, currentStreak - 1);
      if (streakDiff > 0) {
        setTimeout(() => {
          setDisplayStreak(currentStreak);
          // Pop the streak badge
          Animated.sequence([
            Animated.spring(streakScaleAnim, {
              toValue: 1.35, tension: 200, friction: 5, useNativeDriver: true,
            }),
            Animated.spring(streakScaleAnim, {
              toValue: 1, tension: 120, friction: 6, useNativeDriver: true,
            }),
          ]).start();
        }, 400);
      }
    }, 700);

    // Auto-navigate after 3.5s
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0F0F0F', '#0D1A00', '#0F0F0F']}
      style={[styles.container, { paddingTop: topPad }]}
    >
      <Confetti />

      {/* Ripple rings */}
      <View style={styles.ringsContainer}>
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }]}
        />
        <Animated.View
          style={[styles.ring, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]}
        />
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Check icon */}
        <LinearGradient
          colors={['#FF8C33', Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkGrad}
        >
          <Feather name="check" size={48} color="#fff" />
        </LinearGradient>

        {/* Headline */}
        <View style={styles.textGroup}>
          <Text style={styles.title}>Wake Up Completed</Text>
          <Text style={styles.subtitle}>
            {currentStreak > 1
              ? `${currentStreak} day streak — keep going.`
              : currentStreak === 1
              ? 'First day down. Build on it.'
              : 'Great start! Keep going.'}
          </Text>
        </View>

        {/* Stats row */}
        <Animated.View
          style={[styles.statsRow, { transform: [{ scale: scorePillAnim }], opacity: scorePillAnim }]}
        >
          {/* Streak pill with pop */}
          <Animated.View
            style={[styles.statPill, { transform: [{ scale: streakScaleAnim }] }]}
          >
            <Feather name="trending-up" size={15} color={Colors.primary} />
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{displayStreak}d</Text>
          </Animated.View>

          {/* Score pill with counter */}
          <View style={[styles.statPill, styles.statPillGreen]}>
            <Feather name="award" size={15} color="#00C896" />
            <Text style={[styles.statLabel, { color: '#00C896' }]}>Discipline</Text>
            <Text style={[styles.statValue, { color: '#00C896' }]}>
              +5 → {displayScore}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  content: {
    alignItems: 'center',
    gap: 28,
    paddingHorizontal: 32,
    maxWidth: 420,
    width: '100%',
  },
  checkGrad: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  statPillGreen: {
    backgroundColor: 'rgba(0,200,150,0.1)',
    borderColor: 'rgba(0,200,150,0.3)',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
