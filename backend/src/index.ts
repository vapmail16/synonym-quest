import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './models';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

app.use(cors());
app.use(express.json());

// Import controllers
import { wordController } from './controllers/WordController';
import { quizController } from './controllers/QuizController';
import { gameController } from './controllers/GameController';
import authController from './controllers/AuthController';

// Routes
app.use('/api/auth', authController.getRouter());
app.use('/api/words', wordController.getRouter());
app.use('/api/quiz', quizController.getRouter());
app.use('/api/games', gameController.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Synonym Trainer API is running',
    timestamp: new Date().toISOString(),
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// Test API endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API is working!', 
    timestamp: new Date().toISOString() 
  });
});

// Simple game endpoints (temporary)
app.get('/api/games/statistics', async (req, res) => {
  try {
    const { Word } = require('./models');
    const totalWords = await Word.count();
    const learnedWords = await Word.count({
      where: {
        correctCount: {
          [require('sequelize').Op.gt]: 0
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        totalWords,
        learnedWords,
        learningProgress: totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0,
        dailyStreak: 0,
        gamesPlayed: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get statistics' });
  }
});

// Get new words for a letter
app.get('/api/games/letter/:letter/new', async (req, res) => {
  try {
    const { letter } = req.params;
    const { limit = '5' } = req.query;
    const { Word } = require('./models');
    const { Op } = require('sequelize');
    
    const words = await Word.findAll({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        },
        correctCount: 0,
        incorrectCount: 0
      },
      order: [['difficulty', 'ASC'], ['word', 'ASC']],
      limit: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      data: {
        letter: letter.toUpperCase(),
        words: words.map(w => w.toJSON()),
        count: words.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get new words' });
  }
});

// Get learned words for a letter
app.get('/api/games/letter/:letter/old', async (req, res) => {
  try {
    const { letter } = req.params;
    const { limit = '5' } = req.query;
    const { Word } = require('./models');
    const { Op } = require('sequelize');
    
    const words = await Word.findAll({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        },
        correctCount: {
          [Op.gt]: 0
        }
      },
      order: [['lastReviewed', 'ASC'], ['difficulty', 'ASC']],
      limit: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      data: {
        letter: letter.toUpperCase(),
        words: words.map(w => w.toJSON()),
        count: words.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get learned words' });
  }
});

// Generate synonym match question
app.get('/api/games/synonym-match/question', async (req, res) => {
  try {
    const { Word } = require('./models');
    const { sequelize } = require('./config/database');
    
    const words = await Word.findAll({
      order: sequelize.random(),
      limit: 10
    });
    
    if (words.length === 0) {
      return res.status(404).json({ success: false, error: 'No words found' });
    }
    
    // Find a word with exact synonyms
    let word = null;
    let exactSynonyms = [];
    
    for (const w of words) {
      const wordData = w.toJSON();
      const synonyms = wordData.synonyms.filter(s => s.type === 'exact');
      if (synonyms.length > 0) {
        word = wordData;
        exactSynonyms = synonyms.map(s => s.word);
        break;
      }
    }
    
    if (!word || exactSynonyms.length === 0) {
      word = words[0].toJSON();
      exactSynonyms = ['similar', 'alike', 'comparable'];
    }
    
    // Get distractors
    const otherWords = await Word.findAll({
      where: {
        id: { [require('sequelize').Op.ne]: word.id }
      },
      order: sequelize.random(),
      limit: 20
    });
    
    const distractors = [];
    for (const otherWord of otherWords) {
      const otherWordData = otherWord.toJSON();
      for (const synonym of otherWordData.synonyms) {
        if (distractors.length < 3 && !exactSynonyms.includes(synonym.word)) {
          distractors.push(synonym.word);
        }
      }
      if (distractors.length >= 3) break;
    }
    
    while (distractors.length < 3) {
      distractors.push(`distractor${distractors.length + 1}`);
    }
    
    const correctAnswer = exactSynonyms[Math.floor(Math.random() * exactSynonyms.length)];
    const options = [correctAnswer, ...distractors.slice(0, 3)];
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    res.json({
      success: true,
      data: {
        id: `synonym_${word.id}`,
        questionWord: word,
        options,
        correctAnswer,
        difficulty: word.difficulty,
        gameType: 'synonym_match'
      }
    });
  } catch (error) {
    console.error('Error generating synonym match question:', error);
    res.status(500).json({ success: false, error: 'Failed to generate question' });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🔄 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Synonym Trainer API v1.0`);
      console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();