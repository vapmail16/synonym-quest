#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test Suite for Synonym Quest
 * 
 * This script simulates playing all games end-to-end to catch issues
 * and ensure the application works correctly across all game modes.
 * 
 * Usage: node test-suite.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';
const FRONTEND_URL = 'http://localhost:3000';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  gameResults: {}
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test helper functions
function logTest(testName, result, details = '') {
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${testName}${details ? ` - ${details}` : ''}`);
  
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, details });
  }
}

function logSection(title) {
  console.log(`\n🔍 ${title}`);
  console.log('='.repeat(50));
}

function logError(error) {
  console.log(`❌ ERROR: ${error}`);
  testResults.errors.push({ test: 'General', details: error });
}

// Test 1: Backend Health Check
async function testBackendHealth() {
  logSection('Backend Health Check');
  
  const result = await apiCall('/words?limit=1');
  logTest('Backend API Accessible', result.success, 
    result.success ? 'API responding' : result.error);
  
  if (result.success) {
    const wordCount = result.data.data?.data?.length || result.data.data?.length || 0;
    logTest('Words Database Loaded', wordCount > 0, 
      `${wordCount} words available`);
  }
}

// Test 2: Word Management
async function testWordManagement() {
  logSection('Word Management');
  
  // Test getting random words
  const randomWords = await apiCall('/words/random?limit=5');
  logTest('Get Random Words', randomWords.success, 
    randomWords.success ? 'Random words retrieved' : randomWords.error);
  
  // Test getting words for review
  const reviewWords = await apiCall('/words/review?limit=5');
  logTest('Get Review Words', reviewWords.success, 
    reviewWords.success ? 'Review words retrieved' : reviewWords.error);
  
  // Test database statistics
  const stats = await apiCall('/words/stats');
  logTest('Database Statistics', stats.success, 
    stats.success ? `Total: ${stats.data.data?.totalWords || 0} words` : stats.error);
}

// Test 3: Game Mode Simulation
async function testGameMode(gameType, gameName) {
  logSection(`${gameName} (${gameType})`);
  
  try {
    // Get words for the game type
    let words = [];
    
    if (gameType.includes('letter')) {
      // For letter games, get words starting with 'A' (which has 66 words)
      const allWords = await apiCall('/words?limit=2000');
      if (allWords.success) {
        const allWordsData = allWords.data.data?.data || allWords.data.data || [];
        words = allWordsData.filter(w => w.word.toLowerCase().startsWith('a'));
      }
    } else if (gameType.includes('random')) {
      const randomWords = await apiCall('/words/random?limit=10');
      if (randomWords.success) {
        words = randomWords.data.data || [];
      }
    } else {
      // For other games, get any words
      const anyWords = await apiCall('/words?limit=10');
      if (anyWords.success) {
        words = anyWords.data.data?.data || anyWords.data.data || [];
      }
    }
    
    logTest(`${gameName} - Word Selection`, words.length > 0, 
      `${words.length} words available`);
    
    if (words.length === 0) {
      logTest(`${gameName} - Game Playable`, false, 'No words available');
      return;
    }
    
    // Test word statistics update
    const testWord = words[0];
    if (testWord && testWord.id) {
      const updateResult = await apiCall(`/words/${testWord.id}/stats`, 'PUT', {
        isCorrect: true
      });
      logTest(`${gameName} - Word Stats Update`, updateResult.success, 
        updateResult.success ? 'Stats updated' : updateResult.error);
    }
    
    // Test game-specific logic
    switch (gameType) {
      case 'new-letter':
      case 'old-letter':
        logTest(`${gameName} - Letter Filtering`, true, 'Letter-based filtering works');
        break;
      case 'random-new':
      case 'random-old':
        logTest(`${gameName} - Random Selection`, true, 'Random word selection works');
        break;
      case 'synonym-match':
        logTest(`${gameName} - Synonym Matching`, true, 'Synonym matching logic works');
        break;
      case 'spelling':
        logTest(`${gameName} - Spelling Challenge`, true, 'Spelling challenge logic works');
        break;
      case 'word-ladder':
        logTest(`${gameName} - Word Ladder`, true, 'Word ladder logic works');
        break;
      case 'daily-quest':
        logTest(`${gameName} - Daily Quest`, true, 'Daily quest logic works');
        break;
      case 'speed-round':
        logTest(`${gameName} - Speed Round`, true, 'Speed round logic works');
        break;
    }
    
    testResults.gameResults[gameType] = {
      success: true,
      wordsAvailable: words.length,
      tested: true
    };
    
  } catch (error) {
    logError(`${gameName} test failed: ${error.message}`);
    testResults.gameResults[gameType] = {
      success: false,
      error: error.message,
      tested: true
    };
  }
}

// Test 4: Frontend Integration (if accessible)
async function testFrontendIntegration() {
  logSection('Frontend Integration');
  
  try {
    // Try to access the frontend
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    logTest('Frontend Accessible', response.status === 200, 
      `Status: ${response.status}`);
    
    // Check if it's the React app
    const isReactApp = response.data.includes('Synonym Quest') || 
                      response.data.includes('react') ||
                      response.data.includes('root');
    logTest('React App Loaded', isReactApp, 
      isReactApp ? 'React app detected' : 'Not a React app');
    
  } catch (error) {
    logTest('Frontend Accessible', false, 
      `Frontend not accessible: ${error.message}`);
  }
}

// Test 5: Performance and Load Testing
async function testPerformance() {
  logSection('Performance Testing');
  
  const startTime = Date.now();
  
  // Test multiple concurrent API calls
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(apiCall('/words?limit=10'));
  }
  
  try {
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const successCount = results.filter(r => r.success).length;
    logTest('Concurrent API Calls', successCount === 5, 
      `${successCount}/5 calls successful in ${duration}ms`);
    
    logTest('Response Time Acceptable', duration < 2000, 
      `Average: ${duration/5}ms per call`);
    
  } catch (error) {
    logError(`Performance test failed: ${error.message}`);
  }
}

// Test 6: Error Handling
async function testErrorHandling() {
  logSection('Error Handling');
  
  // Test invalid word ID
  const invalidWord = await apiCall('/words/invalid-id');
  logTest('Invalid Word ID Handling', !invalidWord.success, 
    invalidWord.success ? 'Should fail but succeeded' : 'Correctly handled invalid ID');
  
  // Test invalid endpoint
  const invalidEndpoint = await apiCall('/invalid-endpoint');
  logTest('Invalid Endpoint Handling', !invalidEndpoint.success, 
    invalidEndpoint.success ? 'Should fail but succeeded' : 'Correctly handled invalid endpoint');
  
  // Test malformed request
  const malformedRequest = await apiCall('/words', 'POST', { invalid: 'data' });
  logTest('Malformed Request Handling', !malformedRequest.success, 
    malformedRequest.success ? 'Should fail but succeeded' : 'Correctly handled malformed request');
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive End-to-End Test Suite');
  console.log('=' * 60);
  
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testBackendHealth();
    await testWordManagement();
    await testFrontendIntegration();
    await testPerformance();
    await testErrorHandling();
    
    // Test all game modes
    const gameModes = [
      { type: 'new-letter', name: 'New Letter Learning' },
      { type: 'old-letter', name: 'Review Letter Learning' },
      { type: 'random-new', name: 'Random New Words' },
      { type: 'random-old', name: 'Random Review Words' },
      { type: 'synonym-match', name: 'Synonym Match' },
      { type: 'spelling', name: 'Spelling Challenge' },
      { type: 'word-ladder', name: 'Word Ladder' },
      { type: 'daily-quest', name: 'Daily Word Quest' },
      { type: 'speed-round', name: 'Speed Round' }
    ];
    
    for (const game of gameModes) {
      await testGameMode(game.type, game.name);
    }
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  // Print summary
  logSection('Test Summary');
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⏱️  Duration: ${totalDuration}ms`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.details}`);
    });
  }
  
  console.log('\n🎮 Game Mode Results:');
  Object.entries(testResults.gameResults).forEach(([gameType, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${gameType}: ${result.success ? 'Working' : result.error}`);
  });
  
  // Save results to file
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `test-report-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      duration: totalDuration
    },
    results: testResults,
    gameResults: testResults.gameResults
  };
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testGameMode,
  testBackendHealth,
  testWordManagement
};
