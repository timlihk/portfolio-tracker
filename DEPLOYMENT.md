# Railway Deployment Guide

This guide will help you deploy the Mangrove Portfolio application to Railway with a PostgreSQL database.

## Prerequisites

- Railway account
- GitHub repository with the code

## Deployment Steps

### 1. Prepare Your Repository

Ensure your repository has the following structure:
```
├── railway.toml
├── package.json
├── src/ (frontend)
├── backend/ (backend API)
└── .env.example
```

### 2. Deploy to Railway

1. **Connect Repository**:
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account and select the repository

2. **Add Environment Variables**:
   Railway will automatically detect the `railway.toml` configuration. You need to add the following environment variables:

   ```bash
   # Backend
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

   Railway will automatically provide:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `PORT` (server port, defaults to 3001)

3. **Database Setup**:
   - Railway will automatically provision a PostgreSQL database
   - The database tables will be created automatically when the backend starts

### 3. Verify Deployment

1. **Check Service**:
   - Railway will deploy a single service combining frontend and backend
   - The application will be available at your Railway URL (e.g., `https://portfolio-tracker-production.up.railway.app`)
   - The backend API will be available at `https://your-app-name.railway.app/api`

2. **Test API Endpoints**:
   ```bash
   # Health check
   curl https://your-app-name.railway.app/api/health

   # Register a user
   curl -X POST https://your-app-name.railway.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

## Local Development Setup

If you want to test locally before deploying:

### 1. Backend Setup

```bash
cd backend
npm install

# Set up environment variables
cp ../.env.example ../.env
# Edit .env with your local database settings

# Start backend
npm run dev
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local to point to your local backend

# Start frontend
npm run dev
```

### 3. Local Database

For local development, you can use:
- PostgreSQL installed locally
- Docker with PostgreSQL
- Railway CLI to connect to Railway database

## Environment Variables

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)
```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://username:password@localhost:5432/mangrove_portfolio
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check `DATABASE_URL` environment variable
   - Ensure PostgreSQL is running locally
   - Verify database credentials

2. **CORS Errors**:
   - Check `FRONTEND_URL` environment variable
   - Ensure frontend URL is correctly configured

3. **Build Failures**:
   - Check Railway logs for specific errors
   - Verify all dependencies are in package.json
   - Ensure Node.js version compatibility

### Railway CLI

You can use Railway CLI for debugging:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Connect to project
railway link

# View logs
railway logs

# Open shell
railway shell
```

## Architecture

The deployed application consists of:

- **Frontend**: React app built with Vite and served as static files
- **Backend**: Express.js API server that also serves the frontend static files in production
- **Database**: PostgreSQL with portfolio data
- **Single Service**: Both frontend and backend are deployed as a single container for simplicity

The application uses a single service architecture where the Express.js server handles both API requests and serves the React frontend static files in production mode.