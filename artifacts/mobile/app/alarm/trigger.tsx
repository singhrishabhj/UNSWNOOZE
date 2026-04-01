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
  const { data, recordSnooze, missAlarm } = useApp();

  const alarm = data.alarms.find(a => a.id === alarmId);

  // Always-current reference to the alarm object.
  // The sound-start effect ([] deps) reads from this ref instead of the
  // render-scope `alarm` variable. This avoids the stale-closure bug where
  // AppContext.loadData() hasn't finished by the time the first render runs,
  // leaving `alarm` as undefined and causing the effect to always fall back to
  // standard (beep) mode even when the user selected voice mode.
  const alarmRef = useRef(alarm);
  alarmRef.current = alarm; // updated on every render, never stale

  // Guards the sound-start block so a retry tick that fires after the alarm
  // data arrives doesn't start the sound a second time.
  const soundStartedRef = useRef(false);

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
  // Whether this alarm instance resolved to voice mode (captured at mount).
  const isVoiceModeRef = useRef(false);
  // Set to true right before router.replace('/alarm/task') so the standard-mode
  // useEffect cleanup knows NOT to stop the alarm (which must keep ringing
  // through the task screen until task.tsx calls stopAlarm()).
  const navigatingToTaskRef = useRef(false);
  // Timer ID for the voice-mode lead-in delay; stored so cleanup can cancel it.
  const voiceLeadInRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timer ID for the data-not-ready retry loop.
  const soundRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Becomes true after 3 s on-screen — prevents StrictMode double-mount from
  // firing missAlarm() on the first synthetic unmount in development.
  const wasShownRef = useRef(false);
  const wasShownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  // ─── Stop speech helper (native + web) ────────────────────────────────────
  const stopSpeech = useCallback(() => {
    speechStoppedRef.current = true;
    if (speechPauseRef.current) {
      clearTimeout(speechPauseRef.current);
      speechPauseRef.current = null;
    }
    // Native TTS
    try { Speech.stop(); } catch {}
    // Web SpeechSynthesis
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  }, []);

  // ─── Start looping alarm + speech on mount ─────────────────────────────────
  useEffect(() => {
    // ── Animation + haptics: start immediately, require no alarm data ─────────
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // ── Sound start: reads from alarmRef (never stale) with retry ─────────────
    // WHY: AppContext.loadData() is async. If this screen is pushed before the
    // initial load completes (e.g. tapping a notification immediately after cold
    // launch), the closure-captured `alarm` variable from the render scope would
    // be undefined, causing soundType to fall back to 'standard' even for voice-
    // mode alarms.  By reading alarmRef.current (updated on every render) from
    // inside a callback and retrying every 200 ms until it's populated, we
    // guarantee we always use the correct, user-chosen sound mode.
    const startSound = () => {
      const alarmData = alarmRef.current;

      if (!alarmData) {
        // Data not ready yet — retry after next context re-render flush.
        soundRetryRef.current = setTimeout(startSound, 200);
        return;
      }

      // Idempotency guard: if a retry fires concurrently with the data arriving,
      // only the first invocation proceeds.
      if (soundStartedRef.current) return;
      soundStartedRef.current = true;

      const rawTitle = (alarmData.title ?? '').trim();
      // Voice mode requires both soundType === 'voice' AND a non-empty title.
      // Fall back to standard beep if the title is blank so the alarm never
      // silently fails.
      const useVoice = alarmData.soundType === 'voice' && rawTitle.length > 0;
      isVoiceModeRef.current = useVoice;

      if (!useVoice) {
        // Standard mode: looping beep. Voice mode plays no beep.
        startAlarm();
        return;
      }

      // Voice mode: speak "Title. Wake up." on a 2.5 s loop.
      // Works on both native (expo-speech) and web (SpeechSynthesis API).
      const spokenText = `${rawTitle}. Wake up.`;

      const doSpeak = () => {
        if (speechStoppedRef.current) return;

        const scheduleNext = () => {
          if (!speechStoppedRef.current) {
            speechPauseRef.current = setTimeout(doSpeak, 2500);
          }
        };

        if (Platform.OS === 'web') {
          // Web: use the browser's built-in SpeechSynthesis API.
          // expo-speech is a native-only module and is a no-op on web.
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              const utterance = new SpeechSynthesisUtterance(spokenText);
              utterance.lang = 'en-US';
              utterance.rate = 0.85;
              utterance.pitch = 1.0;
              utterance.onend = scheduleNext;
              utterance.onerror = scheduleNext; // never get stuck
              window.speechSynthesis.cancel(); // clear any queued utterances first
              window.speechSynthesis.speak(utterance);
            } catch { scheduleNext(); }
          } else {
            // SpeechSynthesis unavailable — keep scheduling so the loop stays
            // alive; silence is better than an infinite crash loop.
            scheduleNext();
          }
        } else {
          // Native: use expo-speech
          try {
            Speech.speak(spokenText, {
              language: 'en',
              pitch: 1.0,
              rate: 0.85,
              onDone: scheduleNext,
              onError: scheduleNext, // never get stuck
            });
          } catch { scheduleNext(); }
        }
      };

      speakLoopRef.current = doSpeak;

      // Short lead-in so the user hears the haptic before speech starts.
      voiceLeadInRef.current = setTimeout(() => {
        speakLoopRef.current?.();
      }, 500);
    };

    startSound();

    // Mark the screen as "really shown" after 3 s so the cleanup can safely
    // call missAlarm(). This guard prevents React StrictMode's synthetic
    // double-mount from registering a false miss on first dev render.
    wasShownTimerRef.current = setTimeout(() => {
      wasShownRef.current = true;
    }, 3000);

    // ── Unified cleanup ────────────────────────────────────────────────────────
    // Runs on unmount (or StrictMode double-mount dev re-run).
    return () => {
      // Cancel a pending data-not-ready retry.
      if (soundRetryRef.current) {
        clearTimeout(soundRetryRef.current);
        soundRetryRef.current = null;
      }
      // Cancel a pending voice-mode lead-in.
      if (voiceLeadInRef.current) {
        clearTimeout(voiceLeadInRef.current);
        voiceLeadInRef.current = null;
      }
      // Cancel the "was shown" timer.
      if (wasShownTimerRef.current) {
        clearTimeout(wasShownTimerRef.current);
        wasShownTimerRef.current = null;
      }
      // Stop speech (voice mode). Safe to call in standard mode — it's a no-op.
      stopSpeech();
      // Stop alarm beep only when NOT intentionally navigating to the task
      // screen (navigatingToTaskRef set in handleCompleteTask). The alarm must
      // keep ringing through task.tsx so the user is pressured to complete the
      // wake-up task — task.tsx calls stopAlarm() on success or give-up.
      if (!navigatingToTaskRef.current) {
        stopAlarm();
        // If the user dismissed this screen without completing the task
        // (e.g. Android back button), record today as missed so the streak
        // tracker shows the X icon. Guard with wasShownRef to avoid
        // StrictMode double-mount false positives in development.
        if (wasShownRef.current) {
          missAlarm();
        }
      }
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

    // Silence whichever mode is active
    if (isVoiceModeRef.current) {
      stopSpeech();
    } else {
      stopAlarm();
    }

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

        // Restart whichever mode was active before snooze.
        // Voice mode: re-enable the loop flag and resume speaking on both
        // native AND web (the old Platform.OS !== 'web' guard caused web to
        // stay silent for the rest of the alarm after a snooze).
        if (isVoiceModeRef.current) {
          speechStoppedRef.current = false;
          setTimeout(() => speakLoopRef.current?.(), 500);
        } else {
          startAlarm();
        }
      }
    }, 1000);
  }, [snoozeUsed, snoozed, recordSnooze, stopSpeech]);

  const handleCompleteTask = useCallback(() => {
    if (snoozeTimerRef.current) clearInterval(snoozeTimerRef.current);
    // Mark intentional navigation so the standard-mode cleanup does NOT
    // call stopAlarm() — the alarm must keep ringing through the task screen.
    navigatingToTaskRef.current = true;
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
