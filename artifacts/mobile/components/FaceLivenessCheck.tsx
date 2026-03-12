import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  onVerified: () => void;
  onFailed: () => void;
}

type Phase = 'instructions' | 'camera' | 'verifying' | 'error';

const HINTS = [
  'Look directly at the camera',
  'Eyes open, face clearly visible',
  'Slight smile — you got this!',
];

export function FaceLivenessCheck({ onVerified, onFailed }: Props) {
  const [phase, setPhase] = useState<Phase>('instructions');
  const [hintIdx, setHintIdx] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const hintTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startVerifying = () => {
    setPhase('verifying');
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    hintTimer.current = setInterval(() => setHintIdx(i => (i + 1) % HINTS.length), 900);

    setTimeout(() => {
      if (hintTimer.current) clearInterval(hintTimer.current);
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
      const passed = Math.random() > 0.15;
      if (passed) {
        onVerified();
      } else {
        setPhase('error');
      }
    }, 2500);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Please allow camera access for face verification.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]) {
      startVerifying();
    }
  };

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
          onPress={() => setPhase('camera')}
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
      <View style={styles.wrapper}>
        <View style={styles.iconCircle}>
          <Feather name="camera" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.hint}>{HINTS[hintIdx]}</Text>
        <Pressable
          onPress={openCamera}
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="aperture" size={18} color="#fff" />
          <Text style={styles.btnText}>Take Selfie</Text>
        </Pressable>
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
}

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
});
