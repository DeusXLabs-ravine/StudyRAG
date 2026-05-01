# StudyRAG Widgets + Watch Apps

Home-screen widgets (iOS + Android) and Watch apps (watchOS + Wear OS) that
surface a daily flashcard and streak stats. The native source, config plugins,
and backend endpoint are all in the repo.

## Quick facts

- Widgets and watch apps **cannot run in Expo Go** — they require native code compiled into the binary.
- `syncWidgets()` silently no-ops when the native bridge isn't present — the main app never crashes.
- Use **EAS Build** to get a binary that includes them (no Mac / Xcode required).

## Building with EAS (recommended — no Mac needed)

```bash
cd mobile
eas build --profile development --platform ios      # dev client with widgets
eas build --profile development --platform android  # dev client with widgets

# Production
eas build --profile production --platform all
```

After the build downloads, install it on your device. Widgets appear in the
iOS widget picker and Android home-screen "Add widget" menu.

## What's wired up

| Layer | Location | Notes |
|---|---|---|
| Backend endpoint | `backend/src/routes/widgetRoutes.js` | `GET /api/widgets/daily` |
| TS sync helper | `mobile/src/native/widgets.ts` | Called on login + foreground |
| iOS Widget (WidgetKit) | `mobile/targets/widget/` | `@bacons/apple-targets` compiles it |
| iOS Watch App (watchOS) | `mobile/targets/watch/` | `@bacons/apple-targets` compiles it |
| iOS Widget RN bridge | `mobile/ios-extensions/StudyRAGWidget/` | Swift + ObjC bridge |
| iOS Watch RN bridge | `mobile/ios-extensions/StudyRAGWatch/` | WatchConnectivity bridge |
| Android Widget | `mobile/android-extensions/StudyRAGWidget/` | Copied into android/ by config plugin |
| Android Wear OS | `mobile/android-extensions/StudyRAGWear/` | Standalone Wear APK project |
| Config plugin | `mobile/plugins/withStudyRAGNativeExtensions.js` | App Group entitlement + Android manifest |

## iOS specifics

`@bacons/apple-targets` reads the `targets/` directory and automatically adds
the widget and watch extension targets during `expo prebuild` / EAS Build.

App Group `group.com.studyrag.app` is set in:
- `app.json` → `ios.entitlements`
- `targets/widget/expo-target.config.js`
- `targets/watch/expo-target.config.js`

The widget reads from `UserDefaults(suiteName: "group.com.studyrag.app")`.
The main app writes via `StudyRAGWidgets.setDailyContent()`.

**Before first TestFlight build:** Register `group.com.studyrag.app` as an
App Group in the Apple Developer portal and enable it on all three App IDs
(main app + widget extension + watch app).

## Android specifics

`withStudyRAGNativeExtensions.js` (config plugin) automatically:
1. Adds `<receiver android:name="com.studyrag.widget.FlashcardWidget">` to `AndroidManifest.xml`
2. Copies Kotlin source + resources from `android-extensions/StudyRAGWidget/` → `android/app/src/main/`

The Wear OS app (`android-extensions/StudyRAGWear/`) is a **separate** standalone
Wear OS module. Build it as a companion APK — it syncs data from the phone via
the Wearable Data Layer (no internet required on the watch).

## Data flow

```
Backend /api/widgets/daily
    ↓ (on login + AppState active)
syncWidgets() [mobile/src/native/widgets.ts]
    ↓
NativeModules.StudyRAGWidgets.setDailyContent()
    ├── iOS  → UserDefaults (group.com.studyrag.app) → WidgetKit reload
    └── Android → SharedPreferences → broadcast ACTION_APPWIDGET_UPDATE
```

Watch sync (iOS):
```
WatchConnectivity → StudyRAGWatchBridge.syncToWatch()
    → WCSession.updateApplicationContext()
    → watchOS ConnectivityManager.session(_:didReceiveApplicationContext:)
```

## Pro gating

`GET /api/widgets/daily` returns `definition: null` for free users.
Free users see the daily flashcard; Pro users also see a definition tile.

## Build checklist (first time)

- [ ] Register Apple App Group `group.com.studyrag.app` in developer.apple.com → Identifiers → App Groups
- [ ] Enable the App Group on the main app, widget extension, and watch app App IDs
- [ ] Regenerate provisioning profiles after enabling the App Group
- [ ] Run `eas build --profile production --platform ios`
- [ ] Run `eas build --profile production --platform android`
- [ ] Sideload the Wear OS APK onto a paired watch
