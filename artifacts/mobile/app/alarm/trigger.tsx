import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DigitalClock } from '@/components/DigitalClock';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { startAlarm, stopAlarm } from '@/services/alarmSound';

const MOTIVATIONAL = [
  'Rise and conquer the day.',
  'Your future self will thank you.',
  'Champions wake up early.',
  'The morning belongs to those who earn it.',
];

const SNOOZE_SECONDS = 5 * 60;

export default function AlarmTriggerScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { data, recordSnooze } = useApp();

  const alarm = data.alarms.find(a => a.id === alarmId);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [quote] = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);

  const [snoozed, setSnoozed] = useState(false);
  const [snoozeUsed, setSnoozeUsed] = useState(false);
  const [snoozeCountdown, setSnoozeCountdown] = useState(SNOOZE_SECONDS);
  const snoozeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Speech management refs ────────────────────────────────────────────────
  // speechStoppedRef gates the recursive speak loop so it stops cleanly even
  // when the onDone callback fires after navigation / snooze.
  const speechStoppedRef = useRef(false);
  const speechPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable reference to the recursive speak function, built once on mount.
  const speakLoopRef = useRef<(() => void) | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // ─── Stop speech helper ────────────────────────────────────────────────────
  const stopSpeech = useCallback(() => {
    speechStoppedRef.current = true;
    if (speechPauseRef.current) {
      clearTimeout(speechPauseRef.current);
      speechPauseRef.current = null;
    }
    try { Speech.stop(); } catch {}
  }, []);

  // ─── Start looping alarm + speech on mount ─────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    startAlarm();

    // Build the speak-loop function. Capture alarm details once at mount so
    // the closure is stable across the component's lifecycle.
    if (Platform.OS !== 'web') {
      const title = (alarm?.title ?? '').trim() || 'Wake Up';
      // voice mode → repeat title in a loop; standard mode → announce once
      const isVoice = alarm?.soundType === 'voice';

      const doSpeak = () => {
        if (speechStoppedRef.current) return;
        try {
          Speech.speak(title, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
            onDone: () => {
              // Loop again after 2.5 s gap — both modes loop until task done
              if (!speechStoppedRef.current) {
                speechPauseRef.current = setTimeout(doSpeak, isVoice ? 2500 : 8000);
              }
            },
            onError: () => {},
          });
        } catch {}
      };
      speakLoopRef.current = doSpeak;

      // Let the alarm sound lead by 1.2 s before first announcement.
      // doSpeak() checks speechStoppedRef internally — no need to force-reset here.
      const initialDelay = setTimeout(() => {
        speakLoopRef.current?.();
      }, 1200);

      return () => {
        clearTimeout(initialDelay);
        stopSpeech();
        if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);
      };
    }

    return () => {
      if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnooze = useCallback(() => {
    if (snoozeUsed || snoozed) return;
    recordSnooze();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSnoozed(true);
    setSnoozeUsed(true);
    stopAlarm();
    stopSpeech(); // silence speech during snooze

    let remaining = SNOOZE_SECONDS;
    setSnoozeCountdown(remaining);

    snoozeTimerRef.current = setInterval(() => {
      remaining -= 1;
      setSnoozeCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(snoozeTimerRef.current!);
        snoozeTimerRef.current = null;
        setSnoozed(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        startAlarm();
        // Restart speech loop after snooze
        if (Platform.OS !== 'web') {
          speechStoppedRef.current = false;
          setTimeout(() => speakLoopRef.current?.(), 1200);
        }
      }
    }, 1000);
  }, [snoozeUsed, snoozed, recordSnooze, stopSpeech]);

  const handleCompleteTask = useCallback(() => {
    if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);
    // Speech stops here; alarm SOUND keeps ringing through the task screen
    // and is stopped only by task.tsx on success or give-up.
    stopSpeech();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace({ pathname: '/alarm/task', params: { alarmId } });
  }, [alarmId, stopSpeech]);

  const snoozeMinutes = Math.floor(snoozeCountdown / 60);
  const snoozeSeconds = snoozeCountdown % 60;
  const snoozeLabel = `${snoozeMinutes}:${String(snoozeSeconds).padStart(2, '0')}`;

  return (
    <LinearGradient
      colors={['#0F0F0F', '#1A0800', '#0F0F0F']}
      style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <View style={styles.glowBg} />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <DigitalClock large />
        </View>

        <View style={styles.midSection}>
          {/* Alarm title — passed via navigation params via the alarm object */}
          <Text style={styles.alarmTitle}>{alarm?.title ?? 'Wake Up'}</Text>
          <Text style={styles.quote}>{quote}</Text>
        </View>

        <View style={styles.soundRow}>
          <View style={styles.soundIndicator}>
            <Feather
              name={snoozed ? 'moon' : alarm?.soundType === 'voice' ? 'mic' : 'volume-2'}
              size={13}
              color={Colors.primary}
            />
            <Text style={styles.soundText}>
              {snoozed
                ? 'Alarm snoozed'
                : alarm?.soundType === 'voice'
                ? 'Speaking alarm title'
                : 'Alarm ringing'}
            </Text>
          </View>
        </View>

        {/* Primary wake-up button */}
        <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: pulseAnim }] }]}>
          <Pressable
            onPress={handleCompleteTask}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={['#FF8C33', Colors.primary, '#CC5500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.wakeBtn}
            >
              <Feather name="zap" size={22} color="#fff" style={{ marginBottom: 6 }} />
              <Text style={styles.wakeBtnText}>Complete Wake-Up Task</Text>
              <Text style={styles.wakeBtnSub}>Alarm won't stop until you do</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Snooze row */}
        <View style={styles.snoozeRow}>
          {snoozed ? (
            <View style={styles.snoozeCountdownPill}>
              <Feather name="clock" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={styles.snoozeCountdownText}>
                Alarm restarts in {snoozeLabel}
              </Text>
            </View>
          ) : snoozeUsed ? (
            <Text style={styles.snoozeUsedText}>Snooze used — complete the task</Text>
          ) : (
            <Pressable onPress={handleSnooze} style={styles.snoozeBtn}>
              <Feather name="moon" size={14} color="rgba(255,255,255,0.45)" />
              <Text style={styles.snoozeBtnText}>Snooze · 5 min (1× only)</Text>
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  glowBg: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.06,
    top: '20%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  topSection: { alignItems: 'center', marginTop: 20, width: '100%' },
  midSection: { alignItems: 'center', gap: 16, width: '100%' },
  alarmTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  quote: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  soundRow: { alignItems: 'center' },
  soundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  soundText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  buttonWrapper: { width: '100%' },
  wakeBtn: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 4,
  },
  wakeBtnText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
  },
  wakeBtnSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.75)',
  },
  snoozeRow: {
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  snoozeBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.45)',
  },
  snoozeCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  snoozeCountdownText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.4)',
  },
  snoozeUsedText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,107,0,0.6)',
  },
});
