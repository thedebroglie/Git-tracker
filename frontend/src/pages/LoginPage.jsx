import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { CosmicBackground } from '../components/ui';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleError = params.get('google_error');

    if (googleError) {
      const messages = {
        student_not_found: 'Google account email is not registered in GitTracker.',
        google_oauth_not_configured: 'Google login is not configured yet.',
        missing_params: 'Google login callback was missing required parameters.',
        invalid_state: 'Google login session expired. Please try again.',
        token_exchange_failed: 'Google login failed while exchanging the code.',
        missing_google_email: 'Google did not return an email address.',
        callback_failed: 'Google login callback failed. Please try again.',
      };

      setError(messages[googleError] || 'Google sign-in failed.');
    }
  }, [location.search]);

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const res = await authAPI.getGoogleUrl();
      window.location.href = res.data.authUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start Google sign-in.');
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, user]);

  return (
    <>
      <CosmicBackground />
      <div className="auth-page">
        {/* Branding */}
        <div className="auth-branding fade-in">
          <div className="auth-branding__logo">
            <div className="auth-branding__icon">G</div>
            <span className="auth-branding__name">GitTracker</span>
          </div>
          <p className="auth-branding__tagline">TRACK · SCORE · RISE</p>
        </div>

        {/* Auth Card */}
        <div className="auth-card glass glass--xl fade-in stagger-1">
          {/* Error */}
          {error && <div className="auth-error">⚠ {error}</div>}

          {/* Google Sign-In Only */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              type="button"
              className="btn btn--ghost btn--lg btn--full"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? '...' : 'Continue with Google'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--glass-border)' }} />
              <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>Google sign in only</span>
              <div style={{ height: 1, flex: 1, background: 'var(--glass-border)' }} />
            </div>
          </div>

          {/* Badge */}
          <div className="auth-badge">MITS Gwalior</div>
        </div>
      </div>
    </>
  );
}
