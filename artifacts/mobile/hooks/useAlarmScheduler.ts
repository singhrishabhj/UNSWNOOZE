import { router, useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function useAlarmScheduler() {
  const { data } = useApp();
  // navRef.isReady() returns true once the navigation container has mounted
  // and is safe to call router.push on.
  const navRef = useNavigationContainerRef();

  // Tracks which alarms have already been triggered within the current minute
  // so we never fire the same alarm twice during the same HH:MM window.
  const triggeredRef = useRef<Map<string, string>>(new Map());
  // Guards against concurrent navigation attempts.
  const isNavigatingRef = useRef(false);
  // Keep a stable ref to data so the polling callback always reads the latest
  // alarm list without re-subscribing to the interval.
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const checkAlarms = () => {
      // Don't attempt navigation while another push is in-flight.
      if (isNavigatingRef.current) return;

      // Wait until the navigation container is mounted and ready.
      if (!navRef.isReady()) return;

      const now = new Date();
      const currentDay = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      // Key is unique per alarm per minute — prevents duplicate triggers.
      const currentTimeKey = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

      for (const alarm of dataRef.current.alarms) {
        if (!alarm.enabled) continue;

        const [alarmHour, alarmMinute] = alarm.time.split(':').map(Number);

        // Time mismatch — skip.
        if (alarmHour !== currentHour || alarmMinute !== currentMinute) continue;

        // Repeat day mismatch — skip (one-shot alarms have repeatDays = []).
        if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(currentDay)) continue;

        // Already triggered this alarm during this minute — skip.
        const lastTriggered = triggeredRef.current.get(alarm.id);
        if (lastTriggered === currentTimeKey) continue;

        // Mark as triggered for this minute before attempting navigation
        // so rapid polling ticks don't fire twice.
        triggeredRef.current.set(alarm.id, currentTimeKey);
        isNavigatingRef.current = true;

        try {
          router.push({ pathname: '/alarm/trigger', params: { alarmId: alarm.id } });
          // Unlock after 60 s — long enough to cover the rest of the alarm minute
          // but short enough that a second alarm can fire the next minute if needed.
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 60_000);
        } catch {
          // Navigation failed (e.g. router not yet ready despite the isReady() check).
          // Roll back both guards so the next polling tick can retry.
          triggeredRef.current.delete(alarm.id);
          isNavigatingRef.current = false;
        }

        // Only trigger one alarm per check cycle.
        break;
      }
    };

    // Poll every 5 s. Expo runs in a JS thread so setInterval is reliable
    // while the app is foregrounded. Background / killed-app delivery is
    // handled by expo-notifications (see notificationService.ts).
    const interval = setInterval(checkAlarms, 5000);
    // Run once immediately so an alarm set for the current minute fires without
    // waiting up to 5 s.
    checkAlarms();
    return () => clearInterval(interval);
  // navRef is stable across renders — safe to omit from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
