# Development Roadmap

This document tracks remaining technical debt and future improvements.

## Current Status (v1.7.1)

- **Production**: Live at https://wealth.mangrove-hk.org
- **CI**: GitHub Actions - build passes, E2E tests need server setup
- **Rate Limit**: 500 requests/15min

---

## Phase 1 - Stabilize

### High Priority

- [ ] **Fix E2E tests in CI** - Start server before Playwright tests run
  - Add `webServer` config or background server step in `.github/workflows/ci.yml`

- [ ] **Add unit tests for backend routes**
  - Scaffolding exists in `backend/src/__tests__/`
  - Priority: auth, pricing, portfolio CRUD

- [ ] **Remove `@ts-nocheck` from high-traffic pages**
  - Dashboard.tsx, Stocks.tsx, Bonds.tsx
  - Requires fixing JSX component prop types

### TypeScript Migration

Pages currently using `@ts-nocheck`:
- `src/pages/Accounts.tsx`
- `src/pages/Bonds.tsx`
- `src/pages/CashDeposits.tsx`
- `src/pages/Changelog.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Liabilities.tsx`
- `src/pages/LiquidFunds.tsx`
- `src/pages/Login.tsx`
- `src/pages/PEDeals.tsx`
- `src/pages/PEFunds.tsx`
- `src/pages/Performance.tsx`
- `src/pages/Stocks.tsx`
- `src/pages/Transactions.tsx`

---

## Phase 2 - Harden

### Code Quality

- [ ] **Convert shadcn components to TypeScript**
  - Files: `src/components/ui/*.jsx`

- [ ] **Convert lib files to TypeScript**
  - Files: `src/lib/*.js`

- [ ] **Migrate Changelog to backend API**
  - Currently uses legacy `base44` client
  - Should use `backendClient` like other pages

- [ ] **Add error boundaries**
  - Wrap async data fetches
  - Centralized error logging instead of `console.error`

### Infrastructure

- [ ] **Add staging environment**
  - Separate Railway service for pre-prod testing

- [ ] **Database migration checks in CI**
  - Detect Prisma schema drift

---

## Phase 3 - Polish

### Performance

- [ ] Debounce rapid ticker lookups
- [ ] Add stale-while-revalidate for exchange rates
- [ ] Consider APM monitoring (Sentry, etc.)

### Security

- [ ] Add Content Security Policy (CSP) headers
- [ ] Implement audit logging for sensitive operations

---

## Known Issues

1. **E2E tests fail in CI** - Server not started before test run
2. **Type casts in useMarketData.tsx** - Uses `any` for API responses (lines 114-126)
3. **Duplicate toNumber helper** - Exists in multiple hooks

---

## Contributing

1. Pick an item from Phase 1 or 2
2. Create a feature branch
3. Submit PR with tests if applicable
4. CI must pass (build + lint)
