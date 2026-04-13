/**
 * Seed 11+ maths questions from docs/11plus_math_practice_questions.json
 * Run from backend: npm run seed:math
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { sequelize, MathTopic, MathQuestion } from '../models';

dotenv.config();

interface JsonBank {
  bank_id: string;
  topic: string;
  source_q?: string;
  image_required?: boolean;
  difficulty: string;
  skill: string;
  questions: JsonQuestion[];
}

interface JsonQuestion {
  id: string;
  question_text: string;
  image?: {
    required?: boolean;
    svg_data?: string;
    alt_text?: string;
  };
  options: { label: string; value: string }[];
  correct_answer: string;
  explanation: string;
  working?: string;
}

export async function seedMathQuestions(jsonPath: string): Promise<{ topics: number; questions: number }> {
  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const doc = JSON.parse(raw) as { question_banks: JsonBank[] };
  let qCount = 0;

  for (const bank of doc.question_banks) {
    const [topic] = await MathTopic.findOrCreate({
      where: { bankId: bank.bank_id },
      defaults: {
        bankId: bank.bank_id,
        topic: bank.topic,
        sourceQ: bank.source_q ?? null,
        difficulty: bank.difficulty || 'medium',
        skill: bank.skill || '',
        imageRequired: !!bank.image_required,
      },
    });

    await topic.update({
      topic: bank.topic,
      sourceQ: bank.source_q ?? null,
      difficulty: bank.difficulty || 'medium',
      skill: bank.skill || '',
      imageRequired: !!bank.image_required,
    });

    for (const q of bank.questions) {
      const img = q.image || {};
      const letter = (q.correct_answer || '').toUpperCase().trim().charAt(0);
      if (!['A', 'B', 'C', 'D', 'E'].includes(letter)) {
        console.warn(`Skip ${q.id}: invalid correct_answer`);
        continue;
      }

      const [row, created] = await MathQuestion.findOrCreate({
        where: { mathTopicId: topic.id, externalId: q.id },
        defaults: {
          mathTopicId: topic.id,
          externalId: q.id,
          questionText: q.question_text,
          options: q.options,
          correctAnswer: letter,
          explanation: q.explanation,
          working: q.working ?? null,
          svgData: img.svg_data ?? null,
          imageAltText: img.alt_text ?? null,
          imageRequired: !!img.required,
        },
      });

      if (!created) {
        await row.update({
          questionText: q.question_text,
          options: q.options,
          correctAnswer: letter,
          explanation: q.explanation,
          working: q.working ?? null,
          svgData: img.svg_data ?? null,
          imageAltText: img.alt_text ?? null,
          imageRequired: !!img.required,
        });
      }
      qCount += 1;
    }
  }

  return { topics: doc.question_banks.length, questions: qCount };
}

async function main() {
  const jsonPath = path.resolve(__dirname, '../../../docs/11plus_math_practice_questions.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('JSON not found:', jsonPath);
    process.exit(1);
  }

  await sequelize.authenticate();
  await sequelize.sync({ alter: false });
  const { topics, questions } = await seedMathQuestions(jsonPath);
  console.log(`✅ Seeded ${topics} topic(s), ${questions} question(s).`);
  await sequelize.close();
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
