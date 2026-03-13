import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/constants/colors';

const RING_SIZE = 88;
const STROKE_W = 7;
const RADIUS = (RING_SIZE - STROKE_W * 2) / 2;
const CIRCUMFERENCE = RADIUS * 2 * Math.PI;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  score: number;
}

export function DisciplineRing({ score }: Props) {
  const progressAnim = useRef(new Animated.Value(score / 100)).current;
  const [displayScore, setDisplayScore] = useState(score);
  const prevScore = useRef(score);
  const counterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animateTo = (from: number, to: number) => {
    if (counterRef.current) clearInterval(counterRef.current);

    const diff = to - from;
    if (diff === 0) return;

    const duration = 900;
    const steps = Math.abs(diff);
    const stepMs = duration / steps;

    let current = from;
    counterRef.current = setInterval(() => {
      current += diff > 0 ? 1 : -1;
      setDisplayScore(current);
      if (current === to) {
        if (counterRef.current) clearInterval(counterRef.current);
      }
    }, stepMs);

    Animated.timing(progressAnim, {
      toValue: to / 100,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    const from = prevScore.current;
    const to = score;
    if (from !== to) {
      animateTo(from, to);
      prevScore.current = to;
    }
  }, [score]);

  useEffect(() => {
    return () => {
      if (counterRef.current) clearInterval(counterRef.current);
    };
  }, []);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;

  return (
    <View style={styles.wrapper}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svg}>
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke="rgba(255,107,0,0.15)"
          strokeWidth={STROKE_W}
          fill="transparent"
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke={Colors.primary}
          strokeWidth={STROKE_W}
          fill="transparent"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeLinecap="round"
          strokeDashoffset={strokeDashoffset}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{displayScore}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
