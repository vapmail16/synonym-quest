import React, { useState, useEffect, useCallback, useRef } from 'react';
import authService from './services/authService';
import config from './config/api';

interface Word {
  id: string;
  word: string;
  synonyms: Array<{ word: string; type: string }>;
  difficulty: string;
  meaning?: string;
  correctCount: number;
  incorrectCount: number;
}

interface GameQuestion {
  id: string;
  questionWord: Word;
  options: string[];
  correctAnswer: string;
  difficulty: string;
  gameType: string;
}

// interface GameStats {
//   totalWords: number;
//   learnedWords: number;
//   learningProgress: number;
//   dailyStreak: number;
//   gamesPlayed: number;
// }

type GameType = 
  | 'new-letter' 
  | 'old-letter' 
  | 'random-new' 
  | 'random-old' 
  | 'synonym-match' 
  | 'synonym-match-review'
  | 'spelling' 
  | 'spelling-review'
  | 'word-ladder' 
  | 'word-ladder-review'
  | 'daily-quest' 
  | 'speed-round'
  | 'speed-round-review';


interface GamesProps {
  user?: any; // User object from auth
}

const Games: React.FC<GamesProps> = ({ user }) => {
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string>('A');
  // const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [gameStats, setGameStats] = useState<any>({});
  const [userLetterProgress, setUserLetterProgress] = useState<{[letter: string]: {learned: number, total: number}}>({});
  const [playedWordsInSession, setPlayedWordsInSession] = useState<Set<string>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null);
  const [showSpellingWord, setShowSpellingWord] = useState<boolean>(true);
  const spellingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [questionsAnswered, setQuestionsAnswered] = useState<number>(0);
  const [wordLadderStep, setWordLadderStep] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [recentlyAskedWords, setRecentlyAskedWords] = useState<string[]>([]);
  const [optionMeanings, setOptionMeanings] = useState<{ [word: string]: string }>({});
  const [loadingMeanings, setLoadingMeanings] = useState<boolean>(false);
  const [savedGame, setSavedGame] = useState<{
    gameType: GameType;
    score: number;
    streak: number;
    questionsAnswered: number;
    wordLadderStep: number;
    timestamp: number;
  } | null>(null);

  // Clear saved game
  const clearSavedGame = useCallback(() => {
    const gameKey = user ? `synonymQuest_savedGame_${user.id}` : 'synonymQuest_savedGame';
    localStorage.removeItem(gameKey);
    setSavedGame(null);
  }, [user]);


  // Load user letter progress
  const loadUserLetterProgress = useCallback(async () => {
    if (!user) return;
    
    try {
          const response = await fetch(config.GAME_ENDPOINTS.USER_LETTERS_PROGRESS, {
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`
            }
          });
      
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const progressMap: {[letter: string]: {learned: number, total: number}} = {};
              data.data.forEach((item: any) => {
                progressMap[item.letter] = {
                  learned: item.learnedWords,
                  total: item.totalWords
                };
              });
              setUserLetterProgress(progressMap);
              console.log('📊 User letter progress loaded:', progressMap);
            } else {
              console.warn('⚠️ Letter progress response not successful:', data);
            }
          } else {
            console.warn('⚠️ Failed to load letter progress:', response.status);
          }
    } catch (error) {
      console.error('Error loading user letter progress:', error);
    }
  }, [user]);

  // Load all words and game statistics
  const loadWordsAndStats = useCallback(async () => {
    try {
      let words: Word[] = [];
      let stats: any = {};

      if (user) {
        // User-specific data loading
        const token = authService.getToken();
        const [wordsResponse, statsResponse] = await Promise.all([
          fetch(config.WORD_ENDPOINTS.GET_ALL(2000), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(config.WORD_ENDPOINTS.USER_STATS, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (!wordsResponse.ok) {
          throw new Error(`HTTP error! status: ${wordsResponse.status}`);
        }
        
        if (user && !statsResponse.ok) {
          console.warn('Failed to load user stats:', statsResponse.status);
          // Continue without user stats for now
        }

        const wordsData = await wordsResponse.json();
        let statsData = { data: {} };
        
        if (user && statsResponse.ok) {
          try {
            statsData = await statsResponse.json();
          } catch (error) {
            console.warn('Failed to parse user stats:', error);
          }
        }
        
        words = wordsData.data.data || wordsData.data || [];
        const userStats = statsData.data || {} as any;
        
        // Transform user stats to match frontend expectations
        stats = {
          totalWords: words.length,
          learnedWords: userStats.totalWordsLearned || 0,
          learningProgress: userStats.totalWordsLearned ? Math.round((userStats.totalWordsLearned / words.length) * 100) : 0,
          dailyStreak: userStats.currentStreak || 0,
          gamesPlayed: userStats.totalGamesPlayed || 0
        };
      } else {
        // Anonymous user - fallback to global data
        const response = await fetch(config.WORD_ENDPOINTS.GET_ALL(2000));
      
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
          words = data.data.data || data.data;
          const learnedWords = words.filter((w: Word) => w.correctCount > 0).length;
          stats = {
            totalWords: words.length,
            learnedWords,
            learningProgress: words.length > 0 ? Math.round((learnedWords / words.length) * 100) : 0,
            dailyStreak: 0,
            gamesPlayed: 0
          };
        } else {
          throw new Error('Failed to load words');
        }
      }
      
      if (!Array.isArray(words) || words.length === 0) {
        throw new Error('No words found in database');
      }
      
      setAllWords(words);
      setGameStats(stats);
        
        // Calculate available letters for learned words (for review games)
        // For authenticated users, we'll load user-specific progress separately
        // For anonymous users, use global correctCount
        
        // Calculate all available letters (for new words)
        const allAvailableLetters = Array.from(new Set(
          words.map((w: Word) => w.word.charAt(0).toUpperCase())
        )).sort();
        
        // setAvailableLetters(allAvailableLetters); // Show all letters for new words
        
        // Auto-select first available letter if current selection has no words
        if (allAvailableLetters.length > 0 && !allAvailableLetters.includes(selectedLetter)) {
          setSelectedLetter(allAvailableLetters[0]);
        }
        
        // Clear any previous errors
        setError(null);
    } catch (error) {
      console.error('Error loading words:', error);
      setError('Failed to load words from database. Please check if the backend server is running on port 3001.');
    } finally {
      setInitialLoading(false);
    }
  }, [selectedLetter, user]);

  // Load saved game from localStorage
  const loadSavedGame = useCallback(() => {
    try {
      const gameKey = user ? `synonymQuest_savedGame_${user.id}` : 'synonymQuest_savedGame';
      const saved = localStorage.getItem(gameKey);
      if (saved) {
        const gameState = JSON.parse(saved);
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        if (now - gameState.timestamp < oneDay) {
          setSavedGame(gameState);
        } else {
          localStorage.removeItem(gameKey);
        }
      }
    } catch (error) {
      console.error('Error loading saved game:', error);
      const gameKey = user ? `synonymQuest_savedGame_${user.id}` : 'synonymQuest_savedGame';
      localStorage.removeItem(gameKey);
    }
  }, [user]);

  // Load all words and game statistics
  useEffect(() => {
    loadWordsAndStats();
    loadSavedGame();
    loadUserLetterProgress();
    
    // Cleanup function for component unmount
    return () => {
      // Clear any ongoing timers or async operations
      setCurrentGame(null);
      setCurrentQuestion(null);
      setGameStarted(false);
      setTimeLeft(null);
      setLoading(false);
      setError(null);
    };
  }, [loadWordsAndStats, loadSavedGame, loadUserLetterProgress]);

  // Define endGame function before using it in useEffect
  const endGame = useCallback(() => {
    // Clear saved game when ending
    clearSavedGame();
    
    // Clear all game state
    setCurrentGame(null);
    setCurrentQuestion(null);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setStreak(0);
    setQuestionsAnswered(0);
    setWordLadderStep(0);
    setGameStarted(false);
    setTimeLeft(null);
    setError(null);
    setLoading(false);
    setRetryCount(0);
    setRecentlyAskedWords([]); // Clear recently asked words
  }, [clearSavedGame]);

  // Save game state to localStorage
  const saveGameState = useCallback(() => {
    if (currentGame && gameStarted) {
      const gameState = {
        gameType: currentGame,
        score,
        streak,
        questionsAnswered,
        wordLadderStep,
        timestamp: Date.now()
      };
      const gameKey = user ? `synonymQuest_savedGame_${user.id}` : 'synonymQuest_savedGame';
      localStorage.setItem(gameKey, JSON.stringify(gameState));
      setSavedGame(gameState);
    }
  }, [currentGame, gameStarted, score, streak, questionsAnswered, wordLadderStep, user]);

  // Load saved game from localStorage

  // Resume saved game
  const resumeGame = useCallback(async () => {
    if (savedGame) {
      setCurrentGame(savedGame.gameType);
      setScore(savedGame.score);
      setStreak(savedGame.streak);
      setQuestionsAnswered(savedGame.questionsAnswered);
      setWordLadderStep(savedGame.wordLadderStep);
      setGameStarted(true);
      setSavedGame(null); // Clear saved game as we're resuming
      
      // Set timer for time-based games
      if (savedGame.gameType === 'speed-round') {
        setTimeLeft(60);
      } else if (savedGame.gameType === 'daily-quest') {
        setTimeLeft(300);
      } else {
        setTimeLeft(null);
      }
      
      // Load the first question will be handled by the effect that watches for game state changes
    }
  }, [savedGame]);

  // Timer for time-based games
  useEffect(() => {
    let timer: number; // Use number instead of NodeJS.Timeout for browser compatibility
    
    if (timeLeft !== null && timeLeft > 0 && gameStarted) {
      timer = window.setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && gameStarted) {
      // Time's up! End the game automatically
      console.log('⏰ Time\'s up! Ending game automatically');
      endGame();
    }
    
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [timeLeft, gameStarted, endGame]);

  // Save game state when it changes
  useEffect(() => {
    if (currentGame && gameStarted) {
      saveGameState();
    }
  }, [currentGame, gameStarted, score, streak, questionsAnswered, wordLadderStep, saveGameState]);

  // Fallback dictionary for common generic words that might be used as options
  const genericWordMeanings: { [key: string]: string } = {
    'happy': 'Feeling or showing pleasure or contentment.',
    'sad': 'Feeling or showing sorrow or unhappiness.',
    'big': 'Of considerable size, extent, or intensity.',
    'small': 'Of a size that is less than normal or usual.',
    'fast': 'Moving or capable of moving at high speed.',
    'slow': 'Moving or operating at a low speed.',
    'good': 'To be desired or approved of; having positive qualities.',
    'bad': 'Of poor quality or a low standard; not good.',
    'hot': 'Having a high degree of heat or a high temperature.',
    'cold': 'Of or at a low or relatively low temperature.',
    'new': 'Not existing before; made, introduced, or discovered recently.',
    'old': 'Having lived for a long time; no longer young.',
    'high': 'Of great vertical extent; situated far above the ground.',
    'low': 'Of less than average height; not high.',
    'left': 'On, toward, or relating to the side of a human body or of a thing that is to the west when the person or thing is facing north.',
    'right': 'On, toward, or relating to the side of a human body or of a thing that is to the east when the person or thing is facing north.'
  };

  // Helper function to find meaning for any option (word or synonym)
  const findMeaningForOption = useCallback((option: string, allWords: Word[]): { word: Word | null; meaning: string } | null => {
    if (!option || option.trim() === '') return null;
    
    const optionLower = option.toLowerCase().trim();
    
    // Skip dummy/generic options that won't have meanings
    if (optionLower.startsWith('option') || optionLower.startsWith('random') || optionLower.startsWith('distractor')) {
      return null;
    }
    
    // First, check if option is a main word (exact match)
    const foundWord = allWords.find((w: Word) => w.word.toLowerCase() === optionLower);
    
    // Only use meaning if it's an exact match (main word), not if it's just a synonym
    // For synonyms, we'll fetch from API to get the correct meaning for that specific word
    if (foundWord && foundWord.meaning) {
      return { word: foundWord, meaning: foundWord.meaning };
    }
    
    // If not found in database, check generic word dictionary
    if (genericWordMeanings[optionLower]) {
      return { word: null, meaning: genericWordMeanings[optionLower] };
    }
    
    return null;
  }, []);

  // Generate multiple choice options for questions
  const generateMultipleChoiceOptions = useCallback((correctWord: Word, allWords: Word[]): string[] => {
    const correctSynonym = correctWord.synonyms[0]?.word || 'correct';
    
    // Performance optimization: only use a sample of words instead of all 1054
    const sampleSize = Math.min(100, allWords.length);
    const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);
    const sampleWords = shuffledWords.slice(0, sampleSize);
    
    // Get all possible incorrect options from sample words
    const allIncorrectOptions = sampleWords
      .filter(w => w.id !== correctWord.id)
      .flatMap(w => w.synonyms.map(s => s.word))
      .filter(s => s.toLowerCase() !== correctSynonym.toLowerCase())
      .filter(s => s.length <= 15); // Prevent UI breaking with very long words
    
    // Remove duplicates and shuffle
    const uniqueIncorrectOptions = Array.from(new Set(allIncorrectOptions))
      .sort(() => Math.random() - 0.5);
    
    // Take 3 incorrect options
    const incorrectOptions = uniqueIncorrectOptions.slice(0, 3);
    
    // If we don't have enough incorrect options, add some generic ones
    if (incorrectOptions.length < 3) {
      const genericOptions = ['happy', 'sad', 'big', 'small', 'fast', 'slow', 'good', 'bad', 'hot', 'cold', 'new', 'old', 'high', 'low', 'left', 'right'];
      const additionalOptions = genericOptions
        .filter(opt => !incorrectOptions.includes(opt) && opt.toLowerCase() !== correctSynonym.toLowerCase())
        .slice(0, 3 - incorrectOptions.length);
      incorrectOptions.push(...additionalOptions);
    }
    
    // Final fallback - if we still don't have enough, create dummy options
    while (incorrectOptions.length < 3) {
      const dummyOption = `option${incorrectOptions.length + 1}`;
      if (!incorrectOptions.includes(dummyOption) && dummyOption !== correctSynonym.toLowerCase()) {
        incorrectOptions.push(dummyOption);
      } else {
        break; // Prevent infinite loop
      }
    }
    
    // Combine correct and incorrect options, ensuring no duplicates
    const allOptions = [correctSynonym];
    const usedOptions = new Set([correctSynonym.toLowerCase()]);
    
    // Add incorrect options, avoiding duplicates
    for (const option of incorrectOptions.slice(0, 3)) {
      if (!usedOptions.has(option.toLowerCase())) {
        allOptions.push(option);
        usedOptions.add(option.toLowerCase());
      }
    }
    
    // Ensure we have at least 2 options (correct + 1 incorrect)
    if (allOptions.length < 2) {
      allOptions.push('incorrect');
    }
    
    // Shuffle the options
    return allOptions.sort(() => Math.random() - 0.5);
  }, []);

  // Filter words based on game type
  const getFilteredWords = useCallback((gameType: GameType): Word[] => {
    let filteredWords = [...allWords];
    
    switch (gameType) {
      case 'new-letter':
        // New words starting with selected letter (never answered correctly)
        if (user) {
          // For authenticated users, we need to check user-specific progress
          // Since we don't have user-specific word progress loaded, we'll use all words for the letter
          // and let the backend handle the filtering
          filteredWords = allWords.filter((w: Word) => 
            w.word.toLowerCase().startsWith(selectedLetter.toLowerCase())
          );
        } else {
          // For anonymous users, use global progress
          filteredWords = allWords.filter((w: Word) => 
            w.word.toLowerCase().startsWith(selectedLetter.toLowerCase()) && w.correctCount === 0
          );
        }
        break;
      case 'old-letter':
        // Review words starting with selected letter (answered correctly before)
        if (user) {
          // For authenticated users, we need to check user-specific progress
          // Since we don't have user-specific word progress loaded, we'll use all words for the letter
          // and let the backend handle the filtering
          filteredWords = allWords.filter((w: Word) => 
            w.word.toLowerCase().startsWith(selectedLetter.toLowerCase())
          );
        } else {
          // For anonymous users, use global progress
          filteredWords = allWords.filter((w: Word) => 
            w.word.toLowerCase().startsWith(selectedLetter.toLowerCase()) && w.correctCount > 0
          );
        }
        break;
      case 'random-new':
        // New words (never answered correctly)
        if (user) {
          // For authenticated users, use all words and let backend filter
          // The backend will filter based on user progress
          filteredWords = allWords;
        } else {
          // For anonymous users, use global progress
          filteredWords = allWords.filter((w: Word) => w.correctCount === 0);
        }
        break;
      case 'random-old':
        // Review words (answered correctly before)
        if (user) {
          // For authenticated users, use all words and let backend filter
          // The backend will filter based on user progress
          filteredWords = allWords;
        } else {
          // For anonymous users, use global progress
          filteredWords = allWords.filter((w: Word) => w.correctCount > 0);
        }
        break;
      case 'synonym-match':
      case 'spelling':
      case 'word-ladder':
      case 'daily-quest':
      case 'speed-round':
        // All words for skill and time-based games
        filteredWords = [...allWords];
        break;
      case 'synonym-match-review':
      case 'spelling-review':
      case 'word-ladder-review':
      case 'speed-round-review':
        // Review modes: use all words for now (will be filtered by backend)
        filteredWords = [...allWords];
        break;
      default:
        // All words for unknown game types
        filteredWords = [...allWords];
        break;
    }
    
    return filteredWords;
  }, [allWords, selectedLetter, user]);

  // Load next question for the current game
  const loadNextQuestion = useCallback(async (gameType: GameType) => {
    setLoading(true);
    setShowResult(false);
    setSelectedAnswer('');
    setError(null);
    setShowSpellingWord(true); // Show word initially for spelling games

    try {
      // If we don't have words loaded yet, wait for initial loading to complete
      if (allWords.length === 0) {
        if (initialLoading) {
          // Wait for initial loading to complete
          setError('Still loading words...');
          setLoading(false);
          return;
        } else {
          // Try to reload words
          await loadWordsAndStats();
          // Check the updated state after reload
          const updatedWords = await fetch(config.WORD_ENDPOINTS.GET_ALL(2000))
            .then(res => res.json())
            .then(data => data.success ? (data.data.data || data.data) : [])
            .catch(() => []);
          
          if (!updatedWords || updatedWords.length === 0) {
            setError('Failed to load words. Please try again.');
            setLoading(false);
            return;
          }
          
          // Update local state
          setAllWords(updatedWords);
        }
      }
      
      let filteredWords = getFilteredWords(gameType);
      
      // For authenticated users, get user-specific words from backend
      if (user && (gameType === 'new-letter' || gameType === 'old-letter' || gameType === 'random-new' || gameType === 'random-old')) {
        try {
          let endpoint = '';
          const excludedWords = Array.from(playedWordsInSession).join(',');
          if (gameType === 'new-letter') {
            endpoint = config.GAME_ENDPOINTS.USER_LETTER_NEW(selectedLetter.toLowerCase(), excludedWords);
          } else if (gameType === 'old-letter') {
            endpoint = config.GAME_ENDPOINTS.USER_LETTER_OLD(selectedLetter.toLowerCase(), excludedWords);
          } else if (gameType === 'random-new') {
            endpoint = config.WORD_ENDPOINTS.USER_NEW;
          } else if (gameType === 'random-old') {
            endpoint = config.WORD_ENDPOINTS.USER_LEARNED;
          }
          
          if (endpoint) {
            const response = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${authService.getToken()}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && data.data.length > 0) {
                // Convert backend format to frontend format
                filteredWords = data.data.map((item: any) => ({
                  id: item.word?.id || item.id,
                  word: item.word?.word || item.word,
                  synonyms: item.word?.synonyms || item.synonyms,
                  difficulty: item.word?.difficulty || item.difficulty,
                  correctCount: 0, // Will be handled by user progress
                  incorrectCount: 0
                }));
                console.log(`✅ Loaded ${filteredWords.length} user-specific ${gameType} words`);
              }
            } else {
              console.warn(`Failed to load user-specific words for ${gameType}:`, response.status);
            }
          }
        } catch (error) {
          console.warn(`Error loading user-specific words for ${gameType}:`, error);
        }
      } else if (user && (gameType === 'synonym-match-review' || gameType === 'spelling-review' || gameType === 'word-ladder-review' || gameType === 'speed-round-review')) {
        // For review games, fetch learned words from the original game type
        try {
          const response = await fetch(config.GAME_ENDPOINTS.USER_REVIEW_GAME(gameType), {
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.length > 0) {
              filteredWords = data.data.map((item: any) => ({
                id: item.word?.id || item.id,
                word: item.word?.word || item.word,
                synonyms: item.word?.synonyms || item.synonyms,
                difficulty: item.word?.difficulty || item.difficulty,
                correctCount: 0,
                incorrectCount: 0
              }));
              console.log(`✅ Loaded ${filteredWords.length} user-specific ${gameType} words`);
              console.log(`📝 First few word IDs:`, filteredWords.slice(0, 5).map(w => w.id));
            }
          } else {
            console.warn(`Failed to load user-specific review words for ${gameType}:`, response.status);
          }
        } catch (error) {
          console.warn(`Error loading user-specific review words for ${gameType}:`, error);
        }
      } else if (!user && (gameType === 'new-letter' || gameType === 'old-letter')) {
        // For non-authenticated users, use the public API with exclusion
        try {
          const excludedWords = Array.from(playedWordsInSession).join(',');
          const endpoint = gameType === 'new-letter' 
            ? config.GAME_ENDPOINTS.LETTER_NEW(selectedLetter.toLowerCase(), excludedWords)
            : config.GAME_ENDPOINTS.LETTER_OLD(selectedLetter.toLowerCase(), excludedWords);
          
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.words && data.data.words.length > 0) {
              filteredWords = data.data.words.map((w: any) => ({
                id: w.id,
                word: w.word,
                synonyms: w.synonyms,
                difficulty: w.difficulty,
                correctCount: w.correctCount || 0,
                incorrectCount: w.incorrectCount || 0
              }));
              console.log(`✅ Loaded ${filteredWords.length} public ${gameType} words (excluding: ${excludedWords})`);
            }
          } else {
            console.warn(`Failed to load public words for ${gameType}:`, response.status);
          }
        } catch (error) {
          console.warn(`Error loading public words for ${gameType}:`, error);
        }
      }
      
      if (filteredWords.length === 0) {
        let message = '';
        
        if (gameType.includes('letter')) {
          // For letter games, provide specific guidance based on game type
          if (gameType === 'old-letter') {
            const learnedLetters = Array.from(new Set(
              allWords
                .filter(w => w.correctCount > 0)
                .map(w => w.word.charAt(0).toUpperCase())
            )).sort();
            if (learnedLetters.length > 0) {
              message = `No learned words starting with "${selectedLetter}". Try these letters with learned words: ${learnedLetters.join(', ')}`;
            } else {
              message = `No learned words available yet. Play some games first to learn words, then come back to review them!`;
            }
          } else {
            const availableLetters = Array.from(new Set(allWords.map(w => w.word.charAt(0).toUpperCase()))).sort();
            message = `No new words starting with "${selectedLetter}" available. Available letters: ${availableLetters.slice(0, 10).join(', ')}${availableLetters.length > 10 ? '...' : ''}`;
          }
        } else if (gameType === 'random-new') {
          message = 'No new words available. All words have been learned! 🎉';
        } else if (gameType === 'random-old') {
          message = 'No review words available. Start learning some words first!';
        } else {
          message = `No words available for ${gameType}. Try a different game.`;
        }
        
        setError(message);
        setLoading(false);
        return;
      }

      // Filter out recently asked words and words played in current session (avoid repetition)
      const availableWords = filteredWords.filter(w => 
        !recentlyAskedWords.includes(w.id) && !playedWordsInSession.has(w.id)
      );
      
      let wordsToSelectFrom = availableWords;
      
      // If no words available (all have been played), reset session tracking
      if (availableWords.length === 0) {
        setPlayedWordsInSession(new Set());
        console.log('🔄 All words in this game mode have been played. Resetting session tracking.');
        wordsToSelectFrom = filteredWords;
      }
      
      console.log(`🎮 Game: ${gameType} | Total words: ${filteredWords.length} | Available: ${availableWords.length} | Played in session: ${playedWordsInSession.size}`);
      
      // Select a random word from available words
      const randomIndex = Math.floor(Math.random() * wordsToSelectFrom.length);
      const selectedWord = wordsToSelectFrom[randomIndex];
      
      // Add to recently asked words (keep last 5) and session tracking
      setRecentlyAskedWords((prev: string[]) => {
        const updated = [selectedWord.id, ...prev.filter((id: string) => id !== selectedWord.id)];
        return updated.slice(0, 5); // Keep only last 5
      });
      
      // Add to session tracking for uniqueness within the game
      setPlayedWordsInSession((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.add(selectedWord.id);
        return newSet;
      });
      
      // Validate the selected word has synonyms
      if (!selectedWord.synonyms || selectedWord.synonyms.length === 0) {
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setError(`Selected word has no synonyms. Retrying... (${retryCount + 1}/3)`);
          setTimeout(() => loadNextQuestion(gameType), 1000);
          setLoading(false);
          return;
        } else {
          setError('Unable to find valid words with synonyms. Please try a different game.');
          setRetryCount(0);
          setLoading(false);
          return;
        }
      }
      
      // Validate the first synonym exists and is not empty
      if (!selectedWord.synonyms[0]?.word || selectedWord.synonyms[0].word.trim() === '') {
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setError(`Selected word has invalid synonyms. Retrying... (${retryCount + 1}/3)`);
          setTimeout(() => loadNextQuestion(gameType), 1000);
          setLoading(false);
          return;
        } else {
          setError('Unable to find valid words with synonyms. Please try a different game.');
          setRetryCount(0);
          setLoading(false);
          return;
        }
      }
      
      // Generate multiple choice options
      const options = generateMultipleChoiceOptions(selectedWord, allWords);
      
      // For spelling game, the correct answer is the word itself, not the synonym
      const correctAnswer = gameType === 'spelling' 
        ? selectedWord.word 
        : selectedWord.synonyms[0]?.word || 'correct';
      
      // Validate options
      if (options.length < 2) {
        if (retryCount < 3) {
          setRetryCount(retryCount + 1);
          setError(`Unable to generate enough options. Retrying... (${retryCount + 1}/3)`);
          setTimeout(() => loadNextQuestion(gameType), 1000);
          setLoading(false);
          return;
        } else {
          setError('Unable to generate valid options. Please try a different game.');
          setRetryCount(0);
          setLoading(false);
          return;
        }
      }
      
      // Reset retry count on successful question generation
      setRetryCount(0);
      
      const question: GameQuestion = {
        id: `game_${selectedWord.id}_${Date.now()}`,
        questionWord: selectedWord,
        options,
        correctAnswer,
        difficulty: selectedWord.difficulty,
        gameType: gameType
      };
      
      setCurrentQuestion(question);
      
    } catch (error) {
      console.error('Error loading question:', error);
      setError('Failed to load question. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [allWords, initialLoading, selectedLetter, retryCount, getFilteredWords, generateMultipleChoiceOptions, loadWordsAndStats, recentlyAskedWords, playedWordsInSession, user]);

  // Load first question when game starts
  useEffect(() => {
    if (currentGame && gameStarted && !currentQuestion) {
      // Use setTimeout to avoid calling loadNextQuestion during render
      const timer = setTimeout(() => {
        loadNextQuestion(currentGame);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentGame, gameStarted, currentQuestion, loadNextQuestion, recentlyAskedWords]);

  // Hide spelling word after 3 seconds
  useEffect(() => {
    if (currentGame === 'spelling' && currentQuestion && showSpellingWord) {
      console.log('⏰ Starting 3-second timer to hide spelling word:', currentQuestion.questionWord.word);
      
      // Clear any existing timer first
      if (spellingTimerRef.current) {
        clearTimeout(spellingTimerRef.current);
      }
      
      spellingTimerRef.current = setTimeout(() => {
        console.log('⏰ Hiding spelling word after 3 seconds');
        setShowSpellingWord(false);
        spellingTimerRef.current = null;
      }, 3000);
    }

    // Cleanup function
    return () => {
      if (spellingTimerRef.current) {
        console.log('⏰ Clearing spelling word timer');
        clearTimeout(spellingTimerRef.current);
        spellingTimerRef.current = null;
      }
    };
  }, [currentGame, currentQuestion, showSpellingWord]); // Include all dependencies

  const startGame = async (gameType: GameType) => {
    // Prevent multiple rapid game starts
    if (loading || initialLoading) {
      return;
    }
    
    // Clear any saved game when starting new game
    clearSavedGame();
    
    // Clean up any existing game state
    setCurrentQuestion(null);
    setSelectedAnswer('');
    setShowResult(false);
    setError(null);
    setRetryCount(0); // Reset retry count for new game
    setRecentlyAskedWords([]); // Clear recently asked words
    setPlayedWordsInSession(new Set()); // Clear session tracking for uniqueness
    setShowSpellingWord(true); // Reset spelling word visibility
    
    // Set new game state
    setCurrentGame(gameType);
    setScore(0);
    setStreak(0);
    setQuestionsAnswered(0);
    setWordLadderStep(0); // Initialize word ladder step (0-based, displays as Step 1)
    console.log('🪜 Word Ladder: Game started, initializing step to 0 (displays as Step 1)');
    setGameStarted(true);
    
    // Load the first question first, then start timer
    await loadNextQuestion(gameType);
    
    // Set timer for time-based games only after question is loaded
    if (gameType === 'speed-round') {
      setTimeLeft(60); // 60 seconds for speed round
    } else if (gameType === 'daily-quest') {
      setTimeLeft(300); // 5 minutes for daily quest
    } else {
      setTimeLeft(null);
    }
  };



  const handleAnswer = (answer: string) => {
    try {
      setSelectedAnswer(answer);
      
      if (!currentQuestion) {
        console.error('❌ No current question available');
        setError('No question available. Please try again.');
        return;
      }

      if (!currentQuestion.correctAnswer) {
        console.error('❌ No correct answer available for current question');
        setError('Invalid question. Please try again.');
        return;
      }

      const isCorrect = answer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
      
      // Use functional state updates to avoid race conditions
      setScore((prevScore: number) => {
        let pointsToAdd = 10;
        if (isCorrect && currentGame === 'word-ladder') {
          pointsToAdd = 10 + (streak * 2); // Bonus for climbing higher
        }
        if (isCorrect) {
          return prevScore + pointsToAdd;
        } else if (currentGame === 'word-ladder') {
          return Math.max(0, prevScore - 5); // Can't go below 0
        }
        return prevScore;
      });
      
      setStreak((prevStreak: number) => isCorrect ? prevStreak + 1 : 0);
      
      if (isCorrect) {
        // Word Ladder gets bonus points for climbing and advances step
        if (currentGame === 'word-ladder') {
          setWordLadderStep((prevStep: number) => {
            const newStep = prevStep + 1;
            console.log(`🪜 Word Ladder: Correct answer! Step ${prevStep} → ${newStep} (displays as Step ${newStep + 1})`);
            return newStep;
          });
        }
        // Always increment questions answered for correct answers
        setQuestionsAnswered((prevCount: number) => prevCount + 1);
      } else {
        // For non-word-ladder games, still increment questions answered for wrong answers
        if (currentGame !== 'word-ladder') {
          setQuestionsAnswered((prevCount: number) => prevCount + 1);
        } else {
          console.log(`🪜 Word Ladder: Wrong answer! Staying on step ${wordLadderStep} (display: ${wordLadderStep + 1})`);
        }
      }
      
      setShowResult(true);
      
      // Add word to played words in session to avoid repetition
      setPlayedWordsInSession(prev => new Set([...Array.from(prev), currentQuestion.questionWord.id]));
      
      // Update word progress in database (async, don't wait for it)
      updateWordProgress(currentQuestion.questionWord.id, isCorrect);
    } catch (error) {
      console.error('❌ Error in handleAnswer:', error);
      setError('An error occurred while processing your answer. Please try again.');
    }
  };

  // Fetch meanings for all options when answer is shown
  useEffect(() => {
    if (showResult && currentQuestion && currentQuestion.options) {
      const fetchOptionMeanings = async () => {
        setLoadingMeanings(true);
        const meanings: { [word: string]: string } = {};
        
        // First, try to find meanings from allWords
        for (const option of currentQuestion.options) {
          const meaningData = findMeaningForOption(option, allWords);
          if (meaningData?.meaning) {
            meanings[option] = meaningData.meaning;
          }
        }
        
        // For options without meanings, fetch from API
        const optionsWithoutMeanings = currentQuestion.options.filter(
          option => !meanings[option]
        );
        
        if (optionsWithoutMeanings.length > 0) {
          try {
            console.log(`Fetching meanings for ${optionsWithoutMeanings.length} options:`, optionsWithoutMeanings);
            const meaningPromises = optionsWithoutMeanings.map(async (option) => {
              try {
                const url = config.WORD_ENDPOINTS.GET_OR_GENERATE_MEANING(option);
                console.log(`Fetching meaning for "${option}" from:`, url);
                const response = await fetch(url);
                console.log(`Response for "${option}":`, response.status, response.ok);
                if (response.ok) {
                  const data = await response.json();
                  console.log(`Data for "${option}":`, data);
                  if (data.success && data.data?.meaning) {
                    return { option, meaning: data.data.meaning };
                  } else {
                    console.warn(`No meaning in response for "${option}":`, data);
                  }
                } else {
                  const errorText = await response.text();
                  console.error(`Error response for "${option}":`, response.status, errorText);
                }
              } catch (error) {
                console.error(`Error fetching meaning for "${option}":`, error);
              }
              return null;
            });
            
            const fetchedMeanings = await Promise.all(meaningPromises);
            console.log('Fetched meanings:', fetchedMeanings);
            fetchedMeanings.forEach(result => {
              if (result) {
                meanings[result.option] = result.meaning;
                console.log(`Added meaning for "${result.option}":`, result.meaning);
              }
            });
          } catch (error) {
            console.error('Error fetching option meanings:', error);
          }
        }
        
        console.log('Final meanings object:', meanings);
        
        setOptionMeanings(meanings);
        setLoadingMeanings(false);
      };
      
      fetchOptionMeanings();
    } else if (!showResult) {
      // Clear meanings when starting a new question
      setOptionMeanings({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResult, currentQuestion?.id]);

  const updateWordProgress = async (wordId: string, isCorrect: boolean) => {
    try {
      if (user) {
        // User-specific progress tracking - use the correct endpoint
        const response = await fetch(config.GAME_ENDPOINTS.USER_PROGRESS_UPDATE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authService.getToken()}`
          },
          body: JSON.stringify({
            wordId: wordId,
            gameType: (currentGame || 'unknown').replace('-review', ''), // Remove '-review' suffix for tracking
            isCorrect: isCorrect,
            timeSpent: 0
          })
        });

        if (response.ok) {
          console.log(`✅ User progress updated for ${currentGame}: ${isCorrect ? 'correct' : 'incorrect'}`);
          
          // Reload user stats and letter progress
          console.log('🔄 Reloading user stats and letter progress...');
          const [statsResponse] = await Promise.all([
            fetch(config.WORD_ENDPOINTS.USER_STATS, {
              headers: {
                'Authorization': `Bearer ${authService.getToken()}`
              }
            }),
            loadUserLetterProgress() // Reload letter progress
          ]);
          
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            const userStats = statsData.data || {};
            
            // Transform user stats to match frontend expectations
            const updatedStats = {
              totalWords: allWords.length,
              learnedWords: userStats.totalWordsLearned || 0,
              learningProgress: userStats.totalWordsLearned ? Math.round((userStats.totalWordsLearned / allWords.length) * 100) : 0,
              dailyStreak: userStats.currentStreak || 0,
              gamesPlayed: userStats.totalGamesPlayed || 0
            };
            
            setGameStats(updatedStats);
            console.log('📊 Stats updated for', currentGame, ':', updatedStats);
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Failed to update user progress:', errorData.error || response.statusText);
        }
      } else {
        // Anonymous user - fallback to global progress
        const response = await fetch(config.WORD_ENDPOINTS.WORD_STATS(wordId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isCorrect: isCorrect
          })
        });
        
        if (response.ok) {
          // Update local word state directly instead of reloading all words
          setAllWords((prevWords: Word[]) => {
            const updatedWords = prevWords.map((word: Word) => 
              word.id === wordId 
                ? {
                    ...word,
                    correctCount: isCorrect ? word.correctCount + 1 : word.correctCount,
                    incorrectCount: isCorrect ? word.incorrectCount : word.incorrectCount + 1
                  }
                : word
            );
            
            // Update game stats with the new word counts
            const learnedWords = updatedWords.filter((w: Word) => w.correctCount > 0).length;
            setGameStats((prevStats: any) => ({
              ...prevStats!,
              learnedWords,
              learningProgress: updatedWords.length > 0 ? Math.round((learnedWords / updatedWords.length) * 100) : 0,
            }));
            
            return updatedWords;
          });
          console.log(`✅ Anonymous progress updated: ${isCorrect ? 'correct' : 'incorrect'}`);
        } else {
          console.error('❌ Failed to update word progress:', response.statusText);
        }
      }
    } catch (error) {
      console.error('❌ Error updating word progress:', error);
      // Fallback: just log the action
      console.log(`Word ${wordId} answered ${isCorrect ? 'correctly' : 'incorrectly'} (local only)`);
    }
  };

  const nextQuestion = () => {
    // Allow next question if:
    // 1. No timer (not a time-based game), OR
    // 2. Timer is still running, OR  
    // 3. Game ended due to time but user wants to continue
    if (currentGame && (timeLeft === null || timeLeft > 0 || (!gameStarted && timeLeft === 0))) {
      loadNextQuestion(currentGame);
    }
  };


  const renderGameSelection = () => {
    if (initialLoading) {
      return (
        <div className="game-selection">
          <h2>🎮 Choose Your Learning Adventure</h2>
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading vocabulary database...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="game-selection">
        <h2>🎮 Choose Your Learning Adventure</h2>
      
      {gameStats && (
        <div className="game-stats">
          <div className="stat">
            <span className="stat-number">{gameStats.learnedWords}</span>
            <span className="stat-label">Words Learned</span>
          </div>
          <div className="stat">
            <span className="stat-number">{gameStats.learningProgress}%</span>
            <span className="stat-label">Progress</span>
          </div>
          <div className="stat">
            <span className="stat-number">{gameStats.totalWords}</span>
            <span className="stat-label">Total Words</span>
          </div>
        </div>
      )}

      {savedGame && (
        <div className="resume-game-section">
          <div className="resume-game-card">
            <h3>🔄 Continue Your Game</h3>
            <div className="saved-game-info">
              <span className="game-type">{getGameTitle(savedGame.gameType)}</span>
              <div className="saved-stats">
                <span>Score: {savedGame.score}</span>
                <span>Streak: {savedGame.streak}</span>
                {savedGame.gameType === 'word-ladder' ? (
                  <span>Step: {Math.max(1, savedGame.wordLadderStep + 1)}</span>
                ) : (
                  <span>Questions: {savedGame.questionsAnswered}</span>
                )}
              </div>
              <span className="saved-time">
                Saved {new Date(savedGame.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="resume-buttons">
              <button className="resume-button" onClick={resumeGame}>
                ▶️ Resume Game
              </button>
              <button className="discard-button" onClick={clearSavedGame}>
                🗑️ Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="games-grid">
        {/* Letter-wise Games */}
        <div className="game-category">
          <h3>📚 Letter-wise Learning</h3>
          <div className="letter-selector">
            <label>Choose Letter:</label>
            <select value={selectedLetter} onChange={(e) => setSelectedLetter(e.target.value)}>
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => {
                // For authenticated users, check user-specific progress
                // For anonymous users, check global correctCount
                let hasNewWords = false;
                let hasLearnedWords = false;
                
                if (user) {
                  // Use user-specific progress
                  const letterProgress = userLetterProgress[letter];
                  hasNewWords = letterProgress ? letterProgress.total > letterProgress.learned : false;
                  hasLearnedWords = letterProgress ? letterProgress.learned > 0 : false;
                } else {
                  // Use global progress for anonymous users
                  hasNewWords = allWords.some((w: Word) => w.word.charAt(0).toUpperCase() === letter && w.correctCount === 0);
                  hasLearnedWords = allWords.some((w: Word) => w.word.charAt(0).toUpperCase() === letter && w.correctCount > 0);
                }
                
                return (
                  <option key={letter} value={letter}>
                    {letter}{hasNewWords ? ' 🆕' : ''}{hasLearnedWords ? ' ✓' : ''}
                  </option>
                );
              })}
            </select>
            <div className="available-letters">
              <small>
                🆕 = New words available | ✓ = Learned words available
              </small>
            </div>
          </div>
          <button 
            className="game-button new-letter"
            onClick={() => startGame('new-letter')}
          >
            🆕 New {selectedLetter} Words
          </button>
          <button 
            className={`game-button old-letter ${(() => {
              if (user) {
                const letterProgress = userLetterProgress[selectedLetter];
                return !letterProgress || letterProgress.learned === 0 ? 'disabled' : '';
              } else {
                return !allWords.some((w: Word) => w.word.charAt(0).toUpperCase() === selectedLetter && w.correctCount > 0) ? 'disabled' : '';
              }
            })()}`}
            onClick={() => startGame('old-letter')}
            disabled={(() => {
              if (user) {
                const letterProgress = userLetterProgress[selectedLetter];
                return !letterProgress || letterProgress.learned === 0;
              } else {
                return !allWords.some((w: Word) => w.word.charAt(0).toUpperCase() === selectedLetter && w.correctCount > 0);
              }
            })()}
          >
            🔄 Review {selectedLetter} Words
            {(() => {
              if (user) {
                const letterProgress = userLetterProgress[selectedLetter];
                return (!letterProgress || letterProgress.learned === 0) && <span className="no-words"> (No learned words)</span>;
              } else {
                return !allWords.some((w: Word) => w.word.charAt(0).toUpperCase() === selectedLetter && w.correctCount > 0) && <span className="no-words"> (No learned words)</span>;
              }
            })()}
          </button>
        </div>

        {/* Random Games */}
        <div className="game-category">
          <h3>🎲 Random Learning</h3>
          <button 
            className="game-button random-new"
            onClick={() => startGame('random-new')}
          >
            🆕 Random New Words
          </button>
          <button 
            className="game-button random-old"
            onClick={() => startGame('random-old')}
          >
            📖 Random Review
          </button>
        </div>

        {/* Skill Games */}
        <div className="game-category">
          <h3>🎯 Skill Games</h3>
          <button 
            className="game-button synonym-match"
            onClick={() => startGame('synonym-match')}
          >
            🎯 Synonym Match
          </button>
          <button 
            className="game-button synonym-match-review"
            onClick={() => startGame('synonym-match-review')}
          >
            📖 Review Synonym Match
          </button>
          <button 
            className="game-button spelling"
            onClick={() => startGame('spelling')}
          >
            ✏️ Spelling Challenge
          </button>
          <button 
            className="game-button spelling-review"
            onClick={() => startGame('spelling-review')}
          >
            📖 Review Spelling
          </button>
          <button 
            className="game-button word-ladder"
            onClick={() => startGame('word-ladder')}
          >
            🪜 Word Ladder
          </button>
          <button 
            className="game-button word-ladder-review"
            onClick={() => startGame('word-ladder-review')}
          >
            📖 Review Word Ladder
          </button>
        </div>

        {/* Time Games */}
        <div className="game-category">
          <h3>⏰ Time Games</h3>
          <button 
            className="game-button daily-quest"
            onClick={() => startGame('daily-quest')}
          >
            📅 Daily Quest (5min)
          </button>
          <button 
            className="game-button speed-round"
            onClick={() => startGame('speed-round')}
          >
            ⚡ Speed Round (1min)
          </button>
          <button 
            className="game-button speed-round-review"
            onClick={() => startGame('speed-round-review')}
          >
            📖 Review Speed Round
          </button>
        </div>
      </div>
    </div>
    );
  };

  const renderGame = () => {
    if (!currentGame || !currentQuestion) return null;

    return (
      <div className="game-container">
        <div className="game-header">
          <div className="game-header-top">
            <button className="home-button" onClick={endGame}>
              🏠 Home
            </button>
            <h2>{getGameTitle(currentGame)}</h2>
            <button className="end-game-button" onClick={endGame}>
              End Game
            </button>
          </div>
          <div className="game-stats-inline">
            <span>Score: {score}</span>
            <span>Streak: {streak}</span>
            {(currentGame === 'word-ladder' || currentGame === 'word-ladder-review') ? (
              <span>Step: {Math.max(1, wordLadderStep + 1)}</span>
            ) : (
              <span>Questions: {questionsAnswered}</span>
            )}
            {timeLeft !== null && (
              <span className={`timer ${timeLeft <= 10 ? 'urgent' : ''}`}>
                ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Loading question...</p>
          </div>
        ) : error ? (
          <div className="error">
            <p>{error}</p>
            <button 
              className="retry-button" 
              onClick={() => currentGame && loadNextQuestion(currentGame)}
            >
              🔄 Try Again
            </button>
          </div>
        ) : (
          <div className="question-container">
            {currentGame !== 'spelling' && currentGame !== 'spelling-review' && (
              <div className="question-word">
                <h3>{currentQuestion.questionWord.word}</h3>
                <span className={`difficulty ${currentQuestion.difficulty}`}>
                  {currentQuestion.difficulty}
                </span>
              </div>
            )}

            {(currentGame === 'synonym-match' || currentGame === 'synonym-match-review') && (
              <div className="question-text">
                {currentGame === 'synonym-match-review' && <div style={{ marginBottom: '10px', color: '#666' }}>📖 Review Mode</div>}
                What is a synonym for "<strong>{currentQuestion.questionWord.word}</strong>"?
                {currentQuestion.questionWord.meaning && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.95em', color: '#1e40af' }}>
                    <strong>Meaning:</strong> {currentQuestion.questionWord.meaning}
                  </div>
                )}
              </div>
            )}

            {(currentGame === 'new-letter' || currentGame === 'old-letter') && (
              <div className="question-text">
                <div style={{ marginBottom: '10px' }}>
                  {currentGame === 'new-letter' ? '🆕 Learning New Words' : '🔄 Reviewing Learned Words'} - Letter {selectedLetter}
                </div>
                What is a synonym for "<strong>{currentQuestion.questionWord.word}</strong>"?
                {currentQuestion.questionWord.meaning && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.95em', color: '#1e40af' }}>
                    <strong>Meaning:</strong> {currentQuestion.questionWord.meaning}
                  </div>
                )}
              </div>
            )}

            {(currentGame === 'random-new' || currentGame === 'random-old') && (
              <div className="question-text">
                <div style={{ marginBottom: '10px' }}>
                  {currentGame === 'random-new' ? '🆕 Random New Words' : '📚 Random Review'} - Question {questionsAnswered + 1}
                </div>
                What is a synonym for "<strong>{currentQuestion.questionWord.word}</strong>"?
                {currentQuestion.questionWord.meaning && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.95em', color: '#1e40af' }}>
                    <strong>Meaning:</strong> {currentQuestion.questionWord.meaning}
                  </div>
                )}
              </div>
            )}

            {(currentGame === 'word-ladder' || currentGame === 'word-ladder-review') && (
              <div className="question-text">
                <div style={{ marginBottom: '10px' }}>🪜 Word Ladder {currentGame === 'word-ladder-review' ? '(Review)' : ''} - Step {Math.max(1, wordLadderStep + 1)}</div>
                What is a synonym for "<strong>{currentQuestion?.questionWord?.word || 'Loading...'}</strong>"?
                {currentQuestion?.questionWord?.meaning && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.95em', color: '#1e40af' }}>
                    <strong>Meaning:</strong> {currentQuestion.questionWord.meaning}
                  </div>
                )}
                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                  Correct answers climb the ladder! Wrong answers keep you on the same step.
                </div>
              </div>
            )}

            {(currentGame === 'daily-quest' || currentGame === 'speed-round') && (
              <div className="question-text">
                <div style={{ marginBottom: '10px' }}>
                  {currentGame === 'daily-quest' ? '📅 Daily Quest' : '⚡ Speed Round'} - Question {questionsAnswered + 1}
                </div>
                What is a synonym for "<strong>{currentQuestion.questionWord.word}</strong>"?
                {currentQuestion.questionWord.meaning && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '8px', fontSize: '0.95em', color: '#1e40af' }}>
                    <strong>Meaning:</strong> {currentQuestion.questionWord.meaning}
                  </div>
                )}
                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                  {currentGame === 'daily-quest' ? 'Answer as many as possible in 5 minutes!' : 'Answer as many as possible in 1 minute!'}
                </div>
              </div>
            )}

            {(currentGame === 'spelling' || currentGame === 'spelling-review') && (
              <div className="question-text">
                <div style={{ marginBottom: '20px' }}>
                  {showSpellingWord ? (
                    <div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px', color: '#2d3748' }}>
                        {currentQuestion.questionWord.word}
                      </div>
                      <span className={`difficulty ${currentQuestion.difficulty}`} style={{ marginBottom: '10px', display: 'block' }}>
                        {currentQuestion.difficulty}
                      </span>
                      <div style={{ fontSize: '1.2rem', color: '#666' }}>
                        Spell the word that means: <strong>{currentQuestion.questionWord.synonyms[0]?.word}</strong>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#999', marginTop: '5px' }}>
                        (Word will be hidden in 3 seconds...)
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`difficulty ${currentQuestion.difficulty}`} style={{ marginBottom: '10px', display: 'block' }}>
                        {currentQuestion.difficulty}
                      </span>
                      <div style={{ fontSize: '1.2rem', color: '#666' }}>
                        Spell the word that means: <strong>{currentQuestion.questionWord.synonyms[0]?.word}</strong>
                      </div>
                      <div style={{ marginTop: '10px', fontSize: '1rem', color: '#999' }}>
                        (Word hidden - type from memory!)
                      </div>
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type the word here..."
                  className="spelling-input"
                />
              </div>
            )}

            {(currentGame === 'synonym-match' || currentGame === 'synonym-match-review' || currentGame.includes('letter') || currentGame.includes('random') || currentGame === 'daily-quest' || currentGame === 'speed-round' || currentGame === 'speed-round-review' || currentGame === 'word-ladder' || currentGame === 'word-ladder-review') && (
              <div className="options">
                {currentQuestion.options.map((option: string, index: number) => {
                  return (
                    <button
                      key={index}
                      className={`option-button ${selectedAnswer === option ? 'selected' : ''}`}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      aria-label={`Option ${index + 1}: ${option}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!showResult) {
                            handleAnswer(option);
                          }
                        }
                      }}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {(currentGame === 'spelling' || currentGame === 'spelling-review') && (
              <button 
                className="submit-button"
                onClick={() => handleAnswer(selectedAnswer)}
                disabled={!selectedAnswer || showResult}
              >
                Check Spelling
              </button>
            )}

            {showResult && (
              <div className="result">
                <div className={`result-message ${selectedAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase() ? 'correct' : 'incorrect'}`}>
                  {selectedAnswer.toLowerCase() === currentQuestion.correctAnswer.toLowerCase() ? 
                    '🎉 Correct! Well done!' : 
                    `❌ Incorrect. The right answer is "${currentQuestion.correctAnswer}"`
                  }
                </div>
                
                {/* Show meanings for all options after answer is selected */}
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: '1em', fontWeight: 'bold', marginBottom: '12px', color: '#1e40af' }}>
                    📚 Meanings of all options:
                  </div>
                  {loadingMeanings && (
                    <div style={{ padding: '10px', textAlign: 'center', color: '#6b7280' }}>
                      Loading meanings...
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {currentQuestion.options.map((option: string, index: number) => {
                      const meaning = optionMeanings[option];
                      const isCorrect = option.toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
                      const isSelected = option.toLowerCase() === selectedAnswer.toLowerCase();
                      
                      return (
                        <div 
                          key={index} 
                          style={{ 
                            padding: '10px', 
                            backgroundColor: isCorrect ? '#dcfce7' : isSelected ? '#fee2e2' : '#ffffff',
                            borderRadius: '6px', 
                            border: isCorrect ? '2px solid #16a34a' : isSelected ? '2px solid #ef4444' : '1px solid #e5e7eb',
                            fontSize: '0.9em'
                          }}
                        >
                          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: isCorrect ? '#16a34a' : isSelected ? '#ef4444' : '#374151' }}>
                            {option} {isCorrect && '✓ (Correct Answer)'} {isSelected && !isCorrect && '✗ (Your Answer)'}
                          </div>
                          {meaning ? (
                            <div style={{ color: '#4b5563' }}>
                              {meaning}
                            </div>
                          ) : loadingMeanings ? (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                              Loading meaning...
                            </div>
                          ) : (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.85em' }}>
                              Generating meaning... (this may take a moment)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <button className="next-button" onClick={nextQuestion} style={{ marginTop: '15px' }}>
                  Next Question
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getGameTitle = (gameType: GameType): string => {
    const titles = {
      'new-letter': `New ${selectedLetter} Words`,
      'old-letter': `Review ${selectedLetter} Words`,
      'random-new': 'Random New Words',
      'random-old': 'Random Review',
      'synonym-match': 'Synonym Match',
      'synonym-match-review': 'Review Synonym Match',
      'spelling': 'Spelling Challenge',
      'spelling-review': 'Review Spelling',
      'word-ladder': 'Word Ladder',
      'word-ladder-review': 'Review Word Ladder',
      'daily-quest': 'Daily Quest',
      'speed-round': 'Speed Round',
      'speed-round-review': 'Review Speed Round'
    };
    return titles[gameType] || 'Game';
  };

  return (
    <div className="games-app">
      {currentGame ? renderGame() : renderGameSelection()}
    </div>
  );
};

export default Games;