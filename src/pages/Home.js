// Home.jsx - Mobile Optimized
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import SEO from '../components/SEO';
import './Home.css';

function Home({ user }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [livePlayerCount, setLivePlayerCount] = useState(0);

  useEffect(() => {
    // Fetch live player count
    const fetchPlayerCount = async () => {
      try {
        const gamesRef = ref(database, 'games');
        const snapshot = await get(gamesRef);
        if (snapshot.exists()) {
          let total = 0;
          snapshot.forEach((game) => {
            total += game.val().activePlayers || 0;
          });
          setLivePlayerCount(total);
        }
      } catch (error) {
        console.error('Error fetching player count:', error);
      }
    };
    fetchPlayerCount();
  }, []);

  const games = [
    {
      id: "flappy-bird",
      title: "Flappy Bird",
      description: "Navigate through pipes. Classic arcade game.",
      image: "🐦",
      players: "2.3k",
      prize: "$50",
      entryFee: "FREE",
      color: "#f59e0b"
    },
    {
      id: "checkers",
      title: "Checkers",
      description: "Strategy game. Outsmart your opponent.",
      image: "♟️",
      players: "1.8k",
      prize: "$50",
      entryFee: "FREE",
      color: "#7F77DD"
    },
    {
      id: "ball-crush",
      title: "Ball Crush",
      description: "Addictive arcade action. Crush and score!",
      image: "⚽",
      players: "2.1k",
      prize: "$30",
      entryFee: "FREE",
      color: "#1D9E75"
    }
  ];

  const getNavItems = () => {
    if (user) {
      return [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/games', icon: '🎮', label: 'Games' },

        { path: '/wallet', icon: '💰', label: 'Wallet' },
      ];
    } else {
      return [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/games', icon: '🎮', label: 'Games' },
        { path: '/login', icon: '🔐', label: 'Login' },
        { path: '/contact', icon: '📞', label: 'Contact' }
      ];
    }
  };

  const navItems = getNavItems();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <SEO
        title="Play Games & Win Real Money | WinTap Games"
        description="Win real money playing exciting games like Flappy Bird, Checkers, and Ball Crush. FREE entry! Instant withdrawals, secure payments."
        keywords="win money online, play games for cash, real money games, Flappy Bird, Checkers, gaming platform"
        url="/"
        type="website"
      />
      <div className="home">
        {/* Mobile Header */}
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>☰</button>
          <div className="logo">
            <span className="logo-icon">🎮</span>
            <span className="logo-text">WinTap</span>
          </div>
          {user ? (
            <Link to="/profile" className="mobile-avatar">
              {user.displayName?.[0] || user.email?.[0]}
            </Link>
          ) : (
            <Link to="/login" className="mobile-login">Login</Link>
          )}
        </header>

        {/* Mobile Menu Drawer */}
        <div className={`mobile-menu-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="drawer-header">
            <span className="drawer-logo">🎮 WinTap</span>
            <button onClick={() => setMobileMenuOpen(false)}>✕</button>
          </div>
          <nav className="drawer-nav">
            <button onClick={() => scrollToSection('features')}>✨ Features</button>
            <button onClick={() => scrollToSection('games')}>🎮 Games</button>
            <button onClick={() => scrollToSection('how-it-works')}>💡 How It Works</button>
            <button onClick={() => scrollToSection('winners')}>🏆 Winners</button>
            {!user && (
              <>
                <Link to="/login" className="drawer-link" onClick={() => setMobileMenuOpen(false)}>Login</Link>
                <Link to="/register" className="drawer-link register" onClick={() => setMobileMenuOpen(false)}>Sign Up Free</Link>
              </>
            )}
          </nav>
        </div>
        {mobileMenuOpen && <div className="drawer-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Play FREE Games<br />Win <span className="highlight">Real Money</span>! 💰</h1>
            <p>All games are FREE to play. Win cash prizes instantly!</p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">{livePlayerCount || 500}+</span>
                <span className="stat-label">Online Now</span>
              </div>
              <div className="stat">
                <span className="stat-number">$2.5M+</span>
                <span className="stat-label">Total Paid</span>
              </div>
              <div className="stat">
                <span className="stat-number">FREE</span>
                <span className="stat-label">Entry Fee</span>
              </div>
            </div>
            {!user ? (
              <Link to="/register" className="btn-hero">
                Start Winning Free →
              </Link>
            ) : (
              <Link to="/games" className="btn-hero">
                Play Games Now →
              </Link>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features">
          <h2>Why Choose WinTap?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>FREE to Play</h3>
              <p>No entry fees. Just pure skill and fun!</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Payouts</h3>
              <p>Withdraw winnings to Ecocash instantly</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Fair</h3>
              <p>Provably fair games, secure transactions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3>Real Cash Prizes</h3>
              <p>Compete and win real money daily</p>
            </div>
          </div>
        </section>

        {/* Featured Games */}
        <section id="games" className="featured-games">
          <h2>🎯 FREE Games to Play</h2>
          <p className="section-subtitle">Zero entry fee. 100% chance to win real cash!</p>

          <div className="games-grid">
            {games.map(game => (
              <div key={game.id} className="game-card" style={{ borderTopColor: game.color }}>
                <div className="game-icon" style={{ background: `${game.color}20`, color: game.color }}>
                  {game.image}
                </div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <div className="game-stats">
                  <span>👥 {game.players} active</span>
                  <span className="free-badge">{game.entryFee}</span>
                  <span>🏆 {game.prize}</span>
                </div>
                {user ? (
                  <Link to="/games" className="btn-play" style={{ background: game.color }}>
                    Play Free →
                  </Link>
                ) : (
                  <Link to="/register" className="btn-play" style={{ background: game.color }}>
                    Sign Up & Play
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="how-it-works">
          <h2>💡 How to Win</h2>
          <div className="steps-container">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-icon">📝</div>
              <h3>Sign Up</h3>
              <p>Free account in 30 seconds</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-icon">🎮</div>
              <h3>Play Games</h3>
              <p>All games are FREE</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-icon">🏆</div>
              <h3>Win Prizes</h3>
              <p>Compete & win cash</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-num">4</div>
              <div className="step-icon">💸</div>
              <h3>Withdraw</h3>
              <p>Instant to Ecocash</p>
            </div>
          </div>
        </section>

        {/* Winners Section */}
        <section id="winners" className="winners">
          <h2>🏆 Recent Winners</h2>
          <div className="winners-list">
            <div className="winner-card">
              <div className="winner-rank">🥇</div>
              <div className="winner-info">
                <h4>BraveKing102</h4>
                <span>Checkers</span>
              </div>
              <div className="winner-prize">$50</div>
            </div>
            <div className="winner-card">
              <div className="winner-rank">🥈</div>
              <div className="winner-info">
                <h4>ProHero824</h4>
                <span>Flappy Bird</span>
              </div>
              <div className="winner-prize">$25</div>
            </div>
            <div className="winner-card">
              <div className="winner-rank">🥉</div>
              <div className="winner-info">
                <h4>CoolKing16</h4>
                <span>Ball Crush</span>
              </div>
              <div className="winner-prize">$15</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2>Ready to Start Winning?</h2>
          <p>Join thousands of players winning real money every day. All games are FREE!</p>
          {!user ? (
            <Link to="/register" className="btn-cta">Create Free Account →</Link>
          ) : (
            <Link to="/games" className="btn-cta">Play Now →</Link>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>🎮 WinTap Games</h4>
              <p>Play FREE. Win REAL money. Instant withdrawals.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <button onClick={() => scrollToSection('features')}>Features</button>
              <button onClick={() => scrollToSection('games')}>Games</button>
              <button onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <a href="/terms">Terms of Service</a>
              <a href="/privacy">Privacy Policy</a>
            </div>
          </div>
          <div className="footer-bottom">
            © 2024 WinTap Games. All rights reserved.
          </div>
        </footer>

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

export default Home;