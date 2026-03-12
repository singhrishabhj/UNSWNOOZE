import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

function AnimatedDigit({ digit, style }: { digit: string; style?: any }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (prevDigit.current !== digit) {
      slideAnim.setValue(-30);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
      prevDigit.current = digit;
    }
  }, [digit]);

  return (
    <Animated.Text
      style={[style, { transform: [{ translateY: slideAnim }] }]}
    >
      {digit}
    </Animated.Text>
  );
}

interface DigitalClockProps {
  large?: boolean;
}

export function DigitalClock({ large = true }: DigitalClockProps) {
  const { isDark, colors } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = (hours % 12 || 12).toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const fontSize = large ? 64 : 48;
  const textColor = isDark ? '#FFFFFF' : '#111111';

  return (
    <View style={styles.container}>
      <View style={styles.glowContainer}>
        <View style={[styles.glow, { opacity: isDark ? 0.15 : 0.08 }]} />
      </View>
      <View style={styles.timeRow}>
        <View style={styles.digitGroup}>
          <AnimatedDigit digit={displayHours[0]} style={[styles.digit, { fontSize, color: textColor }]} />
          <AnimatedDigit digit={displayHours[1]} style={[styles.digit, { fontSize, color: textColor }]} />
        </View>
        <Text style={[styles.colon, { fontSize: fontSize * 0.8, color: Colors.primary }]}>:</Text>
        <View style={styles.digitGroup}>
          <AnimatedDigit digit={minutes[0]} style={[styles.digit, { fontSize, color: textColor }]} />
          <AnimatedDigit digit={minutes[1]} style={[styles.digit, { fontSize, color: textColor }]} />
        </View>
        <View style={styles.ampmContainer}>
          <Text style={[styles.ampm, { color: Colors.primary }]}>{ampm}</Text>
          <Text style={[styles.seconds, { color: isDark ? Colors.dark.textMuted : Colors.light.textMuted }]}>{seconds}</Text>
        </View>
      </View>
      <Text style={[styles.date, { color: isDark ? colors.textSecondary : colors.textSecondary }]}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: -20,
  },
  glow: {
    width: 280,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  digitGroup: {
    flexDirection: 'row',
  },
  digit: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  colon: {
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  ampmContainer: {
    marginBottom: 8,
    marginLeft: 6,
    alignItems: 'flex-start',
  },
  ampm: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  seconds: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.2,
  },
});
