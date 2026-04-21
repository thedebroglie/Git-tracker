import axios from 'axios';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-handle 401 responses (expired/invalid token)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gt_token');
      localStorage.removeItem('gt_student');
      // Only redirect if not already on auth page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───
export const authAPI = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  getGoogleUrl: () => api.get('/auth/google'),
  getGithubUrl: () => api.get('/auth/github'),
  getGithubAppInstallUrl: () => api.get('/auth/github/app/install'),
};

// ─── Student ───
export const studentAPI = {
  getProfile: () => api.get('/api/student/profile'),
  getScoreExplanation: () => api.get('/api/student/score-explanation'),
  getSyncStatus: () => api.get('/api/student/sync-status'),
  disconnectGithub: () => api.post('/api/student/github/disconnect'),
  getPublicProfile: (enrollmentId) => api.get(`/api/student/${enrollmentId}`),
  getPublicExplanation: (enrollmentId) => api.get(`/api/student/${enrollmentId}/score-explanation`),
  deleteAccount: (password, confirmText) => api.delete('/api/student/account', { data: { password, confirmText } }),
};

// ─── Sync ───
export const syncAPI = {
  triggerSync: () => api.post('/api/sync'),
  getStatus: () => api.get('/api/sync/status'),
};

// ─── Leaderboard ───
export const leaderboardAPI = {
  getLeaderboard: (params) => api.get('/api/leaderboard', { params }),
  getMyPosition: () => api.get('/api/leaderboard/my-position'),
  getMyTrends: (limit = 12) => api.get('/api/leaderboard/my-trends', { params: { limit } }),
  getCohortsSummary: (params) => api.get('/api/leaderboard/cohorts/summary', { params }),
  getPublicHistory: (enrollmentId, limit = 26) => api.get(`/api/leaderboard/${enrollmentId}/history`, { params: { limit } }),
};

export default api;
