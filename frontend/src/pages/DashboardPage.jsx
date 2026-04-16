import { useEffect, useState } from 'react';
import DashboardPanels from '../components/DashboardPanels.jsx';
import { request } from '../services/api.js';

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({});

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [me, profile, syncStatus, explainability, myPosition] = await Promise.all([
        request('/auth/me'),
        request('/api/student/profile'),
        request('/api/sync/status'),
        request('/api/student/score-explanation'),
        request('/api/leaderboard/my-position'),
      ]);

      setData({ me, profile, syncStatus, explainability, myPosition });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return <section className="panel">Loading student dashboard...</section>;
  }

  if (error) {
    return <section className="panel error-text">{error}</section>;
  }

  return (
    <>
      <section className="toolbar panel stagger-2">
        <p>
          Signed in as <strong>{data.me?.student?.name || 'Student'}</strong>
        </p>
        <div className="toolbar-actions">
          <button onClick={loadDashboard}>Refresh</button>
        </div>
      </section>

      <DashboardPanels data={data} />
    </>
  );
}

export default DashboardPage;
