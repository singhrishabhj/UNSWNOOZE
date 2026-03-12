import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

const { width, height } = Dimensions.get('window');

interface OnboardSlide {
  id: string;
  title: string;
  body: string;
  iconName: string;
  iconSet: 'Feather' | 'Ionicons';
}

const SLIDES: OnboardSlide[] = [
  {
    id: '1',
    title: 'The Snooze Loop',
    body: 'Every morning begins the same way.\nThe alarm rings.\nYou press snooze again and again.',
    iconName: 'moon',
    iconSet: 'Feather',
  },
  {
    id: '2',
    title: 'Lost Mornings',
    body: 'Small delays become lost hours.\nYour day begins already behind schedule.',
    iconName: 'clock',
    iconSet: 'Feather',
  },
  {
    id: '3',
    title: 'A Different Alarm',
    body: 'UNSNWOOZE prevents endless snoozing.\nYou must complete an action before the alarm stops.',
    iconName: 'bell-off',
    iconSet: 'Feather',
  },
  {
    id: '4',
    title: 'Wake With Action',
    body: 'Before the alarm stops you must complete a task.\n• Face verification\n• Photo verification',
    iconName: 'camera',
    iconSet: 'Feather',
  },
  {
    id: '5',
    title: 'Build Discipline',
    body: 'Consistent mornings create powerful habits.',
    iconName: 'trending-up',
    iconSet: 'Feather',
  },
];

function SlideIcon({ iconName, iconSet }: { iconName: string; iconSet: string }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
      <View style={styles.iconGlow} />
      <Feather name={iconName as any} size={52} color={Colors.primary} />
    </Animated.View>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
      Haptics.selectionAsync();
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    completeOnboarding();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? 67 : 0, paddingBottom: Platform.OS === 'web' ? 34 : 0 }]}>
      <View style={[styles.skipRow, { top: insets.top + 16 }]}>
        {!isLast && (
          <Pressable onPress={handleGetStarted} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <SlideIcon iconName={item.iconName} iconSet={item.iconSet} />
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 34) }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <LinearGradient
            colors={['#FF8C33', Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextBtnGrad}
          >
            {isLast ? (
              <Text style={styles.nextBtnText}>Get Started</Text>
            ) : (
              <Feather name="arrow-right" size={22} color="#fff" />
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  skipRow: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: Colors.dark.textSecondary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    opacity: 0.12,
  },
  slideTitle: {
    fontSize: 30,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  slideBody: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  nextBtn: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  nextBtnGrad: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  nextBtnText: {
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
});
