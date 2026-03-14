import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FaceLivenessCheck } from '@/components/FaceLivenessCheck';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

type ToothpasteStep = 'instructions' | 'camera' | 'verifying' | 'done';

export default function WakeTaskScreen() {
  const insets = useSafeAreaInsets();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { data, completeWakeUp } = useApp();
  const alarm = data.alarms.find(a => a.id === alarmId);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const task = alarm?.wakeTask ?? 'face';

  // Toothpaste flow state
  const [toothStep, setToothStep] = useState<ToothpasteStep>('instructions');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Shared success handler — marks wake-up complete and routes to success screen
  const handleSuccess = useCallback(() => {
    completeWakeUp();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      router.replace({ pathname: '/alarm/complete', params: { alarmId } });
    }, 600);
  }, [completeWakeUp, alarmId]);

  const handleGiveUp = useCallback(() => {
    router.replace({ pathname: '/alarm/failure', params: { alarmId } });
  }, [alarmId]);

  // Run the verifying animation then complete the task
  const startVerifying = useCallback(() => {
    setToothStep('verifying');
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    setTimeout(() => {
      setToothStep('done');
      handleSuccess();
    }, 1800);
  }, [spinAnim, handleSuccess]);

  // Request permission then switch to in-app camera view
  const openCamera = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Camera Required', 'Please allow camera access to complete the wake-up task.');
        return;
      }
    }
    setToothStep('camera');
  }, [permission, requestPermission]);

  // Capture with the rear camera and begin verification
  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      startVerifying();
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    }
  }, [startVerifying]);

  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // ─── Face verification task ───
  if (task === 'face') {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
        <View style={styles.topBar}>
          <Text style={styles.topLabel}>WAKE-UP TASK</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.taskTitle}>Face Verification</Text>
          <FaceLivenessCheck
            onVerified={handleSuccess}
            onFailed={() => {/* FaceLivenessCheck handles retry internally */}}
          />
        </View>
        <View style={styles.giveUpRow}>
          <Pressable onPress={handleGiveUp} style={styles.giveUpBtn}>
            <Text style={styles.giveUpText}>Give Up</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ─── Toothpaste verification task ───
  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>WAKE-UP TASK</Text>
      </View>

      {toothStep === 'instructions' && (
        <View style={styles.center}>
          <View style={styles.iconBig}>
            <Feather name="package" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.taskTitle}>Toothpaste Verification</Text>
          <Text style={styles.taskDesc}>
            Take a photo of your toothpaste tube. This confirms you are out of bed and
            starting your morning routine.
          </Text>
          <Pressable
            onPress={openCamera}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <LinearGradient
              colors={['#FF8C33', Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.actionBtn}
            >
              <Feather name="camera" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Open Camera</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={handleGiveUp} style={styles.giveUpBtn}>
            <Text style={styles.giveUpText}>Give Up</Text>
          </Pressable>
        </View>
      )}

      {/* In-app rear camera — does NOT open the system camera app */}
      {toothStep === 'camera' && (
        <View style={styles.center}>
          <Text style={styles.taskTitle}>Point at Toothpaste</Text>
          <View style={styles.cameraWrapper}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.cameraOverlay}>
              <Pressable
                onPress={capturePhoto}
                style={({ pressed }) => [styles.captureBtn, { opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.captureInner} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.taskDesc}>Tap the button to photograph your toothpaste.</Text>
        </View>
      )}

      {toothStep === 'verifying' && (
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Feather name="loader" size={64} color={Colors.primary} />
          </Animated.View>
          <Text style={styles.taskTitle}>Verifying...</Text>
          <Text style={styles.taskDesc}>Confirming photo captured.</Text>
        </View>
      )}

      {toothStep === 'done' && (
        <View style={styles.center}>
          <View style={styles.iconBig}>
            <Feather name="check" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.taskTitle}>Verified!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  topBar: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  topLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.primary,
    letterSpacing: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  iconBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.3)',
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  taskDesc: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingVertical: 18,
    borderRadius: 24,
  },
  actionBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  giveUpRow: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  giveUpBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  giveUpText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.3)',
  },
  // In-app camera
  cameraWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
});
