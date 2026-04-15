# ACE Studio Flutter App

This directory contains the new Flutter consumer app for ACE Studio. It is designed to replace the Expo-based mobile viewer while reusing the existing ACE backend, Firebase auth bridge, viewer-safe mobile APIs, and streaming endpoints.

## What this app includes

- premium dark streaming UI
- Firebase email/password sign-in
- shared ACE backend session login/logout
- home, browse, title detail, library, profile, and playback flows
- access-state aware title pages using the existing `/api/mobile/*` routes
- playback token flow built around `/api/stream/token` and `/api/stream/:id`

## Important note

Flutter is not installed in this workspace, so the native `android/`, `ios/`, `macos/`, and other generated folders were not created in this session. The Dart application structure is fully scaffolded here, but you should run the following after Flutter is installed:

```bash
cd ace_flutter
flutter create .
flutter pub get
```

That will generate the platform wrappers around the app code already added in `lib/`.

## Required runtime configuration

Provide these values with `--dart-define` or a build system wrapper:

- `ACE_API_BASE_URL`
- `ACE_FIREBASE_API_KEY`
- `ACE_FIREBASE_APP_ID`
- `ACE_FIREBASE_MESSAGING_SENDER_ID`
- `ACE_FIREBASE_PROJECT_ID`
- `ACE_FIREBASE_AUTH_DOMAIN`
- `ACE_FIREBASE_STORAGE_BUCKET`
- `ACE_IOS_BUNDLE_ID`

Example:

```bash
flutter run \
  --dart-define=ACE_API_BASE_URL=https://www.acestudio.ng \
  --dart-define=ACE_FIREBASE_API_KEY=... \
  --dart-define=ACE_FIREBASE_APP_ID=... \
  --dart-define=ACE_FIREBASE_MESSAGING_SENDER_ID=... \
  --dart-define=ACE_FIREBASE_PROJECT_ID=... \
  --dart-define=ACE_FIREBASE_AUTH_DOMAIN=... \
  --dart-define=ACE_FIREBASE_STORAGE_BUCKET=... \
  --dart-define=ACE_IOS_BUNDLE_ID=ng.acestudio.mobile
```

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
- `GET /api/mobile/me`
- `GET /api/mobile/me/library`
- `GET /api/stream/token`
- `GET /api/stream/:id`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`

## Migration note

The existing Expo app can now remain frozen while Flutter becomes the forward path for the consumer mobile experience.
