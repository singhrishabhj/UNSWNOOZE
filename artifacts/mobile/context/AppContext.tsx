import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
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
  return upsertOutcomeForDate(history, todayStr(), outcome);
}

/**
 * Insert or update an arbitrary date's outcome. Never downgrades 'success'.
 */
function upsertOutcomeForDate(history: DayRecord[], date: string, outcome: DayOutcome): DayRecord[] {
  const idx = history.findIndex(r => r.date === date);
  if (idx >= 0) {
    if (history[idx].outcome === 'success') return history; // never downgrade success
    const updated = [...history];
    updated[idx] = { date, outcome };
    return updated.slice(-7);
  }
  return [...history, { date, outcome }].slice(-7);
}

/**
 * Auto-detect missed alarms and correct streak/history without user interaction.
 *
 * Rules:
 * 1. If lastWakeDate is before yesterday AND the user had alarms for yesterday
 *    that had no success/snoozed record → mark yesterday as 'missed' and apply
 *    streak penalty (consume freeze or reset streak to 0).
 * 2. If any alarm's time passed today by ≥30 min AND today has no success yet
 *    → mark today as 'missed'.
 *
 * Returns the (possibly mutated) AppData. Callers must persist the result.
 */
function applyMissedAlarmDetection(prev: AppData): { data: AppData; dirty: boolean } {
  const today = todayStr();
  const yesterday = yesterdayStr();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDOW = now.getDay() as RepeatDay;

  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayDOW = yDate.getDay() as RepeatDay;

  let updated = { ...prev };
  let dirty = false;

  // ── 1. Check yesterday ───────────────────────────────────────────────────────
  // Only relevant when the user has an active streak that might have broken.
  const lastWakeBeforeYesterday =
    prev.lastWakeDate !== null &&
    prev.lastWakeDate !== yesterday &&
    prev.lastWakeDate !== today;

  if (lastWakeBeforeYesterday && prev.currentStreak > 0) {
    const yEntry = prev.weeklyHistory.find(r => r.date === yesterday);
    const yOutcome = yEntry?.outcome ?? 'none';

    if (yOutcome !== 'success' && yOutcome !== 'snoozed') {
      // Was there an enabled alarm scheduled for yesterday?
      const hadAlarmYesterday = prev.alarms.some(a => {
        if (!a.enabled) return false;
        return a.repeatDays.length === 0 || a.repeatDays.includes(yesterdayDOW);
      });

      if (hadAlarmYesterday && yOutcome !== 'missed') {
        // Mark yesterday missed
        updated.weeklyHistory = upsertOutcomeForDate(updated.weeklyHistory, yesterday, 'missed');

        // Apply streak penalty
        if (updated.streakFreezeCount > 0 && updated.currentStreak > 0) {
          updated.streakFreezeCount -= 1;
        } else if (updated.currentStreak > 0) {
          updated.currentStreak = 0;
          updated.disciplineScore = Math.max(0, updated.disciplineScore - 5);
        }
        dirty = true;
      }
    }
  }

  // Also handle the case where lastWakeDate is null but streak > 0 (shouldn't
  // normally happen but guard anyway by resetting).
  if (prev.lastWakeDate === null && prev.currentStreak > 0) {
    updated.currentStreak = 0;
    dirty = true;
  }

  // ── 2. Check today ───────────────────────────────────────────────────────────
  // If an enabled alarm's time passed ≥30 min ago today and today has no success
  // outcome yet → mark today as missed.
  const todayEntry = updated.weeklyHistory.find(r => r.date === today);
  const todayOutcome = todayEntry?.outcome ?? 'none';

  if (todayOutcome !== 'success' && todayOutcome !== 'snoozed') {
    const hasPassedAlarm = prev.alarms.some(a => {
      if (!a.enabled) return false;
      const [h, m] = a.time.split(':').map(Number);
      const alarmMinutes = h * 60 + m;
      const isDayMatch = a.repeatDays.length === 0 || a.repeatDays.includes(todayDOW);
      return isDayMatch && nowMinutes - alarmMinutes >= 30;
    });

    if (hasPassedAlarm && todayOutcome !== 'missed') {
      updated.weeklyHistory = upsertDayOutcome(updated.weeklyHistory, 'missed');
      dirty = true;
    }
  }

  return { data: updated, dirty };
}

// ─── Context types ────────────────────────────────────────────────────────────

interface AppContextType {
  data: AppData;
  /** True once loadData() has resolved — consumers can safely read real stored values. */
  dataLoaded: boolean;
  achievements: Achievement[];
  addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => void;
  updateAlarm: (id: string, updates: Partial<Alarm>) => void;
  deleteAlarm: (id: string) => void;
  toggleAlarm: (id: string) => void;
  completeWakeUp: () => void;
  recordSnooze: () => void;
  missAlarm: () => void;
  refreshMissedAlarms: () => void;
  completeOnboarding: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (lang: 'en' | 'hi') => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>(ACHIEVEMENTS);

  useEffect(() => {
    loadData();
  }, []);

  // Re-run missed-alarm detection whenever the app comes back to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setData(prev => {
          const { data: updated, dirty } = applyMissedAlarmDetection(prev);
          if (dirty) {
            storageService.save(updated);
            return updated;
          }
          return prev;
        });
      }
    });
    return () => sub.remove();
  }, []);

  const loadData = async () => {
    let stored = await storageService.load<AppData>(DEFAULT_DATA);

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
    if (Array.isArray(stored.alarms)) {
      stored.alarms = stored.alarms.map(a => ({
        ...a,
        soundType: (a.soundType ?? 'standard') as SoundType,
        wakeTask: (a.wakeTask ?? 'face') as WakeTask,
      }));
    }

    // Auto-detect missed alarms from previous sessions or passed alarm times.
    const { data: corrected, dirty } = applyMissedAlarmDetection(stored);
    if (dirty) {
      stored = corrected;
      storageService.save(stored);
    }

    setData(stored);
    setDataLoaded(true);
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
      // Never downgrade today if the user already successfully woke up.
      const todayEntry = prev.weeklyHistory.find(r => r.date === todayStr());
      if (todayEntry?.outcome === 'success') return prev;

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

  /**
   * Manually trigger missed-alarm detection (e.g. called from trigger screen
   * when the user dismisses without completing the wake-up task).
   */
  const refreshMissedAlarms = useCallback(() => {
    setData(prev => {
      const { data: updated, dirty } = applyMissedAlarmDetection(prev);
      if (dirty) {
        storageService.save(updated);
        updateAchievements(updated.currentStreak, updated.totalWakeUps);
        return updated;
      }
      return prev;
    });
  }, []);

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
      dataLoaded,
      achievements,
      addAlarm,
      updateAlarm,
      deleteAlarm,
      toggleAlarm,
      completeWakeUp,
      recordSnooze,
      missAlarm,
      refreshMissedAlarms,
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
