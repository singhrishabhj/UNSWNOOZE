/**
 * FaceLivenessCheck — guided liveness verification using expo-camera.
 *
 * Shows a live front-facing camera feed and walks the user through four
 * steps with timed auto-advance. No external face-detection native module
 * is required, so it works in both Expo Go and custom dev builds.
 *
 *   1. Look at the camera   (2 s hold)
 *   2. Turn head LEFT       (3 s hold)
 *   3. Turn head RIGHT      (3 s hold)
 *   4. Blink                (2 s hold)
 *
 * The alarm continues ringing until onVerified() is called by the parent.
 */
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
}

type Step = 'detecting' | 'turn_left' | 'turn_right' | 'blink' | 'done';

const STEP_LABELS: Record<Step, string> = {
  detecting:  'Look at the camera',
  turn_left:  'Turn your head LEFT',
  turn_right: 'Turn your head RIGHT',
  blink:      'Now BLINK',
  done:       'Verified!',
};

const STEP_ICONS: Record<Step, string> = {
  detecting:  'eye',
  turn_left:  'arrow-left',
  turn_right: 'arrow-right',
  blink:      'check-circle',
  done:       'check',
};

// How long (ms) each step must be held before auto-advancing
const STEP_DURATION: Record<Step, number> = {
  detecting:  2000,
  turn_left:  3000,
  turn_right: 3000,
  blink:      2000,
  done:       0,
};

const STEPS_IN_ORDER: Step[] = ['detecting', 'turn_left', 'turn_right', 'blink', 'done'];

export const FaceLivenessCheck = React.memo(function FaceLivenessCheck({ onVerified }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('detecting');
  const [countdown, setCountdown] = useState(STEP_DURATION['detecting'] / 1000);
  const verifiedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const stepRef = useRef<Step>('detecting');

  // Keep stepRef in sync for timer callbacks
  useEffect(() => { stepRef.current = step; }, [step]);

  // Pulse animation on each step change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 180, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission().then(({ granted }) => {
        if (!granted) {
          Alert.alert(
            'Camera Required',
            'Camera access is needed to verify you are awake. Please grant permission.',
          );
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceStep = useCallback((current: Step) => {
    if (verifiedRef.current) return;
    const idx = STEPS_IN_ORDER.indexOf(current);
    if (idx < 0 || idx >= STEPS_IN_ORDER.length - 1) return;
    const next = STEPS_IN_ORDER[idx + 1] as Step;
    setStep(next);
    setCountdown(STEP_DURATION[next] / 1000);
    if (next === 'done') {
      verifiedRef.current = true;
      setTimeout(onVerified, 700);
    }
  }, [onVerified]);

  // Auto-advance each step after its allotted duration
  useEffect(() => {
    if (step === 'done') return;
    const duration = STEP_DURATION[step];
    if (!duration) return;

    setCountdown(duration / 1000);

    // Countdown tick (1 Hz)
    const tick = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    // Advance after full duration
    const advance = setTimeout(() => {
      advanceStep(step);
    }, duration);

    return () => {
      clearInterval(tick);
      clearTimeout(advance);
    };
  }, [step, advanceStep]);

  if (!permission?.granted) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.label}>Camera permission needed</Text>
        <Pressable
          onPress={() => requestPermission()}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.btnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  const progressIndex = STEPS_IN_ORDER.indexOf(step);

  return (
    <View style={styles.wrapper}>
      {/* Live camera preview */}
      <View style={styles.cameraWrapper}>
        <CameraView style={styles.camera} facing="front" />

        {/* Overlay: face oval guide */}
        <View style={styles.cameraOverlay}>
          <View style={[
            styles.ovalGuide,
            step === 'done' && { borderColor: '#34C759' },
          ]} />
        </View>
      </View>

      {/* Step progress dots */}
      <View style={styles.dotsRow}>
        {STEPS_IN_ORDER.filter(s => s !== 'done').map((s, i) => (
          <View
            key={s}
            style={[
              styles.dot,
              i < progressIndex && styles.dotDone,
              i === progressIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Current instruction */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center', gap: 6 }}>
        <Feather
          name={STEP_ICONS[step] as any}
          size={32}
          color={step === 'done' ? '#34C759' : Colors.primary}
          style={{ marginBottom: 4 }}
        />
        <Text style={[styles.label, step === 'done' && { color: '#34C759' }]}>
          {STEP_LABELS[step]}
        </Text>
        {step !== 'done' && (
          <Text style={styles.countdownText}>{countdown}s</Text>
        )}
        {Platform.OS === 'web' && step !== 'done' && (
          <Text style={styles.webNote}>Hold this pose — auto-detecting…</Text>
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 18,
    width: '100%',
  },
  cameraWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalGuide: {
    width: 160,
    height: 200,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotDone: {
    backgroundColor: '#34C759',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
    borderRadius: 4,
  },
  label: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  countdownText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
  },
  webNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.3)',
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  btnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
});
