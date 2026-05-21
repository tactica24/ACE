# Store Submission Readiness

## iOS Digital Goods Strategy (Decision)
- Decision date: April 20, 2026.
- The iOS app ships as a consumption-only viewer.
- No in-app web checkout, unlock purchase flow, wallet top-up, or subscription purchase prompt is allowed inside iOS.
- Access is granted only from server-side entitlements already attached to the account.
- If in-app digital sales are required later, implement StoreKit 2 first and submit that flow before enabling iOS purchase prompts.

## Expo Release Configuration (Implemented)
- App slug and scheme: `ace-studio` / `acestudio`.
- iOS bundle identifier: `ng.acestudio.mobile`.
- Android package: `ng.acestudio.mobile`.
- App version: `1.0.0`.
- iOS build number: `1`.
- Android version code: `1`.
- EAS channels:
  - `development`
  - `preview`
  - `production`
- Production auto-increment enabled for iOS and Android builds.

## Mobile QA Pass Matrix
- Offline package download and playback:
  - Verify package creation, package file fetch, expiration behavior (HTTP 410 after retention), and re-generation path.
- Background and foreground playback:
  - Verify resume position and stream token refresh after app lifecycle transitions.
- Sign-in recovery:
  - Verify stale token, forced logout, and return-to-session with account continuity.
- Poor-network retries:
  - Verify retry/backoff behavior for title list, title detail, and playback token endpoints.

## Privacy and Data Safety Review Scope
- Firebase Auth:
  - Account identity, sign-in state, and session continuity data.
- Offline downloads:
  - Encrypted package metadata and local storage lifecycle with retention cleanup.
- Payment redirection:
  - Web checkout is outside mobile app purchase UI; payment records and support actions remain server-audited.
- Support and incident handling:
  - Admin support notes and payment status interventions are auditable in admin surfaces.

## Release Gate
- Use this checklist with `PRODUCTION_REVIEW_TODO.md` and `MOBILE_PLAY_COMPLIANCE_TODO.md` before submitting builds.
