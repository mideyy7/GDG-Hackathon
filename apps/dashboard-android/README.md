# dashboard-android

Native Android client for DevCore Mission Control — a Kotlin + Jetpack Compose
port of `apps/dashboard` with the same functionality (GitHub sign-in, task
submission, run history, plan approval, live Agent Terminal), talking to the
same gateway (`/api/web/*`) and orchestrator (`/orchestrator/*`) APIs. The
backend, bots, and shared packages are unchanged — this app is an additional
client, not a replacement.

## Requirements

- Android Studio (Koala+) or the command line with `ANDROID_HOME` set
- Android SDK Platform 34, Build-Tools 34.0.0
- JDK 17

## Build & test

```bash
./gradlew assembleDebug        # build the debug APK
./gradlew testDebugUnitTest    # run unit tests (JVM, via Robolectric)
./gradlew lintDebug            # static analysis
```

## Architecture

- **UI**: Jetpack Compose screens under `ui/screens`, mirroring the web
  dashboard's pages (`Overview`, `Repositories`, `NewTask`, `Runs`,
  `RunDetail`, `Login`) and components under `ui/components`
  (`StatusBadge`, `RunCard`, `PlanCard`, `PRResult`, `AgentTerminal`).
- **State**: one `ViewModel` per screen (`androidx.lifecycle.ViewModel`),
  exposing a single `StateFlow<UiState>` each.
- **Networking**: Retrofit + OkHttp + kotlinx.serialization
  (`data/remote/ApiService.kt`, mirroring `apps/dashboard/src/lib/api.ts`).
  The live run event stream uses OkHttp's SSE extension
  (`data/remote/RunEventStream.kt`), since there's no browser `EventSource`.
- **Session**: `data/SessionManager.kt` stores the session UUID in
  `SharedPreferences`, mirroring the web app's `localStorage`-backed
  `session.ts`.
- **Server address**: unlike the web app, there's no same-origin dev proxy to
  inherit a host from, so the gateway base URL is a configurable app setting
  (`data/ServerConfig.kt`), defaulting to `http://10.0.2.2:3001` (the Android
  emulator's loopback to the host machine).
- **Dependency injection**: hand-rolled (`data/AppContainer.kt`) — the app is
  small enough that Hilt/Dagger would add ceremony without real benefit.

### GitHub OAuth

The web dashboard redirects the whole page to the gateway's OAuth URL and
gets `/auth/success?userId=...` back as a same-origin route. A native app has
no equivalent redirect target it can always intercept without registering
Android App Links against whatever domain `DASHBOARD_URL` happens to be set
to in a given deployment. Since the session id is a UUID the app already
generates locally *before* OAuth even starts (the backend just links that id
to a GitHub identity server-side), the app instead: opens the OAuth URL in a
Chrome Custom Tab, and re-checks auth status whenever the activity resumes
(see `MainActivity`'s `ON_RESUME` observer) — which naturally fires when the
user returns to the app after completing sign-in in the browser. No backend
changes or deep links required.

## Tests

- `data/` — `SessionManager`, `ServerConfig` (Robolectric), and
  `DashboardRepository` (MockWebServer, exercising the real Retrofit/
  kotlinx.serialization wiring including error-body parsing).
- `ui/screens/` — one test class per `ViewModel`, using an in-memory
  `FakeDashboardRepository`.
- `ui/components/` — Compose UI tests for `StatusBadge`, `RunCard`, and
  `PRResult` (Robolectric-hosted, no emulator required), mirroring the
  existing Vitest component tests in `apps/dashboard`.
