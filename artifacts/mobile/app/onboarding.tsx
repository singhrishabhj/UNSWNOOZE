import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';
import { useTranslation } from '@/hooks/useTranslation';

const SLIDES_COUNT = 4;

// ─── Per-slide entrance hook ──────────────────────────────────────────────────
function useEntrance(isActive: boolean, delay = 0) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isActive ? 0 : 28)).current;
  const ran = useRef(isActive);

  useEffect(() => {
    if (isActive && !ran.current) {
      ran.current = true;
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 480,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 60,
          friction: 12,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (!isActive) {
      ran.current = false;
      opacity.setValue(0);
      translateY.setValue(28);
    }
  }, [isActive]);

  return { opacity, translateY };
}

// ─── Slide 1: Stop Snoozing ───────────────────────────────────────────────────
function Slide1({ isActive, width }: { isActive: boolean; width: number }) {
  const icon = useEntrance(isActive, 0);
  const text = useEntrance(isActive, 160);
  const { t, fonts } = useTranslation();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ring1 = useRef(new Animated.Value(0.6)).current;
  const ring1Op = useRef(new Animated.Value(0.6)).current;
  const ring2 = useRef(new Animated.Value(0.6)).current;
  const ring2Op = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!isActive) return;
    // Pulse the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
    // Expanding rings
    const ringLoop = () =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring1, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
            Animated.timing(ring1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring1Op, { toValue: 0, duration: 2000, useNativeDriver: true }),
            Animated.timing(ring1Op, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    const ring2Loop = () =>
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ring2, { toValue: 2.2, duration: 2000, useNativeDriver: true }),
            Animated.timing(ring2, { toValue: 0.6, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(ring2Op, { toValue: 0, duration: 2000, useNativeDriver: true }),
            Animated.timing(ring2Op, { toValue: 0.4, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    ringLoop();
    setTimeout(ring2Loop, 700);
  }, [isActive]);

  return (
    <View style={[s.slide, { width }]}>
      <Animated.View
        style={[s.iconBlock, { opacity: icon.opacity, transform: [{ translateY: icon.translateY }] }]}
      >
        {/* Rings */}
        <Animated.View
          style={[s.ring, { transform: [{ scale: ring1 }], opacity: ring1Op }]}
        />
        <Animated.View
          style={[s.ring, { transform: [{ scale: ring2 }], opacity: ring2Op }]}
        />
        {/* Icon */}
        <Animated.View
          style={[s.iconCircle, { transform: [{ scale: pulseAnim }] }]}
        >
          <Feather name="bell" size={48} color={Colors.primary} />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[s.textBlock, { opacity: text.opacity, transform: [{ translateY: text.translateY }] }]}
      >
        <Text style={[s.headline, { fontFamily: fonts.bold }]}>{t.slide1Title}</Text>
        <Text style={[s.body, { fontFamily: fonts.regular }]}>{t.slide1Body}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Slide 2: Prove You're Awake ─────────────────────────────────────────────
const FEATURES_ICONS = ['camera', 'trending-up', 'award'] as const;

function Slide2({ isActive, width }: { isActive: boolean; width: number }) {
  const text = useEntrance(isActive, 0);
  const { t, fonts } = useTranslation();

  const featureAnims = useRef(
    FEATURES_ICONS.map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.7),
    }))
  ).current;

  useEffect(() => {
    if (!isActive) {
      featureAnims.forEach(a => { a.opacity.setValue(0); a.scale.setValue(0.7); });
      return;
    }
    FEATURES_ICONS.forEach((_, i) => {
      const delay = 160 + i * 120;
      Animated.parallel([
        Animated.timing(featureAnims[i].opacity, {
          toValue: 1, duration: 380, delay, useNativeDriver: true,
        }),
        Animated.spring(featureAnims[i].scale, {
          toValue: 1, tension: 70, friction: 10, delay, useNativeDriver: true,
        }),
      ]).start();
    });
  }, [isActive]);

  const featureLabels = [t.selfieCheck, t.streakTracking, t.disciplineScore];

  return (
    <View style={[s.slide, { width }]}>
      <Animated.View
        style={[s.textBlock, { opacity: text.opacity, transform: [{ translateY: text.translateY }], marginBottom: 40 }]}
      >
        <Text style={[s.headline, { fontFamily: fonts.bold }]}>{t.slide2Title}</Text>
        <Text style={[s.body, { fontFamily: fonts.regular }]}>{t.slide2Body}</Text>
      </Animated.View>

      <View style={s.featuresRow}>
        {FEATURES_ICONS.map((icon, i) => (
          <Animated.View
            key={icon}
            style={[
              s.featureCard,
              {
                opacity: featureAnims[i].opacity,
                transform: [{ scale: featureAnims[i].scale }],
              },
            ]}
          >
            <View style={s.featureIconWrap}>
              <Feather name={icon} size={26} color={Colors.primary} />
            </View>
            <Text style={[s.featureLabel, { fontFamily: fonts.medium }]}>{featureLabels[i]}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ─── Slide 3: Build Real Discipline ──────────────────────────────────────────
function Slide3({ isActive, width }: { isActive: boolean; width: number }) {
  const text = useEntrance(isActive, 0);
  const ring = useEntrance(isActive, 100);
  const { t, fonts } = useTranslation();

  // Animated streak counter 0 → 7
  const streakCount = useRef(new Animated.Value(0)).current;
  const [displayStreak, setDisplayStreak] = useState(0);
  const barWidth = useRef(new Animated.Value(0)).current;

  // Badge anims
  const badgeAnims = useRef(
    [0, 1, 2, 3].map(() => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  useEffect(() => {
    if (!isActive) {
      streakCount.setValue(0);
      setDisplayStreak(0);
      barWidth.setValue(0);
      badgeAnims.forEach(a => { a.opacity.setValue(0); a.scale.setValue(0.5); });
      return;
    }

    // Count up streak display
    const listener = streakCount.addListener(({ value }) => setDisplayStreak(Math.round(value)));
    Animated.timing(streakCount, { toValue: 7, duration: 1400, delay: 200, useNativeDriver: false }).start();
    Animated.timing(barWidth, { toValue: 1, duration: 1400, delay: 200, useNativeDriver: false }).start();

    // Pop in badge icons
    badgeAnims.forEach((a, i) => {
      const delay = 800 + i * 110;
      Animated.parallel([
        Animated.timing(a.opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
        Animated.spring(a.scale, { toValue: 1, tension: 80, friction: 9, delay, useNativeDriver: true }),
      ]).start();
    });

    return () => streakCount.removeListener(listener);
  }, [isActive]);

  const BADGE_ICONS = ['sun', 'trending-up', 'sunrise', 'award'] as const;

  return (
    <View style={[s.slide, { width }]}>
      <Animated.View
        style={[s.textBlock, { opacity: text.opacity, transform: [{ translateY: text.translateY }], marginBottom: 36 }]}
      >
        <Text style={[s.headline, { fontFamily: fonts.bold }]}>{t.slide3Title}</Text>
        <Text style={[s.body, { fontFamily: fonts.regular }]}>{t.slide3Body}</Text>
      </Animated.View>

      {/* Streak counter */}
      <Animated.View
        style={[s.streakBlock, { opacity: ring.opacity, transform: [{ translateY: ring.translateY }] }]}
      >
        <View style={s.streakRow}>
          <Feather name="zap" size={18} color={Colors.primary} />
          <Text style={s.streakNumber}>{displayStreak}</Text>
          <Text style={[s.streakUnit, { fontFamily: fonts.regular }]}>{t.dayStreak}</Text>
        </View>

        {/* Progress bar */}
        <View style={s.barTrack}>
          <Animated.View
            style={[
              s.barFill,
              {
                width: barWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '70%'],
                }),
              },
            ]}
          />
        </View>

        {/* Achievement badges */}
        <View style={s.badgesRow}>
          {BADGE_ICONS.map((icon, i) => (
            <Animated.View
              key={icon}
              style={[
                s.badge,
                {
                  opacity: badgeAnims[i].opacity,
                  transform: [{ scale: badgeAnims[i].scale }],
                  backgroundColor: i < 2 ? 'rgba(255,107,0,0.18)' : 'rgba(255,255,255,0.05)',
                  borderColor: i < 2 ? 'rgba(255,107,0,0.4)' : 'rgba(255,255,255,0.1)',
                },
              ]}
            >
              <Feather name={icon} size={18} color={i < 2 ? Colors.primary : 'rgba(255,255,255,0.2)'} />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Slide 4: Welcome ─────────────────────────────────────────────────────────
function Slide4({
  isActive,
  width,
  onStart,
}: {
  isActive: boolean;
  width: number;
  onStart: () => void;
}) {
  const brand = useEntrance(isActive, 0);
  const cta = useEntrance(isActive, 300);
  const { t, fonts } = useTranslation();

  return (
    <View style={[s.slide, { width, justifyContent: 'center', gap: 48 }]}>
      {/* Brand block */}
      <Animated.View
        style={[
          s.brandBlock,
          { opacity: brand.opacity, transform: [{ translateY: brand.translateY }] },
        ]}
      >
        <View style={s.brandIconWrap}>
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.brandIconGrad}
          >
            <Feather name="bell" size={36} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={s.brandName}>UNSNWOOZE</Text>
        <Text style={[s.brandTagline, { fontFamily: fonts.regular }]}>{t.slide4Tagline}</Text>
      </Animated.View>

      {/* CTA */}
      <Animated.View
        style={[s.ctaWrap, { opacity: cta.opacity, transform: [{ translateY: cta.translateY }] }]}
      >
        <Pressable
          onPress={onStart}
          style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaBtn}
          >
            <Text style={[s.ctaBtnText, { fontFamily: fonts.semiBold }]}>{t.startAlarm}</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
        <Text style={[s.ctaNote, { fontFamily: fonts.regular }]}>{t.noAccountNeeded}</Text>
      </Animated.View>
    </View>
  );
}

// ─── Onboarding root ──────────────────────────────────────────────────────────
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const { t, fonts } = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(Dimensions.get('window').width);
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 24);

  const handleGetStarted = () => {
    completeOnboarding();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES_COUNT - 1) {
      const next = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
      setCurrentIndex(next);
      Haptics.selectionAsync();
    }
  };

  const isLast = currentIndex === SLIDES_COUNT - 1;

  return (
    <View style={[s.root, { paddingTop: topPad }]}>
      {/* Background gradient accent */}
      <View style={s.bgGlow} />

      {/* Skip */}
      {!isLast && (
        <Pressable
          onPress={handleGetStarted}
          style={[s.skipBtn, { top: topPad + 12 }]}
        >
          <Text style={[s.skipText, { fontFamily: fonts.medium }]}>{t.skip}</Text>
        </Pressable>
      )}

      {/* Slide pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        style={{ flex: 1 }}
        onLayout={e => setSlideWidth(e.nativeEvent.layout.width)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
          setCurrentIndex(idx);
          Haptics.selectionAsync();
        }}
      >
        <Slide1 isActive={currentIndex === 0} width={slideWidth} />
        <Slide2 isActive={currentIndex === 1} width={slideWidth} />
        <Slide3 isActive={currentIndex === 2} width={slideWidth} />
        <Slide4 isActive={currentIndex === 3} width={slideWidth} onStart={handleGetStarted} />
      </ScrollView>

      {/* Footer: dots + next button */}
      {!isLast && (
        <View style={[s.footer, { paddingBottom: botPad }]}>
          {/* Dots */}
          <View style={s.dots}>
            {Array.from({ length: SLIDES_COUNT }).map((_, i) => {
              const inputRange = [
                (i - 1) * slideWidth,
                i * slideWidth,
                (i + 1) * slideWidth,
              ];
              const w = scrollX.interpolate({
                inputRange,
                outputRange: [8, 22, 8],
                extrapolate: 'clamp',
              });
              const op = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: 'clamp',
              });
              return (
                <Animated.View
                  key={i}
                  style={[s.dot, { width: w, opacity: op }]}
                />
              );
            })}
          </View>

          {/* Next arrow */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              s.nextBtn,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            <LinearGradient
              colors={['#FF8C33', Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.nextBtnGrad}
            >
              <Feather name="arrow-right" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {/* Dots-only row on last slide */}
      {isLast && (
        <View style={[s.dotsOnly, { paddingBottom: botPad }]}>
          {Array.from({ length: SLIDES_COUNT }).map((_, i) => {
            const inputRange = [
              (i - 1) * slideWidth,
              i * slideWidth,
              (i + 1) * slideWidth,
            ];
            const w = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });
            const op = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[s.dot, { width: w, opacity: op }]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  bgGlow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: Colors.primary,
    opacity: 0.04,
    top: -60,
    alignSelf: 'center',
  },
  skipBtn: {
    position: 'absolute',
    right: 22,
    zIndex: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  skipText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },

  // Slides
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 0,
  },

  // Slide 1 – icon area
  iconBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    marginBottom: 48,
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,107,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text block (shared)
  textBlock: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  headline: {
    fontSize: 38,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 46,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 26,
  },

  // Slide 2 – features
  featuresRow: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    width: '100%',
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,107,0,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 8,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,107,0,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Slide 3 – streak block
  streakBlock: {
    width: '100%',
    backgroundColor: 'rgba(255,107,0,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 18,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  streakNumber: {
    fontSize: 56,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    letterSpacing: -2,
    lineHeight: 62,
  },
  streakUnit: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
  },
  barTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Slide 4 – brand + CTA
  brandBlock: {
    alignItems: 'center',
    gap: 14,
  },
  brandIconWrap: {
    marginBottom: 8,
  },
  brandIconGrad: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.2,
  },
  ctaWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 28,
  },
  ctaBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  ctaNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.25)',
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  dotsOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    gap: 6,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  nextBtn: {},
  nextBtnGrad: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
