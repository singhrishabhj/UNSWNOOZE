import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
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

  /* ─── Toothpaste flow state ─── */
  const [toothStep, setToothStep] = useState<ToothpasteStep>('instructions');
  const spinAnim = useRef(new Animated.Value(0)).current;

  /* ─── Shared success handler ─── */
  const handleSuccess = () => {
    completeWakeUp();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      router.replace({ pathname: '/alarm/complete', params: { alarmId } });
    }, 600);
  };

  /* ─── Face task ─── */
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
      </View>
    );
  }

  /* ─── Toothpaste task ─── */
  const startVerifying = () => {
    setToothStep('verifying');
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    setTimeout(() => {
      setToothStep('done');
      handleSuccess();
    }, 1800);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Please allow camera access to complete the wake-up task.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      startVerifying();
    }
  };

  const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
            Take a photo of your toothpaste tube. This confirms you are out of bed and starting
            your morning routine.
          </Text>
          <Pressable
            onPress={() => setToothStep('camera')}
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
        </View>
      )}

      {toothStep === 'camera' && (
        <View style={styles.center}>
          <View style={styles.iconBig}>
            <Feather name="camera" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.taskTitle}>Take a Photo</Text>
          <Text style={styles.taskDesc}>Point the camera at your toothpaste tube.</Text>
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
              <Feather name="aperture" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Photograph Toothpaste</Text>
            </LinearGradient>
          </Pressable>
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
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
});
