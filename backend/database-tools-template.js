// Database Tools Template
// Copy this file and rename it to use for database operations
// IMPORTANT: Never commit files with actual database credentials to Git!

const { Client } = require('pg');

// Database configuration from environment variables
const localConfig = {
  host: process.env.LOCAL_DB_HOST || 'localhost',
  port: parseInt(process.env.LOCAL_DB_PORT) || 5432,
  database: process.env.LOCAL_DB_NAME || 'synonym_quest',
  user: process.env.LOCAL_DB_USER || 'postgres',
  password: process.env.LOCAL_DB_PASSWORD || ''
};

const remoteConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

async function validateEnvironmentVariables() {
  const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('\nSet these in your .env file or export them in your shell');
    process.exit(1);
  }
}

async function testConnection(config, label) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✅ ${label} connection successful`);
    const result = await client.query('SELECT version()');
    console.log(`📊 ${label} version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    return true;
  } catch (error) {
    console.error(`❌ ${label} connection failed:`, error.message);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  await validateEnvironmentVariables();
  
  console.log('🔌 Testing database connections...');
  
  const localConnected = await testConnection(localConfig, 'Local');
  const remoteConnected = await testConnection(remoteConfig, 'Remote');
  
  if (localConnected && remoteConnected) {
    console.log('\n🎉 Both database connections successful!');
    console.log('You can now run your database operations safely.');
  } else {
    console.log('\n⚠️  Some connections failed. Check your configuration.');
  }
}

// Add your database operations here
async function yourDatabaseOperation() {
  // Example: Compare tables, migrate data, etc.
  console.log('Add your database operations here');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  localConfig,
  remoteConfig,
  validateEnvironmentVariables,
  testConnection
};
