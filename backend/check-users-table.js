#!/usr/bin/env node

/**
 * Script to check if users table has primary key constraint
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

async function checkUsersTable() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Check if users table exists and has primary key
    const tableCheck = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position;
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Users table does not exist');
      return;
    }
    
    console.log('📊 Users table columns:');
    tableCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check for primary key constraint
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
    
    console.log('\n🔑 Primary Key Constraints:');
    if (pkCheck.rows.length === 0) {
      console.log('  ❌ NO PRIMARY KEY FOUND! This is the problem.');
      console.log('  → The users table exists but has no primary key constraint.');
    } else {
      pkCheck.rows.forEach(pk => {
        console.log(`  ✅ Primary key: ${pk.constraint_name} on column: ${pk.column_name}`);
      });
    }
    
    // Check for unique constraints on id
    const uniqueCheck = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = 'users'
        AND kcu.column_name = 'id'
        AND tc.table_schema = 'public';
    `);
    
    console.log('\n🔐 Unique Constraints on id:');
    if (uniqueCheck.rows.length === 0) {
      console.log('  ❌ NO UNIQUE CONSTRAINT on id column');
    } else {
      uniqueCheck.rows.forEach(uc => {
        console.log(`  ✅ Unique constraint: ${uc.constraint_name} on column: ${uc.column_name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkUsersTable();

