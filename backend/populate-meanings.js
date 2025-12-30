#!/usr/bin/env node

/**
 * Script to populate word meanings using OpenAI
 * This will add simple, child-friendly meanings to all words that don't have one
 */

require('dotenv').config();
const { Client } = require('pg');
const OpenAI = require('openai');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4';
const BATCH_SIZE = 10; // Process 10 words at a time to avoid rate limits
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

async function generateMeaning(word, synonyms = []) {
  try {
    const synonymsText = synonyms.length > 0 ? `Synonyms: ${synonyms.slice(0, 3).join(', ')}.` : '';
    const prompt = `Provide a simple, easy-to-understand meaning for the word "${word}" in plain language that a child can understand. 
${synonymsText}
Keep it short (1-2 sentences, maximum 100 words). Use simple words and avoid complex explanations.`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful vocabulary teacher for children. Explain word meanings in simple, clear language that is easy to understand.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const meaning = response.choices[0]?.message?.content?.trim();
    if (!meaning) {
      throw new Error('No meaning generated');
    }

    return meaning;
  } catch (error) {
    console.error(`  ❌ Error generating meaning for "${word}":`, error.message);
    // Fallback meaning
    return `A word that means something similar to ${synonyms.length > 0 ? synonyms[0] : 'other related words'}.`;
  }
}

async function populateMeanings() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Check if meaning column exists, if not add it
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'words' AND column_name = 'meaning'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('📝 Adding meaning column to words table...');
      await client.query(`
        ALTER TABLE words ADD COLUMN meaning TEXT
      `);
      console.log('✅ Meaning column added\n');
    }
    
    // Get words without meanings
    const result = await client.query(`
      SELECT id, word, synonyms 
      FROM words 
      WHERE meaning IS NULL OR meaning = ''
      ORDER BY word
    `);
    
    if (result.rows.length === 0) {
      console.log('✅ All words already have meanings!');
      return;
    }
    
    console.log(`📊 Found ${result.rows.length} word(s) without meanings\n`);
    console.log('🚀 Starting to generate meanings...\n');
    console.log('='.repeat(80));
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches
    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const batch = result.rows.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} words)...\n`);
      
      for (const wordRow of batch) {
        try {
          const synonyms = Array.isArray(wordRow.synonyms) 
            ? wordRow.synonyms.map(s => typeof s === 'string' ? s : s.word || s)
            : [];
          
          console.log(`  🔄 Generating meaning for "${wordRow.word}"...`);
          const meaning = await generateMeaning(wordRow.word, synonyms);
          
          // Update database
          await client.query(`
            UPDATE words 
            SET meaning = $1 
            WHERE id = $2
          `, [meaning, wordRow.id]);
          
          console.log(`  ✅ Updated "${wordRow.word}"`);
          successCount++;
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`  ❌ Failed to process "${wordRow.word}":`, error.message);
          errorCount++;
        }
      }
      
      // Delay between batches
      if (i + BATCH_SIZE < result.rows.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ Completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${result.rows.length}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

populateMeanings();

