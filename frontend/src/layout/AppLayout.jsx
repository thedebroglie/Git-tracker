import { useNavigate } from 'react-router-dom';
import { clearToken } from '../services/api.js';

function AppLayout({ children }) {
  const navigate = useNavigate();
  const loggedIn = Boolean(localStorage.getItem('gittracker_token'));

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <main className="site-root">
      <header className="top-nav">
        <div className="brand-block">
          <div className="brand-mark">GT</div>
          <div>
            <p className="brand-name">GitTracker</p>
            <p className="brand-subtitle">MITS Gwalior</p>
          </div>
        </div>

        <div className="top-links">
          <a href="#home">Home</a>
          <a href="#projects">Trackers</a>
          <a href="#developers">Developers</a>
        </div>

        <div className="top-actions">
          <button className="icon-btn" aria-label="theme-toggle">◔</button>
          {loggedIn ? (
            <button className="ghost dark" onClick={logout}>Logout</button>
          ) : (
            <button className="dark" onClick={() => navigate('/login')}>Sign In</button>
          )}
        </div>
      </header>

      <section className="content-shell">
        {children}
      </section>
    </main>
  );
}

export default AppLayout;
