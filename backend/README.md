# Mangrove Portfolio Backend

Backend API for the Mangrove Portfolio Management application.

## Features

- RESTful API for portfolio management
- PostgreSQL database integration
- JWT-based authentication
- CORS-enabled for frontend integration
- Rate limiting and security middleware

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp ../.env.example ../.env
   # Edit .env with your configuration
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Portfolio
- `GET /api/portfolio/dashboard` - Get all portfolio data
- `GET /api/portfolio/stocks` - Get user's stocks
- `POST /api/portfolio/stocks` - Add new stock
- `GET /api/portfolio/bonds` - Get user's bonds
- `POST /api/portfolio/bonds` - Add new bond
- `GET /api/portfolio/pe-funds` - Get user's PE funds
- `POST /api/portfolio/pe-funds` - Add new PE fund

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts
- `stocks` - Stock investments
- `bonds` - Bond investments
- `pe_funds` - Private equity funds
- `pe_deals` - Direct private equity deals
- `liquid_funds` - Liquid alternative funds
- `cash_deposits` - Cash and deposits
- `liabilities` - Liabilities and loans

## Deployment

This backend is configured for deployment on Railway. The database will be automatically provisioned and tables will be created on first startup.