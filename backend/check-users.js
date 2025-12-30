#!/usr/bin/env node

/**
 * Script to check users in the database
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

async function checkUsers() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Query users table
    const result = await client.query(`
      SELECT 
        id,
        username,
        email,
        "displayName",
        "createdAt",
        "lastLoginAt",
        "isActive"
      FROM users
      ORDER BY "createdAt" DESC
    `);
    
    if (result.rows.length === 0) {
      console.log('📭 No users found in the database');
    } else {
      console.log(`📊 Found ${result.rows.length} user(s):\n`);
      console.log('='.repeat(80));
      
      result.rows.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username || 'N/A'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.displayName || 'N/A'}`);
        console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`   Last Login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
      });
      
      console.log('\n' + '='.repeat(80));
    }
    
    // Also check user_sessions
    const sessionsResult = await client.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(DISTINCT "userId") as active_users
      FROM user_sessions
      WHERE "isActive" = true
    `);
    
    if (sessionsResult.rows.length > 0) {
      const sessions = sessionsResult.rows[0];
      console.log(`\n📱 Active Sessions: ${sessions.total_sessions}`);
      console.log(`👥 Users with Active Sessions: ${sessions.active_users}`);
    }
    
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
    if (error.code === '42P01') {
      console.error('   → The users table does not exist. Run the backend server to create tables.');
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkUsers();

