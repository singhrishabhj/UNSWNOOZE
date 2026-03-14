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
import React, { useEffect } from "react";
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

SplashScreen.preventAutoHideAsync();

// Show notifications even when the app is foregrounded
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Inject global web styles once
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
  // Navigate to trigger screen when user taps a scheduled notification
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const alarmId = response.notification.request.content.data?.alarmId as string | undefined;
      if (alarmId) {
        router.push({ pathname: '/alarm/trigger', params: { alarmId } });
      }
    });

    return () => sub.remove();
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

  // Request notification permission and set up Android alarm channel once on launch
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setupAndroidNotificationChannel();
      requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
