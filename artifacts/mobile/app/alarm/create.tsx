import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { RepeatDay, SoundType, WakeTask, useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';
import { TimePicker } from '@/components/TimePicker';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CreateAlarmScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();
  const { data, addAlarm, updateAlarm } = useApp();
  const { editId } = useLocalSearchParams<{ editId: string }>();

  const editAlarm = editId ? data.alarms.find(a => a.id === editId) : null;

  const [time, setTime] = useState(() => {
    if (editAlarm) {
      const [h, m] = editAlarm.time.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [title, setTitle] = useState(editAlarm?.title ?? 'Wake Up');
  const [repeatDays, setRepeatDays] = useState<RepeatDay[]>(editAlarm?.repeatDays ?? []);
  const [wakeTask, setWakeTask] = useState<WakeTask>(editAlarm?.wakeTask ?? 'face');
  const [soundType, setSoundType] = useState<SoundType>(editAlarm?.soundType ?? 'standard');

  const bg = isDark ? colors.background : colors.background;
  const cardBg = isDark ? colors.surface : colors.card;
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const toggleDay = (day: RepeatDay) => {
    Haptics.selectionAsync();
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    const timeStr = `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
    if (editAlarm) {
      updateAlarm(editAlarm.id, { time: timeStr, title, repeatDays, wakeTask, soundType });
    } else {
      addAlarm({ time: timeStr, title, repeatDays, wakeTask, soundType, enabled: true });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={isDark ? '#fff' : '#111'} />
        </Pressable>
        <Text style={[styles.topTitle, { color: isDark ? '#fff' : '#111' }]}>
          {editAlarm ? 'Edit Alarm' : 'New Alarm'}
        </Text>
        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveBtnGrad}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottomPad + 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.timeCard, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.timeSectionLabel, { color: colors.textSecondary }]}>SET ALARM TIME</Text>
          <TimePicker value={time} onChange={setTime} />
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>ALARM TITLE</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={[styles.input, { color: isDark ? '#fff' : '#111', borderColor: colors.border }]}
            placeholderTextColor={colors.textMuted}
            placeholder="e.g. Morning Workout"
            selectionColor={Colors.primary}
          />
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>REPEAT DAYS</Text>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((d, i) => {
              const active = repeatDays.includes(i as RepeatDay);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggleDay(i as RepeatDay)}
                  style={[styles.dayBtn, {
                    backgroundColor: active ? Colors.primary : 'transparent',
                    borderColor: active ? Colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.dayBtnText, { color: active ? '#fff' : colors.textSecondary }]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>WAKE-UP TASK</Text>
          {[
            { value: 'face' as WakeTask, label: 'Face Verification', desc: 'Take a selfie to confirm you\'re awake', icon: 'smile' },
            { value: 'toothpaste' as WakeTask, label: 'Toothpaste Photo', desc: 'Photograph your toothpaste to start your routine', icon: 'package' },
          ].map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setWakeTask(opt.value);
                Haptics.selectionAsync();
              }}
              style={[styles.optionCard, {
                backgroundColor: wakeTask === opt.value ? 'rgba(255,107,0,0.1)' : (isDark ? colors.surfaceElevated : colors.surface),
                borderColor: wakeTask === opt.value ? Colors.primary : colors.border,
              }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: wakeTask === opt.value ? 'rgba(255,107,0,0.2)' : (isDark ? colors.surface : colors.surfaceElevated) }]}>
                <Feather name={opt.icon as any} size={20} color={wakeTask === opt.value ? Colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: isDark ? '#fff' : '#111' }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              {wakeTask === opt.value && <Feather name="check-circle" size={20} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>ALARM SOUND</Text>
          {[
            { value: 'standard' as SoundType, label: 'Standard Alarm', desc: 'Repeating alarm tone', icon: 'volume-2' },
            { value: 'voice' as SoundType, label: 'Speak Alarm Title', desc: `Repeats "${title}. Wake up." every few seconds`, icon: 'mic' },
          ].map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => {
                setSoundType(opt.value);
                Haptics.selectionAsync();
              }}
              style={[styles.optionCard, {
                backgroundColor: soundType === opt.value ? 'rgba(255,107,0,0.1)' : (isDark ? colors.surfaceElevated : colors.surface),
                borderColor: soundType === opt.value ? Colors.primary : colors.border,
              }]}
            >
              <View style={[styles.optionIcon, { backgroundColor: soundType === opt.value ? 'rgba(255,107,0,0.2)' : (isDark ? colors.surface : colors.surfaceElevated) }]}>
                <Feather name={opt.icon as any} size={20} color={soundType === opt.value ? Colors.primary : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionLabel, { color: isDark ? '#fff' : '#111' }]}>{opt.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              {soundType === opt.value && <Feather name="check-circle" size={20} color={Colors.primary} />}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnGrad: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
  },
  timeCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  timeSectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.5,
  },
  input: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
