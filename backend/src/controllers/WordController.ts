import { Request, Response, Router } from 'express';
import { wordService } from '../services/WordService';
import { CreateWordRequest, UpdateWordRequest, SearchFilters } from '../types';
import { authenticate } from '../middleware/auth';

export class WordController {
  public getRouter(): Router {
    const router = Router();
    
    router.get('/', this.getWords.bind(this));
    router.get('/random', this.getRandomWords.bind(this));
    router.get('/review', this.getWordsForReview.bind(this));
    router.get('/stats', this.getDatabaseStats.bind(this));
    router.get('/:id', this.getWordById.bind(this));
    router.get('/text/:word', this.getWordByText.bind(this));
    router.post('/', this.createWord.bind(this));
    router.post('/:word/ai-synonyms', this.getAISynonyms.bind(this));
    router.post('/validate', this.validateAnswer.bind(this));
    router.put('/:id', this.updateWord.bind(this));
    router.put('/:id/stats', this.updateWordStats.bind(this));
    router.delete('/:id', this.deleteWord.bind(this));

    // User-specific routes (require authentication)
    router.get('/user/stats', authenticate, this.getUserStats.bind(this));
    router.get('/user/learned', authenticate, this.getUserLearnedWords.bind(this));
    router.get('/user/new', authenticate, this.getUserNewWords.bind(this));
    router.get('/user/letter/:letter', authenticate, this.getUserWordsByLetter.bind(this));
    router.put('/user/progress', authenticate, this.updateUserProgress.bind(this));
    
    return router;
  }
  /**
   * Create a new word
   */
  async createWord(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateWordRequest = req.body;
      
      // Validate required fields
      if (!request.word || !request.synonyms || request.synonyms.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Word and synonyms are required'
        });
        return;
      }

      const word = await wordService.createWord(request);
      
      res.status(201).json({
        success: true,
        data: word,
        message: 'Word created successfully'
      });
    } catch (error: any) {
      console.error('Error in createWord:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create word'
      });
    }
  }

  /**
   * Get all words with pagination and filtering
   */
  async getWords(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters: SearchFilters = {
        category: req.query.category as string,
        difficulty: req.query.difficulty as 'easy' | 'medium' | 'hard',
        searchTerm: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: req.query.sortBy as 'word' | 'createdAt' | 'difficulty',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof SearchFilters] === undefined) {
          delete filters[key as keyof SearchFilters];
        }
      });

      const result = await wordService.getWords(page, limit, filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error in getWords:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch words'
      });
    }
  }

  /**
   * Get a word by ID
   */
  async getWordById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const word = await wordService.getWordById(id);
      
      if (!word) {
        res.status(404).json({
          success: false,
          error: 'Word not found'
        });
        return;
      }

      res.json({
        success: true,
        data: word
      });
    } catch (error: any) {
      console.error('Error in getWordById:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch word'
      });
    }
  }

  /**
   * Get a word by word text
   */
  async getWordByText(req: Request, res: Response): Promise<void> {
    try {
      const { word } = req.params;
      
      const wordData = await wordService.getWordByText(word);
      
      if (!wordData) {
        res.status(404).json({
          success: false,
          error: 'Word not found'
        });
        return;
      }

      res.json({
        success: true,
        data: wordData
      });
    } catch (error: any) {
      console.error('Error in getWordByText:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch word'
      });
    }
  }

  /**
   * Update a word
   */
  async updateWord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const request: UpdateWordRequest = req.body;
      
      const word = await wordService.updateWord(id, request);
      
      if (!word) {
        res.status(404).json({
          success: false,
          error: 'Word not found'
        });
        return;
      }

      res.json({
        success: true,
        data: word,
        message: 'Word updated successfully'
      });
    } catch (error: any) {
      console.error('Error in updateWord:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update word'
      });
    }
  }

  /**
   * Delete a word
   */
  async deleteWord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await wordService.deleteWord(id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Word not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Word deleted successfully'
      });
    } catch (error: any) {
      console.error('Error in deleteWord:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete word'
      });
    }
  }

  /**
   * Get random words for quiz
   */
  async getRandomWords(req: Request, res: Response): Promise<void> {
    try {
      const count = parseInt(req.query.count as string) || 10;
      const difficulty = req.query.difficulty as 'easy' | 'medium' | 'hard';
      const category = req.query.category as string;
      
      const words = await wordService.getRandomWords(count, difficulty, category);
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      console.error('Error in getRandomWords:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch random words'
      });
    }
  }

  /**
   * Get AI-generated synonyms
   */
  async getAISynonyms(req: Request, res: Response): Promise<void> {
    try {
      const { word } = req.params;
      const { context } = req.body;
      
      if (!word) {
        res.status(400).json({
          success: false,
          error: 'Word is required'
        });
        return;
      }

      const synonyms = await wordService.getAISynonyms(word, context);
      
      res.json({
        success: true,
        data: synonyms
      });
    } catch (error: any) {
      console.error('Error in getAISynonyms:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate synonyms'
      });
    }
  }

  /**
   * Validate answer using AI
   */
  async validateAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { word, userAnswer, correctSynonyms } = req.body;
      
      if (!word || !userAnswer || !correctSynonyms) {
        res.status(400).json({
          success: false,
          error: 'Word, userAnswer, and correctSynonyms are required'
        });
        return;
      }

      const validation = await wordService.validateAnswerWithAI(word, userAnswer, correctSynonyms);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      console.error('Error in validateAnswer:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to validate answer'
      });
    }
  }

  /**
   * Get words that need review
   */
  async getWordsForReview(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      
      const words = await wordService.getWordsForReview(limit);
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      console.error('Error in getWordsForReview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch words for review'
      });
    }
  }

  /**
   * Update word statistics
   */
  async updateWordStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isCorrect } = req.body;
      
      if (typeof isCorrect !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isCorrect must be a boolean'
        });
        return;
      }

      await wordService.updateWordStats(id, isCorrect);
      
      res.json({
        success: true,
        message: 'Word statistics updated successfully'
      });
    } catch (error: any) {
      console.error('Error in updateWordStats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update word statistics'
      });
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await wordService.getDatabaseStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error in getDatabaseStats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch database statistics'
      });
    }
  }

  /**
   * Get user's learning statistics
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const stats = await wordService.getUserLearningStats(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's learned words
   */
  async getUserLearnedWords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { limit = 100 } = req.query;
      const words = await wordService.getUserLearnedWords(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's new words (not yet learned)
   */
  async getUserNewWords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { limit = 100 } = req.query;
      const words = await wordService.getUserNewWords(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's words by letter
   */
  async getUserWordsByLetter(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { letter } = req.params;
      const { type = 'new' } = req.query;
      const words = await wordService.getUserWordsByLetter(userId, letter, type as 'new' | 'old');
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update user's word progress
   */
  async updateUserProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { wordId, gameType, isCorrect, timeSpent = 0 } = req.body;
      
      await wordService.updateUserWordProgress(userId, wordId, gameType, isCorrect, timeSpent);
      
      res.json({
        success: true,
        message: 'Progress updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const wordController = new WordController();
