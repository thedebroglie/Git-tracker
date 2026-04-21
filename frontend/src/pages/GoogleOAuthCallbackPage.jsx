import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function readHashPayload() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const params = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(window.location.search);

  const payloadParam = params.get('payload');
  if (payloadParam) {
    try {
      return JSON.parse(decodeURIComponent(payloadParam));
    } catch {
      return null;
    }
  }

  const error = params.get('error') || queryParams.get('error') || queryParams.get('google_error');
  return error ? { error } : null;
}

export default function GoogleOAuthCallbackPage() {
  const navigate = useNavigate();
  const { completeOAuthLogin } = useAuth();
  const [message, setMessage] = useState('Completing Google sign-in...');

  useEffect(() => {
    const data = readHashPayload();

    if (!data) {
      setMessage('Missing Google login response. Redirecting to login...');
      const timer = setTimeout(() => navigate('/login', { replace: true }), 1200);
      return () => clearTimeout(timer);
    }

    if (data.error) {
      const timer = setTimeout(() => navigate(`/login?google_error=${encodeURIComponent(data.error)}`, { replace: true }), 1200);
      return () => clearTimeout(timer);
    }

    if (data.token && data.student) {
      completeOAuthLogin(data.token, data.student);
      navigate('/dashboard', { replace: true });
      return undefined;
    }

    setMessage('Google sign-in failed. Redirecting to login...');
    const timer = setTimeout(() => navigate('/login', { replace: true }), 1200);
    return () => clearTimeout(timer);
  }, [completeOAuthLogin, navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'white' }}>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>GitTracker</div>
        <div style={{ color: 'var(--on-surface-variant)' }}>{message}</div>
      </div>
    </div>
  );
}