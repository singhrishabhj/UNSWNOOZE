/**
 * FaceLivenessCheck — real-time liveness verification using expo-camera +
 * expo-face-detector. No shutter button. The camera runs continuously and
 * the user must complete three steps in order:
 *   1. A face is detected in the frame.
 *   2. Turn head LEFT  (yawAngle < −YAW_THRESHOLD)
 *   3. Turn head RIGHT (yawAngle >  YAW_THRESHOLD)
 *   4. Blink           (both eye-open probabilities < BLINK_THRESHOLD)
 *
 * On web (where expo-face-detector is unavailable) each step is auto-
 * advanced after a short delay so the flow can still be demonstrated.
 *
 * The alarm continues ringing until onVerified() is called by the parent.
 */
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
}

type Step = 'permission' | 'detecting' | 'turn_left' | 'turn_right' | 'blink' | 'done';

const YAW_THRESHOLD = 22;   // degrees — comfortable but deliberate head turn
const BLINK_THRESHOLD = 0.35; // eye-open probability; lower = more closed
const FRAMES_NEEDED = 3;    // consecutive frames required to advance step

const STEP_LABELS: Record<Step, string> = {
  permission: 'Camera access needed',
  detecting:  'Look at the camera',
  turn_left:  'Turn your head LEFT',
  turn_right: 'Turn your head RIGHT',
  blink:      'Blink to stop alarm',
  done:       'Verified!',
};

const STEP_ICONS: Record<Step, string> = {
  permission: 'lock',
  detecting:  'eye',
  turn_left:  'arrow-left',
  turn_right: 'arrow-right',
  blink:      'check-circle',
  done:       'check',
};

const STEPS_IN_ORDER: Step[] = ['detecting', 'turn_left', 'turn_right', 'blink', 'done'];

export const FaceLivenessCheck = React.memo(function FaceLivenessCheck({ onVerified }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('detecting');
  const consecutiveFrames = useRef(0);
  const stepRef = useRef<Step>('detecting');
  const verifiedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Keep stepRef in sync so the onFacesDetected callback always reads current step
  useEffect(() => { stepRef.current = step; }, [step]);

  // Pulse the instruction label each time the step changes
  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.12, duration: 180, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // Ask for camera permission on mount
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
  }, []);

  // Web fallback — auto-advance each step on a timer since face detection
  // APIs are not available in browser environments.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const delays: Record<Step, number> = {
      permission: 0,
      detecting:  1500,
      turn_left:  2500,
      turn_right: 2500,
      blink:      2500,
      done:       0,
    };
    const currentStep = step;
    if (currentStep === 'done') return;
    const delay = delays[currentStep];
    if (!delay) return;
    const timer = setTimeout(() => {
      advanceStep(currentStep);
    }, delay);
    return () => clearTimeout(timer);
  }, [step]);

  const advanceStep = useCallback((current: Step) => {
    if (verifiedRef.current) return;
    const idx = STEPS_IN_ORDER.indexOf(current);
    if (idx < 0) return;
    const next = STEPS_IN_ORDER[idx + 1] as Step;
    consecutiveFrames.current = 0;
    setStep(next);
    if (next === 'done') {
      verifiedRef.current = true;
      // Small delay so the user sees "Verified!" before the screen changes
      setTimeout(onVerified, 800);
    }
  }, [onVerified]);

  /**
   * Called every frame (≈ 150 ms) with the list of detected faces.
   * Uses a consecutive-frame counter to avoid false positives from brief
   * accidental poses.
   */
  const handleFacesDetected = useCallback(({ faces }: { faces: FaceDetector.FaceFeature[] }) => {
    if (verifiedRef.current) return;
    const current = stepRef.current;

    if (faces.length === 0) {
      consecutiveFrames.current = 0;
      return;
    }

    const face = faces[0];
    const yaw = face.yawAngle ?? 0;
    const leftOpen = face.leftEyeOpenProbability ?? 1;
    const rightOpen = face.rightEyeOpenProbability ?? 1;

    let conditionMet = false;

    if (current === 'detecting') {
      // Any face in frame is enough
      conditionMet = true;
    } else if (current === 'turn_left') {
      // Negative yaw = face turned left (from user's POV with front camera)
      conditionMet = yaw < -YAW_THRESHOLD;
    } else if (current === 'turn_right') {
      // Positive yaw = face turned right (from user's POV with front camera)
      conditionMet = yaw > YAW_THRESHOLD;
    } else if (current === 'blink') {
      // Both eyes must be closed simultaneously
      conditionMet = leftOpen < BLINK_THRESHOLD && rightOpen < BLINK_THRESHOLD;
    }

    if (conditionMet) {
      consecutiveFrames.current += 1;
      if (consecutiveFrames.current >= FRAMES_NEEDED) {
        advanceStep(current);
      }
    } else {
      consecutiveFrames.current = 0;
    }
  }, [advanceStep]);

  if (!permission?.granted) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.label}>Camera permission needed</Text>
        <Pressable
          onPress={requestPermission}
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
        <CameraView
          style={styles.camera}
          facing="front"
          onFacesDetected={Platform.OS !== 'web' ? handleFacesDetected : undefined}
          faceDetectorSettings={Platform.OS !== 'web' ? {
            mode: FaceDetector.FaceDetectorMode.fast,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
            runClassifications: FaceDetector.FaceDetectorClassifications.all,
            minDetectionInterval: 150,
            tracking: true,
          } : undefined}
        />

        {/* Overlay: face oval guide */}
        <View style={styles.cameraOverlay}>
          <View style={styles.ovalGuide} />
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
      <Animated.View style={{ transform: [{ scale: pulseAnim }], alignItems: 'center' }}>
        <Feather
          name={STEP_ICONS[step] as any}
          size={32}
          color={step === 'done' ? '#34C759' : Colors.primary}
          style={{ marginBottom: 8 }}
        />
        <Text style={[styles.label, step === 'done' && { color: '#34C759' }]}>
          {STEP_LABELS[step]}
        </Text>
        {Platform.OS === 'web' && step !== 'done' && (
          <Text style={styles.webNote}>Auto-detecting on device…</Text>
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
  webNote: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
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
