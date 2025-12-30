# Release Notes

## v2.0 (December 2025)

### Highlights
- Removed `@ts-nocheck` from all pages; typecheck now passes across the UI.
- Updated Playwright E2E flows to use shared-secret login setup and clearer selectors.
- CI now runs build/lint/typecheck on push; E2E runs manual or scheduled to reduce noise.
- Backend CORS allowlist includes `http://localhost:3001` for local E2E runs.

### Developer Experience
- E2E diagnostics are easier to triage (login setup failures show earlier).
- Documentation refreshed for current CI behavior and testing guidance.

### Known Issues
- E2E coverage is not enforced on every push; authentication/data seeding is still flaky.
- `useMarketData.tsx` still uses `any` for API responses.
- `toNumber` helper duplication remains in multiple hooks.
