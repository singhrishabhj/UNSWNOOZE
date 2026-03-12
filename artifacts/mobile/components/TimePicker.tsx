import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isDark: boolean;
  colors: any;
}

function DrumColumn({ items, selectedIndex, onSelect, isDark, colors }: DrumColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef(selectedIndex);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (lastIndex.current !== selectedIndex) {
      scrollToIndex(selectedIndex);
      lastIndex.current = selectedIndex;
    }
  }, [selectedIndex]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    if (clamped !== lastIndex.current) {
      lastIndex.current = clamped;
      onSelect(clamped);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
    scrollToIndex(clamped);
  };

  const textColor = isDark ? '#fff' : '#111';
  const mutedColor = isDark ? colors.textMuted : colors.textMuted;

  return (
    <View style={styles.drumColumn}>
      <View style={[styles.selectionBar, { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.08)' }]} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          const distance = Math.abs(i - selectedIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25;
          const scale = distance === 0 ? 1 : distance === 1 ? 0.88 : 0.76;
          const fontSize = isSelected ? 36 : distance === 1 ? 28 : 22;
          return (
            <Pressable
              key={i}
              onPress={() => {
                onSelect(i);
                scrollToIndex(i);
              }}
              style={styles.drumItem}
            >
              <Text style={[styles.drumItemText, {
                fontSize,
                opacity,
                color: isSelected ? (isDark ? '#fff' : '#111') : mutedColor,
                fontFamily: isSelected ? 'Inter_700Bold' : 'Inter_400Regular',
                transform: [{ scale }],
              }]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function TimePicker({ value, onChange }: TimePickerProps) {
  const { isDark, colors } = useTheme();

  const rawHour = value.getHours();
  const isPM = rawHour >= 12;
  const hour12 = rawHour % 12 || 12;
  const minute = value.getMinutes();

  const hourIndex = hour12 - 1;
  const minuteIndex = minute;

  const setHour = (index: number) => {
    const h12 = index + 1;
    const h24 = isPM ? (h12 % 12) + 12 : h12 % 12;
    const d = new Date(value);
    d.setHours(h24, value.getMinutes(), 0, 0);
    onChange(d);
  };

  const setMinute = (index: number) => {
    const d = new Date(value);
    d.setMinutes(index, 0, 0);
    onChange(d);
  };

  const toggleAMPM = () => {
    const d = new Date(value);
    const h = value.getHours();
    d.setHours(h >= 12 ? h - 12 : h + 12, value.getMinutes(), 0, 0);
    onChange(d);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  };

  const sepColor = isDark ? colors.textMuted : colors.textMuted;

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <DrumColumn
          items={HOURS}
          selectedIndex={hourIndex}
          onSelect={setHour}
          isDark={isDark}
          colors={colors}
        />

        <View style={styles.separator}>
          <Text style={[styles.separatorText, { color: Colors.primary }]}>:</Text>
        </View>

        <DrumColumn
          items={MINUTES}
          selectedIndex={minuteIndex}
          onSelect={setMinute}
          isDark={isDark}
          colors={colors}
        />

        <Pressable
          onPress={toggleAMPM}
          style={({ pressed }) => [
            styles.ampmToggle,
            {
              backgroundColor: pressed
                ? 'rgba(255,107,0,0.2)'
                : 'rgba(255,107,0,0.1)',
              borderColor: Colors.primary,
            },
          ]}
        >
          <Text style={[styles.ampmText, { color: Colors.primary }]}>
            {isPM ? 'PM' : 'AM'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.labels}>
        <Text style={[styles.labelText, { color: isDark ? colors.textMuted : colors.textMuted }]}>HH</Text>
        <View style={{ width: 28 }} />
        <Text style={[styles.labelText, { color: isDark ? colors.textMuted : colors.textMuted }]}>MM</Text>
        <View style={{ width: 72 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    gap: 4,
  },
  drumColumn: {
    width: 80,
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionBar: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    zIndex: 1,
    borderRadius: 8,
  },
  drumItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumItemText: {
    letterSpacing: -1,
    includeFontPadding: false,
  },
  separator: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  separatorText: {
    fontSize: 36,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  ampmToggle: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignSelf: 'center',
  },
  ampmText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 4,
    alignItems: 'center',
    paddingLeft: 20,
  },
  labelText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    width: 80,
    textAlign: 'center',
  },
});
