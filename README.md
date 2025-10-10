# Synonym Trainer - Vocabulary Learning App

A comprehensive vocabulary learning application built with React, Node.js, PostgreSQL, and OpenAI GPT-4 integration.

## 🚀 Features

### Core Functionality
- **Word Management**: Add, edit, delete words with synonyms
- **Interactive Quizzes**: Test your knowledge with AI-powered validation
- **AI Integration**: OpenAI GPT-4 for synonym suggestions and answer validation
- **Progress Tracking**: Monitor your learning progress with detailed statistics
- **Progressive Web App**: Works offline and installable on mobile devices

### Technical Features
- **Frontend**: React 18 + TypeScript + Simple CSS (optimized for performance)
- **Backend**: Node.js + Express + TypeScript + Sequelize
- **Database**: PostgreSQL with optimized indexing
- **AI**: OpenAI GPT-4 integration for intelligent learning
- **Smart Features**: Intelligent word selection, gamification, achievement system

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- OpenAI API Key
- Docker (optional, for containerized deployment)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd synonym_quest

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

#### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL container
docker-compose up postgres -d

# The database will be automatically initialized
```

#### Option B: Local PostgreSQL
```bash
# Create database
createdb synonym_quest

# Run initialization script (optional)
psql synonym_quest < backend/scripts/init.sql
```

### 3. Environment Configuration

#### Backend (.env)
```bash
cd backend
cp env.example .env

# Edit .env with your configuration:
PORT=3001
NODE_ENV=development

# Database Configuration
DB_URL=postgresql://postgres:postgres123@localhost:5432/synonym_quest

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1000

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:3000
```

#### Frontend (.env)
```bash
cd frontend
echo "REACT_APP_API_URL=http://localhost:3001" > .env
```

### 4. Start the Application

#### Development Mode
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

#### Production Mode
```bash
# Build and start with Docker
docker-compose up --build
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm test                   # Run React tests
npm run test:cypress      # Run E2E tests
```

## 📱 PWA Features

The application is configured as a Progressive Web App with:

- **Offline Support**: Core functionality works without internet
- **Mobile Installation**: Install as a native app on mobile devices
- **Background Sync**: Sync data when connection is restored
- **Push Notifications**: Study reminders (configurable)

## 🤖 AI Integration

### OpenAI GPT-4 Features

1. **Synonym Generation**: Automatically suggest synonyms for words
2. **Answer Validation**: Intelligent validation of user answers with fuzzy matching
3. **Difficulty Assessment**: Automatic difficulty classification of words
4. **Hint Generation**: Contextual hints for learning

### API Endpoints

```bash
# AI-powered endpoints
GET  /api/words/:word/synonyms     # Get AI-generated synonyms
POST /api/words/validate           # Validate answer with AI
```

## 🏗️ Architecture

### Backend Structure
```
backend/
├── src/
│   ├── controllers/     # API route handlers
│   ├── models/         # Database models (Sequelize)
│   ├── services/       # Business logic
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   └── utils/          # Helper functions
├── tests/              # Test files
└── scripts/            # Database scripts
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Main app screens
│   ├── hooks/          # Custom React hooks
│   ├── services/       # API calls
│   ├── store/          # State management (Zustand)
│   └── types/          # TypeScript definitions
├── public/             # Static assets & PWA config
└── tests/              # Test files
```

## 📊 Database Schema

### Words Table
- `id`: UUID primary key
- `word`: The main word (unique)
- `synonyms`: JSON array of synonyms
- `category`: Optional category
- `difficulty`: easy/medium/hard
- `correct_count`: Number of correct answers
- `incorrect_count`: Number of incorrect answers
- `created_at`: Creation timestamp

### Quiz Sessions Table
- `id`: UUID primary key
- `words`: JSON array of word IDs
- `current_index`: Current question index
- `score`: Current score
- `answers`: JSON array of user answers
- `start_time`: Session start time
- `end_time`: Session end time

## 🚀 Deployment

### Docker Deployment
```bash
# Build and deploy
docker-compose up --build -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up --scale backend=2
```

### Manual Deployment

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Build Backend**
   ```bash
   cd backend
   npm run build
   ```

3. **Start Services**
   ```bash
   # Start PostgreSQL
   # Start backend: npm start
   # Serve frontend: nginx/apache
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 3001 |
| `DB_URL` | PostgreSQL connection string | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_MODEL` | OpenAI model to use | gpt-4 |
| `JWT_SECRET` | JWT signing secret | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

### PWA Configuration

Edit `frontend/public/manifest.json` to customize:
- App name and description
- Icons and theme colors
- Display mode and orientation

## 📈 Performance Optimization

- **Database Indexing**: Optimized indexes for common queries
- **Caching**: API response caching with Redis (optional)
- **Code Splitting**: Frontend code splitting for faster loading
- **Image Optimization**: Compressed assets and lazy loading

## 🔒 Security

- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Comprehensive input validation with Joi
- **SQL Injection Prevention**: Parameterized queries with Sequelize
- **CORS Configuration**: Proper CORS setup for cross-origin requests
- **Environment Variables**: Sensitive data in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify connection string in .env
   - Ensure database exists

2. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure model access permissions

3. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify environment variables

4. **PWA Not Working**
   - Check HTTPS in production
   - Verify manifest.json configuration
   - Test service worker registration

### Support

For issues and questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the documentation

---

**Built with ❤️ for vocabulary learning enthusiasts**
