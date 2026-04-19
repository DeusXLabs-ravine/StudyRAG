# StudyRAG Widgets (iOS + Android)

Lock-screen and home-screen widgets that surface a daily flashcard (all users)
and a daily definition (Pro only). The TS layer, backend endpoint, and native
source files are all in the repo. **The widgets themselves can't run in Expo
Go — no widget ever can, on any app, anywhere.** This doc explains why and
what it takes to turn them on without leaving Expo.

## Honest truth about Expo Go + widgets

Expo Go is a pre-built shell app that runs your JavaScript. iOS widgets and
Android widgets require **native code compiled into the binary** — a
WidgetKit extension on iOS, a Glance `AppWidgetProvider` on Android. Expo Go
can't load your widget code because the widget extension has to be signed
into the app bundle at build time.

This isn't a StudyRAG problem — it's an Apple/Google rule. **Every** Expo
app that has widgets (including the big names) has the same constraint.

**Good news:** The app runs in Expo Go today with zero changes.
`mobile/src/native/widgets.ts` silently no-ops when the native bridge
isn't present, so `syncWidgets()` is safe to call everywhere. Widgets just
won't appear on lock/home screens until you ship a build that includes them.

## Two ways to get widgets into a real build (no ejecting required)

### Path 1 — EAS Build with a dev client (recommended, no `prebuild` commitment)

You stay 100% in the Expo managed workflow. EAS runs prebuild for you in the
cloud, the widget code gets compiled in, you install the resulting `.ipa`
/`.apk`, and widgets work.

```bash
cd mobile
npm i -g eas-cli
eas login
eas build:configure          # one-time setup
eas build --profile development --platform ios
eas build --profile development --platform android
```

Install the resulting dev client build from the EAS dashboard, then run
`npx expo start --dev-client` to develop against it. Widgets appear in the
iOS widget picker + Android home-screen add-widget menu.

To get the widget source into the build, you need an Expo **config plugin**
that copies `mobile/native-widgets/*` into the right spots at prebuild time.
A starter plugin is sketched in `plugins/withStudyRAGWidgets.ts` — see the
next section.

### Path 2 — Local `expo prebuild` (gives you an `ios/`+`android/` folder)

If you *do* want the native folders checked into the repo:

```bash
cd mobile
npx expo prebuild --clean
```

Then manually copy files:

- iOS: `mobile/native-widgets/ios/StudyRAGWidget/` → `mobile/ios/StudyRAGWidget/`
- Android: `mobile/native-widgets/android/src/main/java/...` → `mobile/android/app/src/main/java/...`

Your `.gitignore` can still hide `ios/` and `android/` — EAS Build works
either way. This path is traditional; Path 1 is cleaner for a team.

## What's in the repo

| Layer | File | Runs in Expo Go? |
|---|---|---|
| Backend endpoint | `backend/src/routes/widgetRoutes.js` + `widgetController.js` | ✅ Yes — pure HTTP, lives at `GET /api/widgets/daily` |
| TS sync helper | `mobile/src/native/widgets.ts` | ✅ Yes — silently no-ops without bridge |
| iOS widget source | `mobile/native-widgets/ios/` | ❌ Needs build |
| Android widget source | `mobile/native-widgets/android/` | ❌ Needs build |
| Native RN bridge | `mobile/native-widgets/bridge/` | ❌ Needs build |
| Config plugin (writing one is Path 1's key step) | `plugins/withStudyRAGWidgets.ts` | — |

## Turn-on checklist (once you're doing a real build)

### 1. App Group entitlement (iOS)

Both the main app target and the widget extension target need the same
App Group: `group.co.studyrag.widgets`.

In the Apple Developer portal:
- Identifiers → App Groups → register `group.co.studyrag.widgets`
- Add it to both app IDs (main + widget extension)
- Regenerate provisioning profiles

The widget reads `UserDefaults(suiteName: "group.co.studyrag.widgets")` so
without this the widget sees no data.

### 2. Android: manifest receiver

Glance uses `AppWidgetProvider`. The scaffold's `MANIFEST_SNIPPET.xml` shows
the `<receiver>` + `<meta-data>` entries. Merge those into
`android/app/src/main/AndroidManifest.xml` (or let your config plugin merge).

### 3. Wire sync calls

Already wired in `mobile/app/_layout.tsx`:
- After session load (auth store change)
- On `AppState` change to `'active'`

Backend sets `Cache-Control: private, max-age=21600` (6h), so repeated
foreground calls are nearly free.

## Pro-gating

`GET /api/widgets/daily` returns `definition: null` for non-Pro users. The
iOS and Android widget UIs check for null and fall back to the flashcard,
so free users still see content — they just never see a definition tile.

## Current runtime behaviour without a dev client build

- Open the app in Expo Go → app runs normally, every feature works.
- `syncWidgets()` silently returns (no native bridge found, no crash).
- Lock/home screen has no StudyRAG widget option — Expo Go doesn't advertise one.
- Backend `/widgets/daily` endpoint responds normally if hit directly.

So there's nothing to fix to "make Expo Go work" — it already does. The
widgets are a later feature you ship the first time you do an EAS Build.

## Known TODOs

- [x] ~~Replace placeholder flashcard fallback with real SRS "today's due" logic~~ — shipped in `widgetController.js`
- [x] ~~Hook AppState listener in `mobile/app/_layout.tsx` to call `syncWidgets()`~~ — shipped
- [ ] Write the actual `plugins/withStudyRAGWidgets.ts` config plugin
- [ ] Provision App Group in Apple Developer portal before first TestFlight build
- [ ] Replace widget icons (placeholders in scaffolded asset catalog) — `mobile/assets/icon.png` is a fine starting point
- [ ] Add a Settings row to let users pick "Flashcards only" vs. "Flashcards + Definitions" rotation
