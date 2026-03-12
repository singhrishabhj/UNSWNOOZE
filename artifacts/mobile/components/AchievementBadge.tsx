import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Achievement } from '@/context/AppContext';
import { useTheme } from '@/hooks/useTheme';

interface AchievementBadgeProps {
  achievement: Achievement;
}

export function AchievementBadge({ achievement }: AchievementBadgeProps) {
  const { isDark, colors } = useTheme();

  const iconName = achievement.icon as any;
  const isUnlocked = achievement.unlocked;

  return (
    <View style={[styles.badge, {
      backgroundColor: isUnlocked
        ? 'rgba(255, 107, 0, 0.12)'
        : (isDark ? colors.surfaceElevated : colors.surface),
      borderColor: isUnlocked ? 'rgba(255, 107, 0, 0.35)' : colors.border,
    }]}>
      <View style={[styles.iconWrapper, {
        backgroundColor: isUnlocked ? 'rgba(255, 107, 0, 0.2)' : (isDark ? colors.surface : colors.surfaceElevated),
      }]}>
        <Feather
          name={iconName}
          size={20}
          color={isUnlocked ? Colors.primary : colors.textMuted}
        />
      </View>
      <Text style={[styles.title, {
        color: isUnlocked ? (isDark ? '#fff' : '#111') : colors.textMuted,
        fontFamily: 'Inter_600SemiBold',
      }]}>{achievement.title}</Text>
      <Text style={[styles.desc, { color: colors.textMuted }]}>{achievement.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    textAlign: 'center',
  },
  desc: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
