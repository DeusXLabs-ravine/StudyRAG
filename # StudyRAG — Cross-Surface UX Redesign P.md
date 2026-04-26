# StudyRAG — Cross-Surface UX Redesign Plan

## Context

StudyRAG ships across **three surfaces** that today don't share an IA:

- **Mobile** (`mobile/` — Expo + React Native, independent codebase, 5 tabs)
- **Web** (`frontend/` — React + Vite SPA, 9-item top nav + per-page sidebars)
- **Desktop** (`desktop/` — Tauri wrapper that embeds the live web app; inherits its UX for free)

The visual language is already consistent — Outfit font, sky-blue `#0EA5E9` primary, Lucide icons, Tailwind / NativeWind utilities. You said the UI is palatable. The problem is the **information architecture and flows**:

- **"Studying one document" is scattered across 3 destinations** on both web and mobile (Learn + Quiz + Flashcards). A user who just wants to review a PDF has to mentally switch locations.
- **`Learn` screens collapse too many modes into one canvas.** On web, the Learn page simultaneously hosts lesson content, quiz embed, tutor chat, diagrams, podcast, and Teach mode — all toggleable via six+ `useState` calls (`frontend/src/pages/Learn.jsx`). On mobile, `learn/[documentId]` has a WebView, module carousel, and tutor chat competing in one scroll (`mobile/app/learn/[documentId].tsx`).
- **Add-document is a nested modal that loses state.** 387 lines of mode-switching inside `mobile/src/components/common/AddDocumentSheet.tsx`; web has a similar upload modal in `frontend/src/pages/Documents.jsx`.
- **Premium features are invisible.** Teach mode is buried behind modal buttons on both surfaces. Lab (Simulations) sits in the web nav with a lock badge but no path to discover *why* it matters.
- **Settings are hidden on mobile, tucked into a 9-item nav on web.** Accessibility toggles — a differentiator — aren't surfaced at moments when they'd matter.
- **No shared empty / skeleton / toast / processing primitives.** Errors use `Alert.alert()` on mobile and ad-hoc components on web. Loading is `ActivityIndicator` or a rotating-text loader; no skeletons.
- **Onboarding is inconsistent.** Mobile forces a 5-step profile after a 3-screen intro (~9 taps before first value); web has no onboarding at all.

The goal is a **single IA and set of flow patterns** that both surfaces adopt, with surface-specific adaptations only where the form factor demands it. Desktop inherits whatever we do to web.

---

## 1. New Information Architecture

**Drop from 5 mobile tabs / 9 web nav items to a unified 4 destinations.** Quiz and Flashcards stop being top-level — they are *actions on a document*, not places. `Learn` and `Chat` are merged conceptually: they're both "talking to Sage," differing only in scope.

| # | Destination | Mobile | Web / Desktop | Purpose |
|---|---|---|---|---|
| 1 | **Library** | Bottom tab (Books icon) | Top nav + persistent left rail | Document grid + filters + search. Entry point to everything study-related. |
| 2 | **Chat** | Bottom tab (Message icon) | Top nav | Sage conversations with explicit per-thread scope (one doc, many docs, or general). |
| 3 | **Study** | Bottom center (raised primary) | Top nav + dashboard route | Contextual launchpad: "Continue where you left off," "Due today," voice tutor, new document. Replaces ambiguous mobile Home and the 9-item web nav's `Home`. |
| 4 | **Me** | Bottom tab (User icon) | Avatar menu → dedicated route | Progress, streak/XP, analytics, accessibility, subscription, settings — all under one roof. |

Everything else (`Quiz`, `Flashcards`, `Exam`, `Simulations`, `Analytics`, `Settings`, `Upgrade`, `Teach`, `Podcast`) becomes a push-route or a section inside one of the four.

### Current → New route mapping

**Mobile** (`mobile/app/`):

