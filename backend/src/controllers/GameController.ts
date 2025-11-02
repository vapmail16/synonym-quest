import { Request, Response } from 'express';
import { gameService } from '../services/GameService';
import { authenticate } from '../middleware/auth';

export class GameController {
  /**
   * Get all letters progress
   */
  async getAllLettersProgress(req: Request, res: Response): Promise<void> {
    try {
      const progress = await gameService.getAllLettersProgress();
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error getting letters progress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get letters progress'
      });
    }
  }

  /**
   * Get new words for a specific letter
   */
  async getNewWordsForLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letter } = req.params;
      const { limit = '5' } = req.query;
      
      if (!letter || letter.length !== 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid letter parameter'
        });
        return;
      }

      const words = await gameService.getNewWordsForLetter(letter, parseInt(limit as string));
      
      res.json({
        success: true,
        data: {
          letter: letter.toUpperCase(),
          words,
          count: words.length
        }
      });
    } catch (error) {
      console.error('Error getting new words for letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get new words for letter'
      });
    }
  }

  /**
   * Get learned words for a specific letter (revision)
   */
  async getLearnedWordsForLetter(req: Request, res: Response): Promise<void> {
    try {
      const { letter } = req.params;
      const { limit = '5' } = req.query;
      
      if (!letter || letter.length !== 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid letter parameter'
        });
        return;
      }

      const words = await gameService.getLearnedWordsForLetter(letter, parseInt(limit as string));
      
      res.json({
        success: true,
        data: {
          letter: letter.toUpperCase(),
          words,
          count: words.length
        }
      });
    } catch (error) {
      console.error('Error getting learned words for letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get learned words for letter'
      });
    }
  }

  /**
   * Get random new words
   */
  async getRandomNewWords(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query;
      
      const words = await gameService.getRandomNewWords(parseInt(limit as string));
      
      res.json({
        success: true,
        data: {
          words,
          count: words.length
        }
      });
    } catch (error) {
      console.error('Error getting random new words:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get random new words'
      });
    }
  }

  /**
   * Get random learned words (revision)
   */
  async getRandomLearnedWords(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query;
      
      const words = await gameService.getRandomLearnedWords(parseInt(limit as string));
      
      res.json({
        success: true,
        data: {
          words,
          count: words.length
        }
      });
    } catch (error) {
      console.error('Error getting random learned words:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get random learned words'
      });
    }
  }

  /**
   * Generate synonym match question
   */
  async generateSynonymMatchQuestion(req: Request, res: Response): Promise<void> {
    try {
      const question = await gameService.generateSynonymMatchQuestion();
      
      res.json({
        success: true,
        data: question
      });
    } catch (error) {
      console.error('Error generating synonym match question:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate synonym match question'
      });
    }
  }

  /**
   * Submit synonym match answer
   */
  async submitSynonymMatchAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { questionId, answer, wordId } = req.body;
      
      if (!questionId || !answer || !wordId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      // For now, we'll need to regenerate the question to check the answer
      // In a real implementation, you'd store the question temporarily
      const question = await gameService.generateSynonymMatchQuestion();
      const isCorrect = question.correctAnswer.toLowerCase() === answer.toLowerCase();
      
      // Update word progress
      await gameService.updateWordProgress(wordId, isCorrect);
      
      res.json({
        success: true,
        data: {
          isCorrect,
          correctAnswer: question.correctAnswer,
          feedback: isCorrect ? 'Correct! Well done!' : `Incorrect. The right answer is "${question.correctAnswer}"`
        }
      });
    } catch (error) {
      console.error('Error submitting synonym match answer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit synonym match answer'
      });
    }
  }

  /**
   * Generate spelling challenge word
   */
  async generateSpellingChallenge(req: Request, res: Response): Promise<void> {
    try {
      const challenge = await gameService.generateSpellingChallenge();
      
      res.json({
        success: true,
        data: challenge
      });
    } catch (error) {
      console.error('Error generating spelling challenge:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate spelling challenge'
      });
    }
  }

  /**
   * Check spelling answer
   */
  async checkSpellingAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { word, userAnswer, wordId } = req.body;
      
      if (!word || !userAnswer || !wordId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const result = await gameService.checkSpellingAnswer(word, userAnswer);
      
      // Update word progress
      await gameService.updateWordProgress(wordId, result.isCorrect);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error checking spelling answer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check spelling answer'
      });
    }
  }

  /**
   * Get daily quest word
   */
  async getDailyQuestWord(req: Request, res: Response): Promise<void> {
    try {
      const quest = await gameService.getDailyQuestWord();
      
      res.json({
        success: true,
        data: quest
      });
    } catch (error) {
      console.error('Error getting daily quest word:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get daily quest word'
      });
    }
  }

  /**
   * Complete daily quest
   */
  async completeDailyQuest(req: Request, res: Response): Promise<void> {
    try {
      const result = await gameService.completeDailyQuest();
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error completing daily quest:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete daily quest'
      });
    }
  }

  /**
   * Start word ladder game
   */
  async startWordLadder(req: Request, res: Response): Promise<void> {
    try {
      const ladder = await gameService.startWordLadder();
      
      res.json({
        success: true,
        data: ladder
      });
    } catch (error) {
      console.error('Error starting word ladder:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start word ladder'
      });
    }
  }

  /**
   * Generate speed round questions
   */
  async generateSpeedRoundQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { count = '20' } = req.query;
      
      const questions = await gameService.generateSpeedRoundQuestions(parseInt(count as string));
      
      res.json({
        success: true,
        data: {
          questions,
          count: questions.length
        }
      });
    } catch (error) {
      console.error('Error generating speed round questions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate speed round questions'
      });
    }
  }

  /**
   * Get game statistics
   */
  async getGameStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await gameService.getGameStatistics();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting game statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get game statistics'
      });
    }
  }

  /**
   * Get user's game statistics
   */
  async getUserGameStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const stats = await gameService.getUserGameStatistics(userId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user game statistics'
      });
    }
  }

  /**
   * Get user's letters progress
   */
  async getUserLettersProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const progress = await gameService.getUserLettersProgress(userId);
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user letters progress'
      });
    }
  }

  /**
   * Get user's new words for a specific letter
   */
  async getUserNewWordsForLetter(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { letter } = req.params;
      const { limit = 200 } = req.query; // High default to support all words per letter
      const words = await gameService.getUserNewWordsForLetter(userId, letter, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user new words for letter'
      });
    }
  }

  /**
   * Get user's learned words for a specific letter
   */
  async getUserLearnedWordsForLetter(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { letter } = req.params;
      const { limit = 200 } = req.query; // High default to support all words per letter
      const words = await gameService.getUserLearnedWordsForLetter(userId, letter, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user learned words for letter'
      });
    }
  }

  /**
   * Get user's random new words
   */
  async getUserRandomNewWords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { limit = 10 } = req.query;
      const words = await gameService.getUserRandomNewWords(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user random new words'
      });
    }
  }

  /**
   * Get user's random learned words
   */
  async getUserRandomLearnedWords(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { limit = 10 } = req.query;
      const words = await gameService.getUserRandomLearnedWords(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch user random learned words'
      });
    }
  }

  /**
   * Get user's learned words for a specific game type (review mode)
   */
  async getUserLearnedWordsForGameType(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { gameType } = req.params;
      const { limit = 200 } = req.query;
      
      const words = await gameService.getUserLearnedWordsForGameType(userId, gameType, parseInt(limit as string));
      
      res.json({
        success: true,
        data: words
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch learned words for game type'
      });
    }
  }

  /**
   * Update user's game progress
   */
  async updateUserGameProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { wordId, gameType, isCorrect, timeSpent = 0 } = req.body;
      
      await gameService.updateUserGameProgress(userId, wordId, gameType, isCorrect, timeSpent);
      
      res.json({
        success: true,
        message: 'Game progress updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update game progress'
      });
    }
  }

  /**
   * Get router with all game routes
   */
  getRouter() {
    const express = require('express');
    const router = express.Router();

    // Letter-wise games
    router.get('/letters/progress', this.getAllLettersProgress.bind(this));
    router.get('/letter/:letter/new', this.getNewWordsForLetter.bind(this));
    router.get('/letter/:letter/old', this.getLearnedWordsForLetter.bind(this));

    // Random games
    router.get('/random/new', this.getRandomNewWords.bind(this));
    router.get('/random/old', this.getRandomLearnedWords.bind(this));

    // Synonym match game
    router.get('/synonym-match/question', this.generateSynonymMatchQuestion.bind(this));
    router.post('/synonym-match/answer', this.submitSynonymMatchAnswer.bind(this));

    // Spelling challenge
    router.get('/spelling/word', this.generateSpellingChallenge.bind(this));
    router.post('/spelling/check', this.checkSpellingAnswer.bind(this));

    // Daily quest
    router.get('/daily/word', this.getDailyQuestWord.bind(this));
    router.post('/daily/complete', this.completeDailyQuest.bind(this));

    // Word ladder
    router.get('/word-ladder/start', this.startWordLadder.bind(this));

    // Speed round
    router.get('/speed/questions', this.generateSpeedRoundQuestions.bind(this));

    // Statistics
    router.get('/statistics', this.getGameStatistics.bind(this));

    // User-specific routes (require authentication)
    router.get('/user/statistics', authenticate, this.getUserGameStatistics.bind(this));
    router.get('/user/letters/progress', authenticate, this.getUserLettersProgress.bind(this));
    router.get('/user/letter/:letter/new', authenticate, this.getUserNewWordsForLetter.bind(this));
    router.get('/user/letter/:letter/old', authenticate, this.getUserLearnedWordsForLetter.bind(this));
    router.get('/user/random/new', authenticate, this.getUserRandomNewWords.bind(this));
    router.get('/user/random/old', authenticate, this.getUserRandomLearnedWords.bind(this));
    router.get('/user/review/:gameType', authenticate, this.getUserLearnedWordsForGameType.bind(this));
    router.post('/user/progress/update', authenticate, this.updateUserGameProgress.bind(this));

    return router;
  }
}

export const gameController = new GameController();
