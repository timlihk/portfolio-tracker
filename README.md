# Mangrove Portfolio Tracker

A full-stack portfolio tracking application for managing investments across multiple asset classes including stocks, bonds, private equity funds, liquid funds, and private deals.

> **v1.7.1** - December 2025
>
> ### What's New
> - **GitHub Actions CI** - Automated typecheck, build, and lint on every push
> - **Rate limiting** - Configurable via `RATE_LIMIT_MAX` env var (default 500/15min)
> - **Dashboard stability** - Fixed stuck "Updating prices" badge
> - **Railway deployment fixes** - Resolved EBUSY build errors
>
> See [DEVELOPMENT.md](DEVELOPMENT.md) for the roadmap and remaining tasks.

## Features

- **Multi-Asset Portfolio Management**: Track stocks, bonds, PE funds, liquid funds, and private deals
- **Multi-Currency Support**: Track assets in USD, EUR, GBP, CHF, JPY, and more with live FX conversion
- **Single-Tenant Family Mode**: Shared-secret login mapped to a single user (no multi-user UI needed)
- **Live Market Data**: Real-time stock pricing via Yahoo Finance API, bond pricing via Finnhub
- **Dashboard Analytics**: Interactive charts showing allocation and currency exposure
- **Secure Authentication**: JWT-based user authentication with optional shared-secret shortcut
- **Responsive Design**: Mobile-friendly interface built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js, PostgreSQL
- **Authentication**: JWT, bcryptjs
- **Database**: PostgreSQL with automatic migrations
- **Deployment**: Railway with NIXPACKS builder
- **API Integration**: Yahoo Finance for stock prices, exchangerate-api.com for FX rates

## Quick Start

### Local Development

1) Install dependencies
```bash
git clone https://github.com/timlihk/portfolio-tracker.git
cd portfolio-tracker
npm install
npm run install:backend
```

2) Configure environment
```bash
cp .env.example .env
cp .env.example .env.local
# Required: DATABASE_URL, JWT_SECRET, FINNHUB_API_KEY, SHARED_SECRET
# Optional: SHARED_SECRET_USER_ID, SHARED_SECRET_USER_EMAIL, RATE_LIMIT_MAX
```

3) Run dev servers
```bash
# Backend (port 3001)
npm run dev:backend

# Frontend (port 5173)
npm run dev
```

### Build & Test
```bash
# Typecheck + build everything
npm run build:all

# Frontend only
npm run build:frontend

# Backend only (tsc)
npm run build:backend

# E2E tests (requires dev server running or uses webServer config)
npm run test:e2e           # Run all tests headless
npm run test:e2e:headed    # Run with visible browser
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:debug     # Debug mode with inspector
```

### Deployment

The application is configured for deployment on Railway. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Authentication (single-tenant shared secret)

For family/demo use, the app uses a shared secret mapped to a single user ID:

- Set `SHARED_SECRET=<your phrase>` in the environment.
- Optionally set `SHARED_SECRET_USER_ID=<user id>` (defaults to `1`) and `SHARED_SECRET_USER_EMAIL` (optional label).
- The backend auto-creates the user if it does not exist.
- Frontend login page: visit `/login`, enter the secret, and submit. The client stores it locally and sends it in `Authorization: Shared <secret>`.
- JWTs still work, but they are forced to the same single user ID.

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── lib/              # Utilities and contexts
│   ├── api/              # API client and services
│   └── App.tsx           # Main application component
├── backend/              # Express.js backend API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── models/       # Database models
│   │   └── server.ts     # Express server (compiled to dist/main.js)
│   └── package.json      # Backend dependencies
├── railway.toml          # Railway deployment configuration
├── package.json          # Root dependencies and scripts
└── DEPLOYMENT.md         # Deployment guide
```

## API Endpoints

### Pricing API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/pricing/stock/:ticker` | GET | Get real-time price for a stock |
| `/api/pricing/stocks` | POST | Get prices for multiple stocks |
| `/api/pricing/validate/:ticker` | GET | Validate a ticker symbol |
| `/api/pricing/currency/convert` | GET | Convert between currencies |
| `/api/pricing/currency/to-usd` | GET | Convert amount to USD |
| `/api/pricing/currency/rates/:base` | GET | Get exchange rates |
| `/api/pricing/currency/supported` | GET | List supported currencies |
| `/api/pricing/bond/:isin` | GET | Get bond price by ISIN (via Finnhub) |

### Example Usage

```bash
# Get stock price
curl https://your-app.railway.app/api/pricing/stock/AAPL

# Get multiple stock prices
curl -X POST https://your-app.railway.app/api/pricing/stocks \
  -H "Content-Type: application/json" \
  -d '{"tickers": ["AAPL", "GOOGL", "MSFT"]}'

# Convert currency
curl "https://your-app.railway.app/api/pricing/currency/convert?amount=100&from=EUR&to=USD"

## Forms

- Cash & Deposits: required fields include Name, Amount, Currency, and Institution. The dialog scrolls for long forms and shows inline errors if validation fails.
```