| Current | New location |
|---|---|
| `(tabs)/index.tsx` (Home) | Rebuilt as `(tabs)/study.tsx` — contextual, not dashboard-y |
| `(tabs)/learn.tsx` | Rename → `(tabs)/library.tsx`; unified status filter + search |
| `(tabs)/chat.tsx` | Keep; rework scope model (see §2) |
| `(tabs)/quiz.tsx` | **Removed.** Launched from doc detail; push route `quiz/[documentId].tsx` |
| `(tabs)/flashcards.tsx` | **Removed.** Push route `flashcards/[documentId].tsx`; Due-today lives under Study |
| `learn/[documentId].tsx` | Rebuilt as `document/[documentId].tsx` with an action rail |
| `teach.tsx`, `podcast.tsx` | Keep as modal routes; surface entries on Study + doc detail + chat |
| `analytics.tsx` | Section inside `(tabs)/me.tsx` |
| `settings.tsx`, `upgrade.tsx` | Linked from `me.tsx` |
| `exam.tsx`, `simulations.tsx` | Demoted to "Advanced" section of doc detail |
| `profile-onboarding.tsx` | Collapsed 5 steps → 2 (see §2) |

**Web / Desktop** (`frontend/src/pages/`):

| Current | New location |
|---|---|
| `Home.jsx` (authed) | Rebuilt as `Study.jsx` |
| `Documents.jsx` | Rename → `Library.jsx`; same status filter primitive as mobile |
| `Learn.jsx` | Rebuilt as `Document.jsx` with right-rail action surface |
| `Chat.jsx` | Keep; scope model rework |
| `Quiz.jsx`, `Flashcards.jsx` | **Removed from top nav.** Kept as push routes launched from Library/Document |
| `Analytics.jsx`, `Settings.jsx` | Sections inside `Me.jsx` (new) |
| `Exam.jsx`, `Simulations.jsx` | Moved under document detail "Advanced" and `/study/advanced` |
| `Pricing.jsx` | Stays public; new `Me → Subscription` also deep-links here |

Top nav on web shrinks from 9 items to 4 (**Library · Chat · Study · Me**). Avatar dropdown keeps Sign out. Desktop inherits all of this for free.

This directly resolves:
- **One document = one home** (pain points: mobile "3-tab split," web "Learn/Chat ambiguity")
- **Ambiguous Home** (mobile center tab, web Home route)
- **Buried settings** (mobile router.push hidden, web 9th-nav-item)

---

## 2. Key Flow Redesigns (Before → After)

### 2.1 Onboarding (mobile) — 9 taps → 2 screens
**Before:** `(intro)/index` + `(intro)/flow` + `(intro)/upgrade` + sign-in + `profile-onboarding` (5 steps).

**After:**
1. **Welcome + auth** — single screen: headline value prop, OAuth buttons, "Continue with email." Kills `(intro)/flow` and `(intro)/upgrade` from the mandatory path; upgrade only appears on gated actions.
2. **Tell us about you** — single scrollable form: name, teaching level, top-interest chips. Age + accessibility in a collapsible "Personalize further (optional)" panel. Accessibility reappears prominently in Me tab (principle: first-class).

**Web** gets a one-screen post-signup profile form — mobile's exact same component in responsive layout. Removes the "web users get nothing" asymmetry.

Files trimmed: `mobile/app/(intro)/*`, `mobile/app/profile-onboarding.tsx`.

### 2.2 Add document — kill the nested modal (both surfaces)
**Before:** Mobile's `AddDocumentSheet.tsx` is a modal with internal `mode: 'menu' | 'url' | 'note' | 'topic' | 'scan'`; mode-switching loses form state; no progress after submit. Web has a similar modal in `Documents.jsx`.

**After:** Full route `document/new` (mobile: `mobile/app/document/new.tsx`; web: `frontend/src/pages/NewDocument.jsx`). A segmented control at top — **Upload · Link · Paste · Scan · Topic** — mounts one tab-component at a time with state persisted per-tab via a Zustand `addDocumentStore`. Sticky Submit.

After submit, immediately route to `document/[documentId]` in a **processing state**. A `ProcessingCard` primitive (see §3) polls `GET /documents/:id` and shows phase (Uploading → Extracting → Indexing → Generating modules). User can start chatting / skimming a preview while processing (partial availability — see §6 decision).

Refactor targets:
- `mobile/src/components/common/AddDocumentSheet.tsx` → split into `mobile/src/features/new-document/{UploadTab,LinkTab,PasteTab,ScanTab,TopicTab}.tsx`
- `frontend/src/pages/Documents.jsx` → new `NewDocument.jsx`; upload modal removed

