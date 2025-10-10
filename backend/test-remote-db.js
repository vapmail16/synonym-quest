// Test script to verify remote database connection
const { Client } = require('pg');

const remoteConfig = {
  host: 'vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud',
  port: 30575,
  database: 'vocabdb-db',
  user: 'VjIKfz',
  password: ')t=0rdZe^='
};

async function testRemoteConnection() {
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
    console.error('Stack trace:', error.stack);
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testRemoteConnection();
