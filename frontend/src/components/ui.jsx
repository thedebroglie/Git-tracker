export function CosmicBackground() {
  return (
    <div className="cosmic-bg" aria-hidden="true">
      <div className="cosmic-orb cosmic-orb--cyan" />
      <div className="cosmic-orb cosmic-orb--purple" />
      <div className="cosmic-orb cosmic-orb--pink" />
    </div>
  );
}

export function TierBadge({ tier }) {
  const t = (tier || 'Bronze').toLowerCase();
  return <span className={`tier-badge tier-badge--${t}`}>{tier || 'Bronze'}</span>;
}

export function RankDelta({ delta }) {
  if (delta === 0 || delta === undefined || delta === null) {
    return <span className="rank-delta rank-delta--neutral">—</span>;
  }
  const isUp = delta > 0;
  return (
    <span className={`rank-delta rank-delta--${isUp ? 'up' : 'down'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}

export function ProgressBar({ value, max = 100, size = 'default' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`progress-bar ${size === 'sm' ? 'progress-bar--sm' : ''}`}>
      <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ src, alt, size = 'default', tier }) {
  const sizeClass = size === 'lg' ? 'avatar--lg' : size === 'sm' ? 'avatar--sm' : '';
  const ringClass = tier ? `avatar-ring avatar-ring--${tier.toLowerCase()}` : '';
  
  const img = (
    <img
      className={`avatar ${sizeClass}`}
      src={src || `https://ui-avatars.com/api/?name=${encodeURIComponent(alt || 'U')}&background=13192b&color=81ecff&bold=true`}
      alt={alt || 'User avatar'}
    />
  );

  if (ringClass) {
    return <div className={ringClass}>{img}</div>;
  }
  return img;
}

export function StatPill({ label, value, icon }) {
  return (
    <div className="stat-pill">
      {icon && <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>}
      <div className="stat-pill__value">{value ?? '—'}</div>
      <div className="stat-pill__label">{label}</div>
    </div>
  );
}

export function EmptyState({ icon = '📭', title, text, children }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__text">{text}</div>
      {children && <div style={{ marginTop: 20 }}>{children}</div>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="skeleton skeleton--text" style={{ width: '40%' }} />
      <div className="skeleton skeleton--heading" />
      <div className="skeleton skeleton--text" style={{ width: '80%' }} />
      <div className="skeleton skeleton--text" style={{ width: '60%' }} />
    </div>
  );
}

export function LoadingCards({ count = 4 }) {
  return (
    <div className="dashboard-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function CircularProgress({ value, max = 1, size = 100 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, Math.max(0, value / max));
  const offset = circumference * (1 - pct);

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="gradient-progress" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#81ecff" />
            <stop offset="100%" stopColor="#d674ff" />
          </linearGradient>
        </defs>
        <circle
          className="circular-progress__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="circular-progress__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="circular-progress__value">{(pct * 100).toFixed(0)}%</span>
    </div>
  );
}
