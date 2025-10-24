import { Op } from 'sequelize';
import { WordModel } from '../models/Word';
import { UserProgress } from '../models';
import { Word, CreateWordRequest, UpdateWordRequest, SearchFilters, PaginatedResponse } from '../types';
import { openAIService } from './OpenAIService';

export class WordService {
  /**
   * Create a new word with synonyms
   */
  async createWord(request: CreateWordRequest): Promise<Word> {
    try {
      // Validate input
      if (!request.word || !request.synonyms || request.synonyms.length === 0) {
        throw new Error('Word and synonyms are required');
      }

      // Check if word already exists
      const existingWord = await WordModel.findOne({
        where: { word: request.word.toLowerCase() }
      });

      if (existingWord) {
        throw new Error('Word already exists');
      }

      // Assess difficulty if not provided
      let difficulty = request.difficulty;
      if (!difficulty) {
        difficulty = await openAIService.assessDifficulty(request.word);
      }

      // Create the word
      const word = await WordModel.create({
        word: request.word.toLowerCase().trim(),
        synonyms: request.synonyms.map(s => s.toLowerCase().trim()),
        category: request.category?.toLowerCase().trim(),
        difficulty,
        tags: request.tags?.map(t => t.toLowerCase().trim()) || [],
        correctCount: 0,
        incorrectCount: 0,
      });

      return word.toJSON() as Word;
    } catch (error) {
      console.error('Error creating word:', error);
      throw error;
    }
  }

