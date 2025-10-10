# 🧪 Synonym Quest - Comprehensive Test Suite

This directory contains comprehensive end-to-end test cases for the Synonym Quest application. These tests simulate real user interactions and help identify issues before they reach production.

## 📁 Test Files

### 1. `test-suite.js` - Main Test Suite
- **Purpose**: Comprehensive testing of all game modes and backend functionality
- **Coverage**: All 9 game modes, API endpoints, error handling, performance
- **Usage**: `node test-suite.js`

### 2. `speed-round-test.js` - Speed Round Investigation
- **Purpose**: Specifically investigates the Speed Round crash issue
- **Coverage**: Word selection, timer logic, state management simulation
- **Usage**: `node speed-round-test.js`

### 3. `test-package.json` - Test Dependencies
- **Purpose**: Manages test dependencies and scripts
- **Usage**: `npm install` (install dependencies)

## 🚀 Quick Start

### Prerequisites
1. Backend server running on port 3001
2. Frontend server running on port 3000 (optional)
3. Node.js installed

### Setup
```bash
# Install test dependencies
npm install --package-lock-only=false

# Or install axios directly
npm install axios

# Make scripts executable
chmod +x test-suite.js speed-round-test.js
```

### Running Tests

#### 1. Run All Tests
```bash
node test-suite.js
```

#### 2. Test Speed Round Only
```bash
node speed-round-test.js
```

#### 3. Run with npm scripts (if using test-package.json)
```bash
npm run test          # All tests
npm run test:speed    # Speed round only
npm run test:all      # Both
```

## 📊 Test Coverage

### Backend Tests
- ✅ API Health Check
- ✅ Word Management (CRUD operations)
- ✅ Database Statistics
- ✅ Random Word Selection
- ✅ Review Word Selection
- ✅ Word Statistics Updates
- ✅ Error Handling
- ✅ Performance Testing

### Game Mode Tests
- ✅ **New Letter Learning** - Letter-based new word selection
- ✅ **Review Letter Learning** - Letter-based review selection
- ✅ **Random New Words** - Random new word selection
- ✅ **Random Review Words** - Random review selection
- ✅ **Synonym Match** - Multiple choice synonym matching
- ✅ **Spelling Challenge** - Word spelling from synonyms
- ✅ **Word Ladder** - Sequential word building
- ✅ **Daily Word Quest** - Daily word challenges
- ✅ **Speed Round** - Timed word challenges

### Frontend Integration Tests
- ✅ Frontend Accessibility
- ✅ React App Loading
- ✅ API Integration

### Performance Tests
- ✅ Concurrent API Calls
- ✅ Response Time Testing
- ✅ Load Testing

### Error Handling Tests
- ✅ Invalid Word ID Handling
- ✅ Invalid Endpoint Handling
- ✅ Malformed Request Handling

## 🔍 Speed Round Crash Investigation

The `speed-round-test.js` specifically tests the reported Speed Round crash issue:

### What It Tests
1. **Word Selection Logic** - Simulates frontend word filtering
2. **Multiple Choice Generation** - Tests option creation
3. **Answer Validation** - Tests correct/incorrect answer handling
4. **Timer Simulation** - Tests 60-second countdown
5. **State Updates** - Tests word statistics updates
6. **Timer End Behavior** - Tests what happens when time runs out

### Expected Results
- ✅ No backend crashes
- ✅ Timer completes successfully
- ✅ All game logic works correctly

### If Frontend Still Crashes
The test helps identify if the issue is:
- Backend logic problem
- Frontend React state management
- Timer cleanup issues
- Component unmounting problems
- Memory leaks in useEffect

## 📈 Test Results

### Test Report Format
Tests generate detailed JSON reports with:
- Test execution timestamp
- Pass/fail counts
- Individual test results
- Game mode specific results
- Error details
- Performance metrics

### Sample Output
```
🚀 Starting Comprehensive End-to-End Test Suite
============================================================

🔍 Backend Health Check
==================================================
✅ PASS Backend API Accessible - API responding
✅ PASS Words Database Loaded - 1054 words available

🔍 Word Management
==================================================
✅ PASS Get Random Words - Random words retrieved
✅ PASS Get Review Words - Review words retrieved
✅ PASS Database Statistics - Total: 1054 words

🎮 Game Mode Results:
  ✅ new-letter: Working
  ✅ old-letter: Working
  ✅ random-new: Working
  ✅ random-old: Working
  ✅ synonym-match: Working
  ✅ spelling: Working
  ✅ word-ladder: Working
  ✅ daily-quest: Working
  ✅ speed-round: Working

📄 Detailed report saved to: test-report-2024-01-15T10-30-45-123Z.json
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Connection Refused" Errors
```bash
# Ensure backend is running
cd backend && npm run dev

# Check if port 3001 is accessible
curl http://localhost:3001/health
```

#### 2. "No Words Available" Errors
```bash
# Check database connection
curl http://localhost:3001/api/words?limit=1

# Verify database has data
curl http://localhost:3001/api/words/stats
```

#### 3. "Frontend Not Accessible" Errors
```bash
# Ensure frontend is running
cd frontend && npm start

# Check if port 3000 is accessible
curl http://localhost:3000
```

#### 4. Test Dependencies Missing
```bash
# Install axios
npm install axios

# Or use the test package
cp test-package.json package.json
npm install
```

## 🔧 Customizing Tests

### Adding New Test Cases
1. Create new test function in `test-suite.js`
2. Add to the main `runAllTests()` function
3. Follow the existing pattern with `logTest()` and `logSection()`

### Modifying Test Parameters
- Change `BASE_URL` for different backend ports
- Modify `FRONTEND_URL` for different frontend ports
- Adjust timeout values in performance tests
- Change retry counts in error handling tests

### Adding Game-Specific Tests
1. Add new game type to the `gameModes` array
2. Implement specific logic in the `testGameMode()` function
3. Add validation specific to that game type

## 📝 Best Practices

### Running Tests
1. **Always run tests before deployment**
2. **Run tests after any backend changes**
3. **Run speed round test after frontend changes**
4. **Check test reports for detailed failure information**

### Interpreting Results
1. **Green ✅ = Test passed**
2. **Red ❌ = Test failed, check error details**
3. **Yellow ⚠️ = Warning, investigate further**
4. **Check JSON reports for detailed failure information**

### Maintenance
1. **Update tests when adding new features**
2. **Add tests for new game modes**
3. **Update test data when database schema changes**
4. **Keep test dependencies up to date**

## 🎯 Future Enhancements

### Planned Improvements
- [ ] Automated test scheduling
- [ ] Performance benchmarking
- [ ] Database migration testing
- [ ] Frontend UI automation testing
- [ ] Mobile responsiveness testing
- [ ] Cross-browser compatibility testing

### Integration with CI/CD
- [ ] GitHub Actions integration
- [ ] Automated test runs on commits
- [ ] Test result notifications
- [ ] Performance regression detection

---

**Note**: These tests are designed to catch issues early and provide confidence in the application's stability. Run them regularly, especially before releases or major changes.
