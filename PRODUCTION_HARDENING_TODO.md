# ACE Studio Production Hardening

Last updated: 2026-04-26

This is the active implementation checklist for moving ACE Studio from reviewed to production-hardened. Items are checked only after the code path is updated and verified as far as the local environment allows.

## 1. Native playback and series

- [x] Replace the active Flutter player path with the richer playback surface
- [x] Add Flutter seek back / seek forward / resume / playback-rate controls on the active route
- [x] Add subtitle support to Flutter playback when subtitle tracks exist
- [x] Surface audio-language availability in Flutter playback
- [x] Fix Flutter series detail flow so users play episodes, not series containers
- [x] Add episode-level access state in mobile APIs
- [x] Add auto-play next episode in Flutter series playback
- [x] Add auto-unlock next episode until wallet/access stops the flow
- [x] Keep watch-history and multi-device session behavior aligned with server enforcement

## 2. Offline and sharing hardening

- [x] Remove P2P share/download endpoints from the active product surface
- [x] Remove P2P references from admin/account surfaces where they are exposed
- [x] Replace raw MP4 mobile downloads with app-contained offline storage
- [x] Prevent offline downloads from behaving like shareable local media exports
- [x] Keep offline playback inside the app flow only

## 3. Demo and placeholder removal

- [x] Replace `/account/preferences` fake profile/simulated save page with a live-safe implementation
- [x] Remove or neutralize any remaining live placeholder/demo flows surfaced to users
- [x] Ensure unavailable features say `Not available` instead of simulating behavior

## 4. Mobile catalog and discovery

- [x] Add comprehensive server-side mobile search
- [x] Update Flutter browse to query the server instead of filtering only the local batch
- [x] Align mobile title data with web detail needs: subtitles, audio languages, episode access

## 5. iOS and release plumbing

- [x] Normalize iOS bundle/app identifiers and display names
- [x] Remove invalid iOS plist keys and move platform capabilities to proper config
- [x] Make the iOS project release-ready for signing inputs
- [x] Align mobile workflow outputs and supported release assumptions

## 6. Test and CI confidence

- [x] Replace dead root tests with runnable tests
- [x] Add a real root `test` script
- [x] Update CI to run root tests in addition to lint/typecheck
- [x] Keep Flutter analyze/test in CI as the supported mobile release gate
- [x] Decide legacy `mobile/` branch release role and keep it out of the critical release path if unsupported

## 7. Admin reporting

- [x] Replace the crash-prone admin reporting page with a producer-first report generator
- [x] Make producer selection automatically include all associated titles
- [x] Keep month-based report generation and zero-data reporting stable
- [x] Keep the generated report PDF-friendly through the print/save flow

## 8. Approval and playback readiness

- [x] Add shared playback-asset readiness checks for approval and stream token generation
- [x] Block moderation approval when a title or episode has no playable delivery asset
- [x] Block admin reactivation from bypassing playback-readiness checks
- [x] Allow watch history and playback gating to stay aligned with non-container titles
- [x] Support the low-cost interim delivery model with direct 1080p + 720p MP4 uploads
- [x] Keep public catalog, TV, mobile browse, and detail routes limited to viewer-ready approved titles
- [x] Surface the dual-MP4 viewer package clearly on moderation, producer library, admin account, and upload surfaces
- [x] Surface viewer unlocks and continue-watching history cleanly on the account/dashboard side
- [ ] Plug a real transcode/ingest worker into the playback-asset readiness layer

## 9. Verification

- [x] Run root lint
- [x] Run root typecheck
- [x] Run root build
- [x] Run root tests
- [ ] Run Flutter analyze
- [ ] Run Flutter tests
- [x] Run legacy mobile typecheck
- [ ] Summarize remaining live-env checks: payments, TV pairing, signed mobile releases, production storage
