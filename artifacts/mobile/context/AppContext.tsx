import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type WakeTask = 'face' | 'toothpaste';
export type SoundType = 'standard' | 'voice';
export type RepeatDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Alarm {
  id: string;
  time: string;
  title: string;
  repeatDays: RepeatDay[];
  wakeTask: WakeTask;
  soundType: SoundType;
  enabled: boolean;
  createdAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredStreak: number;
  requiredWakeUps?: number;
  unlocked: boolean;
}

export interface AppData {
  alarms: Alarm[];
  currentStreak: number;
  bestStreak: number;
  totalWakeUps: number;
  totalSnoozes: number;
  lastWakeDate: string | null;
  onboardingComplete: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First Wake Up', description: 'Complete your first wake-up', icon: 'sun', requiredStreak: 0, requiredWakeUps: 1, unlocked: false },
  { id: 'streak3', title: '3 Day Streak', description: '3 days in a row', icon: 'trending-up', requiredStreak: 3, unlocked: false },
  { id: 'bird', title: 'Early Bird', description: '7 days in a row', icon: 'sunrise', requiredStreak: 7, unlocked: false },
  { id: 'warrior', title: 'Morning Warrior', description: '15 days in a row', icon: 'zap', requiredStreak: 15, unlocked: false },
  { id: 'master', title: 'Discipline Master', description: '30 days in a row', icon: 'award', requiredStreak: 30, unlocked: false },
];

const DEFAULT_DATA: AppData = {
  alarms: [],
  currentStreak: 0,
  bestStreak: 0,
  totalWakeUps: 0,
  totalSnoozes: 0,
  lastWakeDate: null,
  onboardingComplete: false,
  theme: 'system',
  language: 'en',
};

interface AppContextType {
  data: AppData;
  achievements: Achievement[];
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => void;
  updateAlarm: (id: string, updates: Partial<Alarm>) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  completeWakeUp: () => void;
  recordSnooze: () => void;
  missAlarm: () => void;
  completeOnboarding: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: 'en' | 'hi') => void;
}

const AppContext = createContext<AppContextType | null>(null);

const STORAGE_KEY = '@unsnwooze_data';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        // Migrate old saves that lack new fields
        if (parsed.totalWakeUps === undefined) parsed.totalWakeUps = 0;
        if (parsed.totalSnoozes === undefined) parsed.totalSnoozes = 0;
        setData(parsed);
        updateAchievements(parsed.currentStreak, parsed.totalWakeUps);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  };

  const saveData = async (newData: AppData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Failed to save data:', e);
    }
  };

  const updateAchievements = (streak: number, wakeUps: number) => {
    setAchievements(ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: a.requiredWakeUps
        ? wakeUps >= a.requiredWakeUps
        : streak >= a.requiredStreak,
    })));
  };

  const update = useCallback((updater: (prev: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      updateAchievements(next.currentStreak, next.totalWakeUps);
      return next;
    });
  }, []);

  const addAlarm = useCallback((alarm: Omit<Alarm, 'id' | 'createdAt'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    update(prev => ({
      ...prev,
      alarms: [...prev.alarms, { ...alarm, id, createdAt: Date.now() }],
    }));
  }, [update]);

  const updateAlarm = useCallback((id: string, updates: Partial<Alarm>) => {
    update(prev => ({
      ...prev,
      alarms: prev.alarms.map(a => a.id === id ? { ...a, ...updates } : a),
    }));
  }, [update]);

  const deleteAlarm = useCallback((id: string) => {
    update(prev => ({
      ...prev,
      alarms: prev.alarms.filter(a => a.id !== id),
    }));
  }, [update]);

  const toggleAlarm = useCallback((id: string) => {
    update(prev => ({
      ...prev,
      alarms: prev.alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a),
    }));
  }, [update]);

  const completeWakeUp = useCallback(() => {
    const today = new Date().toDateString();
    update(prev => {
      const isConsecutive = prev.lastWakeDate === new Date(Date.now() - 86400000).toDateString();
      const alreadyToday = prev.lastWakeDate === today;
      if (alreadyToday) return prev;
      const newStreak = isConsecutive || prev.lastWakeDate === null ? prev.currentStreak + 1 : 1;
      return {
        ...prev,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        totalWakeUps: prev.totalWakeUps + 1,
        lastWakeDate: today,
      };
    });
  }, [update]);

  const recordSnooze = useCallback(() => {
    update(prev => ({ ...prev, totalSnoozes: prev.totalSnoozes + 1 }));
  }, [update]);

  const missAlarm = useCallback(() => {
    update(prev => ({
      ...prev,
      currentStreak: 0,
    }));
  }, [update]);

  const completeOnboarding = useCallback(() => {
    update(prev => ({ ...prev, onboardingComplete: true }));
  }, [update]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    update(prev => ({ ...prev, theme }));
  }, [update]);

  const setLanguage = useCallback((language: 'en' | 'hi') => {
    update(prev => ({ ...prev, language }));
  }, [update]);

  return (
    <AppContext.Provider value={{
      data,
      achievements,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      completeWakeUp,
      recordSnooze,
      missAlarm,
      completeOnboarding,
      setTheme,
      setLanguage,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
