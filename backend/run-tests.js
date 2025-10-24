#!/usr/bin/env node

/**
 * Test Runner for Synonym Quest Backend
 * 
 * This script runs all tests from the backend directory
 * Usage: node run-tests.js [test-file]
 */

const { execSync } = require('child_process');
const path = require('path');

// Get the test file argument
const testFile = process.argv[2];

// Path to test files
const testDir = path.join(__dirname, '..', 'test');

if (testFile) {
  // Run specific test file
  const testPath = path.join(testDir, testFile);
  console.log(`Running test: ${testFile}`);
  execSync(`node "${testPath}"`, { stdio: 'inherit' });
} else {
  // Run all test files
  console.log('Running all tests...');
  const testFiles = [
    'test-suite.js',
    'auth-test-suite.js', 
    'frontend-crash-test.js',
    'speed-round-test.js'
  ];
  
  for (const file of testFiles) {
    const testPath = path.join(testDir, file);
    console.log(`\n=== Running ${file} ===`);
    try {
      execSync(`node "${testPath}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error(`Test ${file} failed:`, error.message);
    }
  }
}
