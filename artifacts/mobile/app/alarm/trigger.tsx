import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
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

const MOTIVATIONAL = [
  'Rise and conquer the day.',
  'Your future self will thank you.',
  'Champions wake up early.',
  'The morning belongs to those who earn it.',
];

export default function AlarmTriggerScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();
  const { data } = useApp();

  const alarm = data.alarms.find(a => a.id === alarmId);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [quote] = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)]);
  const speechRef = useRef<any>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    if (Platform.OS === 'web' && alarm?.soundType === 'voice' && alarm?.title) {
      startVoiceAlarm(alarm.title);
    }

    return () => {
      stopVoiceAlarm();
    };
  }, []);

  const startVoiceAlarm = (title: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(`${title}. Wake up.`);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    };
    speak();
    speechRef.current = setInterval(speak, 5000);
  };

  const stopVoiceAlarm = () => {
    if (speechRef.current) {
      clearInterval(speechRef.current);
      speechRef.current = null;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleCompleteTask = () => {
    stopVoiceAlarm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace({ pathname: '/alarm/task', params: { alarmId } });
  };

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
          <Text style={styles.alarmTitle}>{alarm?.title ?? 'Wake Up'}</Text>
          <Text style={styles.quote}>{quote}</Text>
        </View>

        {alarm?.soundType === 'voice' && (
          <View style={styles.voiceIndicator}>
            <Feather name="mic" size={14} color={Colors.primary} />
            <Text style={styles.voiceText}>Speaking alarm title</Text>
          </View>
        )}

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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    justifyContent: 'space-around',
  },
  topSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  midSection: {
    alignItems: 'center',
    gap: 16,
  },
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
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  voiceText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  buttonWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    marginBottom: 20,
  },
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
});
