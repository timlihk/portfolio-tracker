# Mangrove Portfolio Tracker

A full-stack portfolio tracking application for managing investments across multiple asset classes including stocks, bonds, private equity funds, and private deals.

> Last updated: December 1, 2025

## Features

- **Multi-Asset Portfolio Management**: Track stocks, bonds, PE funds, and private deals
- **Family Member Tracking**: Manage portfolios for multiple family members
- **Live Market Data**: Real-time pricing via Alpha Vantage API integration
- **Dashboard Analytics**: Interactive charts and performance metrics
- **Secure Authentication**: JWT-based user authentication
- **Responsive Design**: Mobile-friendly interface built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Express.js, Node.js, PostgreSQL
- **Authentication**: JWT, bcryptjs
- **Database**: PostgreSQL with automatic migrations
- **Deployment**: Railway with NIXPACKS builder
- **API Integration**: Alpha Vantage for market data

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
