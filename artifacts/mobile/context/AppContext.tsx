import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { storageService } from '@/services/storage';

export type WakeTask = 'face' | 'toothpaste';
export type SoundType = 'standard' | 'voice';
export type RepeatDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DayOutcome = 'success' | 'snoozed' | 'missed' | 'none';

export interface DayRecord {
  date: string; // 'YYYY-MM-DD'
  outcome: DayOutcome;
}

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
  disciplineScore: number;
  streakFreezeCount: number;
  lastWakeDate: string | null; // 'YYYY-MM-DD'
  onboardingComplete: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'hi';
  weeklyHistory: DayRecord[];
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
  disciplineScore: 0,
  streakFreezeCount: 0,
  lastWakeDate: null,
  onboardingComplete: false,
  theme: 'system',
  language: 'en',
  weeklyHistory: [],
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Freeze is awarded every time streak crosses a multiple-of-3 boundary. */
function freezesEarned(prevStreak: number, newStreak: number): number {
  const prevMultiple = Math.floor(prevStreak / 3);
  const newMultiple = Math.floor(newStreak / 3);
  return Math.max(0, newMultiple - prevMultiple);
}

/**
 * Insert or update today's outcome in the weekly history.
 * Never downgrades an existing 'success' outcome.
 */
function upsertDayOutcome(history: DayRecord[], outcome: DayOutcome): DayRecord[] {
  const today = todayStr();
  const idx = history.findIndex(r => r.date === today);
  if (idx >= 0) {
    if (history[idx].outcome === 'success') return history; // don't downgrade
    const updated = [...history];
    updated[idx] = { date: today, outcome };
    return updated.slice(-7);
  }
  return [...history, { date: today, outcome }].slice(-7);
}

// ─── Context types ────────────────────────────────────────────────────────────

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

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const stored = await storageService.load<AppData>(DEFAULT_DATA);
    // Forward-compatible top-level field migrations
    if (stored.totalWakeUps === undefined) stored.totalWakeUps = 0;
    if (stored.totalSnoozes === undefined) stored.totalSnoozes = 0;
    if (stored.weeklyHistory === undefined) stored.weeklyHistory = [];
    if (stored.disciplineScore === undefined) {
      stored.disciplineScore = Math.min(100, stored.currentStreak * 5);
    }
    // streakFreezeCount added in v2 — default 0 for existing users.
    if (stored.streakFreezeCount === undefined) stored.streakFreezeCount = 0;
    // lastWakeDate was previously stored as toDateString() ("Thu Mar 14 2026").
    // Migrate to ISO 'YYYY-MM-DD' so date comparisons are reliable.
    if (stored.lastWakeDate && !/^\d{4}-\d{2}-\d{2}$/.test(stored.lastWakeDate)) {
      stored.lastWakeDate = null;
    }
    // Per-alarm field migrations — ensure every alarm has all required fields.
    // soundType was added after initial release; old alarms default to 'standard'.
    if (Array.isArray(stored.alarms)) {
      stored.alarms = stored.alarms.map(a => ({
        ...a,
        soundType: (a.soundType ?? 'standard') as SoundType,
        wakeTask: (a.wakeTask ?? 'face') as WakeTask,
      }));
    }
    setData(stored);
    updateAchievements(stored.currentStreak, stored.totalWakeUps);
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
      storageService.save(next);
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
    const today = todayStr();
    update(prev => {
      // Guard: don't increment twice on the same calendar day.
      if (prev.lastWakeDate === today) return prev;

      // Streak is consecutive only if last wake was exactly yesterday.
      const isConsecutive = prev.lastWakeDate === yesterdayStr();
      const prevStreak = prev.currentStreak;
      const newStreak = (isConsecutive || prev.lastWakeDate === null)
        ? prevStreak + 1
        : 1;

      // Award a freeze every time the streak crosses a multiple-of-3 boundary.
      const earned = freezesEarned(prevStreak, newStreak);

      return {
        ...prev,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        totalWakeUps: prev.totalWakeUps + 1,
        disciplineScore: Math.min(100, prev.disciplineScore + 5),
        streakFreezeCount: prev.streakFreezeCount + earned,
        lastWakeDate: today,
        weeklyHistory: upsertDayOutcome(prev.weeklyHistory, 'success'),
      };
    });
  }, [update]);

  const recordSnooze = useCallback(() => {
    update(prev => ({
      ...prev,
      totalSnoozes: prev.totalSnoozes + 1,
      weeklyHistory: upsertDayOutcome(prev.weeklyHistory, 'snoozed'),
    }));
  }, [update]);

  const missAlarm = useCallback(() => {
    update(prev => {
      // If the user has a freeze available, consume one and protect the streak.
      if (prev.streakFreezeCount > 0 && prev.currentStreak > 0) {
        return {
          ...prev,
          streakFreezeCount: prev.streakFreezeCount - 1,
          weeklyHistory: upsertDayOutcome(prev.weeklyHistory, 'missed'),
        };
      }
      // No freeze — reset streak and penalise discipline score.
      return {
        ...prev,
        currentStreak: 0,
        disciplineScore: Math.max(0, prev.disciplineScore - 5),
        weeklyHistory: upsertDayOutcome(prev.weeklyHistory, 'missed'),
      };
    });
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
