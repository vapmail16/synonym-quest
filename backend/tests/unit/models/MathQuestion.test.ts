/**
 * Math topic & question models — TDD
 */

import { DataTypes } from 'sequelize';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { initMathTopicModel, MathTopicModel } from '../../../src/models/MathTopic';
import { initMathQuestionModel, MathQuestionModel } from '../../../src/models/MathQuestion';

describe('MathTopic & MathQuestion models', () => {
  let sequelize: any;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();
    initMathTopicModel(sequelize);
    initMathQuestionModel(sequelize);

    MathTopicModel.hasMany(MathQuestionModel, { foreignKey: 'mathTopicId', as: 'questions' });
    MathQuestionModel.belongsTo(MathTopicModel, { foreignKey: 'mathTopicId', as: 'topic' });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await MathQuestionModel.destroy({ where: {}, force: true });
    await MathTopicModel.destroy({ where: {}, force: true });
  });

  it('creates topic and question with options JSON and svg', async () => {
    const topic = await MathTopicModel.create({
      bankId: 'combinations_counting',
      topic: 'Combinations and Counting',
      sourceQ: 'Q17',
      difficulty: 'medium',
      skill: 'Count pairs',
      imageRequired: false,
    });

    const q = await MathQuestionModel.create({
      mathTopicId: topic.id,
      externalId: 'comb_001',
      questionText: 'How many combinations?',
      options: [
        { label: 'A', value: '6' },
        { label: 'B', value: '10' },
      ],
      correctAnswer: 'B',
      explanation: 'Because math.',
      working: 'n(n+1)/2',
      svgData: null,
      imageAltText: null,
      imageRequired: false,
    });

    expect(q.id).toBeDefined();
    const found = await MathQuestionModel.findByPk(q.id, { include: [{ model: MathTopicModel, as: 'topic' }] });
    expect(found?.externalId).toBe('comb_001');
    expect((found as any).topic.bankId).toBe('combinations_counting');
    expect(Array.isArray(found?.options)).toBe(true);
  });

  it('enforces unique bankId on topics', async () => {
    await MathTopicModel.create({
      bankId: 't1',
      topic: 'T1',
      difficulty: 'easy',
      skill: 's',
      imageRequired: false,
    });
    await expect(
      MathTopicModel.create({
        bankId: 't1',
        topic: 'T2',
        difficulty: 'easy',
        skill: 's',
        imageRequired: false,
      })
    ).rejects.toThrow();
  });
});
