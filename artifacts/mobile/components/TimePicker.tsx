/**
 * TimePicker.tsx
 * Unified drum-roll time picker for web and native.
 * Uses React Native ScrollView with snapToInterval — no imperative DOM hacks.
 * Shows HH / MM scroll columns + AM/PM segmented control, always visible.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
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

const ITEM_H = 60;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// ─── Single scroll column ─────────────────────────────────────────────────────
interface ColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  textColor: string;
  mutedColor: string;
}

function DrumColumn({ items, selectedIndex, onSelect, textColor, mutedColor }: ColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const lastIndex = useRef(selectedIndex);
  const isDragging = useRef(false);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    scrollRef.current?.scrollTo({ y: index * ITEM_H, animated });
  }, []);

  // Initial scroll — no animation, slight delay for layout
  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(selectedIndex, false), 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes (e.g. AM→PM flipping the hour)
  useEffect(() => {
    if (!isDragging.current && lastIndex.current !== selectedIndex) {
      scrollToIndex(selectedIndex, true);
      lastIndex.current = selectedIndex;
    }
  }, [selectedIndex, scrollToIndex]);

  const commit = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDragging.current = false;
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    scrollToIndex(index);
    if (index !== lastIndex.current) {
      lastIndex.current = index;
      onSelect(index);
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    }
  };

  return (
    <View style={styles.columnWrap}>
      {/* Selection highlight */}
      <View style={styles.selBar} pointerEvents="none" />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        bounces={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { isDragging.current = true; }}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={commit}
        contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
      >
        {items.map((label, i) => {
          const dist = Math.abs(i - selectedIndex);
          return (
            <Pressable
              key={i}
              onPress={() => { onSelect(i); scrollToIndex(i); }}
              style={styles.drumItem}
            >
              <Text
                style={[
                  styles.drumText,
                  {
                    fontSize: dist === 0 ? 40 : dist === 1 ? 28 : dist === 2 ? 20 : 16,
                    opacity: dist === 0 ? 1 : dist === 1 ? 0.45 : dist === 2 ? 0.2 : 0.07,
                    color: dist === 0 ? textColor : mutedColor,
                    fontFamily: dist === 0 ? 'Inter_700Bold' : 'Inter_400Regular',
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────
interface TimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const { isDark, colors } = useTheme();

  const rawHour = value.getHours();
  const isPM = rawHour >= 12;
  const hour12 = rawHour % 12 || 12;
  const minute = value.getMinutes();

  const textColor = isDark ? '#ffffff' : '#111111';
  const mutedColor = isDark ? '#555555' : '#aaaaaa';
  const surfaceBg = isDark ? colors.surfaceElevated : colors.surface;

  const setHour = (index: number) => {
    const h12 = index + 1;
    const h24 = isPM ? (h12 === 12 ? 12 : h12 + 12) : (h12 === 12 ? 0 : h12);
    const d = new Date(value);
    d.setHours(h24, value.getMinutes(), 0, 0);
    onChange(d);
  };

  const setMinute = (index: number) => {
    const d = new Date(value);
    d.setMinutes(index, 0, 0);
    onChange(d);
  };

  const setAMPM = (pm: boolean) => {
    if (pm === isPM) return;
    const d = new Date(value);
    const h = value.getHours();
    d.setHours(pm ? (h % 12) + 12 : h % 12, value.getMinutes(), 0, 0);
    onChange(d);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };

  return (
    <View style={styles.root}>

      {/* ── Scroll columns ── */}
      <View style={styles.row}>
        <DrumColumn
          items={HOURS}
          selectedIndex={hour12 - 1}
          onSelect={setHour}
          textColor={textColor}
          mutedColor={mutedColor}
        />

        <View style={styles.colon}>
          <Text style={[styles.colonText, { color: Colors.primary }]}>:</Text>
        </View>

        <DrumColumn
          items={MINUTES}
          selectedIndex={minute}
          onSelect={setMinute}
          textColor={textColor}
          mutedColor={mutedColor}
        />
      </View>

      {/* ── Column labels ── */}
      <View style={styles.labelsRow}>
        <Text style={[styles.lbl, { color: mutedColor, width: 90 }]}>HH</Text>
        <View style={{ width: 40 }} />
        <Text style={[styles.lbl, { color: mutedColor, width: 90 }]}>MM</Text>
      </View>

      {/* ── AM / PM segmented control ── */}
      <View style={[styles.ampmTrack, { backgroundColor: surfaceBg }]}>
        {(['AM', 'PM'] as const).map((seg) => {
          const active = seg === (isPM ? 'PM' : 'AM');
          return (
            <Pressable
              key={seg}
              onPress={() => setAMPM(seg === 'PM')}
              style={[styles.ampmSeg, active && { backgroundColor: Colors.primary }]}
            >
              <Text style={[styles.ampmTxt, { color: active ? '#fff' : mutedColor }]}>
                {seg}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_H,
  },
  columnWrap: {
    width: 90,
    height: PICKER_H,
    overflow: 'hidden',
    position: 'relative',
  },
  selBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderRadius: 10,
    zIndex: 1,
    pointerEvents: 'none',
  },
  drumItem: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drumText: {
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
  colon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
  },
  colonText: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -1,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  lbl: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 2,
    textAlign: 'center',
  },
  ampmTrack: {
    flexDirection: 'row',
    borderRadius: 28,
    padding: 4,
    marginTop: 10,
    gap: 2,
  },
  ampmSeg: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmTxt: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
});
