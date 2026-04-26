# AHAR — AI Diet & Wellness App — Copilot Workspace Instructions

## What this app is

AHAR is a cross-platform mobile app (Expo + React Native) for personalised
vegetarian diet planning, daily wellness reminders, and body progress tracking,
powered by Azure OpenAI GPT-4o. Target user: busy Indian professionals and
gym-goers with packed schedules and zero time to plan nutrition manually.

## Core tech stack (never deviate from this)

- Frontend: Expo SDK 51, React Native, TypeScript (strict mode)
- Navigation: Expo Router (file-based routing, app/ directory)
- State: Zustand (global), React Query (server state + caching)
- Backend: Node.js 20, Express, TypeScript
- Database: MongoDB Atlas (Mongoose ODM)
- AI: Azure OpenAI GPT-4o via REST (model: gpt-4o, api-version: 2024-02-01)
- Auth: JWT (access token 15min, refresh token 30 days), bcrypt
- Notifications: Expo Notifications (expo-notifications), custom sounds
- Storage: AsyncStorage (offline cache), SecureStore (tokens)
- Styling: Custom design system (NO NativeWind, NO styled-components)
- Icons: Expo Vector Icons (Ionicons set only)
- Charts: Victory Native XL
- Forms: React Hook Form + Zod validation

## Design system (always follow exactly)

Primary color: #2D6A4F (deep forest green)
Secondary color: #52B788 (fresh mint green)  
Accent color: #F4845F (warm coral/orange)
Background: #0F1923 (dark navy — app is DARK THEME ONLY)
Surface: #1A2634 (card background)
Surface2: #243447 (elevated card)
Border: #2E4057 (subtle border)
Text primary: #F0F4F8
Text secondary: #8FA3B1
Text muted: #4A6274
Success: #52B788
Warning: #F4A261
Error: #E07070
Font: System default (SF Pro on iOS, Roboto on Android)
Border radius: 12px (cards), 8px (inputs), 24px (buttons/pills)
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48px

## Folder structure (always maintain this)

ahar/
├── app/ # Expo Router pages
│ ├── (auth)/ # Login, register, onboarding
│ ├── (tabs)/ # Main tab navigation
│ │ ├── dashboard/
│ │ ├── plan/
│ │ ├── progress/
│ │ └── settings/
│ └── \_layout.tsx
├── src/
│ ├── components/ # Atomic components
│ │ ├── atoms/ # Button, Text, Input, Card, Badge
│ │ ├── molecules/ # MealCard, MacroRing, StreakBadge
│ │ └── organisms/ # DayTimeline, WeeklyReport, GymLogger
│ ├── hooks/ # useAuth, usePlan, useNotifications
│ ├── stores/ # Zustand stores
│ ├── services/ # API calls, AI service, notification service
│ ├── utils/ # Date utils, macro calculator, validators
│ ├── types/ # All TypeScript interfaces
│ └── constants/ # Theme, spacing, API endpoints
├── server/ # Express backend
│ ├── src/
│ │ ├── routes/
│ │ ├── controllers/
│ │ ├── models/ # Mongoose models
│ │ ├── middleware/
│ │ ├── services/ # AI service, notification scheduler
│ │ └── utils/
│ └── package.json
├── assets/
│ └── sounds/ # Custom notification sounds (.wav)
└── package.json

## Code rules (always follow)

- TypeScript strict mode everywhere, no `any` types, no `@ts-ignore`
- Every component gets a named export AND a default export
- Every async function has try/catch with typed error handling
- All API responses follow: { success: boolean, data?: T, error?: string }
- All Mongoose models have: createdAt, updatedAt, isDeleted (soft delete)
- All AI prompts sent to Azure OpenAI must be logged to AuditLog collection
- All user actions must be logged to ActivityLog collection
- Zod schema defined BEFORE the TypeScript type (type derived from schema)
- React Query keys must be constants defined in a queryKeys.ts file
- No inline styles — all styles via StyleSheet.create()
- Every screen component must handle: loading state, error state, empty state
- Whenever any new environment variable is introduced, update both `.env.example` (app) and `server/.env.example` in the same change

## MongoDB collections

users, userProfiles, dietPlans, mealLogs, gymLogs, groceryLists,
prepTasks, notifications, activityLogs, auditLogs, weeklySummaries,
streaks, badges, festivals

## Key business rules

- Nightly AI plan generation runs at 9pm in user's LOCAL timezone
- Diet is always vegetarian (no meat, no eggs unless user specifies)
- Macros are calculated from: weight, height, age, gender, activity level, goal
- All notifications are timezone-aware using user's stored timezone offset
- Offline mode: last 3 days of plans cached in AsyncStorage
- Female users: menstrual cycle phase adjusts diet and tips automatically
- Festival mode: detected from festivals collection + user's country
- AI responses always return structured JSON (never freeform text to parse)
- Every AI call must have a fallback response if API fails
- Audit log must store: userId, action, prompt, response, tokens used, cost estimate, timestamp
