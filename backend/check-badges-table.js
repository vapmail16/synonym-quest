#!/usr/bin/env node

/**
 * Script to check if badges table has primary key constraint
 */

require('dotenv').config();
const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

async function checkBadgesTable() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    // Check for primary key constraint on badges
    const pkCheck = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'badges'
        AND tc.table_schema = 'public';
    `);
    
    if (pkCheck.rows.length === 0) {
      console.log('❌ Badges table has no primary key - fixing...');
      await client.query(`ALTER TABLE badges ADD CONSTRAINT badges_pkey PRIMARY KEY (id);`);
      console.log('✅ Primary key added to badges table');
    } else {
      console.log('✅ Badges table has primary key:', pkCheck.rows[0].constraint_name);
    }
    
  } catch (error) {
    if (error.code === '42P01') {
      console.log('ℹ️  Badges table does not exist yet (will be created on sync)');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await client.end();
  }
}

checkBadgesTable();

