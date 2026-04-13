import { MathService } from '../../../src/services/MathService';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/test-db';
import { initMathTopicModel, MathTopicModel } from '../../../src/models/MathTopic';
import { initMathQuestionModel, MathQuestionModel } from '../../../src/models/MathQuestion';

describe('MathService', () => {
  let sequelize: any;
  let service: MathService;

  beforeAll(async () => {
    sequelize = await setupTestDatabase();
    const Topic = initMathTopicModel(sequelize);
    const Question = initMathQuestionModel(sequelize);
    Topic.hasMany(Question, { foreignKey: 'mathTopicId', as: 'questions' });
    Question.belongsTo(Topic, { foreignKey: 'mathTopicId', as: 'topic' });
    await sequelize.sync({ force: true });
    service = new MathService(Topic as any, Question as any);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await MathQuestionModel.destroy({ where: {}, force: true });
    await MathTopicModel.destroy({ where: {}, force: true });
  });

  it('listTopics returns question counts', async () => {
    const t = await MathTopicModel.create({
      bankId: 'b1',
      topic: 'T1',
      difficulty: 'easy',
      skill: 's',
      imageRequired: false,
    });
    await MathQuestionModel.create({
      mathTopicId: t.id,
      externalId: 'q1',
      questionText: 'Q',
      options: [{ label: 'A', value: '1' }],
      correctAnswer: 'A',
      explanation: 'E',
      working: null,
      svgData: null,
      imageAltText: null,
      imageRequired: false,
    });

    const topics = await service.listTopics();
    expect(topics).toHaveLength(1);
    expect(topics[0].questionCount).toBe(1);
    expect(topics[0].bankId).toBe('b1');
  });

  it('topicExists and listQuestionsByBankId', async () => {
    expect(await service.topicExists('x')).toBe(false);
    const t = await MathTopicModel.create({
      bankId: 'x',
      topic: 'X',
      difficulty: 'easy',
      skill: '',
      imageRequired: false,
    });
    expect(await service.topicExists('x')).toBe(true);
    const qs = await service.listQuestionsByBankId('x');
    expect(qs).toEqual([]);
    await MathQuestionModel.create({
      mathTopicId: t.id,
      externalId: 'q1',
      questionText: 'Hi',
      options: [],
      correctAnswer: 'A',
      explanation: 'E',
      working: null,
      svgData: '<svg></svg>',
      imageAltText: 'alt',
      imageRequired: true,
    });
    const qs2 = await service.listQuestionsByBankId('x');
    expect(qs2).toHaveLength(1);
    expect(qs2[0].svgData).toContain('svg');
  });
});
