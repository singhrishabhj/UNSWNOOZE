import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
  onFailed: () => void;
}

type Phase = 'instructions' | 'camera' | 'verifying' | 'error';

// Rotating hints shown during the liveness check animation
const HINTS = [
  'Look directly at the camera',
  'Eyes open, face clearly visible',
  'Slight smile — you got this!',
];

export const FaceLivenessCheck = React.memo(function FaceLivenessCheck({ onVerified }: Props) {
  const [phase, setPhase] = useState<Phase>('instructions');
  const [hintIdx, setHintIdx] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run the fake liveness-check animation then pass/fail at 85 % rate
  const startVerifying = useCallback(() => {
    setPhase('verifying');
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    hintTimer.current = setInterval(() => setHintIdx(i => (i + 1) % HINTS.length), 900);

    setTimeout(() => {
      if (hintTimer.current) clearInterval(hintTimer.current);
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      if (Math.random() > 0.15) onVerified();
      else setPhase('error');
    }, 2500);
  }, [onVerified, spinAnim]);

  // Request camera permission then open the in-app camera view
  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Required', 'Please allow camera access for face verification.');
        return;
      }
    }
    setPhase('camera');
  }, [permission, requestPermission]);

  // Capture a frame from the in-app CameraView and begin verification
  const takeSelfie = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      startVerifying();
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  }, [startVerifying]);

  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (phase === 'instructions') {
    return (
      <View style={styles.wrapper}>
        <View style={styles.iconCircle}>
          <Feather name="smile" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.hint}>
          Take a selfie with your eyes open and a slight smile to confirm you are awake.
        </Text>
        <Pressable
          onPress={openCamera}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="camera" size={18} color="#fff" />
          <Text style={styles.btnText}>Open Camera</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'camera') {
    return (
      <View style={styles.cameraWrapper}>
        {/* Front-facing in-app camera — does NOT open the system camera app */}
        <CameraView ref={cameraRef} style={styles.camera} facing="front" />
        <View style={styles.cameraOverlay}>
          {/* Oval guide to help the user frame their face */}
          <View style={styles.faceGuide} />
          <Text style={styles.guideLabel}>Align your face inside the oval</Text>
          <Pressable
            onPress={takeSelfie}
            style={({ pressed }) => [styles.captureBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={styles.captureInner} />
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === 'verifying') {
    return (
      <View style={styles.wrapper}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Feather name="loader" size={64} color={Colors.primary} />
        </Animated.View>
        <Text style={styles.statusLabel}>LIVELINESS CHECK</Text>
        <Text style={styles.hint}>{HINTS[hintIdx]}</Text>
      </View>
    );
  }

  // error phase
  return (
    <View style={styles.wrapper}>
      <View style={[styles.iconCircle, { borderColor: 'rgba(255,59,48,0.3)', backgroundColor: 'rgba(255,59,48,0.1)' }]}>
        <Feather name="alert-circle" size={48} color="#FF3B30" />
      </View>
      <Text style={[styles.hint, { color: '#FF3B30' }]}>
        Face verification failed. Please try again.
      </Text>
      <Pressable
        onPress={() => setPhase('camera')}
        style={({ pressed }) => [styles.btn, styles.retryBtn, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Text style={[styles.btnText, { color: '#FF3B30' }]}>Try Again</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.3)',
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  hint: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: Colors.primary,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  retryBtn: {
    backgroundColor: 'rgba(255,59,48,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
  },
  // In-app camera styles
  cameraWrapper: {
    width: '100%',
    height: 340,
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
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  faceGuide: {
    width: 180,
    height: 230,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  guideLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
});
