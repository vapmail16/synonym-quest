import fs from 'fs';
import path from 'path';
import {
  MATH_SEED_DOC_FILENAMES,
  resolveMathSeedPaths,
} from '../../../src/scripts/seed-math-questions';

describe('math seed JSON path config', () => {
  it('includes practice and Paper 8 docs', () => {
    expect(MATH_SEED_DOC_FILENAMES).toEqual([
      '11plus_math_practice_questions.json',
      '11plus_math_paper8_questions.json',
    ]);
  });

  it('resolves paths under docs/', () => {
    const root = '/repo/synonym-quest';
    const paths = resolveMathSeedPaths(root);
    expect(paths[0]).toBe(path.join(root, 'docs', '11plus_math_practice_questions.json'));
    expect(paths[1]).toBe(path.join(root, 'docs', '11plus_math_paper8_questions.json'));
  });

  it('Paper 8 JSON in repo matches seed schema', () => {
    const repoRoot = path.resolve(__dirname, '../../../../');
    const paper8 = path.join(repoRoot, 'docs', '11plus_math_paper8_questions.json');
    expect(fs.existsSync(paper8)).toBe(true);
    const doc = JSON.parse(fs.readFileSync(paper8, 'utf-8')) as {
      question_banks: { bank_id: string; questions: unknown[] }[];
    };
    expect(Array.isArray(doc.question_banks)).toBe(true);
    expect(doc.question_banks.length).toBe(12);
    const qCount = doc.question_banks.reduce((n, b) => n + b.questions.length, 0);
    expect(qCount).toBe(120);
  });
});
