/**
 * Notification service — schedules / cancels local alarm notifications via
 * expo-notifications.
 *
 * On Android production builds this service is a no-op for alarm scheduling:
 * the native AlarmModule (AlarmManager → AlarmReceiver → full-screen
 * notification) is the sole alarm trigger on Android. expo-notifications
 * would create a parallel, lower-priority notification that fires at the same
 * time and confuses users (they see a normal banner instead of the full-screen
 * alarm UI).
 *
 * expo-notifications is still used for:
 *   • iOS alarm scheduling (AlarmManager is Android-only)
 *   • Expo Go development testing on Android (native module not loaded)
 *   • Permission requests on Android 13+ (POST_NOTIFICATIONS)
 *   • The Android notification channel setup (so the permission prompt shows
 *     the correct channel name in Settings)
 *
 * Design choices (iOS / Expo Go):
 *   • One WEEKLY scheduled notification per enabled repeat-day per alarm.
 *   • One DATE (next occurrence) notification for alarms with no repeat days.
 *   • syncAlarmNotifications() cancels all managed notifications then
 *     reschedules — keeps it simple and avoids stale-ID edge-cases.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm } from '@/context/AppContext';
import { isNativeAlarmAvailable } from '@/services/nativeAlarmService';

const NOTIF_IDS_KEY = '@unsnwooze_notif_ids';
const ALARM_CHANNEL_ID = 'alarms';

// expo-notifications removed Android push-notification support from Expo Go
// in SDK 53.  Scheduling still compiles but throws at runtime.  We detect
// the Expo Go host environment and downgrade gracefully so the foreground
// 5-second alarm poller (useAlarmScheduler) keeps working while dev testing.
// In a development build or production APK this path is never taken.
const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ─── Android channel setup ────────────────────────────────────────────────────
// Call once on app start to ensure the high-priority alarm channel exists.
export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || IS_EXPO_GO) return;
  try {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      sound: 'default',
    });
  } catch (e) {
    console.warn('[notifications] Failed to create Android alarm channel:', e);
  }
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
  } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request notification permissions. Must be called before any scheduling.
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || IS_EXPO_GO) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Cancel all UNSNWOOZE-managed notifications and reschedule for every enabled
 * alarm. Call this any time the alarm list changes.
 *
 * NO-OP on Android production builds — AlarmManager is the sole trigger there.
 * expo-notifications scheduling only runs on iOS and Expo Go (dev).
 */
export async function syncAlarmNotifications(alarms: Alarm[]): Promise<void> {
  if (Platform.OS === 'web' || IS_EXPO_GO) return;
  // On Android when the native AlarmModule is loaded, AlarmManager handles all
  // alarm scheduling and fires a full-screen notification via AlarmReceiver.
  // Running expo-notifications in parallel would post a second, normal-priority
  // notification at the same time — causing the "behaves like a regular
  // notification" experience. Skip entirely on Android production.
  if (isNativeAlarmAvailable()) return;
  try {
    // Cancel previously managed notifications
    const oldIds = await loadIds();
    for (const id of oldIds) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }

    const newIds: string[] = [];

    for (const alarm of alarms) {
      if (!alarm.enabled) continue;

      const [hour, minute] = alarm.time.split(':').map(Number);
      const body = alarm.title?.trim() || 'Wake up!';
      const content: Notifications.NotificationContentInput = {
        title: 'UNSNWOOZE — Time to Wake Up!',
        body,
        sound: 'default',
        data: { alarmId: alarm.id },
        priority: Notifications.AndroidNotificationPriority.MAX,
      };

      if (alarm.repeatDays.length > 0) {
        // Schedule one weekly notification per repeat day
        // Expo weekday: 1 = Sunday … 7 = Saturday (our RepeatDay: 0 = Sun)
        for (const day of alarm.repeatDays) {
          const id = await Notifications.scheduleNotificationAsync({
            content,
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday: (day + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7,
              hour,
              minute,
            },
          });
          newIds.push(id);
        }
      } else {
        // One-time: next occurrence of this clock time
        const now = new Date();
        const fire = new Date();
        fire.setHours(hour, minute, 0, 0);
        if (fire <= now) {
          fire.setDate(fire.getDate() + 1); // push to tomorrow if time passed today
        }
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fire,
          },
        });
        newIds.push(id);
      }
    }

    await saveIds(newIds);
  } catch (e) {
    console.warn('[notifications] syncAlarmNotifications failed:', e);
  }
}
