# ACE Studio Flutter App

This directory contains the Flutter consumer app for ACE Studio. It is intended to replace the paused Expo-based viewer while reusing the existing ACE backend, Firebase auth bridge, mobile-safe APIs, and streaming endpoints.

## What this app includes

- premium streaming UI for home, browse, detail, library, profile, and playback
- Firebase email/password sign-in with shared ACE backend session login/logout
- access-aware title pages using the existing `/api/mobile/*` routes
- playback token flow built around `/api/stream/token` and `/api/stream/:id`
- committed Android project files for APK and app bundle builds

## Android project status

The Android project files now live in `ace_flutter/android/` so the app can be opened directly in Android Studio or built with Flutter once local tooling is installed.

Typical local setup:

```bash
cd ace_flutter
flutter pub get
flutter build apk \
  --dart-define=ACE_API_BASE_URL=https://www.acestudio.ng \
  --dart-define=ACE_IOS_BUNDLE_ID=ng.acestudio.mobile
```

`local.properties` is still environment-specific and should be generated locally by Flutter or Android Studio so it can point at the installed Flutter SDK and Android SDK.

## Required runtime configuration

Provide this value with `--dart-define` or your mobile build system:

- `ACE_API_BASE_URL`
- `ACE_IOS_BUNDLE_ID`

The Android app loads Firebase public config from `${ACE_API_BASE_URL}/api/mobile/firebase-config` at startup. Build-time `ACE_FIREBASE_*` values are still supported for local overrides, but they are no longer required for GitHub Actions APK builds.

## App structure

- `lib/app`: app shell, router, and theme
- `lib/config`: runtime configuration and Firebase options
- `lib/core`: API and local device session helpers
- `lib/features/auth`: sign-in, registration, and account session sync
- `lib/features/catalog`: home, browse, and title detail
- `lib/features/library`: entitled titles
- `lib/features/profile`: account summary and sign-out
- `lib/features/player`: playback token exchange and video player screen
- `lib/widgets`: shared premium UI widgets

## Backend reuse

This Flutter app is wired around the current ACE mobile-safe routes:

- `GET /api/mobile/titles`
- `GET /api/mobile/titles/:id`
- `GET /api/mobile/firebase-config`
- `GET /api/mobile/me`
- `GET /api/mobile/me/library`
- `GET /api/stream/token`
- `GET /api/stream/:id`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`

## Migration note

The existing Expo app can remain frozen while Flutter becomes the forward path for the consumer mobile experience.
