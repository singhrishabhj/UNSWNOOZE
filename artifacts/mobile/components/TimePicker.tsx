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

// Android fires onScrollEndDrag before momentum fully settles.
// Debounce the handler so only the last event is acted upon.
const DEBOUNCE_MS = Platform.OS === 'android' ? 120 : 0;

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
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
  }, []);

  // Initial scroll position — no animation
  React.useEffect(() => {
    const timer = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync programmatic value changes (e.g. "Test +1 min" button)
  React.useEffect(() => {
    if (lastIndex.current !== selectedIndex) {
      scrollToIndex(selectedIndex);
      lastIndex.current = selectedIndex;
    }
  }, [selectedIndex, scrollToIndex]);

  // Shared scroll-settle handler with debounce for Android
  const handleSettle = useCallback((y: number) => {
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
    // Always snap to nearest item
    scrollToIndex(index);
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onSelect(index);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
    }
  }, [items.length, onSelect, scrollToIndex]);

  const scheduleSettle = useCallback((y: number) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (DEBOUNCE_MS > 0) {
      debounceTimer.current = setTimeout(() => handleSettle(y), DEBOUNCE_MS);
    } else {
      handleSettle(y);
    }
  }, [handleSettle]);

  const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scheduleSettle(e.nativeEvent.contentOffset.y);
  }, [scheduleSettle]);

  const textColor = isDark ? '#fff' : '#111';
  const mutedColor = colors.textMuted;

  return (
    <View style={styles.drumColumn}>
      <View
        style={[styles.selectionBar, { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.08)' }]}
        pointerEvents="none"
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        scrollEventThrottle={16}
        // Prevent interference from parent scroll views on Android
        nestedScrollEnabled
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
                color: isSelected ? textColor : mutedColor,
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

  const setHour = useCallback((index: number) => {
    const h12 = index + 1;
    // Preserve AM/PM when user scrolls hour column
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : h12 === 12 ? 0 : h12;
    const d = new Date(value);
    d.setHours(h24, value.getMinutes(), 0, 0);
    onChange(d);
  }, [isPM, value, onChange]);

  const setMinute = useCallback((index: number) => {
    const d = new Date(value);
    d.setMinutes(index, 0, 0);
    onChange(d);
  }, [value, onChange]);

  const toggleAMPM = useCallback(() => {
    const d = new Date(value);
    const h = value.getHours();
    d.setHours(h >= 12 ? h - 12 : h + 12, value.getMinutes(), 0, 0);
    onChange(d);
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, [value, onChange]);

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
        <Text style={[styles.labelText, { color: colors.textMuted }]}>HH</Text>
        <View style={{ width: 28 }} />
        <Text style={[styles.labelText, { color: colors.textMuted }]}>MM</Text>
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
