/**
 * Diagnostic script: check badge-related stats for a user
 * Run: node scripts/check-user-badge-stats.js <userId>
 * 
 * Use this to verify why "100 words learned" (Lexicon Legend) might not be awarding.
 * Pass your daughter's user ID from the users table.
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/check-user-badge-stats.js <userId>');
  console.error('Example: node scripts/check-user-badge-stats.js 550e8400-e29b-41d4-a716-446655440000');
  process.exit(1);
}

async function main() {
  const sequelize = new Sequelize(process.env.DATABASE_URL || process.env.DB_URL, {
    logging: false,
    dialect: 'postgres',
  });

  try {
    // 1. What the badge uses (distinct words, masteryLevel >= 1)
    const badgeCount = await sequelize.query(
      `SELECT COUNT(DISTINCT "wordId") as count FROM user_progress 
       WHERE "userId" = :userId AND "masteryLevel" >= 1`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    const distinctWordsForBadge = parseInt(badgeCount[0]?.count || 0, 10);

    // 2. What the UI shows (rows with correctCount >= 1)
    const uiCount = await sequelize.query(
      `SELECT COUNT(*) as count FROM user_progress 
       WHERE "userId" = :userId AND "correctCount" >= 1`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );
    const rowsShownInUI = parseInt(uiCount[0]?.count || 0, 10);

    // 3. Per game type
    const byGameType = await sequelize.query(
      `SELECT "gameType", COUNT(*) as rows, COUNT(DISTINCT "wordId") as distinct_words
       FROM user_progress
       WHERE "userId" = :userId AND "correctCount" >= 1
       GROUP BY "gameType"
       ORDER BY rows DESC`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    console.log('\n=== Badge Diagnostic for user:', userId, '===\n');
    console.log('1. Distinct words (used by Lexicon Legend badge):', distinctWordsForBadge);
    console.log('2. Rows (shown as "words learned" in UI):         ', rowsShownInUI);
    console.log('\n3. Per game type:');
    byGameType.forEach((row) => {
      console.log(`   ${row.gameType}: ${row.rows} rows, ${row.distinct_words} distinct words`);
    });
    console.log('\n--- Interpretation ---');
    if (rowsShownInUI >= 100 && distinctWordsForBadge < 100) {
      console.log('UI shows 100+ but badge sees < 100 distinct words. This mismatch likely explains');
      console.log('why Lexicon Legend (100 words) is not awarding.');
    } else if (distinctWordsForBadge >= 100) {
      console.log('User has 100+ distinct words. Badge should have been awarded.');
      console.log('If not, check user_badges for Lexicon Legend and badge service logs.');
    } else {
      console.log('User has fewer than 100 distinct words. Badge will award when they reach 100.');
    }
    console.log('');
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
