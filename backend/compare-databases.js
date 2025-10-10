// Database comparison script: Local vs Remote PostgreSQL
const { Client } = require('pg');

// Local database configuration
const localConfig = {
  host: 'localhost',
  port: 5432,
  database: 'synonym_quest',
  user: 'vikkasarunpareek',
  password: ''
};

// Remote database configuration
const remoteConfig = {
  host: 'vocabdb-ictxdwcqsq.tcp-proxy-2212.dcdeploy.cloud',
  port: 30575,
  database: 'vocabdb-db',
  user: 'VjIKfz',
  password: ')t=0rdZe^='
};

async function compareDatabases() {
  const localClient = new Client(localConfig);
  const remoteClient = new Client(remoteConfig);
  
  try {
    console.log('🔄 Starting database comparison...');
    
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
      
      // Show column differences
      if (localOnlyColumns.length > 0) {
        console.log(`  ⚠️  Local only columns:`, localOnlyColumns);
      }
      if (remoteOnlyColumns.length > 0) {
        console.log(`  ⚠️  Remote only columns:`, remoteOnlyColumns);
      }
      
      // Compare data types for common columns
      const columnDifferences = [];
      for (const colName of commonColumns) {
        const localCol = localColumns.find(col => col.column_name === colName);
        const remoteCol = remoteColumns.find(col => col.column_name === colName);
        
        if (localCol.data_type !== remoteCol.data_type) {
          columnDifferences.push({
            column: colName,
            local: localCol.data_type,
            remote: remoteCol.data_type
          });
        }
      }
      
      if (columnDifferences.length > 0) {
        console.log(`  🔄 Column type differences:`);
        columnDifferences.forEach(diff => {
          console.log(`    ${diff.column}: Local(${diff.local}) vs Remote(${diff.remote})`);
        });
      }
      
      // Get row counts
      const localCountResult = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const remoteCountResult = await remoteClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const localCount = parseInt(localCountResult.rows[0].count);
      const remoteCount = parseInt(remoteCountResult.rows[0].count);
      
      console.log(`  📊 Row counts - Local: ${localCount}, Remote: ${remoteCount}`);
      
      if (localCount !== remoteCount) {
        console.log(`  ⚠️  Row count mismatch: ${Math.abs(localCount - remoteCount)} difference`);
      }
      
      // Sample data comparison for small tables
      if (localCount <= 10 && remoteCount <= 10 && localCount > 0) {
        console.log(`  🔍 Sample data comparison:`);
        
        const localDataResult = await localClient.query(`SELECT * FROM ${tableName} ORDER BY 1 LIMIT 5`);
        const remoteDataResult = await remoteClient.query(`SELECT * FROM ${tableName} ORDER BY 1 LIMIT 5`);
        
        const localData = localDataResult.rows;
        const remoteData = remoteDataResult.rows;
        
        console.log(`    Local sample (${localData.length} rows):`);
        localData.forEach((row, index) => {
          const rowStr = Object.entries(row).map(([key, value]) => 
            `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
          ).join(', ');
          console.log(`      ${index + 1}. ${rowStr}`);
        });
        
        console.log(`    Remote sample (${remoteData.length} rows):`);
        remoteData.forEach((row, index) => {
          const rowStr = Object.entries(row).map(([key, value]) => 
            `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
          ).join(', ');
          console.log(`      ${index + 1}. ${rowStr}`);
        });
      }
    }
    
    // Summary
    console.log('\n📈 MIGRATION SUMMARY:');
    console.log('=' * 40);
    console.log(`✅ Successfully migrated tables: ${commonTables.length}`);
    console.log(`📊 Total data migrated:`);
    
    let totalLocalRows = 0;
    let totalRemoteRows = 0;
    
    for (const tableName of commonTables) {
      const localCountResult = await localClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      const remoteCountResult = await remoteClient.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const localCount = parseInt(localCountResult.rows[0].count);
      const remoteCount = parseInt(remoteCountResult.rows[0].count);
      
      totalLocalRows += localCount;
      totalRemoteRows += remoteCount;
      
      const status = localCount === remoteCount ? '✅' : '⚠️';
      console.log(`  ${status} ${tableName}: ${localCount} → ${remoteCount} rows`);
    }
    
    console.log(`\n📊 Total: ${totalLocalRows} → ${totalRemoteRows} rows`);
    console.log(`🎯 Migration accuracy: ${((totalRemoteRows / totalLocalRows) * 100).toFixed(2)}%`);
    
    if (totalLocalRows === totalRemoteRows) {
      console.log('🎉 Perfect migration! All data successfully transferred.');
    } else {
      console.log('⚠️  Some data discrepancies found. Check individual tables above.');
    }
    
  } catch (error) {
    console.error('❌ Database comparison failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await localClient.end();
    await remoteClient.end();
    console.log('\n🔌 Database connections closed');
  }
}

// Run comparison
compareDatabases();
