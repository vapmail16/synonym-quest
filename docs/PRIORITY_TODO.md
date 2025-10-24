# 🎯 Synonym Quest - Priority TODO List

**Last Updated**: October 10, 2025  
**Current Completion**: 85%

---

## 🔥 CRITICAL PRIORITY (Do First - 1 Week)

### ❗ 1. Fix Speed Round React Crash
**Status**: ❌ NOT FIXED  
**Impact**: Critical - App crashes  
**Effort**: 1-2 days

**Problem**: Timer not being cleaned up properly in useEffect, causing state updates after unmount.

**File to Fix**: `frontend/src/Games.tsx`

**Changes Needed**:
```typescript
// Lines 286-302 - Fix timer useEffect
useEffect(() => {
  let timer: number;
  let isMounted = true; // Add mounted flag
  
  if (timeLeft !== null && timeLeft > 0 && gameStarted && isMounted) {
    timer = window.setTimeout(() => {
      if (isMounted) {
        setTimeLeft(timeLeft - 1);
      }
    }, 1000);
  } else if (timeLeft === 0 && gameStarted && isMounted) {
    setGameStarted(false);
  }
  
  return () => {
    isMounted = false; // Cleanup mounted flag
    if (timer) window.clearTimeout(timer);
  };
}, [timeLeft, gameStarted, endGame]);
```

**Testing**:
- [ ] Start Speed Round game
- [ ] Let timer run for 10 seconds
- [ ] Click "End Game" or "Home" button
- [ ] Verify no crash
- [ ] Verify no console errors

---

### ❗ 2. Add PWA Icons and Update Manifest
**Status**: ⚠️ PARTIAL (manifest exists, icons missing)  
**Impact**: High - Can't install as mobile app  
**Effort**: 1 day

