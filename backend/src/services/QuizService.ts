import { QuizSessionModel } from '../models/QuizSession';
import { wordService } from './WordService';
import { openAIService } from './OpenAIService';
import { 
  QuizSession, 
  QuizResult, 
  AnswerFeedback, 
  GameSettings,
  Word,
  QuizAnswer
} from '../types';

export class QuizService {
  /**
   * Start a new quiz session
   */
  async startQuiz(settings: GameSettings): Promise<QuizSession> {
    try {
      // Get random words based on settings
      const words = await wordService.getRandomWords(
        settings.quizLength,
        settings.difficulty === 'mixed' ? undefined : settings.difficulty,
        settings.categories?.[0] // For simplicity, use first category
      );

      if (words.length === 0) {
        throw new Error('No words available for quiz');
      }

      // Create quiz session
      const session = await QuizSessionModel.create({
        words: words.map(word => word.id),
        currentIndex: 0,
        score: 0,
        totalQuestions: words.length,
        answers: [],
      });

      return session.toJSON() as QuizSession;
    } catch (error) {
      console.error('Error starting quiz:', error);
      throw error;
    }
  }

  /**
   * Get current quiz question
   */
  async getCurrentQuestion(sessionId: string): Promise<{
    word: Word;
    questionNumber: number;
    totalQuestions: number;
    hintsUsed: number;
  } | null> {
    try {
      const session = await QuizSessionModel.findByPk(sessionId);
      if (!session) {
        return null;
      }

      if (session.currentIndex >= session.words.length) {
        return null; // Quiz completed
      }

      const currentWordId = session.words[session.currentIndex];
      const word = await wordService.getWordById(currentWordId);
      
      if (!word) {
        throw new Error('Word not found');
      }

      // Get hints used for current question
      const currentAnswer = session.answers.find(
        answer => answer.wordId === currentWordId
      );
      const hintsUsed = currentAnswer?.hintsUsed || 0;

      return {
        word,
        questionNumber: session.currentIndex + 1,
        totalQuestions: session.totalQuestions,
        hintsUsed,
      };
    } catch (error) {
      console.error('Error getting current question:', error);
      throw error;
    }
  }

