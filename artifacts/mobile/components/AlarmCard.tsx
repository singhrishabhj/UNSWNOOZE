import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Alarm } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
}

export function AlarmCard({ alarm, onToggle, onPress, onDelete }: AlarmCardProps) {
  const { isDark, colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hours = (h % 12 || 12).toString();
    const minutes = m.toString().padStart(2, '0');
    return { time: `${hours}:${minutes}`, ampm };
  };

  const { time, ampm } = formatTime(alarm.time);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 100 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100 }).start();
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Alarm',
      'Delete this alarm?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const cardBg = isDark ? colors.surface : colors.card;
  const borderColor = alarm.enabled ? 'rgba(255, 107, 0, 0.2)' : (isDark ? colors.border : colors.border);
  const timeColor = alarm.enabled ? (isDark ? '#fff' : '#111') : (isDark ? colors.textMuted : colors.textMuted);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.card, {
          backgroundColor: cardBg,
          borderColor,
          shadowColor: alarm.enabled ? Colors.primary : 'transparent',
        }]}
      >
        <View style={styles.left}>
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: timeColor }]}>{time}</Text>
            <Text style={[styles.ampm, { color: alarm.enabled ? Colors.primary : colors.textMuted }]}>{ampm}</Text>
          </View>
          <Text style={[styles.title, { color: colors.textSecondary }]}>{alarm.title}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface }]}>
              <Feather
                name={alarm.wakeTask === 'face' ? 'smile' : 'package'}
                size={11}
                color={Colors.primary}
              />
              <Text style={styles.tagText}>
                {alarm.wakeTask === 'face' ? 'Face' : 'Toothpaste'}
              </Text>
            </View>
            <View style={[styles.tag, { backgroundColor: isDark ? colors.surfaceElevated : colors.surface }]}>
              <Feather
                name={alarm.soundType === 'voice' ? 'mic' : 'volume-2'}
                size={11}
                color={Colors.primary}
              />
              <Text style={styles.tagText}>
                {alarm.soundType === 'voice' ? 'Voice' : 'Sound'}
              </Text>
            </View>
          </View>
          {alarm.repeatDays.length > 0 && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((d, i) => {
                const active = alarm.repeatDays.includes(i as any);
                return (
                  <View key={i} style={[styles.dayDot, {
                    backgroundColor: active ? Colors.primary : 'transparent',
                    borderColor: active ? Colors.primary : colors.border,
                  }]}>
                    <Text style={[styles.dayText, { color: active ? '#fff' : colors.textMuted }]}>{d}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.right}>
          <View
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
          >
            <Switch
              value={alarm.enabled}
              onValueChange={() => {
                Haptics.selectionAsync();
                onToggle();
              }}
              trackColor={{ false: isDark ? colors.surfaceElevated : colors.surfaceElevated, true: 'rgba(255, 107, 0, 0.4)' }}
              thumbColor={alarm.enabled ? Colors.primary : (isDark ? '#555' : '#ccc')}
              ios_backgroundColor={isDark ? colors.surfaceElevated : colors.surfaceElevated}
            />
          </View>

          <Pressable
            onPress={handleDeletePress}
            hitSlop={8}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                backgroundColor: pressed
                  ? 'rgba(255,59,48,0.15)'
                  : (isDark ? colors.surfaceElevated : colors.surface),
              },
            ]}
          >
            <Feather name="trash-2" size={14} color={isDark ? colors.textMuted : colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 6,
  },
  right: {
    alignItems: 'center',
    gap: 10,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  time: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
    includeFontPadding: false,
  },
  ampm: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.primary,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  dayDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
