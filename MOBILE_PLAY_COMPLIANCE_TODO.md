# ACE Studio Mobile Play Compliance Todo

## Completed in this pass

- Added Android-safe mobile API routes under `app/api/mobile/*`.
- Removed pricing and payment data from the Android app catalog/detail flow.
- Replaced wallet, top-up, unlock, and payment wording in the Android viewer flow.
- Reworked mobile navigation into a viewer-focused app: `Home`, `Browse`, `My Access`, `Profile`.
- Removed mobile wallet, offline package, studio, and admin routes from the Play app build.
- Added neutral access messaging for blocked playback states.
- Linked Expo EAS project configuration and cleaned mobile build config.

## Remaining recommended work

- Add a first-class `entitlements` table instead of inferring access from `unlock` records.
- Split internal producer/admin mobile tooling into a separate internal-only app or build target.
- Add Play review credentials with active entitled titles for app review.
- Audit push notification templates to ensure they do not contain purchase prompts.
- Audit lifecycle emails to ensure they do not look like in-app purchase continuation prompts.
- Add app access notes in Play Console describing the app as a consumption-only viewer.
- Complete Play Data safety declarations for auth, analytics, and streaming data use.

## Guardrails for future Android work

- Do not add prices to Android title cards or detail pages.
- Do not add payment provider names to Android UI or API payloads.
- Do not add browser or webview checkout handoff from Android.
- Do not add wallet, top-up, subscription purchase, or unlock purchase flows to Android.
- Keep website billing and Android playback connected only through backend access state.
