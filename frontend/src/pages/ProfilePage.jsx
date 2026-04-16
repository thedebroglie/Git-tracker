import { useEffect, useState } from 'react';
import { request } from '../services/api.js';

function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError('');

      try {
        const data = await request('/api/student/profile');
        setProfile(data.student || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return <section className="panel">Loading profile section...</section>;
  }

  if (error) {
    return <section className="panel error-text">{error}</section>;
  }

  if (!profile) {
    return <section className="panel">No profile data available.</section>;
  }

  return (
    <section className="panel stagger-3">
      <h2>Student Profile Section</h2>
      <div className="metrics-row">
        <article className="metric-card">
          <h3>Name</h3>
          <p className="metric-value">{profile.name}</p>
        </article>
        <article className="metric-card">
          <h3>Enrollment ID</h3>
          <p className="metric-value">{profile.enrollmentId}</p>
        </article>
        <article className="metric-card">
          <h3>Email</h3>
          <p className="metric-value">{profile.email}</p>
        </article>
        <article className="metric-card">
          <h3>Branch / Year</h3>
          <p className="metric-value">{profile.branch} / {profile.year}</p>
        </article>
        <article className="metric-card">
          <h3>GitHub</h3>
          <p className="metric-value">{profile.githubUsername || 'Not Connected'}</p>
        </article>
      </div>
    </section>
  );
}

export default ProfilePage;
