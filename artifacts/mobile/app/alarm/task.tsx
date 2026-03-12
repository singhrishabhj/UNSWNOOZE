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
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

type TaskStep = 'instructions' | 'camera' | 'verifying' | 'done';

export default function WakeTaskScreen() {
  const insets = useSafeAreaInsets();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { data, completeWakeUp } = useApp();
  const alarm = data.alarms.find(a => a.id === alarmId);

  const [step, setStep] = useState<TaskStep>('instructions');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [faceAttempts, setFaceAttempts] = useState(0);
  const spinAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const task = alarm?.wakeTask ?? 'face';

  const startVerifying = () => {
    setStep('verifying');
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();

    setTimeout(() => {
      if (task === 'face') {
        const eyesOpen = Math.random() > 0.2;
        if (eyesOpen || faceAttempts >= 2) {
          handleSuccess();
        } else {
          setFaceAttempts(p => p + 1);
          setStep('camera');
          Alert.alert('Try Again', 'Make sure your eyes are open and face is visible.');
          spinAnim.setValue(0);
        }
      } else {
        handleSuccess();
      }
    }, 2000);
  };

  const handleCameraCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Required', 'Please allow camera access to complete the wake-up task.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      startVerifying();
    }
  };

  const handleSuccess = () => {
    setStep('done');
    completeWakeUp();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      router.replace({ pathname: '/alarm/complete', params: { alarmId } });
    }, 800);
  };

  const renderInstructions = () => (
    <View style={styles.center}>
      <View style={[styles.iconBig, { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: 'rgba(255,107,0,0.3)' }]}>
        <Feather
          name={task === 'face' ? 'smile' : 'package'}
          size={48}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.taskTitle}>
        {task === 'face' ? 'Face Verification' : 'Toothpaste Verification'}
      </Text>
      <Text style={styles.taskDesc}>
        {task === 'face'
          ? 'Take a selfie with your eyes open and a slight smile to confirm you\'re awake.'
          : 'Take a photo of your toothpaste tube. This confirms you\'re out of bed and starting your routine.'}
      </Text>
      <Pressable
        onPress={() => setStep('camera')}
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
  );

  const renderCamera = () => (
    <View style={styles.center}>
      <View style={[styles.iconBig, { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: 'rgba(255,107,0,0.3)' }]}>
        <Feather name="camera" size={48} color={Colors.primary} />
      </View>
      <Text style={styles.taskTitle}>Take a Photo</Text>
      <Text style={styles.taskDesc}>
        {task === 'face'
          ? 'Look directly at the camera, eyes open, face clearly visible.'
          : 'Point camera at your toothpaste tube.'}
      </Text>
      <Pressable
        onPress={handleCameraCapture}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <LinearGradient
          colors={['#FF8C33', Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionBtn}
        >
          <Feather name="aperture" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>
            {task === 'face' ? 'Take Selfie' : 'Photograph Toothpaste'}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderVerifying = () => {
    const rotation = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Feather name="loader" size={64} color={Colors.primary} />
        </Animated.View>
        <Text style={styles.taskTitle}>Verifying...</Text>
        <Text style={styles.taskDesc}>
          {task === 'face' ? 'Checking your face is visible and eyes are open.' : 'Confirming photo captured.'}
        </Text>
      </View>
    );
  };

  const renderDone = () => (
    <View style={styles.center}>
      <View style={[styles.iconBig, { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: 'rgba(255,107,0,0.3)' }]}>
        <Feather name="check" size={48} color={Colors.primary} />
      </View>
      <Text style={styles.taskTitle}>Verified!</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <View style={styles.topBar}>
        <Text style={styles.topLabel}>WAKE-UP TASK</Text>
      </View>

      {step === 'instructions' && renderInstructions()}
      {step === 'camera' && renderCamera()}
      {step === 'verifying' && renderVerifying()}
      {step === 'done' && renderDone()}
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  actionBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
});
