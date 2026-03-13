import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { useAlarmScheduler } from "@/hooks/useAlarmScheduler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Inject global web styles once — removes browser focus outlines and box-shadows on buttons
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

function AlarmScheduler() {
  useAlarmScheduler();
  return null;
}

function RootLayoutNav() {
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
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <AlarmScheduler />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