### 2.3 Studying a document — single source of truth
**Before (mobile):** `learn/[documentId].tsx` stacks WebView lesson + module carousel + tutor chat in one scroll. **Before (web):** `Learn.jsx` simultaneously toggles lesson, quiz, tutor, diagrams, podcast, Teach.

**After — mobile:**
```
┌─ Sticky header: title · progress ring · menu ⋯ ┐
│                                                │
│  [Continue] primary — resumes last mode        │
│                                                │
│  Action rail (horizontal, chip-style)          │
│  Read · Chat · Quiz · Cards · Teach · Podcast  │
│  (each shows badge: "5 due", "72%")            │
│                                                │
│  Tabs: Overview | Modules | Notes              │
│  Overview: AI summary, key terms, weak areas   │
│  Modules: vertical list (replaces carousel)    │
│  Notes: user highlights from chat              │
└────────────────────────────────────────────────┘
```
"Read" opens a full-screen push of the WebView lesson — no longer a cramped zone.

**After — web:**
```
┌─ Sticky header: breadcrumb Library > Doc name · progress ring · ⋯ ┐
│                                                                   │
│ ┌─────────────────────────┐ ┌──── Right rail (~320px) ───────┐    │
│ │                         │ │ [Continue] primary             │    │
│ │  Main content area      │ │                                │    │
│ │  (tab-switched)         │ │ Action list (vertical):        │    │
│ │  - Read                 │ │ Read · Chat · Quiz · Cards     │    │
│ │  - Modules              │ │ · Teach · Podcast · Advanced   │    │
│ │  - Notes                │ │                                │    │
│ │  - Quiz/Cards open in   │ │ Quick stats: modules left,     │    │
│ │    modal overlay        │ │ cards due, last score          │    │
│ │                         │ │                                │    │
│ └─────────────────────────┘ └────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
```
Retires the 6+ simultaneous toggles in `Learn.jsx` — each action is its own surface, not a mode flag.

### 2.4 Chat — make scope explicit
**Before:** Sessions list + document selector + thread in one screen; multi-doc context unclear on both surfaces.

**After:** Chat destination lists threads grouped by scope — **General** and **Per document**. Each thread card shows a scope badge ("Biology Ch. 3" or "All documents"). New thread opens an explicit first step: *"Ask about a specific document"* vs *"Ask Sage anything."* Inside a thread, a sticky scope bar at top with an edit action re-opens the chooser. Citation chips deep-link to the source document's Read view.

Refactor: `mobile/app/(tabs)/chat.tsx`, `frontend/src/pages/Chat.jsx`.

### 2.5 Progress / stats / settings — one roof
New `Me` destination (mobile: `(tabs)/me.tsx`; web: `Me.jsx`):

1. **Hero** — avatar, name, streak flame, XP level bar.
2. **This week** — minutes studied, docs touched, quizzes completed (from `/analytics/overview`, `/analytics/activity`).
3. **Weak areas** — tappable chips (from `/analytics/weak-areas`) that deep-link to a quiz for that topic.
4. **Accessibility** — dyslexia font toggle, ADHD focus mode, high contrast, voice-input default — all in one tap.
5. **Subscription** — plan status + `Upgrade` CTA → Pricing page.
6. **Settings** list — account, notifications, data, sign out.

### 2.6 Voice tutor (Teach) — discoverable
Currently hidden behind a modal button on both surfaces. After redesign, Teach appears in **three places**:
- Study destination: "Live tutor" card with mic badge.
- Document detail: first-class chip in the action rail.
- Chat thread: mic FAB that converts the current thread into a Teach session, preserving context.

---

## 3. Shared UX Primitives (both surfaces)

Create **parallel folders** on both surfaces (`mobile/src/components/feedback/` and `frontend/src/components/feedback/`) with matching APIs so components stay conceptually unified even where platform code diverges:

