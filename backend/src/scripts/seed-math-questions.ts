/**
 * Seed 11+ maths questions from JSON under repo docs/.
 * Default files: practice banks + Paper 8 banks.
 * Run from backend: npm run seed:math
 * Optional: npm run seed:math -- /abs/path/custom.json [...]
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { sequelize, MathTopic, MathQuestion } from '../models';

dotenv.config();

/** Filenames under <repo>/docs/ — processed in order (no overlapping bank_id between files). */
export const MATH_SEED_DOC_FILENAMES = [
  '11plus_math_practice_questions.json',
  '11plus_math_paper8_questions.json',
] as const;

export function resolveMathSeedPaths(repoRoot: string): string[] {
  return MATH_SEED_DOC_FILENAMES.map(f => path.join(repoRoot, 'docs', f));
}

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
  const repoRoot = path.resolve(__dirname, '../../..');
  const cliPaths = process.argv.slice(2).map(p => path.resolve(p));
  const jsonPaths = cliPaths.length > 0 ? cliPaths : resolveMathSeedPaths(repoRoot);

  for (const jsonPath of jsonPaths) {
    if (!fs.existsSync(jsonPath)) {
      console.error('JSON not found:', jsonPath);
      process.exit(1);
    }
  }

  await sequelize.authenticate();
  await sequelize.sync({ alter: false });

  let bankBatches = 0;
  let questionRows = 0;
  for (const jsonPath of jsonPaths) {
    const { topics, questions } = await seedMathQuestions(jsonPath);
    bankBatches += topics;
    questionRows += questions;
    console.log(`   … ${path.basename(jsonPath)}: ${topics} bank(s), ${questions} question(s)`);
  }

  console.log(`✅ Seeded ${jsonPaths.length} file(s): ${bankBatches} bank batch(es), ${questionRows} question row(s).`);
  await sequelize.close();
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
