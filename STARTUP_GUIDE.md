# Synonym Trainer - Startup Guide

## 🚀 Quick Start (TL;DR)

1. **Start PostgreSQL** (if not running)
2. **Set up environment variables**
3. **Start backend**: `cd backend && npm run dev`
4. **Start frontend**: `cd frontend && npm start`
5. **Open browser**: http://localhost:3000

---

## 📋 Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **PostgreSQL** (v12 or higher)
- **npm** or **yarn**

### Database Setup
```bash
# Create database
createdb synonym_quest

# Or using psql
psql -U postgres
CREATE DATABASE synonym_quest;
\q
```

---

## 🔧 Environment Setup

### 1. Backend Environment Variables
Create `backend/.env` file:
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=synonym_quest
DB_USER=postgres
DB_PASSWORD=your_password_here

# OpenAI Configuration (Optional - for AI features)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=150

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 2. Frontend Environment Variables
Create `frontend/.env` file:
```bash
REACT_APP_API_URL=http://localhost:3001
```

---

## 🏃‍♂️ Running the Application

### Method 1: Manual Start (Recommended for Development)

#### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm start
```

### Method 2: One-Command Start
```bash
# Backend in background
cd backend && npm run dev &

# Frontend in foreground
cd frontend && npm start
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "No words available for quiz"
**Cause**: Database is empty or backend not connected
**Solution**:
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check database connection
curl http://localhost:3001/api/words

# If empty, add words via API or use the word management features
```

### Issue 2: OpenAI API Key Errors
**Cause**: Invalid or missing OpenAI API key
**Solution**:
```bash
# Check your .env file
cat backend/.env | grep OPENAI_API_KEY

# Should show: OPENAI_API_KEY=sk-your-actual-key-here
# NOT: OPENAI_API_KEY=your_ope************here

# Get a real API key from: https://platform.openai.com/account/api-keys
```

### Issue 3: Database Connection Failed
**Cause**: PostgreSQL not running or wrong credentials
**Solution**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql
# or
systemctl status postgresql

# Start PostgreSQL
brew services start postgresql
# or
sudo systemctl start postgresql

# Test connection
psql -U postgres -d synonym_quest -c "SELECT 1;"
```

### Issue 4: Port Already in Use
**Cause**: Another process using port 3000 or 3001
**Solution**:
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Or use different ports
# Backend: PORT=3002 npm run dev
# Frontend: PORT=3003 npm start
```

### Issue 5: TypeScript Compilation Errors
**Cause**: Type mismatches or missing shared types
**Solution**:
```bash
# Check if shared/types.ts exists
ls -la shared/types.ts

# If missing, it should be recreated automatically
# If compilation fails, temporarily disable strict mode in backend/tsconfig.json
```

---

## 📁 Project Structure

```
synonym_quest/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API endpoints
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── config/         # Database config
│   ├── dist/              # Compiled JavaScript
│   ├── .env               # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main application
│   │   └── index.css      # Styles
│   ├── .env               # Environment variables
│   └── package.json
├── shared/
│   └── types.ts           # Shared TypeScript interfaces
└── STARTUP_GUIDE.md       # This file
```

---

## 🔄 Development Workflow

### Making Changes
1. **Backend changes**: Edit files in `backend/src/`
2. **Frontend changes**: Edit files in `frontend/src/`
3. **Shared types**: Edit `shared/types.ts`
4. **Restart servers** if needed (usually auto-reloads)

### Adding New Words
```bash
# Via API (recommended)
curl -X POST http://localhost:3001/api/words \
  -H "Content-Type: application/json" \
  -d '{
    "word": "example",
    "synonyms": ["sample", "instance", "illustration"],
    "difficulty": "easy",
    "category": "general"
  }'

# Or use the word management features in the app
```

### Database Reset (if needed)
```bash
# Drop and recreate database
dropdb synonym_quest
createdb synonym_quest

# Restart backend to recreate tables
cd backend && npm run dev
```

---

## 🚨 Emergency Recovery

### If Everything Breaks
```bash
# 1. Stop all processes
pkill -f "node.*3000"
pkill -f "node.*3001"

# 2. Clean install
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install

# 3. Rebuild backend
cd ../backend && npm run build

# 4. Restart servers
npm run dev &
cd ../frontend && npm start
```

### If Database is Corrupted
```bash
# Backup current data (if important)
pg_dump synonym_quest > backup.sql

# Reset database
dropdb synonym_quest
createdb synonym_quest

# Restore from backup (if needed)
psql synonym_quest < backup.sql
```

---

## ✅ Health Checks

### Backend Health
```bash
curl http://localhost:3001/api/health
# Should return: {"success":true,"message":"Synonym Quest API is running"}
```

### Database Health
```bash
curl http://localhost:3001/api/words
# Should return word data or empty array
```

### Frontend Health
```bash
curl http://localhost:3000
# Should return HTML page
```

---

## 📝 Notes

- **Backend runs on**: http://localhost:3001
- **Frontend runs on**: http://localhost:3000
- **Database**: PostgreSQL on localhost:5432
- **Auto-reload**: Both servers support hot reload during development
- **Logs**: Check terminal output for errors
- **API Docs**: Available at http://localhost:3001/api/health

---

## 🆘 Getting Help

1. **Check logs** in terminal where you started the servers
2. **Verify environment variables** are set correctly
3. **Ensure PostgreSQL is running**
4. **Check if ports are available**
5. **Restart servers** if changes aren't taking effect

---

**Last Updated**: September 30, 2025
**Version**: 1.0.0
