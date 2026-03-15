import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from "@expo-google-fonts/noto-sans-devanagari";
import * as Notifications from 'expo-notifications';
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import { useAlarmScheduler } from "@/hooks/useAlarmScheduler";
import {
  requestNotificationPermission,
  setupAndroidNotificationChannel,
  syncAlarmNotifications,
} from "@/services/notificationService";

// If fonts don't resolve within this window we render anyway using system fonts.
// This prevents a permanent blank screen when the device is offline at startup.
const FONT_TIMEOUT_MS = 5_000;

SplashScreen.preventAutoHideAsync();

// Show notifications even when the app is foregrounded.
// Wrapped in try/catch so a throw during Expo Go init never crashes the layout.
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

// Inject global web focus-ring reset once
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    *:focus { outline: none !important; }
    *:focus-visible { outline: none !important; box-shadow: none !important; }
    button { box-shadow: none !important; }
    [role="button"] { box-shadow: none !important; }
  `;
  document.head.appendChild(style);
}

// Polls every 5 s for foreground alarm triggering
function AlarmScheduler() {
  useAlarmScheduler();
  return null;
}

// Syncs expo-notifications whenever the alarm list changes
function NotificationSync() {
  const { data } = useApp();

  useEffect(() => {
    syncAlarmNotifications(data.alarms);
  }, [data.alarms]);

  return null;
}

function RootLayoutNav() {
  // Navigate to trigger screen when user taps a scheduled notification.
  // Skipped on web (expo-notifications is native-only).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub: Notifications.EventSubscription | null = null;
    try {
      sub = Notifications.addNotificationResponseReceivedListener(response => {
        const alarmId = response.notification.request.content.data?.alarmId as string | undefined;
        if (alarmId) {
          router.push({ pathname: '/alarm/trigger', params: { alarmId } });
        }
      });
    } catch (e) {
      console.warn('[layout] Failed to add notification listener:', e);
    }

    return () => { sub?.remove(); };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alarm/create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="alarm/trigger" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="alarm/task" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="alarm/complete" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="alarm/failure" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      <Stack.Screen name="settings/about" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/privacy" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/terms" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  // Safety valve: if useFonts never resolves (network down, cache miss, etc.)
  // we render with system fonts after FONT_TIMEOUT_MS so the user never sees
  // a permanent blank screen or a stuck splash.
  const [fontTimedOut, setFontTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFontTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // We are ready to render as soon as fonts are done (success or error) OR
  // the timeout fires — whichever comes first.
  const fontsReady = fontsLoaded || !!fontError || fontTimedOut;

  // Request notification permission and set up Android alarm channel once on launch.
  // Both calls are already wrapped in try/catch inside the service.
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setupAndroidNotificationChannel();
      requestNotificationPermission();
    }
  }, []);

  // Hide the splash screen as soon as fonts are ready.
  // .catch() swallows the rare case where hideAsync() throws
  // (e.g. Expo SDK internal race on first cold-launch).
  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  // Keep splash visible while waiting — never render null indefinitely.
  if (!fontsReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <AlarmScheduler />
          <NotificationSync />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
