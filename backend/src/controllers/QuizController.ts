import { Request, Response, Router } from 'express';
import { quizService } from '../services/QuizService';
import { GameSettings } from '../types';

export class QuizController {
  public getRouter(): Router {
    const router = Router();
    
    router.post('/start', this.startQuiz.bind(this));
    router.post('/:sessionId/answer', this.submitAnswer.bind(this));
    router.get('/:sessionId', this.getQuizSession.bind(this));
    router.get('/:sessionId/result', this.getQuizResult.bind(this));
    router.delete('/:sessionId', this.deleteQuizSession.bind(this));
    
    return router;
  }

  /**
   * Start a new quiz session
   */
  public async startQuiz(req: Request, res: Response): Promise<void> {
    try {
      const settings: GameSettings = req.body;
      
      const quizSession = await quizService.startQuiz(settings);
      
      res.status(201).json({
        success: true,
        data: quizSession,
        message: 'Quiz session started successfully'
      });
    } catch (error: any) {
      console.error('Error starting quiz:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to start quiz'
      });
    }
  }

  /**
   * Submit an answer for a quiz session
   */
  public async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { answer, hintsUsed = 0 } = req.body;
      
      if (!answer || !Array.isArray(answer)) {
        res.status(400).json({
          success: false,
          error: 'Answer must be an array of strings'
        });
        return;
      }

      const feedback = await quizService.submitAnswer(sessionId, answer, hintsUsed);
      
      res.json({
        success: true,
        data: feedback
      });
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to submit answer'
      });
    }
  }

  /**
   * Get quiz session details
   */
  public async getQuizSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const session = await quizService.getQuizSession(sessionId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Quiz session not found'
        });
        return;
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error: any) {
      console.error('Error getting quiz session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get quiz session'
      });
    }
  }

  /**
   * Get quiz result
   */
  public async getQuizResult(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const result = await quizService.getQuizResults(sessionId);
      
      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Quiz session not found or not completed'
        });
        return;
      }

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error getting quiz result:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get quiz result'
      });
    }
  }

  /**
   * Delete a quiz session
   */
  public async deleteQuizSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      const deleted = await quizService.deleteQuizSession(sessionId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Quiz session not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Quiz session deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting quiz session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete quiz session'
      });
    }
  }
}

export const quizController = new QuizController();