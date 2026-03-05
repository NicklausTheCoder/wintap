// Home.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Home.css';

function Home({ user }) {
  const location = useLocation();

  const games = [
    {
      id: 1,
      title: "Flappy Bird",
      description: "Navigate through pipes. Classic arcade game with cash rewards.",
      image: "🐦",
      players: "2,345",
      prize: "$50"
    },
    {
      id: 2,
      title: "Space Shooter",
      description: "1v1 space battles. Shoot down opponents and win big!",
      image: "🚀",
      players: "1,892",
      prize: "$100"
    },
    {
      id: 3,
      title: "Ball Crush",
      description: "Crush balls and score points in this addictive arcade game.",
      image: "⚽",
      players: "3,421",
      prize: "$75"
    }
  ];

  // Navigation items for bottom bar - Different based on login status
  const getNavItems = () => {
    if (user) {
      return [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/games', icon: '🎮', label: 'Games' },
        { path: '/profile', icon: '👤', label: 'Profile' },
        { path: '/leaderboard', icon: '🏆', label: 'Rank' }
      ];
    } else {
      return [
        { path: '/', icon: '🏠', label: 'Home' },
        { path: '/games', icon: '🎮', label: 'Games' },
        { path: '/login', icon: '🔐', label: 'Login' },
        { path: '/register', icon: '📝', label: 'Sign Up' },
        { path: '/contact', icon: '📞', label: 'Contact' }
      ];
    }
  };

  const navItems = getNavItems();

  // Smooth scroll function
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home">
      {/* Navigation Bar - Desktop only */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-icon">🎮</span>
          <span className="brand-name">WinTap Games</span>
        </div>
        <div className="nav-links">
          <button onClick={() => scrollToSection('features')}>
            Features
          </button>
          <button onClick={() => scrollToSection('games')}>
            Games
          </button>
          <button onClick={() => scrollToSection('how-it-works')}>
            How It Works
          </button>
          <button onClick={() => scrollToSection('winners')}>
            Winners
          </button>
        </div>
        <div className="nav-buttons">
          {user ? (
            <>
              <Link to="/dashboard" className="btn-dashboard">Dashboard</Link>
              <span className="user-greeting">Hi, {user.displayName || 'Player'}!</span>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-login">Login</Link>
              <Link to="/register" className="btn-register">Sign Up Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Play Games, Win Real Money! 💰</h1>
          <p>Join thousands of players already winning cash prizes every day.</p>
          {!user ? (
            <Link to="/register" className="btn-hero">
              Start Winning Now →
            </Link>
          ) : (
            <Link to="/games" className="btn-hero">
              Play Games Now →
            </Link>
          )}
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">50,000+</span>
              <span className="stat-label">Active Players</span>
            </div>
            <div className="stat">
              <span className="stat-number">$2.5M+</span>
              <span className="stat-label">Total Paid</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Instant Withdrawals</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="featured-games">
        <h2>🎯 Why Choose WinTap?</h2>
        <p className="section-subtitle">The best platform to play and win real money</p>
        
        <div className="games-grid">
          <div className="game-card">
            <div className="game-image">⚡</div>
            <h3>Instant Payments</h3>
            <p>Withdraw your winnings instantly to your bank account or crypto wallet</p>
          </div>
          <div className="game-card">
            <div className="game-image">🎮</div>
            <h3>Skill-Based Games</h3>
            <p>Compete against real players. Your skill determines your winnings</p>
          </div>
          <div className="game-card">
            <div className="game-image">🔒</div>
            <h3>Secure & Fair</h3>
            <p>Provably fair games with encrypted transactions</p>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section id="games" className="featured-games">
        <h2>🎯 Featured Games</h2>
        <p className="section-subtitle">Play these popular games and win big!</p>
        
        <div className="games-grid">
          {games.map(game => (
            <div key={game.id} className="game-card">
              <div className="game-image">{game.image}</div>
              <h3>{game.title}</h3>
              <p>{game.description}</p>
              <div className="game-stats">
                <span>👥 {game.players} players</span>
                <span>🏆 Prize {game.prize}</span>
              </div>
              {user ? (
                <Link to="/games" className="btn-play">Play Now</Link>
              ) : (
                <Link to="/register" className="btn-play">Play & Win</Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-it-works">
        <h2>💡 How It Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-icon">1️⃣</div>
            <h3>Create Account</h3>
            <p>Sign up for free in just 30 seconds</p>
          </div>
          <div className="step">
            <div className="step-icon">2️⃣</div>
            <h3>Add Funds</h3>
            <p>Deposit money to your wallet</p>
          </div>
          <div className="step">
            <div className="step-icon">3️⃣</div>
            <h3>Play Games</h3>
            <p>Compete and win cash prizes</p>
          </div>
          <div className="step">
            <div className="step-icon">4️⃣</div>
            <h3>Withdraw</h3>
            <p>Get your winnings instantly</p>
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
              <h4>JohnDoe123</h4>
              <span className="winner-game">Flappy Bird</span>
            </div>
            <div className="winner-prize">$50</div>
          </div>
          <div className="winner-card">
            <div className="winner-rank">🥈</div>
            <div className="winner-info">
              <h4>GamerGirl</h4>
              <span className="winner-game">Space Shooter</span>
            </div>
            <div className="winner-prize">$100</div>
          </div>
          <div className="winner-card">
            <div className="winner-rank">🥉</div>
            <div className="winner-info">
              <h4>ProPlayer</h4>
              <span className="winner-game">Ball Crush</span>
            </div>
            <div className="winner-prize">$25</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>WinTap Games</h4>
            <p>Play games. Win real money. Instant withdrawals.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <a onClick={() => scrollToSection('features')}>Features</a>
            <a onClick={() => scrollToSection('games')}>Games</a>
            <a onClick={() => scrollToSection('how-it-works')}>How It Works</a>
            <a onClick={() => scrollToSection('winners')}>Winners</a>
          </div>
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
          </div>
          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <span>🐦</span>
              <span>📘</span>
              <span>📷</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          © 2024 WinTap Games. All rights reserved.
        </div>
      </footer>

      {/* Bottom Navigation - Fixed at bottom like mobile app */}
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Home;