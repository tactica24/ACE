# Production Review Todo

## Critical
- [x] Block negative or self-directed P2P share fees and validate playable approved content before packaging.
- [x] Credit the P2P sender wallet when a recipient unlocks, so the unlock fee is not lost in transit.
- [x] Stop newly added episodes on approved series from going live without moderation by forcing `PENDING` and creating moderation records.
- [x] Tighten upload ownership checks so a user cannot reuse any upload path for the wrong asset purpose.
- [x] Harden TV pairing state transitions so sessions cannot be silently re-claimed or finalized repeatedly.

## High
- [x] Add rate limiting to auth login/register, TV pairing, P2P create/unlock, and offline package creation.
- [x] Deduplicate concurrent offline package creation so mobile users do not trigger multiple encrypt jobs for the same title.
- [x] Remove persistent plaintext P2P download remnants by decrypting to a unique temp file and cleaning it up after streaming.
- [x] Add localized wallet and producer analytics labels to the mobile app so producer/user balances do not stay hardcoded to naira in those screens.
- [x] Improve mobile API error parsing so app users see the actual server validation message instead of opaque raw payload text.

## Medium
- [x] Paginate the public catalog API with a safe `limit` cap and update mobile clients to request only what they need.
- [x] Fail fast on missing production secrets and infrastructure config instead of defaulting critical env values to empty strings.
- [x] Make stream session concurrency enforcement atomic across racing playback requests.
- [ ] Add cleanup and retention policy for encrypted/offline package storage so cache and package growth stay bounded over time.
- [ ] Add dedicated ledger/settlement records for P2P unlock fees instead of routing through wallet balance only.
- [ ] Finish geo-aware currency display across every remaining account/admin/mobile detail screen still showing hardcoded NGN text.

## Admin And Producer UX
- [x] Split producer withdrawal approvals into a dedicated `/admin/payments` operating page with grouped statuses and action handling.
- [x] Simplify the admin overview so payments, moderation, support, and producer approvals are easier to reach without duplicate panels.
- [x] Restructure producer studio and wallet pages around clear status, payout readiness, and next-step actions.
- [ ] Continue polishing secondary admin detail pages (`/admin/users/[id]`, support/payment incident views) so every operational surface follows the same cleaner layout.

## Store Readiness
- [ ] Decide the iOS digital-goods payment strategy. Web checkout for in-app video unlocks/subscriptions can trigger App Store review rejection without approved external entitlement or StoreKit flow.
- [ ] Set final mobile identifiers and release config in Expo for store submission: iOS bundle identifier, Android package name, version/build numbers, and release channels.
- [ ] Add mobile QA passes for offline package download, background/foreground playback, sign-in recovery, and poor-network retries.
- [ ] Review privacy disclosures, permissions, and data safety forms for Firebase auth, downloads, and payment redirection.

## Quality
- [ ] Add automated tests for wallet verify, unlock debit, payout lifecycle, TV pairing, offline package creation, and P2P unlock.
- [ ] Add root and mobile typecheck/lint gates that can run in CI before deployment.
