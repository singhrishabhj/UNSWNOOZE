import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function AlarmCompleteScreen() {
  const insets = useSafeAreaInsets();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { data } = useApp();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const ringScale1 = useRef(new Animated.Value(0.5)).current;
  const ringScale2 = useRef(new Animated.Value(0.5)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.8)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.6)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringScale1, { toValue: 2.5, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringScale1, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(ringOpacity1, { toValue: 0, duration: 1800, useNativeDriver: true }),
          Animated.timing(ringOpacity1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ])
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ringScale2, { toValue: 2.5, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringScale2, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ringOpacity2, { toValue: 0, duration: 1800, useNativeDriver: true }),
            Animated.timing(ringOpacity2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }, 600);

    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#0F0F0F', '#1A0800', '#0F0F0F']}
      style={[styles.container, { paddingTop: topPad }]}
    >
      <View style={styles.ringsContainer}>
        <Animated.View style={[styles.ring, { transform: [{ scale: ringScale1 }], opacity: ringOpacity1 }]} />
        <Animated.View style={[styles.ring, { transform: [{ scale: ringScale2 }], opacity: ringOpacity2 }]} />
      </View>

      <Animated.View style={[styles.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.checkCircle]}>
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.checkGrad}
          >
            <Feather name="sun" size={44} color="#fff" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Morning Started</Text>
        <Text style={styles.subtitle}>
          {data.currentStreak > 0
            ? `Day ${data.currentStreak} streak maintained.`
            : 'Great start! Keep going.'}
        </Text>

        <View style={styles.streakPill}>
          <Feather name="trending-up" size={16} color={Colors.primary} />
          <Text style={styles.streakText}>{data.currentStreak} Day Streak</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

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
    gap: 20,
  },
  checkCircle: {
  },
  checkGrad: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.35)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 8,
  },
  streakText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
  },
});
