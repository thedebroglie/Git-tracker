const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

async function request(path, options = {}) {
  const token = localStorage.getItem('gittracker_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Request failed');
  }

  return body;
}

function saveToken(token) {
  localStorage.setItem('gittracker_token', token);
}

function clearToken() {
  localStorage.removeItem('gittracker_token');
}

export { request, saveToken, clearToken };
