/**
 * nativeAlarmService.ts
 *
 * JS wrapper around the native AlarmModule (AlarmModule.kt).
 * Only active on Android production/dev builds — silently no-ops in Expo Go
 * and on web/iOS (expo-notifications handles those platforms).
 *
 * Mirrors the same cancel-all + reschedule pattern used by notificationService
 * so both systems stay in sync whenever the alarm list changes.
 *
 * Storage key: @unsnwooze_native_alarm_ids
 *   Stores the array of scheduleIds that are currently registered with
 *   AlarmManager so we can cancel them precisely before rescheduling.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { Alarm } from '@/context/AppContext';

const NATIVE_IDS_KEY = '@unsnwooze_native_alarm_ids';

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** True only when the native AlarmModule is available and usable. */
export function isNativeAlarmAvailable(): boolean {
  return (
    Platform.OS === 'android' &&
    !IS_EXPO_GO &&
    !!NativeModules.AlarmModule
  );
}

// ─── AsyncStorage helpers ────────────────────────────────────────────────────

async function loadScheduledIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(NATIVE_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveScheduledIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NATIVE_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function nextOccurrenceForWeekday(
  dayOfWeek: number,  // 0 = Sun … 6 = Sat
  hour: number,
  minute: number,
): Date {
  const now    = new Date();
  const result = new Date();
  result.setHours(hour, minute, 0, 0);

  let daysUntil = (dayOfWeek - now.getDay() + 7) % 7;
  // If it's the same day but the time has already passed, push a full week.
  if (daysUntil === 0 && result <= now) daysUntil = 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function nextOccurrenceOnAnyDay(hour: number, minute: number): Date {
  const now    = new Date();
  const result = new Date();
  result.setHours(hour, minute, 0, 0);
  if (result <= now) result.setDate(result.getDate() + 1);
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Cancel all previously registered AlarmManager alarms, then reschedule for
 * every enabled alarm.  Call this any time the alarm list changes.
 */
export async function syncNativeAlarms(alarms: Alarm[]): Promise<void> {
  if (!isNativeAlarmAvailable()) return;

  const mod = NativeModules.AlarmModule;

  try {
    // Cancel previously registered alarms
    const oldIds = await loadScheduledIds();
    for (const id of oldIds) {
      try {
        await mod.cancelAlarm(id);
      } catch {}
    }

    const newIds: string[] = [];

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;

      const parts  = alarm.time?.split(':').map(Number);
      const hour   = parts?.[0];
      const minute = parts?.[1];
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

      const title = alarm.title?.trim() || 'Wake Up!';

      if (alarm.repeatDays.length > 0) {
        // One AlarmManager entry per repeat weekday
        for (const day of alarm.repeatDays) {
          const scheduleId  = `${alarm.id}_${day}`;
          const triggerTime = nextOccurrenceForWeekday(day, hour!, minute!);
          try {
            await mod.scheduleAlarm(scheduleId, title, triggerTime.getTime());
            newIds.push(scheduleId);
          } catch (e) {
            console.warn('[nativeAlarm] scheduleAlarm failed:', scheduleId, e);
          }
        }
      } else {
        // One-shot alarm — next occurrence of the configured clock time
        const triggerTime = nextOccurrenceOnAnyDay(hour!, minute!);
        try {
          await mod.scheduleAlarm(alarm.id, title, triggerTime.getTime());
          newIds.push(alarm.id);
        } catch (e) {
          console.warn('[nativeAlarm] scheduleAlarm failed:', alarm.id, e);
        }
      }
    }

    await saveScheduledIds(newIds);
  } catch (e) {
    console.warn('[nativeAlarm] syncNativeAlarms failed:', e);
  }
}

/**
 * Cancel native alarms for a specific alarm ID (all weekday slots included).
 * Call when an alarm is deleted or disabled.
 */
export async function cancelNativeAlarm(alarmId: string): Promise<void> {
  if (!isNativeAlarmAvailable()) return;
  const mod = NativeModules.AlarmModule;

  try {
    const ids = await loadScheduledIds();
    const toCancel = ids.filter(
      (id) => id === alarmId || id.startsWith(`${alarmId}_`),
    );
    const remaining: string[] = [];

    for (const id of ids) {
      if (toCancel.includes(id)) {
        try { await mod.cancelAlarm(id); } catch {}
      } else {
        remaining.push(id);
      }
    }

    await saveScheduledIds(remaining);
  } catch (e) {
    console.warn('[nativeAlarm] cancelNativeAlarm failed:', e);
  }
}
