import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <section id="home" className="home-v3">
      <section className="hero-banner">
        <p className="hero-kicker">Madhav Institute of Technology & Science, Gwalior</p>
        <h1>Track Your Development Journey</h1>
        <p>
          GitTracker helps MITS students monitor their GitHub coding progress, contribution quality,
          and rank growth across the institute leaderboard.
        </p>
        <Link to="/login"><button className="light">Sign in with Institute Account</button></Link>
      </section>

      <section id="projects" className="why-section">
        <h2>Why Use GitTracker?</h2>
        <p className="muted">A coding progress and ranking platform built for MITS students.</p>
        <div className="why-grid">
          <article className="why-card">
            <h3>Connect Your GitHub</h3>
            <p>Link your account once and securely sync contribution metadata through GitHub App integration.</p>
          </article>
          <article className="why-card">
            <h3>Visualize Progress</h3>
            <p>Track score changes, consistency patterns, quality signals, and explainable scoring factors.</p>
          </article>
          <article className="why-card">
            <h3>Rank with Fairness</h3>
            <p>Compete on transparent scoring with anti-cheat checks, CQE, decay, and event-based updates.</p>
          </article>
        </div>
      </section>

      <section className="leaderboard-preview">
        <h2>MITS GitTracker Leaderboard</h2>
        <p className="muted">Top student contributors by quality-adjusted development activity.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Enrollment</th>
                <th>Branch</th>
                <th>Tier</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Shahid Khan</td><td>BTI24C00124</td><td>IT</td><td>Gold</td><td>51.55</td></tr>
              <tr><td>2</td><td>Aaradhya Puranik</td><td>BTI24C00101</td><td>IOT</td><td>Gold</td><td>48.87</td></tr>
              <tr><td>3</td><td>Divyansh Rajput</td><td>BTI24C00108</td><td>IOT</td><td>Silver</td><td>47.63</td></tr>
              <tr><td>4</td><td>Rakhi Yadav</td><td>09Q1I02J143</td><td>IOT</td><td>Silver</td><td>47.05</td></tr>
              <tr><td>5</td><td>Harsh Jain</td><td>09Q1SC21050</td><td>CSE</td><td>Silver</td><td>42.67</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="excellence-block">
        <div className="lab-shot" aria-hidden="true" />
        <div>
          <h3>MITS Coding Excellence</h3>
          <p>
            GitTracker reinforces a strong engineering culture by giving students measurable feedback loops,
            healthy competition, and mentor visibility into real progress over time.
          </p>
          <p>
            From contribution streaks to collaboration quality and rank movement, the platform helps students
            build consistent software craftsmanship.
          </p>
        </div>
      </section>

      <section className="growth-strip">
        <h2>Track Your Growth</h2>
        <p>Detailed analytics to identify strengths and improve coding consistency.</p>
        <div className="growth-grid">
          <article><span>Commits Indexed</span><strong>86,500+</strong></article>
          <article><span>PRs Processed</span><strong>1,500+</strong></article>
          <article><span>Highest Score</span><strong>2124+</strong></article>
          <article><span>Longest Streak</span><strong>324+ days</strong></article>
        </div>
      </section>

      <section className="cta-v2">
        <h2>Ready to Start Tracking?</h2>
        <p>Join using your institute email and begin your GitTracker growth journey.</p>
        <Link to="/login"><button className="light">Sign in with Institute Account</button></Link>
      </section>

      <footer id="developers" className="footer-v2">
        <div>
          <strong>GitTracker</strong>
          <p>A competitive development analytics platform for MITS students.</p>
        </div>
        <p>
          Developed by Nemish Patel, Priya Sharma, and Arjun Mehta.
        </p>
      </footer>
    </section>
  );
}

export default HomePage;
