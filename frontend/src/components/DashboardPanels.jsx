function MetricCard({ title, value, subtitle, className = '' }) {
  return (
    <article className={`metric-card ${className}`.trim()}>
      <h3>{title}</h3>
      <p className="metric-value">{value}</p>
      {subtitle ? <p className="muted">{subtitle}</p> : null}
    </article>
  );
}

function DashboardPanels({ data }) {
  const profile = data.profile?.student || {};
  const stats = data.profile?.stats || {};
  const explain = data.explainability || {};
  const myPosition = data.myPosition || {};
  const syncStatus = data.syncStatus || {};

  const components = explain.formula?.components || {};

  return (
    <div className="dashboard-grid">
      <section className="panel stagger-1">
        <h2>Student Snapshot</h2>
        <div className="metrics-row">
          <MetricCard title="Score" value={profile.score ?? 0} subtitle={`Tier: ${profile.tierRank || 'Bronze'}`} />
          <MetricCard title="Rank" value={profile.leaderboardRank || '-'} subtitle={`Branch: ${profile.branch || '-'}`} />
          <MetricCard title="Sync" value={syncStatus.canSync ? 'Ready' : 'Cooldown'} subtitle={syncStatus.nextAllowedAt ? new Date(syncStatus.nextAllowedAt).toLocaleString() : 'Sync anytime'} />
        </div>
      </section>

      <section className="panel stagger-2">
        <h2>Contribution Breakdown</h2>
        <div className="metrics-row">
          <MetricCard title="PAS" value={components.PAS ?? 0} />
          <MetricCard title="OCS" value={components.OCS ?? 0} />
          <MetricCard title="PIS" value={components.PIS ?? 0} />
          <MetricCard title="CIS" value={components.CIS ?? 0} />
          <MetricCard title="SDS" value={components.SDS ?? 0} />
        </div>
        <p className="muted">
          CQE: {explain.formula?.qualityScore ?? 0} | Decay: {explain.formula?.decay?.decayFactor ?? 1} | Version: {explain.formula?.scoreVersion || '-'}
        </p>
      </section>

      <section className="panel stagger-3">
        <h2>Leaderboard Context</h2>
        <div className="metrics-row">
          <MetricCard title="My Rank" value={myPosition.myRank ?? '-'} />
          <MetricCard title="My Score" value={myPosition.myScore ?? 0} />
          <MetricCard title="My Tier" value={myPosition.myTier || '-'} />
        </div>
      </section>

      <section className="panel stagger-4">
        <h2>Anti-Cheat Visibility</h2>
        <p>
          {explain.antiCheat?.isFlagged
            ? 'This profile is currently flagged for review.'
            : 'No active anti-cheat flags.'}
        </p>
        <ul className="flag-list">
          {(explain.antiCheat?.flags || []).map((flag) => (
            <li key={flag.code}>
              <strong>{flag.code}</strong> - {flag.reason}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel stagger-5">
        <h2>Profile Section</h2>
        <div className="metrics-row">
          <MetricCard title="Name" value={profile.name || '-'} />
          <MetricCard title="Enrollment ID" value={profile.enrollmentId || '-'} />
          <MetricCard title="Email" value={profile.email || '-'} />
          <MetricCard title="Branch / Year" value={`${profile.branch || '-'} / ${profile.year || '-'}`} />
          <MetricCard title="GitHub Username" value={profile.githubUsername || 'Not Connected'} />
        </div>
      </section>

      <section className="panel stagger-5">
        <h2>GitHub Activity Stats</h2>
        <div className="metrics-row">
          <MetricCard title="Commits" value={stats.commits ?? 0} />
          <MetricCard title="PRs Opened" value={stats.prsOpened ?? 0} />
          <MetricCard title="Reviews" value={stats.codeReviews ?? 0} />
          <MetricCard title="Languages" value={stats.languageCount ?? 0} />
        </div>
      </section>
    </div>
  );
}

export default DashboardPanels;
