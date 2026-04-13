import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MathService } from '../services/MathService';
import { MathTopicModel, MathQuestionModel } from '../models';

export class MathController {
  private mathService: MathService;

  constructor(
    topicModel?: typeof MathTopicModel,
    questionModel?: typeof MathQuestionModel
  ) {
    const tm = topicModel || MathTopicModel;
    const qm = questionModel || MathQuestionModel;
    this.mathService = new MathService(tm, qm);
  }

  getRouter(): Router {
    const router = Router();
    router.use(authenticate);
    router.get('/topics', this.listTopics.bind(this));
    router.get('/topics/:bankId/questions', this.listQuestions.bind(this));
    router.get('/questions/:id', this.getQuestion.bind(this));
    return router;
  }

  async listTopics(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.mathService.listTopics();
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('listTopics', e);
      res.status(500).json({ success: false, error: e.message || 'Failed to list topics' });
    }
  }

  async listQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { bankId } = req.params;
      const exists = await this.mathService.topicExists(bankId);
      if (!exists) {
        res.status(404).json({ success: false, error: 'Topic not found' });
        return;
      }
      const rows = await this.mathService.listQuestionsByBankId(bankId);
      res.json({ success: true, data: rows });
    } catch (e: any) {
      console.error('listQuestions', e);
      res.status(500).json({ success: false, error: e.message || 'Failed to list questions' });
    }
  }

  async getQuestion(req: Request, res: Response): Promise<void> {
    try {
      const row = await this.mathService.getQuestionById(req.params.id);
      if (!row) {
        res.status(404).json({ success: false, error: 'Question not found' });
        return;
      }
      res.json({ success: true, data: row });
    } catch (e: any) {
      console.error('getQuestion', e);
      res.status(500).json({ success: false, error: e.message || 'Failed to get question' });
    }
  }
}

export const mathController = new MathController();
