import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, studentAPI } from '../services/api';
import { Avatar, TierBadge } from '../components/ui';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState('');

  const handleConnectGithub = async () => {
    try {
      const res = await authAPI.getGithubUrl();
      window.location.href = res.data.authUrl;
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to get GitHub auth URL');
    }
  };

  const handleInstallGithubApp = async () => {
    try {
      const res = await authAPI.getGithubAppInstallUrl();
      window.location.href = res.data.installUrl;
    } catch {
      setMessage('Failed to get GitHub App install URL');
    }
  };

  const handleDisconnectGithub = async () => {
    if (!confirm('Disconnect GitHub? Your data history will be preserved.')) return;
    setDisconnecting(true);
    try {
      await studentAPI.disconnectGithub();
      setMessage('GitHub disconnected successfully');
      refreshUser();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Settings</h1>
        <p className="page-header__subtitle">Manage your GitTracker account</p>
      </div>

      {message && (
        <div className="alert alert--success">{message}</div>
      )}

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* Profile Card */}
        <div className="card fade-in stagger-1">
          <div className="card__header">
            <span className="card__title">Profile</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar src={user?.avatar} alt={user?.name} size="lg" tier={user?.tierRank} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                {user?.enrollmentId} · {user?.email}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span className="pill">{user?.branch}</span>
                <span className="pill">Year {user?.year}{user?.semester ? ` (Sem ${user.semester})` : ''}</span>
                {user?.mobile && <span className="pill">📞 {user.mobile}</span>}
                {user?.tierRank && <TierBadge tier={user.tierRank} />}
              </div>
            </div>
          </div>
        </div>

        {/* GitHub Integration */}
        <div className="card fade-in stagger-2">
          <div className="card__header">
            <span className="card__title">GitHub Integration</span>
          </div>
          {user?.githubConnected ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div className="sync-indicator">
                  <div className="sync-indicator__dot" />
                  Connected
                </div>
                {user.githubUsername && (
                  <a
                    href={`https://github.com/${user.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill pill--active"
                    style={{ textDecoration: 'none' }}
                  >
                    @{user.githubUsername} ↗
                  </a>
                )}
              </div>
              {user.githubAppInstalled && (
                <div className="alert alert--success" style={{ marginBottom: 12 }}>
                  ✓ GitHub App installed (Installation: {user.githubAppInstallationId})
                </div>
              )}
              {!user.githubAppInstalled && (
                <div style={{ marginBottom: 12 }}>
                  <button className="btn btn--ghost" onClick={handleInstallGithubApp}>
                    Install GitHub App (recommended)
                  </button>
                </div>
              )}
              <button
                className="btn btn--danger btn--sm"
                onClick={handleDisconnectGithub}
                disabled={disconnecting}
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 16 }}>
                Connect your GitHub account to start tracking contributions.
              </p>
              <button className="btn btn--primary" onClick={handleConnectGithub}>
                ⛓ Connect GitHub
              </button>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card fade-in stagger-3" style={{ borderColor: 'rgba(255,113,108,0.15)' }}>
          <div className="card__header">
            <span className="card__title" style={{ color: 'var(--error)' }}>Danger Zone</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 12 }}>
            Sign out of your GitTracker session.
          </p>
          <button className="btn btn--danger" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