  /**
   * Submit answer for current question
   */
  async submitAnswer(
    sessionId: string,
    userAnswer: string[],
    useAIValidation: boolean = true
  ): Promise<QuizResult> {
    try {
      const session = await QuizSessionModel.findByPk(sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      if (session.currentIndex >= session.words.length) {
        throw new Error('Quiz already completed');
      }

      const currentWordId = session.words[session.currentIndex];
      const word = await wordService.getWordById(currentWordId);
      
      if (!word) {
        throw new Error('Word not found');
      }

      // Check if answer already exists (for re-submission)
      const existingAnswerIndex = session.answers.findIndex(
        answer => answer.wordId === currentWordId
      );

      let isCorrect: boolean;
      let feedback: AnswerFeedback[];
      let hintsUsed = 0;

      if (existingAnswerIndex >= 0) {
        hintsUsed = session.answers[existingAnswerIndex].hintsUsed;
      }

      if (useAIValidation) {
        // Use AI for validation - convert array to string
        const userAnswerString = Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer;
        const aiValidation = await openAIService.validateAnswer({
          word: word.word,
          userAnswer: userAnswerString,
          correctSynonyms: word.synonyms,
        });
        
        isCorrect = aiValidation.isValid;
        feedback = this.generateFeedbackFromAI(
          userAnswer,
          word.synonyms,
          aiValidation
        );
      } else {
        // Use simple string matching
        const result = this.validateAnswerSimple(userAnswer, word.synonyms);
        isCorrect = result.isCorrect;
        feedback = result.feedback;
      }

      // Calculate score
      const baseScore = isCorrect ? 10 : 0;
      const hintPenalty = hintsUsed * 2;
      const score = Math.max(0, baseScore - hintPenalty);

      // Create answer object
      const answer = {
        wordId: currentWordId,
        userAnswer,
        correctSynonyms: word.synonyms,
        isCorrect,
        timestamp: new Date(),
        hintsUsed,
      };

      // Update session
      const updatedAnswers = [...session.answers];
      if (existingAnswerIndex >= 0) {
        updatedAnswers[existingAnswerIndex] = answer;
      } else {
        updatedAnswers.push(answer);
      }

      const newScore = session.score + score;
      await session.update({
        answers: updatedAnswers,
        score: newScore,
      });

      // Update word statistics
      await wordService.updateWordStats(currentWordId, isCorrect);

      return {
        wordId: currentWordId,
        userAnswer,
        correctSynonyms: word.synonyms,
        feedback,
        score,
        hintsUsed,
        totalQuestions: session.words.length,
        correctAnswers: session.answers.filter(a => a.isCorrect).length,
        incorrectAnswers: session.answers.filter(a => !a.isCorrect).length,
        streak: this.calculateStreak(session.answers),
        timeSpent: Date.now() - session.startTime.getTime(),
        achievements: [],
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  /**
   * Move to next question
   */
  async nextQuestion(sessionId: string): Promise<{
    hasNext: boolean;
    isComplete: boolean;
    finalScore?: number;
  }> {
    try {
      const session = await QuizSessionModel.findByPk(sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      const nextIndex = session.currentIndex + 1;
      const isComplete = nextIndex >= session.words.length;

      if (isComplete) {
        // Quiz completed
        await session.update({
          currentIndex: nextIndex,
          endTime: new Date(),
        });

        return {
          hasNext: false,
          isComplete: true,
          finalScore: session.score,
        };
      } else {
        // Move to next question
        await session.update({
          currentIndex: nextIndex,
        });

        return {
          hasNext: true,
          isComplete: false,
        };
      }
    } catch (error) {
      console.error('Error moving to next question:', error);
      throw error;
    }
  }

  /**
   * Get quiz session details
   */
  async getQuizSession(sessionId: string): Promise<QuizSession | null> {
    try {
      const session = await QuizSessionModel.findByPk(sessionId);
      return session ? (session.toJSON() as QuizSession) : null;
    } catch (error) {
      console.error('Error getting quiz session:', error);
      throw error;
    }
  }

  /**
   * Get quiz results summary
   */
  async getQuizResults(sessionId: string): Promise<{
    session: QuizSession;
    words: Word[];
    results: QuizResult[];
    summary: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      totalScore: number;
      hintsUsed: number;
      timeSpent?: number;
    };
  } | null> {
    try {
      const session = await this.getQuizSession(sessionId);
      if (!session) {
        return null;
      }

      // Get all words for the quiz
      const words = await Promise.all(
        session.words.map(wordId => wordService.getWordById(wordId))
      );
      const validWords = words.filter(word => word !== null) as Word[];

      // Build results
      const results: QuizResult[] = session.answers.map(answer => {
        const word = validWords.find(w => w.id === answer.wordId);
        return {
          wordId: answer.wordId,
          userAnswer: answer.userAnswer,
          correctSynonyms: answer.correctSynonyms,
          feedback: this.generateSimpleFeedback(answer.userAnswer, answer.correctSynonyms),
          score: answer.isCorrect ? 10 : 0,
          hintsUsed: answer.hintsUsed,
          totalQuestions: session.words.length,
          correctAnswers: session.answers.filter(a => a.isCorrect).length,
          incorrectAnswers: session.answers.filter(a => !a.isCorrect).length,
          streak: this.calculateStreak(session.answers),
          timeSpent: Date.now() - session.startTime.getTime(),
          achievements: [],
        };
      });

      // Calculate summary
      const correctAnswers = results.filter(r => r.feedback.every(f => f.status === 'correct')).length;
      const totalHints = results.reduce((sum, r) => sum + r.hintsUsed, 0);
      const accuracy = session.totalQuestions > 0 ? (correctAnswers / session.totalQuestions) * 100 : 0;
      
      let timeSpent: number | undefined;
      if (session.endTime) {
        timeSpent = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
      }

      return {
        session,
        words: validWords,
        results,
        summary: {
          totalQuestions: session.totalQuestions,
          correctAnswers,
          accuracy: Math.round(accuracy * 100) / 100,
          totalScore: session.score,
          hintsUsed: totalHints,
          timeSpent,
        },
      };
    } catch (error) {
      console.error('Error getting quiz results:', error);
      throw error;
    }
  }

  /**
   * Get hint for current question
   */
  async getHint(sessionId: string): Promise<string> {
    try {
      const session = await QuizSessionModel.findByPk(sessionId);
      if (!session) {
        throw new Error('Quiz session not found');
      }

      const currentWordId = session.words[session.currentIndex];
      const word = await wordService.getWordById(currentWordId);
      
      if (!word) {
        throw new Error('Word not found');
      }

      // Get already revealed synonyms
      const currentAnswer = session.answers.find(
        answer => answer.wordId === currentWordId
      );
      const revealedSynonyms = currentAnswer?.userAnswer || [];

      // Find missing synonyms
      const missingSynonyms = word.synonyms.filter(
        synonym => !revealedSynonyms.some(rev => 
          rev.toLowerCase().trim() === synonym.toLowerCase().trim()
        )
      );

      if (missingSynonyms.length === 0) {
        return 'You have found all synonyms!';
      }

      // Generate hint using AI
      const hint = await openAIService.generateHint(word.word, missingSynonyms);

      // Update hints used count
      const answerIndex = session.answers.findIndex(
        answer => answer.wordId === currentWordId
      );

      if (answerIndex >= 0) {
        const updatedAnswers = [...session.answers];
        updatedAnswers[answerIndex].hintsUsed += 1;
        await session.update({ answers: updatedAnswers });
      } else {
        // Create new answer entry for hint tracking
        const newAnswer = {
          wordId: currentWordId,
          userAnswer: revealedSynonyms,
          correctSynonyms: word.synonyms,
          isCorrect: false,
          timestamp: new Date(),
          hintsUsed: 1,
        };
        await session.update({ answers: [...session.answers, newAnswer] });
      }

      return hint;
    } catch (error) {
      console.error('Error getting hint:', error);
      throw error;
    }
  }

  /**
   * Simple answer validation (fallback)
   */
  private validateAnswerSimple(userAnswer: string[], correctSynonyms: string[]): {
    isCorrect: boolean;
    feedback: AnswerFeedback[];
  } {
    const feedback: AnswerFeedback[] = [];
    
    // Check user answers
    userAnswer.forEach(userSynonym => {
      const isCorrect = correctSynonyms.some(correct => 
        correct.toLowerCase().trim() === userSynonym.toLowerCase().trim()
      );
      feedback.push({
        isCorrect: isCorrect,
        correctAnswers: correctSynonyms,
        userAnswer: userSynonym,
        synonym: userSynonym,
        status: isCorrect ? 'correct' : 'incorrect',
        userProvided: true,
      });
    });

    // Check missing synonyms
    correctSynonyms.forEach(correctSynonym => {
      const isProvided = userAnswer.some(user => 
        user.toLowerCase().trim() === correctSynonym.toLowerCase().trim()
      );
      if (!isProvided) {
        feedback.push({
        isCorrect: false,
        correctAnswers: correctSynonyms,
        userAnswer: '',
        synonym: correctSynonym,
        status: 'missing',
        userProvided: false,
        });
      }
    });

    const correctCount = feedback.filter(f => f.status === 'correct').length;
    const isCorrect = correctCount === correctSynonyms.length && userAnswer.length === correctSynonyms.length;

    return { isCorrect, feedback };
  }

  /**
   * Generate feedback from AI validation
   */
  private generateFeedbackFromAI(
    userAnswer: string[],
    correctSynonyms: string[],
    aiValidation: any
  ): AnswerFeedback[] {
    const feedback: AnswerFeedback[] = [];
    
    // Check user answers
    userAnswer.forEach(userSynonym => {
      const isCorrect = correctSynonyms.some(correct => 
        correct.toLowerCase().trim() === userSynonym.toLowerCase().trim()
      );
      feedback.push({
        isCorrect: isCorrect,
        correctAnswers: correctSynonyms,
        userAnswer: userSynonym,
        synonym: userSynonym,
        status: isCorrect ? 'correct' : 'incorrect',
        userProvided: true,
      });
    });

    // Check missing synonyms
    correctSynonyms.forEach(correctSynonym => {
      const isProvided = userAnswer.some(user => 
        user.toLowerCase().trim() === correctSynonym.toLowerCase().trim()
      );
      if (!isProvided) {
        feedback.push({
        isCorrect: false,
        correctAnswers: correctSynonyms,
        userAnswer: '',
        synonym: correctSynonym,
        status: 'missing',
        userProvided: false,
        });
      }
    });

    return feedback;
  }

  /**
   * Generate simple feedback for results
   */
  private generateSimpleFeedback(userAnswer: string[], correctSynonyms: string[]): AnswerFeedback[] {
    return this.validateAnswerSimple(userAnswer, correctSynonyms).feedback;
  }

  /**
   * Delete a quiz session
   */
  async deleteQuizSession(sessionId: string): Promise<boolean> {
    try {
      const deleted = await QuizSessionModel.destroy({
        where: { id: sessionId }
      });
      
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting quiz session:', error);
      throw error;
    }
  }

  /**
   * Calculate current streak from answers
   */
  private calculateStreak(answers: QuizAnswer[]): number {
    let streak = 0;
    for (let i = answers.length - 1; i >= 0; i--) {
      if (answers[i].isCorrect) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }
}

export const quizService = new QuizService();
