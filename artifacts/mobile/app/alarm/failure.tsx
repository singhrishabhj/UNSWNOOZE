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
import { useTranslation } from '@/hooks/useTranslation';

export default function AlarmFailureScreen() {
  const insets = useSafeAreaInsets();
  const { data, missAlarm } = useApp();
  const { t, fonts } = useTranslation();

  // Capture freeze state BEFORE missAlarm() consumes it, so the UI reflects
  // the outcome accurately even after the state update re-renders.
  const willUseFreeze = data.streakFreezeCount > 0 && data.currentStreak > 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    missAlarm();
    Haptics.notificationAsync(
      willUseFreeze
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error,
    );

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={[styles.glow, willUseFreeze && styles.glowBlue]} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Animated.View
          style={[
            styles.iconWrap,
            willUseFreeze && styles.iconWrapBlue,
            { transform: [{ scale: iconScale }] },
          ]}
        >
          <Feather
            name={willUseFreeze ? 'shield' : 'moon'}
            size={44}
            color={willUseFreeze ? '#60a5fa' : '#FF4444'}
          />
        </Animated.View>

        <View style={styles.textBlock}>
          <Text style={[styles.headline, { fontFamily: fonts.bold }]}>
            {willUseFreeze ? t.streakProtected : t.missedWakeUp}
          </Text>

          {willUseFreeze ? (
            <View style={[styles.bulletList, styles.bulletListBlue]}>
              <BulletRow
                icon="shield"
                text={t.freezeConsumed}
                color="rgba(96,165,250,0.8)"
                fontFamily={fonts.regular}
              />
              <BulletRow
                icon="trending-up"
                text={t.streakProtectedSub}
                color="rgba(96,165,250,0.8)"
                fontFamily={fonts.regular}
              />
              <BulletRow
                icon="sunrise"
                text={t.tryTomorrow}
                color="rgba(96,165,250,0.8)"
                fontFamily={fonts.regular}
              />
            </View>
          ) : (
            <View style={styles.bulletList}>
              <BulletRow
                icon="trending-down"
                text={t.streakReset}
                color="rgba(255,68,68,0.7)"
                fontFamily={fonts.regular}
              />
              <BulletRow
                icon="minus-circle"
                text={t.scoreDrop}
                color="rgba(255,68,68,0.7)"
                fontFamily={fonts.regular}
              />
              <BulletRow
                icon="sunrise"
                text={t.tryTomorrow}
                color="rgba(255,68,68,0.7)"
                fontFamily={fonts.regular}
              />
            </View>
          )}
        </View>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.btnText, { fontFamily: fonts.semiBold }]}>{t.backToDashboard}</Text>
        </Pressable>

        <Text style={[styles.footnote, { fontFamily: fonts.regular }]}>{t.footnote}</Text>
      </Animated.View>
    </View>
  );
}

function BulletRow({
  icon,
  text,
  color,
  fontFamily,
}: {
  icon: string;
  text: string;
  color: string;
  fontFamily: string;
}) {
  return (
    <View style={styles.bulletRow}>
      <Feather name={icon as any} size={15} color={color} />
      <Text style={[styles.bulletText, { fontFamily }]}>{text}</Text>
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
  glowBlue: {
    backgroundColor: '#3B82F6',
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
  iconWrapBlue: {
    backgroundColor: 'rgba(96,165,250,0.1)',
    borderColor: 'rgba(96,165,250,0.35)',
  },
  textBlock: {
    alignItems: 'center',
    gap: 24,
    width: '100%',
  },
  headline: {
    fontSize: 30,
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
  bulletListBlue: {
    backgroundColor: 'rgba(96,165,250,0.06)',
    borderColor: 'rgba(96,165,250,0.2)',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletText: {
    fontSize: 15,
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
    color: '#FFFFFF',
  },
  footnote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
