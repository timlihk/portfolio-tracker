# Development Roadmap

This document tracks remaining technical debt and future improvements.

## CEO Vision: From Portfolio Tracker to Wealth Operating System

> **Executive Vision:** "Democratize sophisticated wealth management for high-net-worth individuals and families—making institutional-grade portfolio analytics, real-time insights, and collaborative planning accessible through a beautiful, intuitive interface."

**New Brand Identity:** **"Mangrove Capital"** – representing deep roots (stability), interconnected ecosystems (portfolio relationships), and growth.

---

### **Pillars of Transformation**

#### **Pillar 1: Experience Revolution**
- **Mobile-First PWA** – Installable app with offline support
- **Robinhood-Inspired UI** – Swipeable cards, haptic feedback, dark/light themes
- **Zero-Data-Entry Onboarding** – Connect brokerage accounts via Plaid/Yodlee
- **Gesture-Based Navigation** – Swipe to refresh, pinch to zoom charts

#### **Pillar 2: Intelligence & Automation**
- **AI-Powered Insights** ("Mangrove Intelligence"):
  - Portfolio concentration alerts and diversification suggestions
  - Yield optimization for fixed income
  - Tax-loss harvesting opportunities
- **Automated Document Processing** – Upload statements → auto-categorize transactions
- **Predictive Cash Flow Modeling** – Forecast PE distributions, bond coupons

#### **Pillar 3: Social & Collaborative**
- **Family Dashboard** – Multi-user roles (view-only, editor, admin)
- **Shared Watchlists** – Collaborative investment research
- **Advisor Portal** – Invite wealth managers with granular permissions
- **Comment Threads** on positions – collaborative discussion

#### **Pillar 4: Real-Time Everything**
- **WebSocket Connections** – Live price ticks, news alerts
- **Push Notifications** – Price movements, corporate actions
- **Market Sentiment Integration** – Social media trends
- **Newsfeed** – Curated financial news affecting holdings

#### **Pillar 5: Advanced Analytics Suite**
- **Stress Testing** – Scenario modeling (rate changes, market shocks)
- **Monte Carlo Simulations** – Retirement probability forecasts
- **Tax Optimization Engine** – Automated lot selection for sales
- **Benchmarking** – Compare vs. indices, custom portfolios

---

### **Technical Architecture Modernization**

#### **Current Architecture Limitations:**
- Monolithic Express backend
- In-memory caching only (not distributed)
- Polling-based price updates
- Single-tenant database design

#### **Modern Stack Proposal:**

**Frontend:**
- **React 19** with Server Components + Suspense for streaming
- **Next.js 15** – App Router, React Compiler, Partial Prerendering
- **Tailwind CSS 4** – Utility-first with CSS-native cascade layers
- **Real-time Layer** – Socket.io + TanStack Query subscriptions
- **Mobile** – React Native + Expo for native apps

**Backend (Microservices):**
- `users-service` – Authentication, profiles, permissions
- `portfolio-service` – Core portfolio CRUD
- `pricing-service` – Market data with Redis caching
- `analytics-service` – AI insights, simulations
- `notifications-service` – Push, email, WebSocket alerts
- **Event-Driven** – Apache Kafka for decoupled services
- **Database** – PostgreSQL + Redis + TimescaleDB

**Key Technical Upgrades:**
1. **Replace polling** with WebSockets for real-time prices
2. **Distributed cache** (Redis) instead of in-memory
3. **Background job queue** (BullMQ) for document processing
4. **Column-level encryption** for sensitive financial data
5. **GraphQL Federation** for flexible client queries

---

### **Implementation Roadmap (Phased)**

#### **Phase 1: Foundation (Q1)**
- [ ] **Mobile PWA** – Installable app with offline support
- [ ] **Brokerage Integrations** – Plaid for automated data sync
- [ ] **Multi-User Support** – Evolve single-tenant to family/team
- **Files to modify:** `backend/prisma/schema.prisma` (add `User`, `Team`, `Invitation`), `src/App.tsx` (add role-based routing)

#### **Phase 2: Intelligence (Q2)**
- [ ] **AI Insights Engine** – LLM integration for portfolio commentary
- [ ] **Automated Document Processing** – PDF statement parsing
- [ ] **Enhanced Dashboard** – Predictive charts, smart alerts
- **Files to create:** `backend/src/services/InsightService.ts`, `src/components/ai/PortfolioInsights.tsx`

#### **Phase 3: Real-Time (Q3)**
- [ ] **WebSocket Server** – Live price updates
- [ ] **Push Notifications** – Mobile + desktop alerts
- [ ] **Market News Integration** – Curated feed
- **Files to create:** `backend/src/socket/`, `src/hooks/useLivePrices.ts`

#### **Phase 4: Advanced Analytics (Q4)**
- [ ] **Scenario Modeling** – Stress test interface
- [ ] **Tax Optimization** – Automated lot selection
- [ ] **Benchmarking Suite** – Custom index comparisons
- **Files to create:** `backend/src/services/AnalyticsService.ts`, `src/pages/ScenarioBuilder.tsx`

#### **Phase 5: Ecosystem (Ongoing)**
- [ ] **Public API** – Developer platform
- [ ] **Advisor Portal** – White-label offering
- [ ] **Mobile Apps** – React Native iOS/Android

---

### **Expected Outcomes**

**User Experience:**
- **10x faster data entry** – via brokerage integrations
- **Real-time updates** – vs current 60-second polling
- **Mobile usage** – 40% of traffic from mobile devices

**Business Impact:**
- **Monetization paths:** Advisor subscriptions, API access, premium analytics
- **Market expansion:** From family tracking → wealth advisors → institutional
- **Valuation:** Transform from portfolio tracker → wealth tech platform

**Technical Excellence:**
- **99.9% uptime** – microservices + load balancing
- **<100ms response times** – Redis caching + CDN
- **Scale to 10,000+ users** – from current single-tenant

---

### **First Steps (Immediate)**
1. **Audit current TypeScript debt** – Remove `@ts-nocheck` from 13 pages
2. **Implement WebSocket prototype** – Add to `backend/src/server.ts`
3. **Design mobile-responsive dashboard** – Refactor `Dashboard.tsx` with mobile-first CSS
4. **Add Plaid integration spike** – Test automated transaction import

> **"The Robinhood Lesson:** Success comes from combining **dead-simple UX** with **powerful underlying technology.** Mangrove has the backend sophistication—now it needs the frontend magic."

---

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
