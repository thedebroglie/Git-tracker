import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentAPI, syncAPI, leaderboardAPI, authAPI } from '../services/api';
import {
  TierBadge, RankDelta, ProgressBar, StatPill, Avatar,
  EmptyState, LoadingCards, CircularProgress,
} from '../components/ui';

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString();
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, syncRes, explainRes, posRes] = await Promise.allSettled([
        studentAPI.getProfile(),
        syncAPI.getStatus(),
        studentAPI.getScoreExplanation(),
        leaderboardAPI.getMyPosition(),
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data.student);
        setStats(profileRes.value.data.stats);
      }
      if (syncRes.status === 'fulfilled') setSyncStatus(syncRes.value.data);
      if (explainRes.status === 'fulfilled') setExplanation(explainRes.value.data);
      if (posRes.status === 'fulfilled') setPosition(posRes.value.data);
    } catch {
      // handled per-request
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await syncAPI.triggerSync();
      setSyncMessage(res.data.message || 'Sync queued!');
      // Refresh data after a short delay
      setTimeout(() => {
        fetchData();
        refreshUser();
      }, 3000);
    } catch (err) {
      setSyncMessage(err.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGithub = async () => {
    try {
      const res = await authAPI.getGithubUrl();
      window.location.href = res.data.authUrl;
    } catch {
      alert('Failed to get GitHub auth URL');
    }
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="topbar">
          <div className="topbar__greeting">
            <div className="skeleton skeleton--heading" />
            <div className="skeleton skeleton--text" style={{ width: 200 }} />
          </div>
        </div>
        <LoadingCards count={6} />
      </div>
    );
  }

  const p = profile || user;
  const s = stats;
  const ex = explanation;
  const breakdown = ex?.formula?.components || {};
  const quality = ex?.formula?.qualityBreakdown || {};

  return (
    <div className="fade-in">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar__greeting">
          <h1>Welcome back, {p?.name?.split(' ')[0] || 'Student'}</h1>
          <p>
            {p?.enrollmentId} · {p?.branch} · Year {p?.year}
            {syncStatus?.lastSyncedAt && (<> · Last synced {timeAgo(syncStatus.lastSyncedAt)}</>)}
          </p>
        </div>
        <div className="topbar__actions">
          {syncMessage && (
            <span className="sync-indicator" style={{ fontSize: 12 }}>
              {syncMessage}
            </span>
          )}
          {!p?.githubConnected ? (
            <button className="btn btn--primary" onClick={handleConnectGithub}>
              ⛓ Connect GitHub
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={handleSync}
              disabled={syncing || (syncStatus && !syncStatus.canSync)}
            >
              {syncing ? '⟳ Syncing...' : '⟳ Sync Now'}
            </button>
          )}
        </div>
      </div>

      {/* No GitHub connected state */}
      {!p?.githubConnected && (
        <EmptyState
          icon="⛓"
          title="Connect Your GitHub"
          text="Link your GitHub account to start tracking contributions, earn scores, and climb the leaderboard."
        >
          <button className="btn btn--primary btn--lg" onClick={handleConnectGithub}>
            Connect GitHub Account
          </button>
        </EmptyState>
      )}

      {/* Dashboard Cards */}
      {p?.githubConnected && (
        <div className="dashboard-grid">
          {/* Score Card */}
          <div className="card fade-in stagger-1">
            <div className="card__header">
              <span className="card__title">Total Score</span>
              <TierBadge tier={p?.tierRank} />
            </div>
            <div className="score-value">{formatNumber(p?.score)}</div>
            <div className="score-label">
              Score Version: {s?.scoreVersion || 'v4-cqe-decay-1'}
            </div>
            {/* Mini breakdown bars */}
            {Object.keys(breakdown).length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(breakdown).map(([key, val]) => {
                  const maxVals = { PAS: 6000, OCS: 6500, PIS: 1500, CIS: 4000, SDS: 200 };
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, width: 30, color: 'var(--on-surface-variant)' }}>
                        {key}
                      </span>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={val} max={maxVals[key] || 5000} size="sm" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, width: 50, textAlign: 'right', color: 'var(--on-surface)' }}>
                        {formatNumber(val)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rank Card */}
          <div className="card fade-in stagger-2">
            <div className="card__header">
              <span className="card__title">Leaderboard Rank</span>
              <RankDelta delta={p?.rankChange || position?.myRank ? (position?.neighbors?.find(n => n.isMe)?.rank ? 0 : 0) : 0} />
            </div>
            <div className="rank-display">
              <span className="rank-hash">#</span>
              <span className="rank-number">{p?.leaderboardRank || position?.myRank || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <span className="pill">{p?.branch}</span>
              <span className="pill">Year {p?.year}</span>
              {p?.githubUsername && <span className="pill">@{p.githubUsername}</span>}
            </div>
            {/* Neighbors */}
            {position?.neighbors && position.neighbors.length > 0 && (
              <div style={{ marginTop: 16, fontSize: 13 }}>
                {position.neighbors.map((n, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 0',
                      opacity: n.isMe ? 1 : 0.7,
                      fontWeight: n.isMe ? 600 : 400,
                      color: n.isMe ? 'var(--primary)' : 'var(--on-surface-variant)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', width: 28, fontSize: 12 }}>#{n.rank}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatNumber(n.score)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GitHub Stats */}
          <div className="card fade-in stagger-3" style={{ gridColumn: 'span 2' }}>
            <div className="card__header">
              <span className="card__title">GitHub Metrics</span>
              <span className="card__icon">⬡</span>
            </div>
            <div className="stats-grid">
              <StatPill label="Commits" value={formatNumber(s?.commits)} icon="●" />
              <StatPill label="PRs Opened" value={formatNumber(s?.prsOpened)} icon="⤴" />
              <StatPill label="PRs Merged" value={formatNumber(s?.prsMergedExternal)} icon="✓" />
              <StatPill label="Issues" value={formatNumber(s?.issues)} icon="◉" />
              <StatPill label="Reviews" value={formatNumber(s?.codeReviews)} icon="◈" />
              <StatPill label="Repos" value={formatNumber(s?.totalRepoCount)} icon="▣" />
              <StatPill label="Stars" value={formatNumber(s?.stars)} icon="★" />
              <StatPill label="Languages" value={formatNumber(s?.languageCount)} icon="◇" />
              <StatPill label="Streak" value={`${s?.streakDays || 0}d`} icon="⚡" />
              <StatPill label="30-Day" value={formatNumber(s?.contributionsLast30Days)} icon="⏱" />
            </div>
          </div>

          {/* Quality Engine */}
          <div className="card fade-in stagger-4">
            <div className="card__header">
              <span className="card__title">Quality Engine</span>
              <span className="card__icon">◎</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <CircularProgress value={s?.qualityScore || 0} max={1} size={100} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: 4, fontFamily: 'var(--font-label)' }}>
                  EFFECTIVE COMMITS
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700 }}>
                  {formatNumber(s?.effectiveCommits)}
                </div>
              </div>
            </div>
            {Object.keys(quality).length > 0 && quality.weights && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { key: 'volumeScore', label: 'Volume' },
                  { key: 'diversityScore', label: 'Diversity' },
                  { key: 'prAssociationScore', label: 'PR Quality' },
                  { key: 'antiSpamScore', label: 'Anti-Spam' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-label)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--on-surface)' }}>
                        {((quality[key] || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar value={(quality[key] || 0) * 100} max={100} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decay & Activity */}
          <div className="card fade-in stagger-5">
            <div className="card__header">
              <span className="card__title">Activity & Decay</span>
              <span className="card__icon">⏱</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700, color: 'var(--on-surface)' }}>
                  {s?.daysSinceActivity ?? 0}
                </div>
                <div className="score-label">Days Since Activity</div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700, color: 'var(--primary)' }}>
                  {((s?.decayFactor ?? 1) * 100).toFixed(0)}%
                </div>
                <div className="score-label">Decay Factor</div>
              </div>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--outline)', fontFamily: 'var(--font-mono)' }}>
              decay = 1 / log(days + 2) ∈ [0.2, 1.0]
            </div>
            {/* Anti-cheat flags */}
            {ex?.antiCheat?.isFlagged && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-label)', color: 'var(--error)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  ⚠ Anti-Cheat Flags
                </div>
                {ex.antiCheat.flags.map((f, i) => (
                  <div key={i} className="flag-item">
                    <div className="flag-item__code">{f.code}</div>
                    <div className="flag-item__reason">{f.reason}</div>
                  </div>
                ))}
              </div>
            )}
            {ex?.antiCheat && !ex.antiCheat.isFlagged && (
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🛡 No anti-cheat flags detected
              </div>
            )}
          </div>

          {/* Language List */}
          {s?.languageList && s.languageList.length > 0 && (
            <div className="card fade-in stagger-6">
              <div className="card__header">
                <span className="card__title">Languages</span>
                <span className="card__icon">◇</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.languageList.map((lang) => (
                  <span key={lang} className="pill">{lang}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
