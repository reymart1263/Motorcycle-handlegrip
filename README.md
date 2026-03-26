<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f2ff5931-5801-45cb-a5df-2c2d3fe34028

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend + Local Database

- Backend runs with Express in `server.ts`.
- App state API:
  - `GET /api/state` - load saved app data
  - `PUT /api/state` - save app data
- Local backend database file: `data/app-state.json`
- Device-local cache key (for mobile-like offline persistence): `grip_app_state` in local storage.

## True Mobile App (Expo React Native)

A native mobile app is available under `mobile/`.

### Mobile features

- Native UI with React Native (Android/iOS)
- On-device persistence with `AsyncStorage`
- Backend sync using existing API (`GET/PUT /api/state`)

### Run mobile app

1. Run backend in project root:
   `npm run dev`
2. In another terminal, install mobile dependencies:
   `cd mobile && npm install`
3. Start Expo:
   `npm run start`
4. Open in Android/iOS emulator or Expo Go.

### Backend URL for mobile

- Default is Android emulator URL: `http://10.0.2.2:3000`
- Override with env var in `mobile/.env`:
  `EXPO_PUBLIC_API_BASE_URL=http://<your-local-ip>:3000`

## Native Android (Kotlin / Android Studio)

For **full native control** (no React Native), use the Gradle project in `native-android/`:

- **Language:** Kotlin (recommended for Android today; Java is optional for new modules).
- **UI:** Jetpack Compose.
- **Docs:** see [native-android/README.md](native-android/README.md).

Open `native-android` in **Android Studio**, run the backend with `npm run dev`, then Run the app on an emulator or device.
