# Changelog

## Unreleased

### Added
- Extracted `lib/report-formatting.ts`, `lib/studio-tiers.ts`, `lib/upload-form-helpers.ts`, and `lib/moderation-status.ts` for smaller, testable modules.
- Expanded unit test suite under `tests/` (admin reports, upload security, studio tiers, upload helpers, moderation status).
- `CONTRIBUTING.md` and environment placeholders for smoke/mock tooling.
- Structured logger enhancements with optional Sentry DSN bridge (`ACE_SENTRY_DSN`).

### Changed
- Coverage gate thresholds raised for the pure-module suite.