- **`EmptyState`** — props: `icon`, `title`, `body`, `primaryAction`, `secondaryAction`, `illustration?`. Used by Library (first upload), Chat (first thread), doc-detail Notes, Quiz before any attempts. Replaces every blank grid.
- **`Skeleton`** + presets `SkeletonList`, `SkeletonCard`, `SkeletonDocumentDetail`. Replaces every spinner and the web's rotating-text "AILoader" for initial content loads.
- **`Toast` + `useToast()`** — providers in `mobile/src/providers/` and `frontend/src/providers/`. Replaces every mobile `Alert.alert` and web's existing `sonner`-based toasts get a wrapped API for consistency. Supports `success | info | error`, optional action.
- **`ProcessingCard`** — polls document status, shows phase + progress bar + "what happens next" helper text.
- **`StatusPill`** — shared across Library, Quiz launch, Flashcards launch: `Ready | Processing | Failed | No content yet`. Backs a unified status-filter primitive reused everywhere docs are listed.

---

## 4. Specific Screen Wireframes

### Study destination (mobile), above the fold
- Greeting row: "Morning, Dan" · streak flame · XP badge
- **Pickup card**: "Continue: *Neuroanatomy Ch. 4* — 3 modules left" → primary CTA
- **Due today**: "12 flashcards · 1 quiz" → two CTAs
- Scroll: shortcut grid (2×2) — Live tutor · New document · Browse library · Today's podcast

