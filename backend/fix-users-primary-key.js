#!/usr/bin/env node

/**
 * Script to add primary key constraint to users table
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

async function fixUsersPrimaryKey() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Check if primary key already exists
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
        AND tc.table_name = 'users'
        AND tc.table_schema = 'public';
    `);
    
    if (pkCheck.rows.length > 0) {
      console.log('✅ Primary key already exists:');
      pkCheck.rows.forEach(pk => {
        console.log(`   - ${pk.constraint_name} on ${pk.column_name}`);
      });
      return;
    }
    
    console.log('🔧 Adding primary key constraint to users table...');
    
    // Add primary key constraint
    await client.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_pkey PRIMARY KEY (id);
    `);
    
    console.log('✅ Primary key constraint added successfully!');
    
    // Verify
    const verifyCheck = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = 'users'
        AND tc.table_schema = 'public';
    `);
    
    if (verifyCheck.rows.length > 0) {
      console.log('\n✅ Verification successful:');
      verifyCheck.rows.forEach(pk => {
        console.log(`   - ${pk.constraint_name} on ${pk.column_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P16') {
      console.error('   → Cannot add primary key: column contains null values');
    } else if (error.code === '23505') {
      console.error('   → Cannot add primary key: duplicate values found');
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

fixUsersPrimaryKey();

