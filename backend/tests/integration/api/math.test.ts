/**
 * Math API integration tests (TDD)
 */

import request from 'supertest';
import express, { Express } from 'express';
import { MathController } from '../../../src/controllers/MathController';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { DataTypes } from 'sequelize';
import { initMathTopicModel, MathTopicModel } from '../../../src/models/MathTopic';
import { initMathQuestionModel, MathQuestionModel } from '../../../src/models/MathQuestion';

jest.mock('../../../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    if (req.headers.authorization) {
      const testUserId = (global as any).__testUserId;
      if (testUserId) {
        (req as any).user = { id: testUserId };
        next();
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      }
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  },
}));

describe('Math API', () => {
  let app: Express;
  let sequelize: any;
  let Topic: typeof MathTopicModel;
  let Question: typeof MathQuestionModel;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();
    Topic = initMathTopicModel(sequelize);
    Question = initMathQuestionModel(sequelize);
    Topic.hasMany(Question, { foreignKey: 'mathTopicId', as: 'questions' });
    Question.belongsTo(Topic, { foreignKey: 'mathTopicId', as: 'topic' });
    await sequelize.sync({ force: true });

    (global as any).__testUserId = '00000000-0000-4000-8000-000000000001';

    const topic = await Topic.create({
      bankId: 'combinations_counting',
      topic: 'Combinations',
      sourceQ: 'Q17',
      difficulty: 'medium',
      skill: 'count',
      imageRequired: false,
    });

    await Question.create({
      mathTopicId: topic.id,
      externalId: 'comb_001',
      questionText: 'Test?',
      options: [{ label: 'A', value: '1' }],
      correctAnswer: 'A',
      explanation: 'Because.',
      working: 'w',
      svgData: null,
      imageAltText: null,
      imageRequired: false,
    });

    app = express();
    app.use(express.json());
    const mathController = new MathController(Topic as any, Question as any);
    app.use('/api/math', mathController.getRouter());
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('GET /api/math/topics returns topics with question counts', async () => {
    const res = await request(app)
      .get('/api/math/topics')
      .set('Authorization', 'Bearer x')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].bankId).toBe('combinations_counting');
    expect(res.body.data[0].questionCount).toBe(1);
  });

  it('GET /api/math/topics/:bankId/questions returns questions', async () => {
    const res = await request(app)
      .get('/api/math/topics/combinations_counting/questions')
      .set('Authorization', 'Bearer x')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].externalId).toBe('comb_001');
    expect(res.body.data[0].correctAnswer).toBe('A');
  });

  it('GET /api/math/topics/:bankId/questions 404 for unknown bank', async () => {
    await request(app)
      .get('/api/math/topics/unknown_bank/questions')
      .set('Authorization', 'Bearer x')
      .expect(404);
  });

  it('GET /api/math/questions/:id returns one question', async () => {
    const list = await request(app)
      .get('/api/math/topics/combinations_counting/questions')
      .set('Authorization', 'Bearer x')
      .expect(200);
    const id = list.body.data[0].id;

    const res = await request(app)
      .get(`/api/math/questions/${id}`)
      .set('Authorization', 'Bearer x')
      .expect(200);

    expect(res.body.data.questionText).toBe('Test?');
  });

  it('requires auth', async () => {
    await request(app).get('/api/math/topics').expect(401);
  });
});
