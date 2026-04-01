# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── mobile/             # UNSNWOOZE Expo React Native app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## UNSNWOOZE Mobile App

Smart alarm app that prevents snooze abuse.

### Features
- **Splash Screen**: Animated clock with orange glow on dark background
- **Onboarding**: 5-slide swipe flow with animated icons
- **Home Dashboard**: Animated digital clock with digit transitions, ambient orange glow
- **Streak Ring**: Animated circular progress ring showing current/best streak
- **Alarm List**: Cards with time, title, task type, sound type, and days
- **Create Alarm**: Full alarm configuration with time picker, repeat days, wake task selection, sound type
- **Alarm Trigger**: Full-screen alarm with looping expo-audio sound + expo-speech TTS reads alarm title 1.2 s after ring
- **Background Alarm**: expo-notifications schedules local notifications for each enabled alarm; tapping notification opens trigger screen
- **Wake-Up Tasks**: Face liveness check (timer-guided camera: look → turn left → turn right → blink), Toothpaste photo verification
- **Completion Screen**: Expanding ring animation, streak update, auto-returns to dashboard
- **Gamification**: Achievement badges (Sleepy Panda, Early Bird, Morning Warrior, Discipline Master)
- **Dark/Light Mode**: Smooth theme toggle in settings
- **Multi-language**: English and Hindi support

