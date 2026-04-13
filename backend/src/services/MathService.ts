import { MathTopicModel, MathQuestionModel } from '../models';

export class MathService {
  constructor(
    private mathTopicModel: typeof MathTopicModel,
    private mathQuestionModel: typeof MathQuestionModel
  ) {}

  async listTopics(): Promise<
    Array<{
      id: string;
      bankId: string;
      topic: string;
      difficulty: string;
      skill: string;
      imageRequired: boolean;
      questionCount: number;
    }>
  > {
    const topics = await this.mathTopicModel.findAll({
      order: [['topic', 'ASC']],
      include: [
        {
          model: this.mathQuestionModel,
          as: 'questions',
          attributes: ['id'],
          required: false,
        },
      ],
    });

    return topics.map(t => {
      const json = t.toJSON() as any;
      const count = Array.isArray(json.questions) ? json.questions.length : 0;
      return {
        id: json.id,
        bankId: json.bankId,
        topic: json.topic,
        difficulty: json.difficulty,
        skill: json.skill,
        imageRequired: json.imageRequired,
        questionCount: count,
      };
    });
  }

  async topicExists(bankId: string): Promise<boolean> {
    const n = await this.mathTopicModel.count({ where: { bankId } });
    return n > 0;
  }

  async listQuestionsByBankId(bankId: string): Promise<any[]> {
    const topic = await this.mathTopicModel.findOne({ where: { bankId } });
    if (!topic) {
      return [];
    }
    const rows = await this.mathQuestionModel.findAll({
      where: { mathTopicId: topic.id },
      order: [['externalId', 'ASC']],
    });
    return rows.map(r => r.toJSON());
  }

  async getQuestionById(questionId: string): Promise<any | null> {
    const row = await this.mathQuestionModel.findByPk(questionId);
    return row ? row.toJSON() : null;
  }
}
