import { WordModel } from '../models/Word';
import { GameProgressModel } from '../models/GameProgress';
import { UserProgress } from '../models';
import { DailyQuestModel } from '../models/DailyQuest';
import { Word } from '../types';
import { Op } from 'sequelize';
import { sequelize } from '../config/database';

export interface GameQuestion {
  id: string;
  questionWord: Word;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  gameType: string;
}

export interface GameResult {
  isCorrect: boolean;
  score: number;
  streak: number;
  feedback: string;
  nextQuestion?: GameQuestion;
}

export interface LetterProgress {
  letter: string;
  totalWords: number;
  learnedWords: number;
  progressPercentage: number;
}

export class GameService {
  /**
   * Get progress for a specific letter
   */
  async getLetterProgress(letter: string): Promise<LetterProgress> {
    const totalWords = await WordModel.count({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        }
      }
    });

    const learnedWords = await WordModel.count({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        },
        correctCount: {
          [Op.gt]: 0
        }
      }
    });

    const progressPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

    return {
      letter: letter.toUpperCase(),
      totalWords,
      learnedWords,
      progressPercentage
    };
  }

  /**
   * Get all letters progress
   */
  async getAllLettersProgress(): Promise<LetterProgress[]> {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const progressPromises = letters.map(letter => this.getLetterProgress(letter));
    return Promise.all(progressPromises);
  }

  /**
   * Get new words for a specific letter (not yet learned)
   */
  async getNewWordsForLetter(letter: string, limit: number = 5): Promise<Word[]> {
    const words = await WordModel.findAll({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        },
        correctCount: 0,
        incorrectCount: 0
      },
      order: [
        ['difficulty', 'ASC'], // Easy words first
        ['word', 'ASC']
      ],
      limit
    });

    return words.map(word => word.toJSON() as Word);
  }

  /**
   * Get learned words for a specific letter (for revision)
   */
  async getLearnedWordsForLetter(letter: string, limit: number = 5): Promise<Word[]> {
    const words = await WordModel.findAll({
      where: {
        word: {
          [Op.like]: `${letter.toLowerCase()}%`
        },
        correctCount: {
          [Op.gt]: 0
        }
      },
      order: [
        ['lastReviewed', 'ASC'], // Oldest reviewed first
        ['difficulty', 'ASC']
      ],
      limit
    });

    return words.map(word => word.toJSON() as Word);
  }

  /**
   * Get random new words (not yet learned)
   */
  async getRandomNewWords(limit: number = 10): Promise<Word[]> {
    const words = await WordModel.findAll({
      where: {
        correctCount: 0,
        incorrectCount: 0
      },
      order: [
        ['difficulty', 'ASC'], // Easy words first
        sequelize.random() // Random order
      ],
      limit
    });

    return words.map(word => word.toJSON() as Word);
  }

  /**
   * Get random learned words (for revision)
   */
  async getRandomLearnedWords(limit: number = 10): Promise<Word[]> {
    const words = await WordModel.findAll({
      where: {
        correctCount: {
          [Op.gt]: 0
        }
      },
      order: [
        ['lastReviewed', 'ASC'], // Oldest reviewed first
        sequelize.random() // Random order
      ],
      limit
    });

    return words.map(word => word.toJSON() as Word);
  }

  /**
   * Generate a synonym match question
   */
  async generateSynonymMatchQuestion(): Promise<GameQuestion> {
    // Get a random word
    const words = await WordModel.findAll({
      order: sequelize.random(),
      limit: 10
    });

    if (words.length === 0) {
      throw new Error('No words found');
    }

    // Find a word with exact synonyms
    let word: Word | null = null;
    let exactSynonyms: string[] = [];

    for (const w of words) {
      const wordData = w.toJSON() as Word;
      const synonyms = wordData.synonyms.filter((s: any) => s.type === 'exact');
      if (synonyms.length > 0) {
        word = wordData;
        exactSynonyms = synonyms.map((s: any) => s.word);
        break;
      }
    }

    if (!word || exactSynonyms.length === 0) {
      // Fallback: use any word and create basic synonyms
      word = words[0].toJSON() as Word;
      exactSynonyms = ['similar', 'alike', 'comparable'];
    }

    // Get 3 random distractors from other words
    const otherWords = await WordModel.findAll({
      where: {
        id: {
          [Op.ne]: word.id
        }
      },
      order: sequelize.random(),
      limit: 20
    });

    const distractors: string[] = [];
    for (const otherWord of otherWords) {
      const otherWordData = otherWord.toJSON() as Word;
      for (const synonym of otherWordData.synonyms) {
        if (distractors.length < 3 && !exactSynonyms.includes((synonym as any).word)) {
          distractors.push((synonym as any).word);
        }
      }
      if (distractors.length >= 3) break;
    }

    // Ensure we have 3 distractors
    while (distractors.length < 3) {
      distractors.push(`random${distractors.length + 1}`);
    }

    // Pick one correct answer and create options
    const correctAnswer = exactSynonyms[Math.floor(Math.random() * exactSynonyms.length)];
    const options = [correctAnswer, ...distractors.slice(0, 3)];
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      id: `synonym_${word.id}`,
      questionWord: word,
      options,
      correctAnswer,
      difficulty: word.difficulty,
      gameType: 'synonym_match'
    };
  }

  /**
   * Generate a spelling challenge word
   */
  async generateSpellingChallenge(): Promise<{ word: Word; difficulty: 'easy' | 'medium' | 'hard' }> {
    const words = await WordModel.findAll({
      order: sequelize.random(),
      limit: 1
    });

    if (words.length === 0) {
      throw new Error('No words found for spelling challenge');
    }

    const word = words[0].toJSON() as Word;
    
    // Determine difficulty based on word length and complexity
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (word.word.length > 8 || word.word.includes('-') || word.word.includes(' ')) {
      difficulty = 'hard';
    } else if (word.word.length > 5) {
      difficulty = 'medium';
    }

    return {
      word,
      difficulty
    };
  }

  /**
   * Check spelling answer
   */
  async checkSpellingAnswer(word: string, userAnswer: string): Promise<{
    isCorrect: boolean;
    accuracy: number;
    feedback: string;
  }> {
    const normalizedWord = word.toLowerCase().trim();
    const normalizedAnswer = userAnswer.toLowerCase().trim();
    
    const isExactMatch = normalizedWord === normalizedAnswer;
    
    // Calculate accuracy based on character matching
    let matches = 0;
    const maxLength = Math.max(normalizedWord.length, normalizedAnswer.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (normalizedWord[i] === normalizedAnswer[i]) {
        matches++;
      }
    }
    
    const accuracy = maxLength > 0 ? (matches / maxLength) * 100 : 0;
    
    let feedback = '';
    if (isExactMatch) {
      feedback = 'Perfect! You spelled it correctly!';
    } else if (accuracy >= 80) {
      feedback = 'Almost correct! Just a small mistake.';
    } else if (accuracy >= 60) {
      feedback = 'Good attempt! You got most of it right.';
    } else {
      feedback = 'Not quite right. Keep practicing!';
    }

    return {
      isCorrect: isExactMatch,
      accuracy,
      feedback
    };
  }

  /**
   * Get today's daily quest word
   */
  async getDailyQuestWord(): Promise<{ word: Word; streak: number; isCompletedToday: boolean }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if today's quest exists
    let dailyQuest = await DailyQuestModel.findOne({
      where: { date: today }
    });

    if (!dailyQuest) {
      // Create new daily quest
      const randomWords = await WordModel.findAll({
        order: sequelize.random(),
        limit: 1
      });

      if (randomWords.length === 0) {
        throw new Error('No words available for daily quest');
      }

      const word = randomWords[0];
      
      // Calculate current streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const yesterdayQuest = await DailyQuestModel.findOne({
        where: { date: yesterdayStr }
      });
      
      const streak = yesterdayQuest?.completed ? (yesterdayQuest.streak + 1) : 1;

      dailyQuest = await DailyQuestModel.create({
        date: today,
        wordId: word.id,
        completed: false,
        streak
      });
    }

    const word = await WordModel.findByPk(dailyQuest.wordId);
    if (!word) {
      throw new Error('Daily quest word not found');
    }

    return {
      word: word.toJSON() as Word,
      streak: dailyQuest.streak,
      isCompletedToday: dailyQuest.completed
    };
  }

  /**
   * Complete daily quest
   */
  async completeDailyQuest(): Promise<{ success: boolean; newStreak: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    const dailyQuest = await DailyQuestModel.findOne({
      where: { date: today }
    });

    if (!dailyQuest) {
      throw new Error('No daily quest found for today');
    }

    if (dailyQuest.completed) {
      return {
        success: false,
        newStreak: dailyQuest.streak
      };
    }

    await dailyQuest.update({
      completed: true,
      completedAt: new Date()
    });

    // Update word stats
    const word = await WordModel.findByPk(dailyQuest.wordId);
    if (word) {
      await word.update({
        correctCount: (word.correctCount || 0) + 1,
        lastReviewed: new Date()
      });
    }

    return {
      success: true,
      newStreak: dailyQuest.streak
    };
  }

  /**
   * Start a word ladder game
   */
  async startWordLadder(): Promise<{
    currentWord: Word;
    ladderPosition: number;
    targetPosition: number;
    ladderWords: Word[];
  }> {
    // Start with an easy word
    const startWords = await WordModel.findAll({
      where: { difficulty: 'easy' },
      order: sequelize.random(),
      limit: 1
    });

    if (startWords.length === 0) {
      throw new Error('No easy words found for word ladder');
    }

    const currentWord = startWords[0].toJSON() as Word;
    const targetPosition = 10; // Climb to position 10

    return {
      currentWord,
      ladderPosition: 0,
      targetPosition,
      ladderWords: [currentWord]
    };
  }

  /**
   * Generate speed round questions
   */
  async generateSpeedRoundQuestions(count: number = 20): Promise<GameQuestion[]> {
    const questions: GameQuestion[] = [];
    
    for (let i = 0; i < count; i++) {
      const question = await this.generateSynonymMatchQuestion();
      questions.push(question);
    }

    return questions;
  }

  /**
   * Update word learning progress
   */
  async updateWordProgress(wordId: string, isCorrect: boolean): Promise<void> {
    const word = await WordModel.findByPk(wordId);
    if (!word) {
      throw new Error('Word not found');
    }

    if (isCorrect) {
      await word.update({
        correctCount: (word.correctCount || 0) + 1,
        lastReviewed: new Date()
      });
    } else {
      await word.update({
        incorrectCount: (word.incorrectCount || 0) + 1,
        lastReviewed: new Date()
      });
    }
  }

  /**
   * Get game statistics
   */
  async getGameStatistics(): Promise<{
    totalWords: number;
    learnedWords: number;
    learningProgress: number;
    dailyStreak: number;
    gamesPlayed: number;
  }> {
    const totalWords = await WordModel.count();
    const learnedWords = await WordModel.count({
      where: {
        correctCount: {
          [Op.gt]: 0
        }
      }
    });

    const learningProgress = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

    // Get current daily streak
    const today = new Date().toISOString().split('T')[0];
    const todayQuest = await DailyQuestModel.findOne({
      where: { date: today }
    });
    const dailyStreak = todayQuest?.streak || 0;

    // Get games played (approximate based on game progress)
    const gamesPlayed = await GameProgressModel.count();

    return {
      totalWords,
      learnedWords,
      learningProgress,
      dailyStreak,
      gamesPlayed
    };
  }

  /**
   * Update user's game progress
   */
  async updateUserGameProgress(
    userId: string,
    wordId: string,
    gameType: string,
    isCorrect: boolean,
    timeSpent: number = 0
  ): Promise<void> {
    try {
      await UserProgress.updateProgress(userId, wordId, gameType, isCorrect, timeSpent);
    } catch (error) {
      console.error('Error updating user game progress:', error);
      throw error;
    }
  }

  /**
   * Get user's game statistics
   */
  async getUserGameStatistics(userId: string): Promise<{
    totalWordsLearned: number;
    totalGamesPlayed: number;
    currentStreak: number;
    longestStreak: number;
    averageAccuracy: number;
    favoriteGameType?: string;
    masteryDistribution: { [level: number]: number };
  }> {
    try {
      return await UserProgress.getUserStats(userId);
    } catch (error) {
      console.error('Error getting user game statistics:', error);
      throw error;
    }
  }

  /**
   * Get user's letters progress
   */
  async getUserLettersProgress(userId: string): Promise<LetterProgress[]> {
    try {
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      const letterProgress: LetterProgress[] = [];

      for (const letter of letters) {
        // Get total words for this letter
        const totalWords = await WordModel.count({
          where: {
            word: {
              [Op.like]: `${letter}%`
            }
          }
        });

        // Get learned words for this letter (masteryLevel >= 2)
        const learnedWords = await UserProgress.count({
          where: {
            userId,
            masteryLevel: { [Op.gte]: 2 }
          },
          include: [{
            model: WordModel,
            as: 'word',
            where: {
              word: { [Op.like]: `${letter}%` }
            },
            required: true
          }]
        });

        const progressPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

        letterProgress.push({
          letter: letter.toUpperCase(),
          totalWords,
          learnedWords,
          progressPercentage
        });
      }

      return letterProgress;
    } catch (error) {
      console.error('Error getting user letters progress:', error);
      throw error;
    }
  }

  /**
   * Get user's new words for a specific letter
   * Returns words that are unplayed OR have masteryLevel < 2
   * Handles the case where user has no progress yet for this letter
   */
  async getUserNewWordsForLetter(userId: string, letter: string, limit: number = 10): Promise<any[]> {
    try {
      // Step 1: Get words the user has already tried (with progress)
      const progressWords = await UserProgress.findAll({
        where: {
          userId,
          masteryLevel: { [Op.lt]: 2 }
        },
        include: [{
          model: WordModel,
          as: 'word',
          where: {
            word: { [Op.like]: `${letter.toLowerCase()}%` }
          },
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
      });

      // Step 2: Get ALL words for this letter
      const allWords = await WordModel.findAll({
        where: {
          word: { [Op.like]: `${letter.toLowerCase()}%` }
        },
        order: [['difficulty', 'ASC'], ['word', 'ASC']]
      });

      // Step 3: If we have less than limit from progress, add unplayed words
      const playedWordIds = new Set(progressWords.map(p => p.wordId));
      
      if (progressWords.length < limit) {
        // Get unplayed words (not in UserProgress)
        const unplayedWords = allWords.filter(w => !playedWordIds.has(w.id));
        
        // Add unplayed words to reach the limit
        const needed = limit - progressWords.length;
        const additionalWords = unplayedWords.slice(0, needed);
        
        // Convert unplayed words to same format as progress words
        const additionalProgressFormat = additionalWords.map(word => ({
          id: `temp-${word.id}`,
          userId,
          wordId: word.id,
          gameType: 'new-letter',
          correctCount: 0,
          incorrectCount: 0,
          lastPlayedAt: new Date(),
          masteryLevel: 0,
          streak: 0,
          totalTimeSpent: 0,
          word: word,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        return [...progressWords, ...additionalProgressFormat].slice(0, limit);
      }
      
      // Return only progress words if we have enough
      return progressWords.slice(0, limit);
    } catch (error) {
      console.error('Error getting user new words for letter:', error);
      throw error;
    }
  }

  /**
   * Get user's learned words for a specific letter
   */
  async getUserLearnedWordsForLetter(userId: string, letter: string, limit: number = 10): Promise<any[]> {
    try {
      return await UserProgress.findAll({
        where: {
          userId,
          masteryLevel: { [Op.gte]: 2 }
        },
        include: [{
          model: WordModel,
          as: 'word',
          where: {
            word: { [Op.like]: `${letter.toLowerCase()}%` }
          },
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
        limit
      });
    } catch (error) {
      console.error('Error getting user learned words for letter:', error);
      throw error;
    }
  }

  /**
   * Get user's random new words
   * Returns words that are unplayed OR have masteryLevel < 2
   */
  async getUserRandomNewWords(userId: string, limit: number = 10): Promise<any[]> {
    try {
      // Step 1: Get words the user has already tried (with progress)
      const progressWords = await UserProgress.findAll({
        where: {
          userId,
          masteryLevel: { [Op.lt]: 2 }
        },
        include: [{
          model: WordModel,
          as: 'word',
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
      });

      // Step 2: Get ALL words
      const allWords = await WordModel.findAll({
        order: [['difficulty', 'ASC'], ['word', 'ASC']]
      });

      // Step 3: If we have less than limit from progress, add unplayed words
      const playedWordIds = new Set(progressWords.map(p => p.wordId));
      
      if (progressWords.length < limit) {
        // Get unplayed words (not in UserProgress)
        const unplayedWords = allWords.filter(w => !playedWordIds.has(w.id));
        
        // Shuffle for randomness
        const shuffledUnplayed = unplayedWords.sort(() => Math.random() - 0.5);
        
        // Add unplayed words to reach the limit
        const needed = limit - progressWords.length;
        const additionalWords = shuffledUnplayed.slice(0, needed);
        
        // Convert unplayed words to same format as progress words
        const additionalProgressFormat = additionalWords.map(word => ({
          id: `temp-${word.id}`,
          userId,
          wordId: word.id,
          gameType: 'random-new',
          correctCount: 0,
          incorrectCount: 0,
          lastPlayedAt: new Date(),
          masteryLevel: 0,
          streak: 0,
          totalTimeSpent: 0,
          word: word,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        return [...progressWords, ...additionalProgressFormat].slice(0, limit);
      }
      
      // Return only progress words if we have enough
      return progressWords.slice(0, limit);
    } catch (error) {
      console.error('Error getting user random new words:', error);
      throw error;
    }
  }

  /**
   * Get user's random learned words
   */
  async getUserRandomLearnedWords(userId: string, limit: number = 10): Promise<any[]> {
    try {
      return await UserProgress.findAll({
        where: {
          userId,
          masteryLevel: { [Op.gte]: 2 }
        },
        include: [{
          model: WordModel,
          as: 'word',
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
        limit
      });
    } catch (error) {
      console.error('Error getting user random learned words:', error);
      throw error;
    }
  }

  /**
   * Get user's learned words for a specific game type (for review modes)
   */
  async getUserLearnedWordsForGameType(userId: string, gameType: string, limit: number = 200): Promise<any[]> {
    try {
      // Extract base game type from review game type (e.g., 'synonym-match-review' -> 'synonym-match')
      const baseGameType = gameType.replace('-review', '');
      
      return await UserProgress.findAll({
        where: {
          userId,
          gameType: baseGameType,
          masteryLevel: { [Op.gte]: 2 }
        },
        include: [{
          model: WordModel,
          as: 'word',
          required: true
        }],
        order: [['masteryLevel', 'ASC'], ['lastPlayedAt', 'ASC']],
        limit
      });
    } catch (error) {
      console.error('Error getting user learned words for game type:', error);
      throw error;
    }
  }
}

export const gameService = new GameService();