### Study destination (web), above the fold
- Left: Greeting + Pickup card (full-width hero)
- Right: "Due today" side card + Live tutor launcher
- Below: 4 shortcut tiles in a row (New document, Browse library, This week stats, Today's podcast)

### Document detail — described in §2.3 for both surfaces

### New-document route
Segmented control (mobile: 5 pills; web: 5 tabs); single-tab form; sticky Submit at bottom (mobile) / right-aligned primary button (web). No nested modals.

### Me destination
Full-bleed hero card. Below fold: scrollable list of section cards with clear `SectionTitle` headers. Identical IA on both surfaces, layout adapts (web: 2-column on wide viewports).

---

## 5. Rollout / Migration

### Phase 1 — IA reset (both surfaces, ships together)
- New tab bar on mobile (`mobile/app/(tabs)/_layout.tsx` — 4 tabs, raised `Study` center); new top nav on web (`frontend/src/components/layout/Navbar.jsx` — 4 items).
- Keep old routes alive for deep links (redirect `learn/[id]` → `document/[id]`, etc.).
- Ship `EmptyState`, `Skeleton`, `Toast`, `ProcessingCard`, `StatusPill` on both surfaces.
- Build `Me` (mobile tab + web route) — merge analytics + settings + accessibility.
- Add action rail + "Continue" to document detail on both surfaces; push quiz/cards from there.
- Replace all `Alert.alert` (mobile) and ad-hoc loaders (web) with new primitives.

### Phase 2 — New-document flow + Chat scope
- Retire `AddDocumentSheet` (mobile) and upload modal (web).
- Chat scope rework.
- Study destination intelligence (pickup, due-today). Backend can initially stitch from existing `/modules`, `/flashcards`, `/quiz`; later collapse to a `GET /users/me/pickup` aggregator.

### Phase 3 — Onboarding consolidation + advanced surfaces
- 2-screen mobile onboarding; matching 1-screen web post-signup profile.
- Demote Exam + Simulations into document detail "Advanced" section.

### Reuse vs replace

**Reuse:** mobile `PrimaryButton`, `Card`, `Screen`, `TopBar`, `SectionTitle`, `StepDots`, `FeatureCard`; web `Navbar` shell (content swapped), `.sleek-card`, `.lesson-board`, existing tokens in `frontend/src/index.css`.

**Replace:** mobile `RaisedTabBar` (rebuild for 4 tabs, center stays primary), mobile `AddDocumentSheet`, mobile `(tabs)/index.tsx`, mobile `(tabs)/quiz.tsx` + `(tabs)/flashcards.tsx` (as tabs), mobile `learn/[documentId].tsx`; web `Home.jsx` (authed), `Learn.jsx`, `Documents.jsx` (upload modal portion), top-nav items in `Navbar.jsx`.

### Backend mapping (no new endpoints for Phase 1)
- Library → `/documents`
- Document detail → `/documents/:id` + `/modules?documentId`
- Quiz launch → `/quiz` (existing)
- Flashcards → `/flashcards`
- Chat → `/chat/query`, `/chat/history`
- Me → `/analytics/overview`, `/analytics/weak-areas`, `/analytics/activity`, `/auth/profile`, RevenueCat status (mobile) / Stripe+Paystack status (web)

Phase 2 benefits from a pickup aggregator but can ship without it.

---

## 6. Decisions Baked Into This Plan

The four open questions all came back as "no preference," so I've committed to specific answers. All are reversible in Phase 2 if we want to revisit:

1. **Quiz & Flashcards removed as top-level destinations.** They live under document detail. Daily reviewers get a "Due today" card on Study — keeps the spaced-repetition habit loop intact without the tab split.
2. **Raised-primary center tab stays on mobile, repurposed as `Study`.** Signature preserved; meaning clarified. Web gets a matching `Study` nav item (no raised styling — web nav is flat).
3. **Partial availability during document processing.** Chat and Read unlock when first chunks index; a banner warns "Still indexing — answers may miss later sections." Quiz and Flashcards stay locked until fully ready. Faster perceived value without misleading on high-stakes assessments.
4. **Onboarding trimmed to 2 mobile screens / 1 web post-signup screen.** Accessibility in an optional panel; most users reach Library in 2–3 taps.

---

## 7. Verification

Phase 1 is verifiable end-to-end on both surfaces:

**Mobile (Expo):**
```bash
cd mobile && npx expo start
```
Then on device/simulator:
- Fresh install → onboarding → land on Study → see pickup card populated with seeded content
- Open Library → verify status pills, empty state for fresh accounts
- Tap a document → verify action rail, Continue button resumes last mode
- Trigger a mock network failure → verify toast (not `Alert.alert`)
- Open Me → verify streak, accessibility toggles work, subscription status surfaces

**Web (Vite):**
```bash
cd frontend && npm run dev
```
Then in a browser:
- Sign up with a new account → land on 1-screen profile form → Study page
- Verify 4-item nav (Library, Chat, Study, Me) — no more 9 items
- Open document → right rail actions work; lesson opens full-screen
- Deep-link `/learn/:id` redirects to `/document/:id`
- Trigger an error → verify wrapped toast API

**Desktop (Tauri):**
```bash
cd desktop && npm run tauri dev
```
- Verify the new web IA renders inside the native window
- File → New Document still opens a secondary window (unchanged Phase 1)

**Regression checks:** existing auth flow (Supabase), payments (RevenueCat on mobile, Stripe/Paystack on web), and document processing pipelines must continue working — no backend changes in Phase 1.

---

## Critical Files

**Mobile**
- `mobile/app/(tabs)/_layout.tsx` — tab bar refactor (5 → 4 tabs)
- `mobile/src/components/navigation/RaisedTabBar.tsx` — rebuild for new tab set
- `mobile/src/components/common/AddDocumentSheet.tsx` — retire in Phase 2
- `mobile/app/learn/[documentId].tsx` — rebuild with action rail
- `mobile/app/(tabs)/index.tsx` → `study.tsx` — replace
- `mobile/app/(tabs)/quiz.tsx`, `mobile/app/(tabs)/flashcards.tsx` — delete as tabs, keep logic in push routes
- `mobile/src/components/feedback/*` — new primitives
- `mobile/app/profile-onboarding.tsx`, `mobile/app/(intro)/*` — trim in Phase 3

**Web**
- `frontend/src/components/layout/Navbar.jsx` — 9 → 4 items
- `frontend/src/pages/Home.jsx` (authed) → new `Study.jsx`
- `frontend/src/pages/Learn.jsx` → new `Document.jsx`
- `frontend/src/pages/Documents.jsx` — strip upload modal, keep grid; rename to `Library.jsx`
- `frontend/src/pages/Quiz.jsx`, `Flashcards.jsx` — keep files, drop from nav
- `frontend/src/pages/Settings.jsx`, `Analytics.jsx` — merge into new `Me.jsx`
- `frontend/src/components/feedback/*` — new primitives
- `frontend/src/App.jsx` — route map update + legacy redirects

**Desktop**
- No direct file changes in Phase 1 — inherits web redesign automatically.
- Phase 2+: consider adding `File → Open Document` (drag-drop to `/api/documents/register`) per the existing roadmap item in `desktop/README.md`.