/**
 * API Configuration
 * Centralizes API endpoint configuration for both development and production
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const config = {
  API_URL,
  AUTH_ENDPOINTS: {
    LOGIN: `${API_URL}/api/auth/login`,
    REGISTER: `${API_URL}/api/auth/register`,
    LOGOUT: `${API_URL}/api/auth/logout`,
    REFRESH_TOKEN: `${API_URL}/api/auth/refresh-token`,
    PROFILE: `${API_URL}/api/auth/profile`,
  },
  GAME_ENDPOINTS: {
    USER_LETTERS_PROGRESS: `${API_URL}/api/games/user/letters/progress`,
    USER_PROGRESS_UPDATE: `${API_URL}/api/games/user/progress/update`,
    LETTER_NEW: (letter: string, exclude?: string) => 
      `${API_URL}/api/games/letter/${letter}/new${exclude ? `?exclude=${exclude}` : ''}`,
    LETTER_OLD: (letter: string, exclude?: string) => 
      `${API_URL}/api/games/letter/${letter}/old${exclude ? `?exclude=${exclude}` : ''}`,
    USER_LETTER_NEW: (letter: string) => 
      `${API_URL}/api/games/user/letter/${letter}/new`,
    USER_LETTER_OLD: (letter: string) => 
      `${API_URL}/api/games/user/letter/${letter}/old`,
  },
  WORD_ENDPOINTS: {
    GET_ALL: (limit?: number) => 
      `${API_URL}/api/words${limit ? `?limit=${limit}` : ''}`,
    USER_STATS: `${API_URL}/api/words/user/stats`,
    USER_NEW: `${API_URL}/api/words/user/new`,
    USER_LEARNED: `${API_URL}/api/words/user/learned`,
    WORD_STATS: (wordId: string) => 
      `${API_URL}/api/words/${wordId}/stats`,
  },
};

export default config;