  /**
   * Get all words with optional filtering and pagination
   */
  async getWords(
    page: number = 1,
    limit: number = 10,
    filters: SearchFilters = {}
  ): Promise<PaginatedResponse<Word>> {
    try {
      const offset = (page - 1) * limit;
      const whereClause: any = {};

      // Apply filters
      if (filters.category) {
        whereClause.category = filters.category.toLowerCase();
      }

      if (filters.difficulty) {
        whereClause.difficulty = filters.difficulty;
      }

      if (filters.searchTerm) {
        whereClause[Op.or] = [
          { word: { [Op.iLike]: `%${filters.searchTerm}%` } },
          { synonyms: { [Op.contains]: [filters.searchTerm.toLowerCase()] } }
        ];
      }

      if (filters.tags && filters.tags.length > 0) {
        whereClause.tags = { [Op.overlap]: filters.tags.map(t => t.toLowerCase()) };
      }

      // Build order clause
      let orderClause: any[] = [];
      if (filters.sortBy) {
        const direction = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';
        orderClause.push([filters.sortBy, direction]);
      } else {
        orderClause.push(['createdAt', 'DESC']);
      }

      // Execute query
      const { count, rows } = await WordModel.findAndCountAll({
        where: whereClause,
        order: orderClause,
        limit,
        offset,
      });

      const totalPages = Math.ceil(count / limit);

      return {
        data: rows.map(row => row.toJSON() as Word),
        total: count,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      console.error('Error fetching words:', error);
      throw error;
    }
  }

  /**
   * Get a word by ID
   */
  async getWordById(id: string): Promise<Word | null> {
    try {
      const word = await WordModel.findByPk(id);
      return word ? (word.toJSON() as Word) : null;
    } catch (error) {
      console.error('Error fetching word by ID:', error);
      throw error;
    }
  }

  /**
   * Get a word by word text
   */
  async getWordByText(wordText: string): Promise<Word | null> {
    try {
      const word = await WordModel.findOne({
        where: { word: wordText.toLowerCase() }
      });
      return word ? (word.toJSON() as Word) : null;
    } catch (error) {
      console.error('Error fetching word by text:', error);
      throw error;
    }
  }

  /**
   * Update a word
   */
  async updateWord(id: string, request: UpdateWordRequest): Promise<Word | null> {
    try {
      const word = await WordModel.findByPk(id);
      if (!word) {
        return null;
      }

      // Check for duplicate word if word text is being updated
      if (request.word && request.word.toLowerCase() !== word.word) {
        const existingWord = await WordModel.findOne({
          where: { word: request.word.toLowerCase() }
        });
        if (existingWord) {
          throw new Error('Word already exists');
        }
      }

      // Assess difficulty if not provided and word is being updated
      let difficulty = request.difficulty;
      if (!difficulty && request.word) {
        difficulty = await openAIService.assessDifficulty(request.word);
      }

      // Update the word
      const updateData: any = {};
      if (request.word) updateData.word = request.word.toLowerCase().trim();
      if (request.synonyms) updateData.synonyms = request.synonyms.map(s => s.toLowerCase().trim());
      if (request.category !== undefined) updateData.category = request.category?.toLowerCase().trim();
      if (difficulty) updateData.difficulty = difficulty;
      if (request.tags !== undefined) updateData.tags = request.tags?.map(t => t.toLowerCase().trim()) || [];

      await word.update(updateData);

      return (word.toJSON() as Word);
    } catch (error) {
      console.error('Error updating word:', error);
      throw error;
    }
  }

  /**
   * Delete a word
   */
  async deleteWord(id: string): Promise<boolean> {
    try {
      const word = await WordModel.findByPk(id);
      if (!word) {
        return false;
      }

      await word.destroy();
      return true;
    } catch (error) {
      console.error('Error deleting word:', error);
      throw error;
    }
  }

  /**
   * Get random words for quiz
   */
  async getRandomWords(
    count: number = 10,
    difficulty?: 'easy' | 'medium' | 'hard',
    category?: string
  ): Promise<Word[]> {
    try {
      const whereClause: any = {};
      
      if (difficulty) {
        whereClause.difficulty = difficulty;
      }

      if (category) {
        whereClause.category = category.toLowerCase();
      }

      const words = await WordModel.findAll({
        where: whereClause,
        order: WordModel.sequelize?.random(),
        limit: count,
      });

      return words.map(word => word.toJSON() as Word);
    } catch (error) {
      console.error('Error fetching random words:', error);
      throw error;
    }
  }

  /**
   * Update word statistics after quiz - DEPRECATED
   * Use updateUserWordProgress instead for user-specific tracking
   */
  async updateWordStats(id: string, isCorrect: boolean): Promise<void> {
    try {
      const word = await WordModel.findByPk(id);
      if (!word) {
        throw new Error('Word not found');
      }

      if (isCorrect) {
        await word.increment('correctCount');
      } else {
        await word.increment('incorrectCount');
      }

      // Update last reviewed timestamp
      await word.update({ lastReviewed: new Date() });
    } catch (error) {
      console.error('Error updating word stats:', error);
      throw error;
    }
  }

  /**
   * Update user-specific word progress
   */
  async updateUserWordProgress(
    userId: string, 
    wordId: string, 
    gameType: string, 
    isCorrect: boolean, 
    timeSpent: number = 0
  ): Promise<void> {
    try {
      await UserProgress.updateProgress(userId, wordId, gameType, isCorrect, timeSpent);
    } catch (error) {
      console.error('Error updating user word progress:', error);
      throw error;
    }
  }

  /**
   * Get user's learning progress for a specific word
   */
  async getUserWordProgress(userId: string, wordId: string, gameType: string): Promise<any> {
    try {
      return await UserProgress.findOne({
        where: { userId, wordId, gameType }
      });
    } catch (error) {
      console.error('Error getting user word progress:', error);
      throw error;
    }
  }

  /**
   * Get user's overall learning statistics
   */
  async getUserLearningStats(userId: string): Promise<{
    totalWordsLearned: number;
    totalGamesPlayed: number;
    currentStreak: number;
    longestStreak: number;
    averageAccuracy: number;
    favoriteGameType?: string;
    masteryDistribution: { [level: number]: number };
  }> {
    try {
      return await UserProgress.getUserStats(userId);
    } catch (error) {
      console.error('Error getting user learning stats:', error);
      throw error;
    }
  }

  /**
   * Get words for user's game based on their progress
   */
  async getWordsForUserGame(
    userId: string, 
    gameType: string, 
    limit: number = 10
  ): Promise<any[]> {
    try {
      return await UserProgress.getWordsForGame(userId, gameType, limit);
    } catch (error) {
      console.error('Error getting words for user game:', error);
      throw error;
    }
  }

  /**
   * Get user's learned words (mastery level >= 3)
   */
  async getUserLearnedWords(userId: string, limit: number = 100): Promise<any[]> {
    try {
      return await UserProgress.findAll({
        where: { 
          userId,
          masteryLevel: { [Op.gte]: 3 }
        },
        order: [['lastPlayedAt', 'DESC']],
        limit,
        include: [{
          model: WordModel,
          as: 'word',
          required: true
        }]
      });
    } catch (error) {
      console.error('Error getting user learned words:', error);
      throw error;
    }
  }

  /**
   * Get user's new words (mastery level < 2)
   */
  async getUserNewWords(userId: string, limit: number = 100): Promise<any[]> {
    try {
      return await UserProgress.findAll({
        where: { 
          userId,
          masteryLevel: { [Op.lt]: 2 }
        },
        order: [['lastPlayedAt', 'ASC']],
        limit,
        include: [{
          model: WordModel,
          as: 'word',
          required: true
        }]
      });
    } catch (error) {
      console.error('Error getting user new words:', error);
      throw error;
    }
  }

  /**
   * Get words by letter for user (filtered by their progress)
   */
  async getUserWordsByLetter(
    userId: string, 
    letter: string, 
    gameType: 'new' | 'old' = 'new'
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        userId
      };

      if (gameType === 'new') {
        whereClause.masteryLevel = { [Op.lt]: 2 };
      } else {
        whereClause.masteryLevel = { [Op.gte]: 2 };
      }

      return await UserProgress.findAll({
        where: whereClause,
        include: [{
          model: WordModel,
          as: 'word',
          where: {
            word: { [Op.like]: `${letter.toLowerCase()}%` }
          },
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
        limit: 50
      });
    } catch (error) {
      console.error('Error getting user words by letter:', error);
      throw error;
    }
  }

  /**
   * Get words that need review (based on performance)
   */
  async getWordsForReview(limit: number = 20): Promise<Word[]> {
    try {
      // Get words with low accuracy or haven't been reviewed recently
      const words = await WordModel.findAll({
        order: [
          ['lastReviewed', 'ASC NULLS FIRST'],
          ['incorrectCount', 'DESC'],
        ],
        limit,
      });

      return words.map(word => word.toJSON() as Word);
    } catch (error) {
      console.error('Error fetching words for review:', error);
      throw error;
    }
  }

  /**
   * Get AI-generated synonyms for a word
   */
  async getAISynonyms(word: string, context?: string): Promise<string[]> {
    try {
      return await openAIService.suggestSynonyms({
        word,
        context,
        maxSynonyms: 10,
      });
    } catch (error) {
      console.error('Error getting AI synonyms:', error);
      throw error;
    }
  }

  /**
   * Validate user's answer using AI
   */
  async validateAnswerWithAI(
    word: string,
    userAnswer: string,
    correctSynonyms: string[]
  ) {
    try {
      return await openAIService.validateAnswer({
        word,
        userAnswer,
        correctSynonyms,
      });
    } catch (error) {
      console.error('Error validating answer with AI:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the word database
   */
  async getDatabaseStats(): Promise<{
    totalWords: number;
    wordsByDifficulty: { [key: string]: number };
    wordsByCategory: { [key: string]: number };
    averageAccuracy: number;
  }> {
    try {
      const totalWords = await WordModel.count();
      
      const wordsByDifficulty = await WordModel.findAll({
        attributes: [
          'difficulty',
          [WordModel.sequelize?.fn('COUNT', WordModel.sequelize?.col('id')), 'count']
        ],
        group: ['difficulty'],
        raw: true,
      });

      const wordsByCategory = await WordModel.findAll({
        attributes: [
          'category',
          [WordModel.sequelize?.fn('COUNT', WordModel.sequelize?.col('id')), 'count']
        ],
        group: ['category'],
        raw: true,
      });

      // Calculate average accuracy
      const accuracyResult = await WordModel.findAll({
        attributes: [
          [WordModel.sequelize?.fn('AVG', WordModel.sequelize?.literal('CASE WHEN ("correctCount" + "incorrectCount") > 0 THEN "correctCount"::float / ("correctCount" + "incorrectCount") ELSE 0 END')), 'avgAccuracy']
        ],
        raw: true,
      });

      const averageAccuracy = parseFloat((accuracyResult[0] as any)?.avgAccuracy || '0') * 100;

      return {
        totalWords,
        wordsByDifficulty: wordsByDifficulty.reduce((acc, item: any) => {
          acc[item.difficulty] = parseInt(item.count);
          return acc;
        }, {} as { [key: string]: number }),
        wordsByCategory: wordsByCategory.reduce((acc, item: any) => {
          acc[item.category || 'uncategorized'] = parseInt(item.count);
          return acc;
        }, {} as { [key: string]: number }),
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }
}

export const wordService = new WordService();
