// Special migration script for the words table
const { Client } = require('pg');

const localConfig = {
  host: 'localhost',
  port: 5432,
  database: 'synonym_quest',
  user: 'vikkasarunpareek',
  password: ''
};

const remoteConfig = {
  host: 'vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud',
  port: 30575,
  database: 'vocabdb-db',
  user: 'VjIKfz',
  password: ')t=0rdZe^='
};

async function migrateWordsTable() {
  const localClient = new Client(localConfig);
  const remoteClient = new Client(remoteConfig);
  
  try {
    console.log('🔄 Migrating words table...');
    
    await localClient.connect();
    await remoteClient.connect();
    
    // Create words table manually with proper structure
    const createWordsTable = `
      CREATE TABLE IF NOT EXISTS words (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        word VARCHAR(255) NOT NULL UNIQUE,
        synonyms JSONB,
        category VARCHAR(100),
        difficulty VARCHAR(20),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastReviewed" TIMESTAMP,
        "correctCount" INTEGER DEFAULT 0,
        "incorrectCount" INTEGER DEFAULT 0,
        tags JSONB
      );
    `;
    
    await remoteClient.query(createWordsTable);
    console.log('✅ Created words table structure');
    
    // Get all words from local
    const wordsResult = await localClient.query('SELECT * FROM words');
    const words = wordsResult.rows;
    
    console.log(`📊 Found ${words.length} words to migrate`);
    
    if (words.length === 0) {
      console.log('📭 No words to migrate');
      return;
    }
    
    // Clear existing words in remote
    await remoteClient.query('DELETE FROM words');
    
    // Insert words in batches
    const batchSize = 50;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      for (const word of batch) {
        const insertQuery = `
          INSERT INTO words (id, word, synonyms, category, difficulty, "createdAt", "lastReviewed", "correctCount", "incorrectCount", tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
          word.id,
          word.word,
          typeof word.synonyms === 'object' ? JSON.stringify(word.synonyms) : word.synonyms,
          word.category,
          word.difficulty,
          word.createdAt,
          word.lastReviewed,
          word.correctCount,
          word.incorrectCount,
          typeof word.tags === 'object' ? JSON.stringify(word.tags) : word.tags
        ];
        
        await remoteClient.query(insertQuery, values);
      }
      
      console.log(`📦 Migrated batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(words.length / batchSize)}`);
    }
    
    // Verify migration
    const localCount = await localClient.query('SELECT COUNT(*) FROM words');
    const remoteCount = await remoteClient.query('SELECT COUNT(*) FROM words');
    
    const localCountNum = parseInt(localCount.rows[0].count);
    const remoteCountNum = parseInt(remoteCount.rows[0].count);
    
    if (localCountNum === remoteCountNum) {
      console.log(`✅ Words table: ${localCountNum} rows migrated successfully!`);
    } else {
      console.log(`❌ Words table: Local ${localCountNum}, Remote ${remoteCountNum} (mismatch!)`);
    }
    
  } catch (error) {
    console.error('❌ Words table migration failed:', error.message);
  } finally {
    await localClient.end();
    await remoteClient.end();
  }
}

migrateWordsTable();
