# Testing Instructions - Letter Learning & Review Modes

## ✅ What We Fixed

### 1. **Letter Learning Word Repetition Bug**
- **Problem**: Users saw only 1-2 words repeatedly in letter games
- **Root Cause**: Backend only returned words with existing UserProgress records
- **Fix**: Backend now fetches ALL words for the letter, then adds unplayed words to fill the limit

### 2. **Mastery Level Logic**
- **Changed**: From complex logic to simple: 1 correct answer = learned (masteryLevel=2)
- **Result**: Words move to review section immediately after first correct answer

### 3. **Review Modes for Skill Games**
- **Added**: 4 new review game modes:
  - Review Synonym Match
  - Review Spelling  
  - Review Word Ladder
  - Review Speed Round
- Each review mode shows ONLY words the user learned in that specific game

---

## 🚀 How to Test Locally

### Option 1: Manual Testing (Separate Terminals)

**Terminal 1 - Backend**:
```bash
cd backend
npm install  # if needed
npm run build  # compile TypeScript
npm run dev   # starts backend on http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm install  # if needed
npm start    # starts frontend on http://localhost:3000
```

Then open: http://localhost:3000

---

### Option 2: Docker Testing

```bash
# Make sure you have .env file with database credentials
docker-compose up --build
```

Then open: http://localhost:3000 (frontend) and http://localhost:3001 (backend health check)

---

## 🔐 Login Credentials

**Test Account**:
- Email: `test@example.com`
- Password: `testpassword123`

**OR Create New Account**:
- Click "Sign In" → "Create Account"
- Any email, username, password (6+ chars)

---

## 🧪 Test Scenarios

### Test 1: Letter Learning - No More Repetition

1. **Create a NEW user account** (or use existing)
2. **Go to "Letter-wise Learning"**
3. **Select letter "A"**
4. **Click "🆕 New A Words"**
5. **Expected**: Should see multiple different words (not just 1-2 repeating)
6. **Answer questions** and verify new words keep appearing

### Test 2: Words Move to Review After 1 Correct Answer

1. **Play "🆕 New A Words"** 
2. **Answer a word correctly ONCE**
3. **Go back to game selection**
4. **Click "🔄 Review A Words"**
5. **Expected**: That word should now appear in review (even if only answered once)

### Test 3: Review Modes Work

1. **Play "🎯 Synonym Match"** and answer 3-4 words correctly
2. **Go back to game selection**
3. **Click "📖 Review Synonym Match"**
4. **Expected**: Should see ONLY the 3-4 words you learned in Synonym Match
5. **Repeat for**: Review Spelling, Review Word Ladder, Review Speed Round

### Test 4: No Limit - All Words Available

1. **Play any letter game** (e.g., "New A Words")
2. **Keep answering questions**
3. **Expected**: Should see ALL words for that letter (50+) before repeating
4. **No artificial limit**: Only stops when you've seen all words for that letter

---

## 🔍 What to Check

### Backend Logs
Watch Terminal 1 for:
- ✅ Database queries
- ✅ Word loading messages
- ✅ API endpoint hits

### Frontend Console (Browser F12)
Watch for:
- ✅ `Loaded X user-specific words` messages
- ✅ No errors about missing words
- ✅ Progress update confirmations

### Database Check (Optional)
```bash
psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME

# Check user progress
SELECT gameType, COUNT(*) as count, AVG(masteryLevel) as avg_mastery 
FROM user_progress 
WHERE userId = 'YOUR_USER_ID' 
GROUP BY gameType;

# Check for letter A words
SELECT COUNT(*) FROM words WHERE word LIKE 'a%';
```

---

## 📝 Expected Database Schema

The `user_progress` table will have these NEW gameType values:
- `synonym-match-review`
- `spelling-review`
- `word-ladder-review`
- `speed-round-review`

But note: When progress is saved, it removes `-review` and saves as:
- `synonym-match`
- `spelling`
- `word-ladder`
- `speed-round`

This ensures review mode updates the SAME progress as the original game.

---

## 🐛 If Something Goes Wrong

1. **Check backend is running**: http://localhost:3001/health
2. **Check database connection**: Look for connection errors in backend logs
3. **Clear browser cache**: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. **Check frontend console**: Look for API errors
5. **Restart both servers**: Stop and restart backend + frontend

---

## 🎯 Success Criteria

✅ Letter games show MANY different words (not repeating 1-2)
✅ Words appear in "Review" after just 1 correct answer
✅ Review modes show ONLY words learned in that specific game
✅ Each game tracks progress independently
✅ No database errors
✅ Frontend builds and runs smoothly

---

Good luck testing! 🚀

