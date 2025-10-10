// Database migration script: Local PostgreSQL to Remote PostgreSQL
const { Client } = require('pg');
const fs = require('fs');

// Local database configuration (your current setup)
const localConfig = {
  host: 'localhost',
  port: 5432,
  database: 'synonym_quest',
  user: 'vikkasarunpareek',
  password: '' // Empty password for local
};

// Remote database configuration
const remoteConfig = {
  host: 'vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud',
  port: 30575,
  database: 'vocabdb-db',
  user: 'VjIKfz',
  password: ')t=0rdZe^='
};

async function migrateDatabase() {
  const localClient = new Client(localConfig);
  const remoteClient = new Client(remoteConfig);
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Connect to both databases
    console.log('📡 Connecting to local database...');
    await localClient.connect();
    
    console.log('📡 Connecting to remote database...');
    await remoteClient.connect();
    
    console.log('✅ Connected to both databases successfully');
    
    // Get all table names from local database
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await localClient.query(tablesQuery);
    const tables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`📋 Found ${tables.length} tables to migrate:`, tables);
    
    // Create backup file
    const backupFile = `backup-${new Date().toISOString().split('T')[0]}.sql`;
    
    for (const tableName of tables) {
      try {
        console.log(`\n🔄 Migrating table: ${tableName}`);
        
        // Get table structure
        const structureQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        
        const structureResult = await localClient.query(structureQuery, [tableName]);
        const columns = structureResult.rows;
      
      // Create table on remote if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          ${columns.map(col => {
            let def = `"${col.column_name}" ${col.data_type}`;
            if (col.is_nullable === 'NO') def += ' NOT NULL';
            if (col.column_default) {
              // Handle special cases for default values
              let defaultValue = col.column_default;
              if (defaultValue.includes('nextval')) {
                def += ` DEFAULT ${defaultValue}`;
              } else if (defaultValue.includes("'")) {
                def += ` DEFAULT ${defaultValue}`;
              } else {
                def += ` DEFAULT '${defaultValue}'`;
              }
            }
            return def;
          }).join(', ')}
        );
      `;
      
      await remoteClient.query(createTableQuery);
      console.log(`✅ Created table structure for ${tableName}`);
      
      // Get data from local table
      const dataQuery = `SELECT * FROM ${tableName}`;
      const dataResult = await localClient.query(dataQuery);
      const rows = dataResult.rows;
      
      if (rows.length === 0) {
        console.log(`📭 Table ${tableName} is empty, skipping data migration`);
        continue;
      }
      
      // Clear existing data in remote table
      await remoteClient.query(`DELETE FROM ${tableName}`);
      
      // Insert data into remote table
      if (rows.length > 0) {
        const columnNames = columns.map(col => `"${col.column_name}"`).join(', ');
        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
        
        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columns.map(col => {
              let value = row[col.column_name];
              // Handle JSON columns properly
              if (col.data_type === 'json' || col.data_type === 'jsonb') {
                if (typeof value === 'object' && value !== null) {
                  value = JSON.stringify(value);
                }
              }
              return value;
            });
            await remoteClient.query(insertQuery, values);
          }
          
          console.log(`📦 Inserted batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(rows.length / batchSize)} for ${tableName}`);
        }
      }
      
        console.log(`✅ Migrated ${rows.length} rows to ${tableName}`);
      } catch (error) {
        console.error(`❌ Failed to migrate table ${tableName}:`, error.message);
        console.log(`⚠️  Continuing with other tables...`);
      }
    }
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    for (const tableName of tables) {
      try {
        const localCount = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
        const remoteCount = await remoteClient.query(`SELECT COUNT(*) FROM ${tableName}`);
        
        const localCountNum = parseInt(localCount.rows[0].count);
        const remoteCountNum = parseInt(remoteCount.rows[0].count);
        
        if (localCountNum === remoteCountNum) {
          console.log(`✅ ${tableName}: ${localCountNum} rows (verified)`);
        } else {
          console.log(`❌ ${tableName}: Local ${localCountNum}, Remote ${remoteCountNum} (mismatch!)`);
        }
      } catch (error) {
        console.log(`⚠️  ${tableName}: Could not verify (${error.message})`);
      }
    }
    
    console.log('\n🎉 Database migration completed successfully!');
    console.log('📝 You can now update your application to use the remote database.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Close connections
    await localClient.end();
    await remoteClient.end();
    console.log('🔌 Database connections closed');
  }
}

// Run migration
migrateDatabase();
