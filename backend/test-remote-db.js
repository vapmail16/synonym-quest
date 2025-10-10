// Test script to verify remote database connection
// IMPORTANT: Set environment variables before running this script
const { Client } = require('pg');

const remoteConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

async function testRemoteConnection() {
  // Validate environment variables
  if (!remoteConfig.host || !remoteConfig.port || !remoteConfig.database || !remoteConfig.user || !remoteConfig.password) {
    console.error('❌ Missing required environment variables:');
    console.error('Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    console.error('Set these in your .env file or export them in your shell');
    process.exit(1);
  }

  const client = new Client(remoteConfig);
  
  try {
    console.log('🔌 Testing remote database connection...');
    console.log('📍 Host:', remoteConfig.host);
    console.log('📍 Port:', remoteConfig.port);
    console.log('📍 Database:', remoteConfig.database);
    console.log('📍 User:', remoteConfig.user);
    
    await client.connect();
    console.log('✅ Successfully connected to remote database!');
    
    // Test basic query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    // Check existing tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('📋 Existing tables:', tablesResult.rows.map(row => row.table_name));
    } else {
      console.log('📭 No tables found - ready for migration');
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testRemoteConnection();
