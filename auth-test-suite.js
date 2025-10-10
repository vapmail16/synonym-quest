#!/usr/bin/env node

/**
 * Authentication System Test Suite
 * 
 * Tests the complete user authentication flow including:
 * - User registration
 * - User login
 * - Token management
 * - User profile management
 * - Session persistence
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001/api';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  userData: null,
  tokens: null
};

// Helper function to make API calls
async function apiCall(endpoint, method = 'GET', data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
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

// Generate unique test data
const timestamp = Date.now();
const testUser = {
  username: `testuser${timestamp}`,
  email: `test${timestamp}@example.com`,
  password: 'testpassword123',
  displayName: `Test User ${timestamp}`
};

// Test 1: User Registration
async function testUserRegistration() {
  logSection('User Registration');
  
  const result = await apiCall('/auth/register', 'POST', testUser);
  logTest('User Registration', result.success, 
    result.success ? 'User created successfully' : result.error?.error);
  
  if (result.success && result.data.data) {
    testResults.userData = result.data.data.user;
    testResults.tokens = result.data.data.tokens;
    
    // Validate user data
    const user = result.data.data.user;
    logTest('User ID Generated', !!user.id, user.id);
    logTest('Username Set', user.username === testUser.username, user.username);
    logTest('Email Set', user.email === testUser.email, user.email);
    logTest('Display Name Set', user.displayName === testUser.displayName, user.displayName);
    
    // Validate tokens
    const tokens = result.data.data.tokens;
    logTest('Access Token Generated', !!tokens.accessToken, 'Token length: ' + tokens.accessToken.length);
    logTest('Refresh Token Generated', !!tokens.refreshToken, 'Token length: ' + tokens.refreshToken.length);
    logTest('Expires In Set', tokens.expiresIn > 0, tokens.expiresIn + ' seconds');
  }
}

// Test 2: Duplicate Registration
async function testDuplicateRegistration() {
  logSection('Duplicate Registration Prevention');
  
  const result = await apiCall('/auth/register', 'POST', testUser);
  logTest('Duplicate Registration Blocked', !result.success, 
    result.success ? 'Should have failed' : result.error?.error);
}

// Test 3: User Login
async function testUserLogin() {
  logSection('User Login');
  
  const loginData = {
    email: testUser.email,
    password: testUser.password
  };
  
  const result = await apiCall('/auth/login', 'POST', loginData);
  logTest('User Login', result.success, 
    result.success ? 'Login successful' : result.error?.error);
  
  if (result.success && result.data.data) {
    const tokens = result.data.data.tokens;
    logTest('New Access Token Generated', !!tokens.accessToken, 'Token length: ' + tokens.accessToken.length);
    logTest('New Refresh Token Generated', !!tokens.refreshToken, 'Token length: ' + tokens.refreshToken.length);
    
    // Update tokens for subsequent tests
    testResults.tokens = tokens;
  }
}

// Test 4: Invalid Login
async function testInvalidLogin() {
  logSection('Invalid Login Handling');
  
  const invalidLoginData = {
    email: testUser.email,
    password: 'wrongpassword'
  };
  
  const result = await apiCall('/auth/login', 'POST', invalidLoginData);
  logTest('Invalid Password Rejected', !result.success, 
    result.success ? 'Should have failed' : result.error?.error);
  
  const nonExistentUser = {
    email: 'nonexistent@example.com',
    password: 'anypassword'
  };
  
  const result2 = await apiCall('/auth/login', 'POST', nonExistentUser);
  logTest('Non-existent User Rejected', !result2.success, 
    result2.success ? 'Should have failed' : result2.error?.error);
}

// Test 5: Token-based Authentication
async function testTokenAuthentication() {
  logSection('Token-based Authentication');
  
  if (!testResults.tokens) {
    logTest('Token Authentication', false, 'No tokens available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${testResults.tokens.accessToken}`
  };
  
  const result = await apiCall('/auth/profile', 'GET', null, headers);
  logTest('Profile Access with Token', result.success, 
    result.success ? 'Profile retrieved' : result.error?.error);
  
  if (result.success && result.data.data) {
    const profile = result.data.data.user;
    logTest('Profile Data Correct', profile.email === testUser.email, profile.email);
    logTest('Profile ID Matches', profile.id === testResults.userData.id, profile.id);
  }
}

// Test 6: Token Refresh
async function testTokenRefresh() {
  logSection('Token Refresh');
  
  if (!testResults.tokens) {
    logTest('Token Refresh', false, 'No tokens available');
    return;
  }
  
  const refreshData = {
    refreshToken: testResults.tokens.refreshToken
  };
  
  const result = await apiCall('/auth/refresh-token', 'POST', refreshData);
  logTest('Token Refresh', result.success, 
    result.success ? 'Tokens refreshed' : result.error?.error);
  
  if (result.success && result.data.data) {
    const newTokens = result.data.data.tokens;
    logTest('New Access Token Generated', !!newTokens.accessToken, 'Token length: ' + newTokens.accessToken.length);
    logTest('New Refresh Token Generated', !!newTokens.refreshToken, 'Token length: ' + newTokens.refreshToken.length);
    
    // Update tokens
    testResults.tokens = newTokens;
  }
}

// Test 7: Profile Update
async function testProfileUpdate() {
  logSection('Profile Update');
  
  if (!testResults.tokens) {
    logTest('Profile Update', false, 'No tokens available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${testResults.tokens.accessToken}`
  };
  
  const updateData = {
    displayName: 'Updated Test User',
    preferences: {
      theme: 'dark',
      language: 'en',
      gameSettings: {
        defaultGameType: 'random-new',
        timerEnabled: true,
        soundEnabled: false
      }
    }
  };
  
  const result = await apiCall('/auth/profile', 'PUT', updateData, headers);
  logTest('Profile Update', result.success, 
    result.success ? 'Profile updated' : result.error?.error);
  
  if (result.success && result.data.data) {
    const updatedProfile = result.data.data.user;
    logTest('Display Name Updated', updatedProfile.displayName === 'Updated Test User', updatedProfile.displayName);
    logTest('Preferences Updated', !!updatedProfile.preferences, JSON.stringify(updatedProfile.preferences));
  }
}

// Test 8: Invalid Token Handling
async function testInvalidTokenHandling() {
  logSection('Invalid Token Handling');
  
  const invalidHeaders = {
    'Authorization': 'Bearer invalid_token_here'
  };
  
  const result = await apiCall('/auth/profile', 'GET', null, invalidHeaders);
  logTest('Invalid Token Rejected', !result.success, 
    result.success ? 'Should have failed' : result.error?.error);
  
  // Test with no token
  const result2 = await apiCall('/auth/profile', 'GET');
  logTest('No Token Rejected', !result2.success, 
    result2.success ? 'Should have failed' : result2.error?.error);
}

// Test 9: User Sessions
async function testUserSessions() {
  logSection('User Sessions Management');
  
  if (!testResults.tokens) {
    logTest('User Sessions', false, 'No tokens available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${testResults.tokens.accessToken}`
  };
  
  const result = await apiCall('/auth/sessions', 'GET', null, headers);
  logTest('User Sessions Retrieved', result.success, 
    result.success ? 'Sessions retrieved' : result.error?.error);
  
  if (result.success && result.data.data) {
    const sessions = result.data.data.sessions;
    logTest('Sessions Array Returned', Array.isArray(sessions), `${sessions.length} sessions`);
    
    if (sessions.length > 0) {
      const session = sessions[0];
      logTest('Session Has Required Fields', 
        !!(session.id && session.deviceInfo && session.lastUsedAt), 
        'Session ID: ' + session.id);
    }
  }
}

// Test 10: Logout
async function testLogout() {
  logSection('User Logout');
  
  if (!testResults.tokens) {
    logTest('User Logout', false, 'No tokens available');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${testResults.tokens.accessToken}`
  };
  
  const result = await apiCall('/auth/logout', 'POST', null, headers);
  logTest('User Logout', result.success, 
    result.success ? 'Logout successful' : result.error?.error);
  
  // Try to access profile after logout
  const result2 = await apiCall('/auth/profile', 'GET', null, headers);
  logTest('Profile Access After Logout Blocked', !result2.success, 
    result2.success ? 'Should have failed' : result2.error?.error);
}

// Test 11: Data Validation
async function testDataValidation() {
  logSection('Data Validation');
  
  // Test invalid email format
  const invalidEmailUser = {
    username: 'testuser2',
    email: 'invalid-email',
    password: 'password123'
  };
  
  const result1 = await apiCall('/auth/register', 'POST', invalidEmailUser);
  logTest('Invalid Email Rejected', !result1.success, 
    result1.success ? 'Should have failed' : result1.error?.error);
  
  // Test short password
  const shortPasswordUser = {
    username: 'testuser3',
    email: 'test3@example.com',
    password: '123'
  };
  
  const result2 = await apiCall('/auth/register', 'POST', shortPasswordUser);
  logTest('Short Password Rejected', !result2.success, 
    result2.success ? 'Should have failed' : result2.error?.error);
  
  // Test short username
  const shortUsernameUser = {
    username: 'ab',
    email: 'test4@example.com',
    password: 'password123'
  };
  
  const result3 = await apiCall('/auth/register', 'POST', shortUsernameUser);
  logTest('Short Username Rejected', !result3.success, 
    result3.success ? 'Should have failed' : result3.error?.error);
}

// Main test runner
async function runAuthTests() {
  console.log('🚀 Starting Authentication System Test Suite');
  console.log('=' * 60);
  
  const startTime = Date.now();
  
  try {
    // Run all authentication tests
    await testUserRegistration();
    await testDuplicateRegistration();
    await testUserLogin();
    await testInvalidLogin();
    await testTokenAuthentication();
    await testTokenRefresh();
    await testProfileUpdate();
    await testInvalidTokenHandling();
    await testUserSessions();
    await testDataValidation();
    await testLogout();
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  // Print summary
  logSection('Authentication Test Summary');
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
  
  console.log('\n🔐 Authentication System Status:');
  if (testResults.failed === 0) {
    console.log('✅ FULLY FUNCTIONAL - Ready for production!');
    console.log('✅ User registration working');
    console.log('✅ User login working');
    console.log('✅ Token management working');
    console.log('✅ Profile management working');
    console.log('✅ Session persistence working');
    console.log('✅ Security validation working');
  } else {
    console.log('⚠️  PARTIAL FUNCTIONALITY - Issues detected');
    console.log('Please review failed tests and fix issues before production deployment');
  }
  
  // Save results to file
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = `auth-test-report-${timestamp}.json`;
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      duration: totalDuration
    },
    results: testResults,
    testUser: testUser.username // For cleanup if needed
  };
  
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run the tests
if (require.main === module) {
  runAuthTests().catch(error => {
    console.error('💥 Auth test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = {
  runAuthTests,
  testUserRegistration,
  testUserLogin,
  testTokenAuthentication
};
