# Native Android (Kotlin)

This is a **native Android** app using **Kotlin** and **Jetpack Compose** (the standard stack for new Android work). Java is still supported on Android, but Google and the ecosystem default to Kotlin for application code.

## Requirements

- **Android Studio** Koala (2024.1.1) or newer (includes **JDK 17** and the Android SDK).
- **Android SDK** with API 35 (installed from SDK Manager).
- Backend running on your PC: from repo root, `npm run dev` (port **3000**).

Do **not** rely on an old system **JRE 8** for Gradle; AGP 8.x needs a modern JDK (Android Studio’s bundled **jbr** is correct).

## Open in Android Studio

1. **File → Open…** and select this folder: `native-android/`.
2. Wait for Gradle sync to finish.
3. Start the backend (`npm run dev` in the project root).
4. Run the app:
   - **Emulator:** default API base URL `http://10.0.2.2:3000` works in the app.
   - **Physical device:** use your PC’s LAN IP, e.g. `http://192.168.1.50:3000` (same Wi‑Fi).

## Command line (optional)

From `native-android/`:

```bat
gradlew.bat assembleDebug
```

Use the JDK that ships with Android Studio (set `JAVA_HOME` to the `jbr` folder if `java` on PATH is too old).

## What this app does

- Loads **`GET /api/state`** from your existing Node backend and shows user + fingerprint counts.
- Uses **cleartext HTTP** only for local development (`network_security_config` + `usesCleartextTraffic`).

For production, serve **HTTPS** and tighten the network security config.
