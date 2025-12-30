#!/usr/bin/env node

/**
 * Script to delete all users except pareekneeru06@gmail.com
 * Also deletes related records (sessions, progress)
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

const KEEP_EMAIL = 'pareekneeru06@gmail.com';

async function deleteUsers() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // First, get the user to keep
    const keepUserResult = await client.query(`
      SELECT id, email, username FROM users WHERE email = $1
    `, [KEEP_EMAIL]);
    
    if (keepUserResult.rows.length === 0) {
      console.log(`❌ User with email ${KEEP_EMAIL} not found!`);
      console.log('   Aborting deletion to prevent deleting all users.');
      return;
    }
    
    const keepUser = keepUserResult.rows[0];
    console.log(`✅ Found user to keep: ${keepUser.email} (${keepUser.username})`);
    console.log(`   ID: ${keepUser.id}\n`);
    
    // Get users to delete
    const usersToDeleteResult = await client.query(`
      SELECT id, email, username, "displayName" 
      FROM users 
      WHERE email != $1
      ORDER BY "createdAt" DESC
    `, [KEEP_EMAIL]);
    
    if (usersToDeleteResult.rows.length === 0) {
      console.log('📭 No users to delete. Only the keep user exists.');
      return;
    }
    
    console.log(`📊 Found ${usersToDeleteResult.rows.length} user(s) to delete:\n`);
    console.log('='.repeat(80));
    
    usersToDeleteResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.username || 'N/A'}) - ${user.displayName || 'N/A'}`);
    });
    
    console.log('='.repeat(80));
    
    // Count related records
    const userIds = usersToDeleteResult.rows.map(u => u.id);
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
    
    const sessionsCount = await client.query(`
      SELECT COUNT(*) as count FROM user_sessions WHERE "userId" IN (${placeholders})
    `, userIds);
    
    const progressCount = await client.query(`
      SELECT COUNT(*) as count FROM user_progress WHERE "userId" IN (${placeholders})
    `, userIds);
    
    console.log(`\n📊 Related records to delete:`);
    console.log(`   - User Sessions: ${sessionsCount.rows[0].count}`);
    console.log(`   - User Progress: ${progressCount.rows[0].count}`);
    console.log(`   - Users: ${usersToDeleteResult.rows.length}`);
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      console.log('\n🗑️  Starting deletion...\n');
      
      // Delete user sessions
      if (parseInt(sessionsCount.rows[0].count) > 0) {
        const deleteSessions = await client.query(`
          DELETE FROM user_sessions WHERE "userId" IN (${placeholders})
        `, userIds);
        console.log(`✅ Deleted ${deleteSessions.rowCount} user session(s)`);
      }
      
      // Delete user progress
      if (parseInt(progressCount.rows[0].count) > 0) {
        const deleteProgress = await client.query(`
          DELETE FROM user_progress WHERE "userId" IN (${placeholders})
        `, userIds);
        console.log(`✅ Deleted ${deleteProgress.rowCount} user progress record(s)`);
      }
      
      // Delete users
      const deleteUsers = await client.query(`
        DELETE FROM users WHERE id IN (${placeholders})
      `, userIds);
      console.log(`✅ Deleted ${deleteUsers.rowCount} user(s)`);
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('\n✅ Deletion completed successfully!');
      console.log(`\n👤 Remaining user: ${keepUser.email} (${keepUser.username})`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('\n❌ Error deleting users:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

deleteUsers();

