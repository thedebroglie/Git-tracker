import { useState } from 'react';
import { request, saveToken } from '../services/api.js';

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      saveToken(data.token);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel stagger-1">
      <h2>{isRegister ? 'Create Student Account' : 'Welcome Back'}</h2>
      <p className="muted">
        Use your institute email to {isRegister ? 'register' : 'sign in'} and view your score insights.
      </p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="24cs10xx00@mitsgwl.ac.in"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
          required
          minLength={6}
        />

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>

      <button
        type="button"
        className="ghost"
        onClick={() => setMode(isRegister ? 'login' : 'register')}
      >
        {isRegister ? 'Already registered? Login' : 'New student? Register'}
      </button>
    </section>
  );
}

export default AuthPanel;
