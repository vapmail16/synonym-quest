# Deployment Guide

## Docker Configuration

This project now includes Dockerfiles for both frontend and backend deployment.

### Files Created:
- `frontend/Dockerfile` - Frontend React app with Nginx
- `backend/Dockerfile` - Backend Node.js API
- `docker-compose.yml` - Local development setup
- `.dockerignore` files - Exclude unnecessary files from Docker builds

## Environment Variables for Production

Create a `.env` file in your deployment environment with these variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration (Remote PostgreSQL)
DB_HOST=vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud
DB_PORT=30575
DB_NAME=vocabdb-db
DB_USER=VjIKfz
DB_PASSWORD=)t=0rdZe^=
DB_URL=postgresql://VjIKfz:)t=0rdZe^=@vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud:30575/vocabdb-db

# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

## Deployment Steps

### For Frontend Deployment:
1. The `frontend/Dockerfile` will:
   - Build the React app
   - Serve it with Nginx
   - Handle client-side routing
   - Optimize with gzip compression

### For Backend Deployment:
1. The `backend/Dockerfile` will:
   - Build the TypeScript code
   - Install production dependencies
   - Run as non-root user
   - Include health checks

## Local Development with Docker:
```bash
# Build and run all services
docker-compose up --build

# Run only backend
docker-compose up backend

# Run only frontend
docker-compose up frontend
```

## Production Deployment:
```bash
# Build frontend image
docker build -t synonym-quest-frontend ./frontend

# Build backend image
docker build -t synonym-quest-backend ./backend

# Run with environment variables
docker run -p 3001:3001 --env-file .env synonym-quest-backend
docker run -p 3000:80 synonym-quest-frontend
```

## Notes:
- Frontend runs on port 80 (mapped to 3000 locally)
- Backend runs on port 3001
- Database uses your remote PostgreSQL instance
- All sensitive data should be in environment variables
- `.env` files are ignored by Git for security
