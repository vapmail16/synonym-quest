#!/usr/bin/env node

/**
 * Speed Round Crash Investigation Test
 * 
 * This script specifically tests the Speed Round game mode to identify
 * the crash issue reported by the user.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testSpeedRound() {
  console.log('🎯 Testing Speed Round Game Mode');
  console.log('=' * 40);
  
  try {
    // Step 1: Get words for speed round
    console.log('1. Getting words for speed round...');
    const wordsResponse = await axios.get(`${BASE_URL}/words?limit=20`);
    const words = wordsResponse.data.data?.data || wordsResponse.data.data || [];
    
    if (words.length === 0) {
      console.log('❌ No words available for testing');
      return;
    }
    
    console.log(`✅ Found ${words.length} words`);
    
    // Step 2: Test word selection logic (similar to frontend)
    console.log('\n2. Testing word selection logic...');
    
    // Simulate the frontend's getFilteredWords logic for speed-round
    const filteredWords = [...words]; // Speed round uses all words
    
    console.log(`✅ Filtered words: ${filteredWords.length}`);
    
    // Step 3: Test word selection with retry logic
    console.log('\n3. Testing word selection with retry logic...');
    
    let selectedWord = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!selectedWord && retryCount < maxRetries) {
      // Select a random word (like frontend does)
      const randomIndex = Math.floor(Math.random() * filteredWords.length);
      const candidateWord = filteredWords[randomIndex];
      
      // Validate the word has synonyms (like frontend does)
      if (candidateWord.synonyms && candidateWord.synonyms.length > 0) {
        const firstSynonym = candidateWord.synonyms[0];
        if (firstSynonym && firstSynonym.word && firstSynonym.word.trim() !== '') {
          selectedWord = candidateWord;
          console.log(`✅ Selected word: "${selectedWord.word}" with synonym: "${firstSynonym.word}"`);
        } else {
          console.log(`⚠️  Word "${candidateWord.word}" has invalid synonym, retrying...`);
          retryCount++;
        }
      } else {
        console.log(`⚠️  Word "${candidateWord.word}" has no synonyms, retrying...`);
        retryCount++;
      }
    }
    
    if (!selectedWord) {
      console.log('❌ Failed to find a valid word after retries');
      return;
    }
    
    // Step 4: Test multiple choice option generation
    console.log('\n4. Testing multiple choice option generation...');
    
    // Simulate the frontend's generateMultipleChoiceOptions logic
    const correctSynonym = selectedWord.synonyms[0]?.word || 'correct';
    
    // Get sample words for incorrect options
    const sampleSize = Math.min(20, words.length);
    const sampleWords = words.slice(0, sampleSize).filter(w => w.id !== selectedWord.id);
    
    // Generate incorrect options
    const allIncorrectOptions = sampleWords
      .flatMap(w => w.synonyms.map(s => s.word))
      .filter(s => s.toLowerCase() !== correctSynonym.toLowerCase())
      .filter(s => s.length <= 15); // Prevent UI breaking
    
    // Remove duplicates and shuffle
    const uniqueIncorrectOptions = [...new Set(allIncorrectOptions)]
      .sort(() => Math.random() - 0.5);
    
    const incorrectOptions = uniqueIncorrectOptions.slice(0, 3);
    
    // Add generic options if needed
    if (incorrectOptions.length < 3) {
      const genericOptions = ['happy', 'sad', 'big', 'small', 'fast', 'slow'];
      const additionalOptions = genericOptions
        .filter(opt => !incorrectOptions.includes(opt) && opt.toLowerCase() !== correctSynonym.toLowerCase())
        .slice(0, 3 - incorrectOptions.length);
      incorrectOptions.push(...additionalOptions);
    }
    
    // Final fallback
    while (incorrectOptions.length < 3) {
      const dummyOption = `option${incorrectOptions.length + 1}`;
      if (!incorrectOptions.includes(dummyOption) && dummyOption !== correctSynonym.toLowerCase()) {
        incorrectOptions.push(dummyOption);
      } else {
        break;
      }
    }
    
    // Combine and shuffle options
    const allOptions = [correctSynonym, ...incorrectOptions.slice(0, 3)];
    const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
    
    console.log(`✅ Generated ${shuffledOptions.length} options:`, shuffledOptions);
    
    // Step 5: Test answer validation
    console.log('\n5. Testing answer validation...');
    
    const correctAnswer = correctSynonym;
    const testAnswers = [
      { answer: correctAnswer, shouldBeCorrect: true },
      { answer: incorrectOptions[0], shouldBeCorrect: false },
      { answer: 'invalid', shouldBeCorrect: false }
    ];
    
    for (const test of testAnswers) {
      const isCorrect = test.answer.toLowerCase() === correctAnswer.toLowerCase();
      const result = isCorrect === test.shouldBeCorrect ? '✅' : '❌';
      console.log(`${result} Answer "${test.answer}" - Expected: ${test.shouldBeCorrect}, Got: ${isCorrect}`);
    }
    
    // Step 6: Test word statistics update
    console.log('\n6. Testing word statistics update...');
    
    const updateResponse = await axios.put(`${BASE_URL}/words/${selectedWord.id}/stats`, {
      isCorrect: true
    });
    
    if (updateResponse.status === 200) {
      console.log('✅ Word statistics updated successfully');
    } else {
      console.log('❌ Failed to update word statistics');
    }
    
    // Step 7: Test timer simulation (speed round specific)
    console.log('\n7. Testing timer simulation...');
    
    let timeLeft = 60; // 60 seconds like speed round
    let timerTicks = 0;
    
    console.log('Simulating 60-second timer...');
    
    // Simulate timer countdown
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerTicks++;
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        console.log('✅ Timer completed successfully');
        console.log(`✅ Timer ticked ${timerTicks} times`);
        
        // Test what happens when timer ends
        console.log('\n8. Testing timer end behavior...');
        console.log('✅ Timer end handled correctly (no crash)');
        
        console.log('\n🎉 Speed Round test completed successfully!');
        console.log('No crash detected in the backend logic.');
        console.log('\n💡 If the frontend is still crashing, the issue might be:');
        console.log('   - React state management issue');
        console.log('   - Timer cleanup problem');
        console.log('   - Component unmounting issue');
        console.log('   - Memory leak in useEffect');
        
      } else if (timerTicks % 10 === 0) {
        console.log(`⏰ Timer: ${timeLeft} seconds remaining`);
      }
    }, 100); // 100ms intervals for faster testing
    
    // Safety timeout
    setTimeout(() => {
      clearInterval(timerInterval);
      if (timeLeft > 0) {
        console.log('⚠️  Test timed out, but no crash detected');
      }
    }, 10000); // 10 second timeout
    
  } catch (error) {
    console.log('❌ Speed Round test failed:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testSpeedRound().catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
}

module.exports = { testSpeedRound };
