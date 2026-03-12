import { router, useNavigationContainerRef } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';

export function useAlarmScheduler() {
  const { data } = useApp();
  const triggeredRef = useRef<Map<string, string>>(new Map());
  const isNavigatingRef = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    const checkAlarms = () => {
      if (isNavigatingRef.current) return;

      const now = new Date();
      const currentDay = now.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeKey = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

      for (const alarm of dataRef.current.alarms) {
        if (!alarm.enabled) continue;

        const [alarmHour, alarmMinute] = alarm.time.split(':').map(Number);

        if (alarmHour !== currentHour || alarmMinute !== currentMinute) continue;

        if (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes(currentDay)) continue;

        const lastTriggered = triggeredRef.current.get(alarm.id);
        if (lastTriggered === currentTimeKey) continue;

        triggeredRef.current.set(alarm.id, currentTimeKey);
        isNavigatingRef.current = true;

        try {
          router.push({ pathname: '/alarm/trigger', params: { alarmId: alarm.id } });
        } catch {
        }

        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 65000);

        break;
      }
    };

    const interval = setInterval(checkAlarms, 5000);
    checkAlarms();
    return () => clearInterval(interval);
  }, []);
}
