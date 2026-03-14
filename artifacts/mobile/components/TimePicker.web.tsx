/**
 * TimePicker.web.tsx
 * Web-specific drum-roll picker using CSS scroll-snap for native-quality scroll physics.
 * The AM/PM selector is a segmented pill control below the columns.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';

const ITEM_H = 60;
const VISIBLE = 5;
const PICKER_H = ITEM_H * VISIBLE;

// ─── CSS injected once ────────────────────────────────────────────────────────
const CSS_ID = '__tp_scrollsnap';
if (typeof document !== 'undefined' && !document.getElementById(CSS_ID)) {
  const s = document.createElement('style');
  s.id = CSS_ID;
  s.textContent = `
    .tp-scroll {
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      height: ${PICKER_H}px;
    }
    .tp-scroll::-webkit-scrollbar { display: none; }
    .tp-item {
      height: ${ITEM_H}px;
      display: flex;
      align-items: center;
      justify-content: center;
      scroll-snap-align: center;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
    }
    .tp-text {
      font-family: 'Inter_700Bold', Inter, system-ui, sans-serif;
      letter-spacing: -1.5px;
      transition: font-size 80ms, opacity 80ms, color 80ms;
    }
  `;
  document.head.appendChild(s);
}

// ─── Single scroll column ─────────────────────────────────────────────────────
interface ColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  isDark: boolean;
  accentColor: string;
  textColor: string;
  mutedColor: string;
}

function ScrollColumn({
  items,
  selectedIndex,
  onSelect,
  isDark,
  accentColor,
  textColor,
  mutedColor,
}: ColumnProps) {
  const wrapperRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const currentIdx = useRef(selectedIndex);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Keep callback ref current so closures don't go stale
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const applyStyles = useCallback(
    (container: HTMLDivElement, activeIdx: number) => {
      const itemEls = container.querySelectorAll<HTMLElement>('.tp-item');
      itemEls.forEach((el, i) => {
        const span = el.querySelector<HTMLSpanElement>('.tp-text');
        if (!span) return;
        const dist = Math.abs(i - activeIdx);
        if (dist === 0) {
          span.style.fontSize = '40px';
          span.style.fontWeight = '700';
          span.style.opacity = '1';
          span.style.color = textColor;
        } else if (dist === 1) {
          span.style.fontSize = '28px';
          span.style.fontWeight = '600';
          span.style.opacity = '0.45';
          span.style.color = mutedColor;
        } else if (dist === 2) {
          span.style.fontSize = '20px';
          span.style.fontWeight = '400';
          span.style.opacity = '0.2';
          span.style.color = mutedColor;
        } else {
          span.style.fontSize = '16px';
          span.style.fontWeight = '400';
          span.style.opacity = '0.07';
          span.style.color = mutedColor;
        }
      });
    },
    [textColor, mutedColor],
  );

  useEffect(() => {
    const wrapper = wrapperRef.current as HTMLElement | null;
    if (!wrapper) return;

    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'tp-scroll';
    scrollRef.current = scrollDiv;

    // Top padding so first item can sit in centre slot
    const padTop = document.createElement('div');
    padTop.style.height = `${ITEM_H * 2}px`;
    scrollDiv.appendChild(padTop);

    items.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = 'tp-item';

      const span = document.createElement('span');
      span.className = 'tp-text';
      span.textContent = label;

      item.appendChild(span);
      item.addEventListener('pointerdown', (e) => e.stopPropagation());
      item.addEventListener('click', () => {
        scrollDiv.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
        // will be confirmed by scroll-end handler
      });
      scrollDiv.appendChild(item);
    });

    // Bottom padding
    const padBot = document.createElement('div');
    padBot.style.height = `${ITEM_H * 2}px`;
    scrollDiv.appendChild(padBot);

    // Set initial position (no animation)
    scrollDiv.scrollTop = selectedIndex * ITEM_H;
    applyStyles(scrollDiv, selectedIndex);

    // Scroll handler — update styles live + debounced commit
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const idx = Math.round(scrollDiv.scrollTop / ITEM_H);
        applyStyles(scrollDiv, idx);
      });

      if (snapTimer.current) clearTimeout(snapTimer.current);
      snapTimer.current = setTimeout(() => {
        const idx = Math.max(
          0,
          Math.min(Math.round(scrollDiv.scrollTop / ITEM_H), items.length - 1),
        );
        if (idx !== currentIdx.current) {
          currentIdx.current = idx;
          onSelectRef.current(idx);
        }
      }, 120);
    };

    scrollDiv.addEventListener('scroll', onScroll, { passive: true });
    wrapper.appendChild(scrollDiv);

    return () => {
      scrollDiv.removeEventListener('scroll', onScroll);
      if (snapTimer.current) clearTimeout(snapTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      wrapper.removeChild(scrollDiv);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external selectedIndex changes (e.g. AM→PM flipping hours)
  useEffect(() => {
    const scrollDiv = scrollRef.current;
    if (!scrollDiv) return;
    if (selectedIndex === currentIdx.current) return;
    currentIdx.current = selectedIndex;
    scrollDiv.scrollTo({ top: selectedIndex * ITEM_H, behavior: 'smooth' });
    applyStyles(scrollDiv, selectedIndex);
  }, [selectedIndex, applyStyles]);

  return (
    <View
      ref={wrapperRef}
      style={styles.columnWrapper}
    />
  );
}

// ─── TimePicker ────────────────────────────────────────────────────────────────
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

  const textColor = isDark ? '#ffffff' : '#111111';
  const mutedColor = isDark ? '#666666' : '#aaaaaa';
  const surfaceBg = isDark ? colors.surfaceElevated : colors.surface;

  return (
    <View style={styles.root}>

      {/* ── Drum columns ── */}
      <View style={styles.row}>
        {/* Selection highlight bar */}
        <View
          style={[
            styles.selectionBar,
            { borderColor: Colors.primary, backgroundColor: 'rgba(255,107,0,0.08)' },
          ]}
          pointerEvents="none"
        />

        <ScrollColumn
          items={HOURS}
          selectedIndex={hour12 - 1}
          onSelect={setHour}
          isDark={isDark}
          accentColor={Colors.primary}
          textColor={textColor}
          mutedColor={mutedColor}
        />

        <View style={styles.colon}>
          <Text style={[styles.colonText, { color: Colors.primary }]}>:</Text>
        </View>

        <ScrollColumn
          items={MINUTES}
          selectedIndex={minute}
          onSelect={setMinute}
          isDark={isDark}
          accentColor={Colors.primary}
          textColor={textColor}
          mutedColor={mutedColor}
        />
      </View>

      {/* ── Column labels ── */}
      <View style={styles.labelsRow}>
        <Text style={[styles.label, { color: mutedColor, width: 90 }]}>HH</Text>
        <View style={{ width: 40 }} />
        <Text style={[styles.label, { color: mutedColor, width: 90 }]}>MM</Text>
      </View>

      {/* ── AM / PM segmented control ── */}
      <View style={[styles.ampmTrack, { backgroundColor: surfaceBg }]}>
        {(['AM', 'PM'] as const).map((label) => {
          const active = label === (isPM ? 'PM' : 'AM');
          return (
            <Pressable
              key={label}
              onPress={() => setAMPM(label === 'PM')}
              style={[
                styles.ampmSegment,
                active && { backgroundColor: Colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.ampmText,
                  { color: active ? '#fff' : mutedColor },
                ]}
              >
                {label}
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
    position: 'relative',
  },
  selectionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_H * 2,
    height: ITEM_H,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderRadius: 10,
    zIndex: 0,
    pointerEvents: 'none',
  },
  columnWrapper: {
    width: 90,
    height: PICKER_H,
    overflow: 'hidden',
  },
  colon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 4,
    zIndex: 1,
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
  label: {
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
  ampmSegment: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ampmText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
});
