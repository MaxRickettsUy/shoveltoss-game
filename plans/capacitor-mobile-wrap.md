# Feature Plan: Capacitor Mobile Wrap (Post-Phaser)

## Scope

Wrap the post-migration Phaser web build with Capacitor and produce installable iOS + Android binaries from the same codebase. Game logic, rendering, and Supabase calls remain unchanged. App store submission, code signing, and IAP are out of scope.

## Prerequisites

- Phaser migration slices 1–5 are complete; the project produces a static web build (e.g., `dist/`) via its bundler.
- macOS with Xcode (for iOS).
- Android Studio + JDK 17 (for Android).

## Files Touched / Added

- `package.json` (deps + scripts)
- `capacitor.config.ts` (new)
- `resources/icon.png`, `resources/splash.png` (new — source artwork for asset generation)
- `ios/` and `android/` (new — generated platform projects, committed)

## Implementation Steps

### Step 1 — Install Capacitor core + platforms + plugins

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/status-bar @capacitor/splash-screen @capacitor/app
npm install -D @capacitor/assets
```

Pin Capacitor to a single major version (current major at time of work). Plugins above cover status-bar styling, splash control, and Android hardware-back handling — minimum viable set.

### Step 2 — Initialize Capacitor config

Run once:

```bash
npx cap init "Shovel Toss" "ing.shoveltoss.app" --web-dir dist
```

Verify the resulting `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ing.shoveltoss.app',
  appName: 'Shovel Toss',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#111111',
      showSpinner: false
    }
  }
};
export default config;
```

`appId` must be a stable reverse-DNS string — changing it later breaks the existing install on every device.

### Step 3 — Add platform projects

```bash
npx cap add ios
npx cap add android
```

Commit the generated `ios/` and `android/` directories. They're not generated on every build — they're long-lived projects you'll edit (Info.plist, AndroidManifest.xml, signing).

### Step 4 — Generate icons + splash screens

Place source artwork:
- `resources/icon.png` — 1024×1024, opaque (no transparency for iOS).
- `resources/splash.png` — 2732×2732 with the logo centered in the inner 50%.

Run:

```bash
npx capacitor-assets generate
```

This writes platform-specific icon/splash sets into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`.

### Step 5 — Wire Capacitor APIs in the Phaser boot

In the Phaser bootstrap (post-migration entry point), call:

```ts
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#1a1a2e' }).catch(() => {}); // Android only; no-op on iOS
  App.addListener('backButton', () => {
    // Route hardware back: from leaderboard/level-select → previous; from select → exit
    window.dispatchEvent(new CustomEvent('shoveltoss:back'));
  });
  SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
}
```

In the Phaser scene that owns navigation, listen for `shoveltoss:back` and pop to the previous screen (or call `App.exitApp()` if already at root). Android Play Store rejects apps that don't honor hardware back — this is required.

### Step 6 — Build + sync npm scripts

Add to `package.json`:

```json
"scripts": {
  "build": "<existing phaser build command>",
  "cap:sync": "npm run build && npx cap sync",
  "ios": "npm run cap:sync && npx cap open ios",
  "android": "npm run cap:sync && npx cap open android"
}
```

`cap sync` copies the latest `dist/` into both native projects and updates plugin native code. Re-run after every web change before launching from Xcode/Android Studio.

### Step 7 — Verify on simulator + device

- iOS: `npm run ios` → Xcode → select an iPhone simulator → Run. Test touch input, leaderboard fetch (Supabase HTTPS works out of the box; iOS 14+ requires no ATS exception for HTTPS).
- Android: `npm run android` → Android Studio → run on an emulator (API 30+). Test hardware back, rotation, and that score submission still satisfies the prod-host gate (see Constraints).
- Run on at least one physical iOS device and one Android device before claiming done — simulators miss touch latency and orientation quirks.

## Constraints

- `webDir` must point at the bundler's output directory (whatever the post-Phaser project uses).
- The prod-host check in `globalScores.js` (`*.shoveltoss.ing` matcher) will REJECT submissions when the WebView origin is `capacitor://localhost` or `https://localhost`. Add `'localhost'` to the production allowlist OR introduce a separate "native build" check (`Capacitor.isNativePlatform()`) before shipping. Without one of these, native users can never submit scores.
- Don't move asset URLs to a CDN before wrapping — Capacitor serves bundled `dist/` from a custom scheme; same-origin assets are simplest.

## Edge Cases

- iOS App Transport Security: Supabase uses HTTPS, so no Info.plist ATS exception is needed. Confirm before adding any HTTP fallback.
- iOS notch / home indicator: Phaser scales to viewport; verify the canvas respects safe-area insets. If not, add `viewport-fit=cover` to the meta viewport and read CSS `env(safe-area-inset-*)` in scene layout.
- Android back button on root scene: must call `App.exitApp()` or the app feels broken (back becomes a no-op).
- Web/PWA build still ships from the same `dist/` — Capacitor wrapping doesn't replace the website, just adds two more distribution targets.

## Out of Scope

- Code signing, provisioning profiles, App Store / Play Store metadata, screenshots.
- Push notifications, in-app purchase, deep links.
- Native plugins for analytics, crash reporting, or auth.
- Migrating leaderboard auth from anonymous to platform identity (Sign in with Apple, Google Play Games).
