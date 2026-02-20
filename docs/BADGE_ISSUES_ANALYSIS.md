# Badge Issues Analysis

**Date:** Feb 20, 2025  
**Reported issues:**  
1. "100 words learned" (Lexicon Legend) badge not working  
2. "Most correct" or "lots of correct" badge not working  

---

## Summary of Findings

### Issue 1: Lexicon Legend (100 words learned) – **Potential bug: UI vs badge count mismatch**

**Root cause:** The number shown as "words learned" in the UI and the number used for the 100-word badge are calculated differently.

| Source | What it counts | Definition |
|--------|----------------|------------|
| **UI (totalWordsLearned)** | `UserProgress.getUserStats()` | Count of **rows** in `user_progress` where `correctCount >= 1` |
| **Badge (getUserWordCount)** | `BadgeService.getUserWordCount()` | Count of **distinct wordIds** in `user_progress` where `masteryLevel >= 1` |

**Why this breaks the badge:**

- Each row in `user_progress` is `(userId, wordId, gameType)`.
- The same word can appear in several game types (e.g. synonym-match, letter-wise).
- Example: 80 distinct words played across 3 game types → **120 rows**.
  - UI: **120** words learned  
  - Badge: **80** words learned  
- If the user has 100+ rows but fewer than 100 distinct words, the badge never triggers even though the UI shows 100+.

**Code locations:**

- UI: `backend/src/models/UserProgress.ts` line 98  
  ```ts
  const totalWordsLearned = allProgress.filter(p => p.correctCount >= 1).length;
  ```
- Badge: `backend/src/services/BadgeService.ts` lines 97–108  
  ```ts
  const count = await this.userProgressModel.count({
    where: { userId, masteryLevel: { [Op.gte]: 1 } },
    distinct: true,
    col: 'wordId',
  });
  ```

---

### Issue 2: Perfect Score / “Most correct” (100% accuracy) – **Bug: badge is never evaluated**

**Root cause:** No code path ever sends an event with `accuracy` to the badge service.

- The **Perfect Score** badge criteria require `event.data.accuracy >= 100`.
- Only these events trigger badge checks:
  - `WORD_LEARNED` – when a single correct answer is recorded
  - `GAME_COMPLETED` – when a game ends
- Neither event includes `accuracy` in `event.data`.

**Code locations:**

- `backend/src/services/GameService.ts` (around 558–593): only `wordId`, `gameType`, and `wordCount` are sent.
- `BadgeService.checkCriteria` for `accuracy` (around 81–85):  
  ```ts
  const accuracy = event.data.accuracy || 0;  // Always 0
  return accuracy >= criteria.minAccuracy;     // 0 >= 100 → false
  ```

So the Perfect Score badge can never be earned, regardless of game performance.

---

## Diagnostic Queries for a Specific User

Use your daughter’s user ID (e.g. from `users` table) in place of `'USER_ID_HERE'`:

```sql
-- 1. Distinct words learned (what the badge uses)
SELECT COUNT(DISTINCT "wordId") as distinct_words_for_badge
FROM user_progress
WHERE "userId" = 'USER_ID_HERE'
  AND "masteryLevel" >= 1;

-- 2. Row count (what the UI shows as totalWordsLearned)
SELECT COUNT(*) as rows_shown_in_ui
FROM user_progress
WHERE "userId" = 'USER_ID_HERE'
  AND "correctCount" >= 1;

-- 3. Distribution by game type
SELECT "gameType", 
       COUNT(*) as rows,
       COUNT(DISTINCT "wordId") as distinct_words
FROM user_progress
WHERE "userId" = 'USER_ID_HERE'
  AND "correctCount" >= 1
GROUP BY "gameType"
ORDER BY rows DESC;
```

If `distinct_words_for_badge` < 100 but `rows_shown_in_ui` >= 100, the mismatch explains why the Lexicon Legend badge is not awarded.

---

## Badges Referenced

- **Lexicon Legend** – "Learn 100 words" (`word_count`, value: 100)  
- **Perfect Score** – "Get 100% accuracy in a game" (`accuracy`, minAccuracy: 100)  

No badge in the seed data is named “most correct” or “lots of correct”; the closest is **Perfect Score**.

---

## Next Steps (recommended, not yet implemented)

1. **100 words badge / UI consistency**
   - Either align `UserProgress.getUserStats()` to use distinct word count, or
   - Update the UI to show “distinct words learned” so it matches the badge logic.

2. **Perfect Score badge**
   - Add game-end logic to compute per-game accuracy.
   - Send a badge event (e.g. `GAME_COMPLETED` or `PERFECT_SCORE`) with `event.data.accuracy` when a game ends.
   - Keep using `BadgeService.checkCriteria` for the `accuracy` type so the Perfect Score badge can be awarded.