### Key Files
- `artifacts/mobile/app/_layout.tsx` — Root layout (SafeAreaProvider + AppProvider + GestureHandler; no unnecessary wrappers)
- `artifacts/mobile/app/index.tsx` — Splash screen entry
- `artifacts/mobile/app/onboarding.tsx` — Swipe onboarding
- `artifacts/mobile/app/(tabs)/index.tsx` — Home dashboard
- `artifacts/mobile/app/(tabs)/streak.tsx` — Streak tab (stats, weekly grid, milestones, achievements)
- `artifacts/mobile/app/(tabs)/settings.tsx` — Settings screen
- `artifacts/mobile/app/alarm/create.tsx` — Alarm creation/edit
- `artifacts/mobile/app/alarm/trigger.tsx` — Alarm trigger screen
- `artifacts/mobile/app/alarm/task.tsx` — Wake-up task (in-app CameraView for both face & toothpaste)
- `artifacts/mobile/app/alarm/complete.tsx` — Completion screen
- `artifacts/mobile/context/AppContext.tsx` — Global state (alarms, streak, weeklyHistory, achievements)
- `artifacts/mobile/services/storage.ts` — Typed AsyncStorage wrapper (storageService.load/save)
- `artifacts/mobile/services/alarmSound.ts` — Alarm audio singleton (expo-audio on native, WebAudio on web; loop/stop API)
- `artifacts/mobile/services/notificationService.ts` — expo-notifications scheduler; syncAlarmNotifications() cancels+reschedules on every alarm change; IDs stored in AsyncStorage key `@unsnwooze_notif_ids`
- `artifacts/mobile/services/nativeAlarmService.ts` — Native AlarmManager bridge; syncNativeAlarms() mirrors same cancel+reschedule pattern; IDs in `@unsnwooze_native_alarm_ids`; no-op in Expo Go / web / iOS
- `artifacts/mobile/plugins/withAndroidAlarm.js` — Expo config plugin; generates 4 Kotlin files + patches AndroidManifest.xml + MainApplication.kt during EAS Build prebuild
- `artifacts/mobile/components/DigitalClock.tsx` — Animated digit clock (single setInterval, cleanup on unmount)
- `artifacts/mobile/components/StreakRing.tsx` — Circular streak progress (React.memo)
- `artifacts/mobile/components/AlarmCard.tsx` — Alarm list card (React.memo)
- `artifacts/mobile/components/AchievementBadge.tsx` — Achievement display (React.memo)
- `artifacts/mobile/components/FaceLivenessCheck.tsx` — In-app front-camera face verification (expo-camera CameraView)
- `artifacts/mobile/constants/colors.ts` — Color system (primary: #FF6B00)
- `artifacts/mobile/constants/translations.ts` — EN + HI translation strings
- `artifacts/mobile/hooks/useTranslation.ts` — Language hook returning t, fonts, lang

### Color System
- Primary: `#FF6B00` (orange)
- Dark background: `#0F0F0F`
- Dark surface: `#1A1A1A`
- Light background: `#FFFFFF`
- Light surface: `#F5F5F5`

### Data Persistence
- `services/storage.ts` typed wrapper around AsyncStorage (key: `@unsnwooze_data`)
- Stores: alarms, streak data, weeklyHistory (7-day rolling window), achievements, theme/language preferences

### Camera
- Both wake-up tasks (face + toothpaste) use `expo-camera` `CameraView` inside the app — the system camera app is never opened
- iOS permission: `NSCameraUsageDescription` in `app.json > ios.infoPlist`
- Android permission: `CAMERA` in `app.json > android.permissions`
- Permission flow: check → request → fallback Alert if denied

### Performance
- `AlarmCard`, `AchievementBadge`, `StreakRing` wrapped with `React.memo`
- `useCallback` on all event handlers in task screens
- `DigitalClock`: single `setInterval` cleared on unmount
- Root layout has no QueryClientProvider or KeyboardProvider (removed — unused)

### Alarm Scheduling Architecture
1. **Foreground**: `useAlarmScheduler` hook polls every 5 s; navigates to `/alarm/trigger` when clock matches
2. **Background / closed (Android native)**: `services/nativeAlarmService.ts` calls `NativeModules.AlarmModule.scheduleAlarm()` — uses Android `AlarmManager.setExactAndAllowWhileIdle`. On fire: `AlarmReceiver.kt` → `AlarmActivity.kt` (acquires FULL_WAKE_LOCK, sets FLAG_SHOW_WHEN_LOCKED, fires deep link `unsnwooze://alarm/trigger?alarmId=xxx`) → Expo Router navigates to trigger screen automatically
3. **Background / closed (fallback)**: `expo-notifications` local notifications. Tapping notification opens app and navigates to trigger via `addNotificationResponseReceivedListener` in `_layout.tsx`
4. **Sound**: `startAlarm()` / `stopAlarm()` in `services/alarmSound.ts`; alarm persists across navigation — only silenced in task.tsx on success or give-up
5. **TTS**: `expo-speech` speaks alarm title 1.2 s after sound starts (native only)
6. **Sync**: `NotificationSync` component in `_layout.tsx` calls both `syncAlarmNotifications` AND `syncNativeAlarms` whenever `data.alarms` changes

### Native Android Alarm — Config Plugin
- Plugin: `plugins/withAndroidAlarm.js` (runs during EAS Build prebuild)
- Writes to `android/app/src/main/java/com/unsnwooze/app/`:
  - `AlarmReceiver.kt` — BroadcastReceiver triggered by AlarmManager
  - `AlarmActivity.kt` — Minimal activity that sets lock-screen flags + opens deep link into RN app
  - `AlarmModule.kt` — React Native native module (scheduleAlarm / cancelAlarm)
  - `AlarmPackage.kt` — Registers AlarmModule with the React bridge
- Patches `AndroidManifest.xml`: SCHEDULE_EXACT_ALARM, USE_FULL_SCREEN_INTENT, WAKE_LOCK permissions + receiver + activity entries
- Patches `MainApplication.kt`: adds `AlarmPackage()` to `getPackages()`

### EAS Build (Deploy)
```bash
# Install EAS CLI (once)
npm install -g eas-cli
# Log into your Expo account
eas login
# Build a preview APK (sideloadable, includes native alarm)
eas build --profile preview --platform android
# Build production AAB (for Play Store)
eas build --profile production --platform android
```

### TimePicker Fix (Android)
`components/TimePicker.tsx` debounces `onScrollEndDrag` by 120 ms on Android to prevent multiple premature fires. Also: `nestedScrollEnabled` on drum columns, `useCallback` on all handlers.

### Removed Dependencies (vs original)
`@tanstack/react-query`, `expo-location`, `react-native-worklets` (re-added as reanimated peer), `@workspace/api-client-react`, `zod`, `zod-validation-error`, `expo-web-browser`, `@react-native-community/datetimepicker`, `expo-image`, `react-native-keyboard-controller`, `expo-av` (→ expo-audio), `expo-face-detector` (→ timer-based liveness)

### Added Dependencies (vs original)
`expo-audio`, `expo-speech`, `expo-notifications`
