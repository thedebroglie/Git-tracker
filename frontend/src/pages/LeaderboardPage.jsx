import { useState, useEffect, useCallback } from 'react';
import { leaderboardAPI } from '../services/api';
import { TierBadge, RankDelta, Avatar, LoadingCards, EmptyState } from '../components/ui';

function formatNumber(n) {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString();
}

const BRANCHES = ['All', 'CSE', 'IT', 'ECE', 'ME', 'CV'];
const YEARS = ['All', '1', '2', '3', '4'];
const TIERS = ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Elite'];

export default function LeaderboardPage() {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [myPosition, setMyPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ branch: '', year: '', tier: '', page: 1 });

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.branch) params.branch = filters.branch;
      if (filters.year) params.year = filters.year;
      if (filters.tier) params.tier = filters.tier;

      const [lbRes, posRes] = await Promise.allSettled([
        leaderboardAPI.getLeaderboard(params),
        leaderboardAPI.getMyPosition(),
      ]);

      if (lbRes.status === 'fulfilled') {
        setStudents(lbRes.value.data.students || []);
        setPagination(lbRes.value.data.pagination || {});
      }
      if (posRes.status === 'fulfilled') {
        setMyPosition(posRes.value.data);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const setFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'All' ? '' : value,
      page: 1,
    }));
  };

  const top3 = students.slice(0, filters.page === 1 ? 3 : 0);
  const rest = filters.page === 1 ? students.slice(3) : students;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-header__title">Leaderboard</h1>
        <p className="page-header__subtitle">
          {pagination.total} students ranked by contribution score
        </p>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-label)', width: '70px', fontWeight: 600 }}>
            • BRANCH
          </span>
          {BRANCHES.map(b => (
            <button
              key={b}
              className={`pill pill--clickable ${((!filters.branch && b === 'All') || filters.branch === b) ? 'pill--active' : ''}`}
              onClick={() => setFilter('branch', b)}
            >
              {b}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-label)', width: '70px', fontWeight: 600 }}>
            • YEAR
          </span>
          {YEARS.map(y => (
            <button
              key={y}
              className={`pill pill--clickable ${((!filters.year && y === 'All') || filters.year === y) ? 'pill--active' : ''}`}
              onClick={() => setFilter('year', y)}
            >
              {y === 'All' ? 'All' : `Y${y}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: 13, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-label)', width: '70px', fontWeight: 600 }}>
            • TIER
          </span>
          {TIERS.map(t => (
            <button
              key={t}
              className={`pill pill--clickable ${((!filters.tier && t === 'All') || filters.tier === t) ? 'pill--active' : ''}`}
              onClick={() => setFilter('tier', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingCards count={4} />
      ) : students.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No Students Found"
          text="No scored students match the current filters. Try adjusting your filters."
        />
      ) : (
        <>
          {/* Podium - Top 3 */}
          {top3.length > 0 && filters.page === 1 && (
            <div className="podium">
              {top3.length > 1 && (
                <div className="podium__item podium__item--2">
                  <div className="podium__rank podium__rank--2">2</div>
                  <Avatar src={top3[1].avatar} alt={top3[1].name} tier={top3[1].tierRank} />
                  <div className="podium__name">{top3[1].name}</div>
                  <div className="podium__score">{formatNumber(top3[1].score)}</div>
                  <div className="podium__branch">{top3[1].branch}</div>
                </div>
              )}
              <div className="podium__item podium__item--1">
                <div className="podium__rank podium__rank--1">1</div>
                <Avatar src={top3[0].avatar} alt={top3[0].name} size="lg" tier={top3[0].tierRank} />
                <div className="podium__name">{top3[0].name}</div>
                <div className="podium__score">{formatNumber(top3[0].score)}</div>
                <div className="podium__branch">{top3[0].branch}</div>
                <TierBadge tier={top3[0].tierRank} />
              </div>
              {top3.length > 2 && (
                <div className="podium__item podium__item--3">
                  <div className="podium__rank podium__rank--3">3</div>
                  <Avatar src={top3[2].avatar} alt={top3[2].name} tier={top3[2].tierRank} />
                  <div className="podium__name">{top3[2].name}</div>
                  <div className="podium__score">{formatNumber(top3[2].score)}</div>
                  <div className="podium__branch">{top3[2].branch}</div>
                </div>
              )}
            </div>
          )}

          {/* Table */}
          {rest.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>Branch</th>
                    <th>Year</th>
                    <th>Score</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((s) => (
                    <tr key={s._id || s.enrollmentId}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        #{s.displayRank}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar src={s.avatar} alt={s.name} size="sm" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                              {s.enrollmentId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td><span className="pill">{s.branch}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{s.year}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
                        {formatNumber(s.score)}
                      </td>
                      <td><TierBadge tier={s.tierRank} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination__btn"
                disabled={pagination.page <= 1}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                ←
              </button>
              {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination__btn ${p === pagination.page ? 'pagination__btn--active' : ''}`}
                  onClick={() => setFilters(prev => ({ ...prev, page: p }))}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination__btn"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                →
              </button>
            </div>
          )}

          {/* My Position */}
          {myPosition && myPosition.myRank && (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="card__header">
                <span className="card__title">Your Position</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <div>
                  <div className="rank-display">
                    <span className="rank-hash">#</span>
                    <span className="rank-number">{myPosition.myRank}</span>
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--primary)' }}>
                  {formatNumber(myPosition.myScore)}
                </div>
                <TierBadge tier={myPosition.myTier} />
              </div>
              {myPosition.neighbors && (
                <div style={{ fontSize: 13 }}>
                  {myPosition.neighbors.map((n, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: n.isMe ? 'rgba(129,236,255,0.06)' : 'transparent',
                        fontWeight: n.isMe ? 600 : 400,
                        color: n.isMe ? 'var(--primary)' : 'var(--on-surface-variant)',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', width: 32, fontSize: 12 }}>
                        #{n.rank}
                      </span>
                      <Avatar src={n.avatar} alt={n.name} size="sm" />
                      <span style={{ flex: 1 }}>{n.name}{n.isMe ? ' (You)' : ''}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {formatNumber(n.score)}
                      </span>
                      <TierBadge tier={n.tierRank} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