**Files to Create**:
```
frontend/public/icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

**File to Update**: `frontend/public/manifest.json`
```json
{
  "short_name": "Synonym Quest",
  "name": "Synonym Quest - Vocabulary Learning",
  "description": "Master vocabulary with 9 engaging games",
  "icons": [
    {
      "src": "icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3b82f6",
  "background_color": "#ffffff",
  "orientation": "portrait-primary"
}
```

**Icon Design**:
- Use brain emoji 🧠 or custom vocabulary-related icon
- Blue theme (#3b82f6) to match app colors
- Simple, recognizable design

**Testing**:
- [ ] Visit app in Chrome mobile
- [ ] See "Add to Home Screen" prompt
- [ ] Install app
- [ ] Verify icon shows correctly
- [ ] Verify splash screen appears

---

### ❗ 3. Implement Basic Service Worker
**Status**: ❌ NOT IMPLEMENTED  
**Impact**: High - No offline support  
**Effort**: 2-3 days

**File to Create**: `frontend/public/service-worker.js`
```javascript
const CACHE_NAME = 'synonym-quest-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

**File to Create**: `frontend/src/serviceWorkerRegistration.ts`
```typescript
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}
```

**File to Update**: `frontend/src/index.tsx`
```typescript
import { register as registerServiceWorker } from './serviceWorkerRegistration';

// At the bottom of the file
registerServiceWorker();
```

**Testing**:
- [ ] Open app in Chrome
- [ ] Open DevTools > Application > Service Workers
- [ ] Verify service worker is registered
- [ ] Go offline (DevTools > Network > Offline)
- [ ] Reload page
- [ ] Verify app still loads

---

## 🔥 HIGH PRIORITY (Week 2-3)

### 🎯 4. Implement Hints System
**Status**: ❌ NOT IMPLEMENTED  
**Impact**: High - Important learning aid  
**Effort**: 1 week

**Files to Create**:

1. **Backend Service**: `backend/src/services/HintService.ts`
```typescript
export class HintService {
  // Generate progressive hints for a word
  generateHints(word: string, synonyms: string[]): {
    firstLetter: string;
    wordLength: number;
    contextHint: string;
  } {
    return {
      firstLetter: word[0],
      wordLength: word.length,
      contextHint: `This word means similar to ${synonyms[0]}`
    };
  }

  // Calculate hint penalty
  calculateHintPenalty(hintsUsed: number): number {
    return hintsUsed * 2; // -2 points per hint
  }
}
```

2. **Backend Controller Updates**: Add to `backend/src/controllers/GameController.ts`
```typescript
async getHints(req: Request, res: Response): Promise<void> {
  const { wordId } = req.params;
  const word = await Word.findByPk(wordId);
  const hints = hintService.generateHints(word.word, word.synonyms);
  res.json({ success: true, data: hints });
}
```

3. **Frontend Updates**: Modify `frontend/src/Games.tsx`
```typescript
const [hintsUsed, setHintsUsed] = useState(0);
const [showHint, setShowHint] = useState(false);
const [currentHint, setCurrentHint] = useState<string>('');

const getHint = async () => {
  if (hintsUsed === 0) {
    setCurrentHint(`First letter: ${currentQuestion.questionWord.word[0]}`);
  } else if (hintsUsed === 1) {
    setCurrentHint(`Word length: ${currentQuestion.questionWord.word.length} letters`);
  } else {
    setCurrentHint(`Context: ${currentQuestion.questionWord.synonyms[0].word}`);
  }
  setHintsUsed(hintsUsed + 1);
  setShowHint(true);
  setScore(Math.max(0, score - 2)); // -2 points penalty
};
```

**UI Changes**:
- Add "💡 Hint" button below options
- Show hint text when clicked
- Display hint count and penalty
- Update score when hint is used

**Testing**:
- [ ] Start any game
- [ ] Click hint button
- [ ] Verify first letter hint appears
- [ ] Click again for word length
- [ ] Click again for context
- [ ] Verify score decreases by 2 each time

---

### 🏆 5. Implement Achievement System
**Status**: ❌ NOT IMPLEMENTED  
**Impact**: High - Gamification  
**Effort**: 1-2 weeks

**Database Models to Create**:

1. **Achievement Model**: `backend/src/models/Achievement.ts`
```typescript
export class Achievement extends Model {
  id!: string;
  name!: string;
  description!: string;
  icon!: string;
  category!: 'learning' | 'streak' | 'score' | 'games';
  criteria!: {
    type: string;
    threshold: number;
  };
  points!: number;
}
```

2. **UserAchievement Model**: `backend/src/models/UserAchievement.ts`
```typescript
export class UserAchievement extends Model {
  id!: string;
  userId!: string;
  achievementId!: string;
  unlockedAt!: Date;
  progress!: number;
}
```

**Achievement Definitions** (to seed in database):
```typescript
const achievements = [
  {
    id: 'first_word',
    name: 'First Step',
    description: 'Learn your first word',
    icon: '🎯',
    category: 'learning',
    criteria: { type: 'words_learned', threshold: 1 },
    points: 10
  },
  {
    id: 'ten_words',
    name: 'Vocabulary Builder',
    description: 'Learn 10 words',
    icon: '📚',
    category: 'learning',
    criteria: { type: 'words_learned', threshold: 10 },
    points: 50
  },
  {
    id: 'perfect_score',
    name: 'Perfect Round',
    description: 'Get 10 correct answers in a row',
    icon: '⭐',
    category: 'score',
    criteria: { type: 'correct_streak', threshold: 10 },
    points: 100
  },
  {
    id: 'daily_streak_3',
    name: 'Consistent Learner',
    description: 'Play for 3 days in a row',
    icon: '🔥',
    category: 'streak',
    criteria: { type: 'daily_streak', threshold: 3 },
    points: 50
  },
  {
    id: 'all_games',
    name: 'Game Master',
    description: 'Play all 9 game modes',
    icon: '👑',
    category: 'games',
    criteria: { type: 'games_played', threshold: 9 },
    points: 200
  }
];
```

**Backend Service**: `backend/src/services/AchievementService.ts`
```typescript
export class AchievementService {
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    // Check user progress against achievement criteria
    // Unlock achievements that meet criteria
    // Return newly unlocked achievements
  }
}
```

**Frontend Components**:

1. **Achievement Display**: `frontend/src/components/Achievements.tsx`
```typescript
const Achievements: React.FC = () => {
  const [achievements, setAchievements] = useState([]);
  
  return (
    <div className="achievements-grid">
      {achievements.map(achievement => (
        <div className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
          <div className="achievement-icon">{achievement.icon}</div>
          <div className="achievement-name">{achievement.name}</div>
          <div className="achievement-description">{achievement.description}</div>
          {achievement.unlocked && (
            <div className="achievement-date">
              Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

2. **Achievement Unlock Modal**: `frontend/src/components/AchievementUnlockModal.tsx`
```typescript
const AchievementUnlockModal: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  return (
    <div className="achievement-unlock-modal">
      <div className="achievement-unlock-content">
        <h2>🎉 Achievement Unlocked!</h2>
        <div className="achievement-icon-large">{achievement.icon}</div>
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        <p className="points">+{achievement.points} points</p>
      </div>
    </div>
  );
};
```

**Integration**:
- Check for new achievements after every game answer
- Show unlock modal when achievement is earned
- Display achievements in user profile
- Add achievement count to header

**Testing**:
- [ ] Answer first word correctly
- [ ] Verify "First Step" achievement unlocks
- [ ] See unlock animation
- [ ] Check achievement appears in profile
- [ ] Test all achievement criteria

---

## 📊 MEDIUM PRIORITY (Week 4-5)

### 📈 6. Enhanced Statistics Dashboard
**Status**: ⚠️ BASIC ONLY  
**Impact**: Medium - Better progress visualization  
**Effort**: 1-2 weeks

**Files to Create**:

1. **Statistics Component**: `frontend/src/components/StatsCharts.tsx`
```typescript
import { LineChart, BarChart, Line, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const StatsCharts: React.FC = () => {
  const [stats, setStats] = useState({
    dailyProgress: [],
    accuracyTrend: [],
    wordsByDifficulty: []
  });

  return (
    <div className="stats-dashboard">
      <h2>📊 Your Progress</h2>
      
      {/* Daily Progress Chart */}
      <div className="chart-container">
        <h3>Daily Learning Progress</h3>
        <LineChart width={600} height={300} data={stats.dailyProgress}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="wordsLearned" stroke="#3b82f6" />
        </LineChart>
      </div>

      {/* Accuracy Trend */}
      <div className="chart-container">
        <h3>Accuracy Over Time</h3>
        <LineChart width={600} height={300} data={stats.accuracyTrend}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="accuracy" stroke="#10b981" />
        </LineChart>
      </div>

      {/* Words by Difficulty */}
      <div className="chart-container">
        <h3>Words Learned by Difficulty</h3>
        <BarChart width={600} height={300} data={stats.wordsByDifficulty}>
          <XAxis dataKey="difficulty" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </div>
    </div>
  );
};
```

2. **Backend Analytics Endpoint**: Add to `backend/src/controllers/GameController.ts`
```typescript
async getUserAnalytics(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user.id;
  const { timeRange = '7d' } = req.query;
  
  const analytics = await gameService.getUserAnalytics(userId, timeRange as string);
  
  res.json({
    success: true,
    data: analytics
  });
}
```

**Dependencies to Install**:
```bash
cd frontend
npm install recharts
```

**Testing**:
- [ ] Navigate to stats page
- [ ] Verify charts load
- [ ] Verify data is accurate
- [ ] Test different time ranges
- [ ] Check mobile responsiveness

---

### 🧠 7. Spaced Repetition System
**Status**: ❌ NOT IMPLEMENTED  
**Impact**: High for learning effectiveness  
**Effort**: 2-3 weeks

**Algorithm to Implement**: SM-2 (SuperMemo 2)

**Files to Create**:

1. **Spaced Repetition Service**: `backend/src/services/SpacedRepetitionService.ts`
```typescript
export class SpacedRepetitionService {
  /**
   * Calculate next review date based on SM-2 algorithm
   */
  calculateNextReview(
    currentInterval: number,
    easeFactor: number,
    quality: number // 0-5 (how well user knew the word)
  ): {
    nextInterval: number;
    nextEaseFactor: number;
    nextReviewDate: Date;
  } {
    // SM-2 algorithm implementation
    let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    if (newEaseFactor < 1.3) newEaseFactor = 1.3;
    
    let newInterval: number;
    if (quality < 3) {
      newInterval = 1; // Reset to 1 day if quality is low
    } else {
      if (currentInterval === 0) {
        newInterval = 1;
      } else if (currentInterval === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(currentInterval * newEaseFactor);
      }
    }
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    
    return {
      nextInterval: newInterval,
      nextEaseFactor: newEaseFactor,
      nextReviewDate
    };
  }

  /**
   * Get words due for review
   */
  async getWordsDueForReview(userId: string, limit: number = 10): Promise<Word[]> {
    const today = new Date();
    
    const userProgress = await UserProgress.findAll({
      where: {
        userId,
        nextReviewDate: {
          [Op.lte]: today
        }
      },
      order: [['nextReviewDate', 'ASC']],
      limit,
      include: [Word]
    });
    
    return userProgress.map(up => up.word);
  }
}
```

2. **Update UserProgress Model**: Add fields to `backend/src/models/UserProgress.ts`
```typescript
export class UserProgress extends Model {
  // Existing fields...
  
  // Spaced repetition fields
  interval!: number; // Days until next review
  easeFactor!: number; // Difficulty multiplier (1.3 - 2.5)
  nextReviewDate!: Date; // When to show word next
  reviewCount!: number; // Total times reviewed
  lastReviewQuality!: number; // 0-5 scale
}
```

3. **Review Game Mode**: Add to `frontend/src/Games.tsx`
```typescript
const startReviewMode = async () => {
  const response = await fetch('http://localhost:3001/api/games/spaced-repetition/review', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    }
  });
  const data = await response.json();
  
  // Start game with words due for review
  setCurrentGame('spaced-review');
  setAllWords(data.data.words);
  loadNextQuestion('spaced-review');
};
```

**Testing**:
- [ ] Answer word correctly
- [ ] Verify next review date is set
- [ ] Answer word incorrectly
- [ ] Verify word comes back sooner
- [ ] Check review queue shows correct words

---

## 🎨 NICE-TO-HAVE (Week 6+)

### 🌙 8. Theme Options (Dark Mode)
**Status**: ❌ NOT IMPLEMENTED  
**Effort**: 1 week

**Files to Create**: `frontend/src/contexts/ThemeContext.tsx`

---

### 🔊 9. Audio Features
**Status**: ❌ NOT IMPLEMENTED  
**Effort**: 1-2 weeks

**Use**: Web Speech API for text-to-speech

---

### 👨‍👩‍👧 10. Parent Dashboard
**Status**: ❌ NOT IMPLEMENTED  
**Effort**: 2-3 weeks

**Features**: Progress reports, custom word lists, insights

---

## 📝 Summary Checklist

### Critical (This Week)
- [ ] Fix Speed Round crash
- [ ] Add PWA icons
- [ ] Implement service worker

### High Priority (Week 2-3)
- [ ] Hints system
- [ ] Achievement system
- [ ] Enhanced statistics

### Medium Priority (Week 4-5)
- [ ] Spaced repetition
- [ ] Adaptive difficulty

### Nice-to-Have (Week 6+)
- [ ] Theme options
- [ ] Audio features
- [ ] Parent dashboard

---

**Total Estimated Time**: 6-8 weeks for full completion  
**MVP Time**: 1-2 weeks (critical items only)

