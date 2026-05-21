# Flutter Migration Todo

This app freezes the current Expo path and starts a cleaner Flutter consumer app for ACE Studio.

## Phase 1

- Keep the existing web, backend, entitlement, streaming, and admin systems as the source of truth.
- Rebuild the viewer mobile experience in Flutter only.
- Keep the Android app consumer-only and Play-safe.
- Reuse the existing mobile-safe endpoints under `/api/mobile/*`.

## Completed In This App

- Project structure for auth, catalog, library, profile, and playback
- Premium ACE theme and navigation shell
- Firebase-aware auth repository
- Shared API client for ACE backend requests
- Playback token flow using the current ACE stream endpoints
- Home, browse, title detail, library, profile, and player screens

## Remaining Build Steps

- Install Flutter locally or in CI
- Run `flutter pub get`
- Configure Firebase for Flutter with the production ACE project
- Add app icons, splash assets, and release signing
- Add secure local session handling and refresh behavior
- Add analytics, crash reporting, and remote config only if needed

## Product Hardening

- Add richer poster, backdrop, and editorial artwork handling
- Add continue-watching sync with the ACE backend
- Add TV pairing support using the existing ACE flow
- Add subtitle, audio, and quality controls in the player
- Add offline policy only if it fits the final rights model

## Release Gate

- Confirm Android and iOS builds compile from CI
- Run device QA on sign-in, playback, entitlement refresh, and sign-out
- Verify no billing or payment prompts appear in the Flutter app
- Confirm the app uses only neutral access wording for blocked playback
