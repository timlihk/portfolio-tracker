# Mangrove Portfolio Tracker

A full-stack portfolio tracking application for managing investments across multiple asset classes including stocks, bonds, private equity funds, and private deals.

> Last updated: December 1, 2025 - Added real-time stock pricing and currency conversion

## Features

- **Multi-Asset Portfolio Management**: Track stocks, bonds, PE funds, and private deals
- **Family Member Tracking**: Manage portfolios for multiple family members
- **Live Market Data**: Real-time stock pricing via Yahoo Finance API
- **Dashboard Analytics**: Interactive charts and performance metrics
- **Secure Authentication**: JWT-based user authentication
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

1. **Clone and install dependencies**:
   ```bash
   git clone https://github.com/timlihk/portfolio-tracker.git
   cd portfolio-tracker
   npm install
   cd backend && npm install && cd ..
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   cp .env.example .env
   # Edit .env and .env.local with your configuration
   ```

3. **Start development servers**:
   ```bash
   # Start backend (port 3001)
   npm run dev:backend

   # In another terminal, start frontend (port 5173)
   npm run dev
   ```

### Deployment

The application is configured for deployment on Railway. See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Project Structure

```
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── lib/              # Utilities and contexts
│   ├── api/              # API client and services
│   └── App.jsx           # Main application component
├── backend/              # Express.js backend API
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── models/       # Database models
│   │   └── server.js     # Express server
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
```
