// Database comparison script: Local vs Remote PostgreSQL
// IMPORTANT: Set environment variables before running this script
const { Client } = require('pg');

// Local database configuration (from environment variables)
const localConfig = {
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_DB_PORT) || 5432,
  database: process.env.LOCAL_DB_NAME || 'synonym_quest',
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || ''
};

// Remote database configuration (from environment variables)
const remoteConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

async function compareDatabases() {
  // Validate environment variables
  if (!remoteConfig.host || !remoteConfig.port || !remoteConfig.database || !remoteConfig.user || !remoteConfig.password) {
    console.error('❌ Missing required environment variables:');
    console.error('Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
    console.error('Optional (for local): LOCAL_DB_HOST, LOCAL_DB_PORT, LOCAL_DB_NAME, LOCAL_DB_USER, LOCAL_DB_PASSWORD');
    process.exit(1);
  }

  const localClient = new Client(localConfig);
  const remoteClient = new Client(remoteConfig);
  
  try {
    console.log('🔄 Starting database comparison...');
    console.log('📍 Local DB:', `${localConfig.host}:${localConfig.port}/${localConfig.database}`);
    console.log('📍 Remote DB:', `${remoteConfig.host}:${remoteConfig.port}/${remoteConfig.database}`);
    
    // Connect to both databases
    await localClient.connect();
    await remoteClient.connect();
    console.log('✅ Connected to both databases');
    
    // Get all tables from both databases
    const getTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const localTablesResult = await localClient.query(getTablesQuery);
    const remoteTablesResult = await remoteClient.query(getTablesQuery);
    
    const localTables = localTablesResult.rows.map(row => row.table_name);
    const remoteTables = remoteTablesResult.rows.map(row => row.table_name);
    
    console.log('\n📋 TABLE COMPARISON:');
    console.log('=' * 50);
    console.log(`Local tables (${localTables.length}):`, localTables);
    console.log(`Remote tables (${remoteTables.length}):`, remoteTables);
    
    // Find common tables
    const commonTables = localTables.filter(table => remoteTables.includes(table));
    const localOnlyTables = localTables.filter(table => !remoteTables.includes(table));
    const remoteOnlyTables = remoteTables.filter(table => !localTables.includes(table));
    
    console.log(`\n✅ Common tables (${commonTables.length}):`, commonTables);
    if (localOnlyTables.length > 0) {
      console.log(`⚠️  Local only (${localOnlyTables.length}):`, localOnlyTables);
    }
    if (remoteOnlyTables.length > 0) {
      console.log(`⚠️  Remote only (${remoteOnlyTables.length}):`, remoteOnlyTables);
    }
    
    // Compare each common table
    console.log('\n🔍 DETAILED TABLE COMPARISON:');
    console.log('=' * 60);
    
    for (const tableName of commonTables) {
      console.log(`\n📊 Table: ${tableName.toUpperCase()}`);
      console.log('-' * 40);
      
      // Get column information
      const getColumnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const localColumnsResult = await localClient.query(getColumnsQuery, [tableName]);
      const remoteColumnsResult = await remoteClient.query(getColumnsQuery, [tableName]);
      
      const localColumns = localColumnsResult.rows;
      const remoteColumns = remoteColumnsResult.rows;
      
      // Compare columns
      const localColumnNames = localColumns.map(col => col.column_name);
      const remoteColumnNames = remoteColumns.map(col => col.column_name);
      
      const commonColumns = localColumnNames.filter(name => remoteColumnNames.includes(name));
      const localOnlyColumns = localColumnNames.filter(name => !remoteColumnNames.includes(name));
      const remoteOnlyColumns = remoteColumnNames.filter(name => !localColumnNames.includes(name));
      
      console.log(`  📝 Columns - Local: ${localColumns.length}, Remote: ${remoteColumns.length}`);
      console.log(`  ✅ Common: ${commonColumns.length}, Local only: ${localOnlyColumns.length}, Remote only: ${remoteOnlyColumns.length}`);
      
      // Get row counts
      const localCountResult = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const remoteCountResult = await remoteClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const localCount = parseInt(localCountResult.rows[0].count);
      const remoteCount = parseInt(remoteCountResult.rows[0].count);
      
      console.log(`  📊 Row counts - Local: ${localCount}, Remote: ${remoteCount}`);
      
      if (localCount !== remoteCount) {
        console.log(`  ⚠️  Row count mismatch: ${Math.abs(localCount - remoteCount)} difference`);
      }
    }
    
    console.log('\n🎉 Database comparison completed!');
    
  } catch (error) {
    console.error('❌ Database comparison failed:', error.message);
  } finally {
    await localClient.end();
    await remoteClient.end();
    console.log('\n🔌 Database connections closed');
  }
}

// Run comparison
compareDatabases();
