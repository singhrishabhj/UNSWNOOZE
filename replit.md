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
- **Alarm Trigger**: Full-screen alarm interface with voice alarm (Web Speech API)
- **Wake-Up Tasks**: Face verification (camera selfie + simulated detection), Toothpaste photo verification
- **Completion Screen**: Expanding ring animation, streak update, auto-returns to dashboard
- **Gamification**: Achievement badges (Sleepy Panda, Early Bird, Morning Warrior, Discipline Master)
- **Dark/Light Mode**: Smooth theme toggle in settings
- **Multi-language**: English and Hindi support

### Key Files
- `artifacts/mobile/app/_layout.tsx` — Root layout with providers
- `artifacts/mobile/app/index.tsx` — Splash screen entry
- `artifacts/mobile/app/onboarding.tsx` — Swipe onboarding
- `artifacts/mobile/app/(tabs)/index.tsx` — Home dashboard
- `artifacts/mobile/app/(tabs)/settings.tsx` — Settings screen
- `artifacts/mobile/app/alarm/create.tsx` — Alarm creation/edit
- `artifacts/mobile/app/alarm/trigger.tsx` — Alarm trigger screen
- `artifacts/mobile/app/alarm/task.tsx` — Wake-up task (camera)
- `artifacts/mobile/app/alarm/complete.tsx` — Completion screen
- `artifacts/mobile/context/AppContext.tsx` — Global state (alarms, streak, achievements)
- `artifacts/mobile/components/DigitalClock.tsx` — Animated digit clock
- `artifacts/mobile/components/StreakRing.tsx` — Circular streak progress
- `artifacts/mobile/components/AlarmCard.tsx` — Alarm list card
- `artifacts/mobile/components/AchievementBadge.tsx` — Achievement display
- `artifacts/mobile/constants/colors.ts` — Color system (primary: #FF6B00)

### Color System
- Primary: `#FF6B00` (orange)
- Dark background: `#0F0F0F`
- Dark surface: `#1A1A1A`
- Light background: `#FFFFFF`
- Light surface: `#F5F5F5`

### Data Persistence
- AsyncStorage at key `@unsnwooze_data`
- Stores: alarms, streak data, achievements, theme/language preferences
