/**
 * Test Database Helper
 * Uses pg-mem for in-memory PostgreSQL testing
 */

import { newDb } from 'pg-mem';
import { Sequelize } from 'sequelize';

let testSequelize: Sequelize | null = null;

export async function setupTestDatabase(): Promise<Sequelize> {
  if (testSequelize) {
    return testSequelize;
  }

  // Create in-memory PostgreSQL database
  const db = newDb();
  
  // Enable UUID extension
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
  });

  // Register ENUM type handlers for pg-mem compatibility
  // pg-mem doesn't fully support ENUM, so we'll use string validation instead
  db.public.registerFunction({
    name: 'enum_range',
    implementation: () => [],
  });

  // Create Sequelize instance connected to in-memory database
  testSequelize = new Sequelize({
    dialect: 'postgres',
    dialectModule: db.adapters.createPg(),
    logging: false,
  });

  return testSequelize;
}

export async function teardownTestDatabase(): Promise<void> {
  if (testSequelize) {
    await testSequelize.close();
    testSequelize = null;
  }
}

export function getTestSequelize(): Sequelize | null {
  return testSequelize;
}

