import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const { width } = Dimensions.get('window');

export default function SplashEntry() {
  const { data, dataLoaded } = useApp();
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Only start navigation timer once real stored data is available.
    // On slow devices, loadData() can take > 2200 ms; without this guard the
    // first render's DEFAULT_DATA (onboardingComplete: false) would fire a
    // premature navigation to /onboarding before actual data is known.
    if (!dataLoaded) return;

    const timer = setTimeout(() => {
      if (data.onboardingComplete) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [data.onboardingComplete, dataLoaded]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.3] });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <View style={styles.clockContainer}>
          <View style={styles.clockFace}>
            <View style={styles.clockHand} />
            <View style={styles.clockHandMinute} />
            <View style={styles.clockCenter} />
          </View>
        </View>
        <Text style={styles.appName}>UNSNWOOZE</Text>
        <Text style={styles.tagline}>Smart Alarm</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  clockContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  clockFace: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHand: {
    position: 'absolute',
    width: 2,
    height: 18,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    top: 6,
    left: 29,
  },
  clockHandMinute: {
    position: 'absolute',
    width: 2,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    top: 8,
    left: 29,
    transform: [{ rotate: '90deg' }, { translateY: -11 }],
  },
  clockCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  appName: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.primary,
    letterSpacing: 3,
    marginTop: 6,
    textTransform: 'uppercase',
  },
});
