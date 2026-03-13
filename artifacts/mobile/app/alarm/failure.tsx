import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';

export default function AlarmFailureScreen() {
  const insets = useSafeAreaInsets();
  const { missAlarm } = useApp();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    missAlarm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Subtle red glow */}
      <View style={styles.glow} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
          <Feather name="moon" size={44} color="#FF4444" />
        </Animated.View>

        {/* Messages */}
        <View style={styles.textBlock}>
          <Text style={styles.headline}>You missed today's{'\n'}wake-up.</Text>

          <View style={styles.bulletList}>
            <BulletRow icon="trending-down" text="Your streak has reset." />
            <BulletRow icon="minus-circle" text="Discipline score dropped by 5." />
            <BulletRow icon="sunrise" text="Try again tomorrow." />
          </View>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.btnText}>Back to Dashboard</Text>
        </Pressable>

        <Text style={styles.footnote}>
          Consistency is built one morning at a time.
        </Text>
      </Animated.View>
    </View>
  );
}

function BulletRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Feather name={icon as any} size={15} color="rgba(255,68,68,0.7)" />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#FF2222',
    opacity: 0.05,
    top: '15%',
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 36,
    gap: 32,
    maxWidth: 420,
    width: '100%',
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  headline: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  bulletList: {
    gap: 14,
    width: '100%',
    backgroundColor: 'rgba(255,68,68,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  btn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 24,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  footnote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
