import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Animated star particles ── */
function Particles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.4 + 0.3,
      alpha: Math.random(),
      speed: Math.random() * 0.004 + 0.001,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129,236,255,${s.alpha * 0.7})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  );
}

/* ── Glassmorphic stat card ── */
function StatCard({ icon, value, label }) {
  return (
    <div style={{
      background: 'rgba(129,236,255,0.04)',
      border: '1px solid rgba(129,236,255,0.12)',
      borderRadius: 16,
      padding: '24px 32px',
      textAlign: 'center',
      backdropFilter: 'blur(12px)',
      flex: '1 1 140px',
      minWidth: 140,
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 28,
        fontWeight: 800,
        background: 'linear-gradient(135deg, #81ecff, #d674ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 4, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

/* ── Feature row card ── */
function FeatureCard({ icon, title, desc, accent }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${accent}22`,
      borderRadius: 20,
      padding: '28px 28px',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
      transition: 'transform 0.2s, border-color 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = accent + '55'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = accent + '22'; }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14, flexShrink: 0,
        background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, border: `1px solid ${accent}30`,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--on-surface)', fontFamily: 'var(--font-display)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #04060f 0%, #090e1c 40%, #0d1323 100%)',
      color: 'var(--on-surface)',
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <Particles />

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(9,14,28,0.75)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(129,236,255,0.08)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/logo.png"
            alt="GitTracker Logo"
            style={{ width: 52, height: 52, objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(129,236,255,0.35))' }}
          />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
            background: 'linear-gradient(135deg, #81ecff 30%, #d674ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>GitTracker</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'Leaderboard', 'About'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} style={{
              fontSize: 13, color: 'var(--on-surface-variant)', textDecoration: 'none',
              fontFamily: 'var(--font-label)', transition: 'color 0.2s',
            }}
              onMouseEnter={e => e.target.style.color = '#81ecff'}
              onMouseLeave={e => e.target.style.color = 'var(--on-surface-variant)'}
            >{link}</a>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '8px 22px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #81ecff, #00d4ec)',
            color: '#003840', fontWeight: 700, fontSize: 13,
            fontFamily: 'var(--font-label)',
            boxShadow: '0 0 18px rgba(129,236,255,0.25)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(129,236,255,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(129,236,255,0.25)'; }}
        >
          Sign In →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
      }}>
        {/* Institution badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 18px', borderRadius: 999,
          background: 'rgba(129,236,255,0.07)',
          border: '1px solid rgba(129,236,255,0.18)',
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 14 }}>🎓</span>
          <span style={{ fontSize: 12, color: '#81ecff', fontFamily: 'var(--font-label)', letterSpacing: '0.04em' }}>
            Madhav Institute of Technology &amp; Science, Gwalior
          </span>
        </div>

        {/* Hindi subtitle */}
        <div style={{ fontSize: 14, color: '#81ecff', marginBottom: 6, opacity: 0.8 }}>
          माधव प्रौद्योगिकी एवं विज्ञान संस्थान, ग्वालियर (म.प्र.), भारत
        </div>

        <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginBottom: 4, fontFamily: 'var(--font-label)' }}>
          Deemed University &nbsp;·&nbsp; NAAC Accredited A++ Grade
        </div>

        {/* Main heading */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(44px, 7vw, 84px)',
          fontWeight: 900,
          lineHeight: 1.1,
          margin: '28px 0 18px',
          letterSpacing: '-0.02em',
        }}>
          <span style={{ color: '#e1e4fa' }}>Git</span>
          <span style={{
            background: 'linear-gradient(135deg, #81ecff 20%, #d674ff 80%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Tracker</span>
        </h1>

        <p style={{
          fontSize: 'clamp(15px, 2.2vw, 20px)',
          color: 'var(--on-surface-variant)',
          maxWidth: 560,
          lineHeight: 1.65,
          marginBottom: 40,
        }}>
          Track, rank, and showcase your GitHub contributions.
          A transparent leaderboard built for MITS students.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '14px 36px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #81ecff, #00d4ec)',
              color: '#003840', fontWeight: 800, fontSize: 15,
              fontFamily: 'var(--font-label)',
              boxShadow: '0 0 32px rgba(129,236,255,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(129,236,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(129,236,255,0.35)'; }}
          >
            Get Started →
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            style={{
              padding: '14px 36px', borderRadius: 12, cursor: 'pointer',
              background: 'transparent',
              border: '1px solid rgba(129,236,255,0.25)',
              color: '#81ecff', fontWeight: 700, fontSize: 15,
              fontFamily: 'var(--font-label)',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,236,255,0.55)'; e.currentTarget.style.background = 'rgba(129,236,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(129,236,255,0.25)'; e.currentTarget.style.background = 'transparent'; }}
          >
            View Leaderboard
          </button>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
          marginTop: 72,
        }}>
          <StatCard icon="👨‍💻" value="500+" label="Students" />
          <StatCard icon="⭐" value="10K+" label="Commits Tracked" />
          <StatCard icon="🏆" value="5" label="Tier Ranks" />
          <StatCard icon="📡" value="Live" label="Sync Engine" />
        </div>

        {/* Scroll arrow */}
        <div style={{
          marginTop: 60, fontSize: 22, color: 'rgba(129,236,255,0.4)',
          animation: 'bounce 2s infinite',
        }}>↓</div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{
        position: 'relative', zIndex: 1,
        padding: '100px 24px',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, color: '#81ecff', fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            What GitTracker Does
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: 0 }}>
            Built for Developers,&nbsp;
            <span style={{ background: 'linear-gradient(135deg,#81ecff,#d674ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              by Developers
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FeatureCard
            icon="📊"
            title="Real-Time GitHub Analytics"
            desc="Automatically syncs your commits, pull requests, issues, stars, and forks directly from GitHub. No manual input required."
            accent="#81ecff"
          />
          <FeatureCard
            icon="🏅"
            title="5-Tier Ranking System"
            desc="Earn your place from Bronze to Elite based on a transparent scoring formula. Every metric is explained — no black box."
            accent="#d674ff"
          />
          <FeatureCard
            icon="🔬"
            title="Score Explainability Engine"
            desc="Understand exactly how your score is calculated. Breakdown by PAS, OCS, PIS, CIS, SDS with decay and quality weighting."
            accent="#ff6b98"
          />
          <FeatureCard
            icon="🛡️"
            title="Anti-Cheat System"
            desc="Built-in contribution pattern analysis flags unusual activity like self-PRs, spam commits, and repo gaming."
            accent="#fbbf24"
          />
          <FeatureCard
            icon="🔗"
            title="Institutional OAuth Login"
            desc="Sign in only with your MITS institutional email (@mitsgwalior.in or @mitsgwl.ac.in). Secure and hassle-free."
            accent="#34d399"
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '80px 24px',
        textAlign: 'center',
        background: 'rgba(129,236,255,0.02)',
        borderTop: '1px solid rgba(129,236,255,0.06)',
        borderBottom: '1px solid rgba(129,236,255,0.06)',
      }}>
        <div style={{ fontSize: 12, color: '#81ecff', fontFamily: 'var(--font-label)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
          How It Works
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, marginBottom: 56 }}>
          Three Steps to Your Rank
        </h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 860, margin: '0 auto' }}>
          {[
            { step: '01', icon: '🔑', title: 'Sign In', desc: 'Login with your institutional Google account. Auto-registered as a student.' },
            { step: '02', icon: '🔗', title: 'Connect GitHub', desc: 'Link your GitHub via OAuth. Your public contributions are pulled instantly.' },
            { step: '03', icon: '🚀', title: 'Climb the Board', desc: 'Watch your score update in real-time. See where you stand among peers.' },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} style={{
              flex: '1 1 220px', minWidth: 220,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(129,236,255,0.1)',
              borderRadius: 20, padding: '32px 24px',
              backdropFilter: 'blur(12px)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: 16, right: 20,
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'rgba(129,236,255,0.25)', fontWeight: 700,
              }}>{step}</div>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{
        position: 'relative', zIndex: 1,
        padding: '120px 24px',
        textAlign: 'center',
      }}>
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 600, height: 300, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(129,236,255,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, marginBottom: 16 }}>
          Ready to track your&nbsp;
          <span style={{ background: 'linear-gradient(135deg,#81ecff,#d674ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            progress?
          </span>
        </h2>
        <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', marginBottom: 40, maxWidth: 460, margin: '0 auto 40px' }}>
          Join your peers on the GitTracker leaderboard and start building your developer reputation today.
        </p>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '16px 48px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #81ecff, #00d4ec)',
            color: '#003840', fontWeight: 800, fontSize: 16,
            fontFamily: 'var(--font-label)',
            boxShadow: '0 0 48px rgba(129,236,255,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 0 64px rgba(129,236,255,0.55)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 48px rgba(129,236,255,0.4)'; }}
        >
          Get Started →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        position: 'relative', zIndex: 1,
        padding: '28px 40px',
        borderTop: '1px solid rgba(129,236,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/logo.png" alt="GitTracker" style={{ width: 40, height: 40, objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(129,236,255,0.3))' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--on-surface-variant)' }}>GitTracker</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--outline)', fontFamily: 'var(--font-label)' }}>
          Madhav Institute of Technology &amp; Science, Gwalior &nbsp;·&nbsp; {new Date().getFullYear()}
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
      `}</style>
    </div>
  );
}
