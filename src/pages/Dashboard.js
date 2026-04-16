// Dashboard.jsx - Fixed
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, onValue, off, set, get } from 'firebase/database';
import { auth, database } from '../firebase';
import './Dashboard.css';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({
    balance: 0,
    totalWon: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalBonus: 0,
    totalLost: 0
  });
  const [winnings, setWinnings] = useState({ total: 0, count: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }

    // Load user data
    const profileRef = ref(database, `user_profiles/${user.uid}`);
    const walletRef = ref(database, `wallets/${user.uid}`);
    const gamesRef = ref(database, `users/${user.uid}/games`);
    const winningsRef = ref(database, `winnings`);

    // Listen to wallet changes
    const walletUnsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      }
    });

    // Listen to profile changes
    const profileUnsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      }
    });

    // Load winnings
    const winningsBalanceRef = ref(database, `winningsBalance/${user.uid}`);
    const winningsUnsubscribe = onValue(winningsBalanceRef, (snapshot) => {
      const total = snapshot.exists() ? (snapshot.val().balance || 0) : 0;
      console.log(`💰 Total winnings: $${total}`);
      setWinnings({ total, count: 0 });
    });

    // Load recent games
    const gamesUnsubscribe = onValue(gamesRef, (snapshot) => {
      if (snapshot.exists()) {
        const games = [];
        snapshot.forEach((gameSnapshot) => {
          const gameData = gameSnapshot.val();
          games.push({
            id: gameSnapshot.key,
            ...gameData
          });
        });
        setRecentGames(games);
      }
      setLoading(false);
    });

    return () => {
      walletUnsubscribe();
      profileUnsubscribe();
      winningsUnsubscribe();
      gamesUnsubscribe();
    };
  }, [user?.uid, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('gameUser');
      sessionStorage.removeItem('gameUser');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const calculateWinRate = () => {
    if (!profile?.totalGames || profile.totalGames === 0) return 0;
    return Math.round((profile.totalWins || 0) / profile.totalGames * 100);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,  // ← Show 2 decimal places
      maximumFractionDigits: 2   // ← Keep 2 decimal places
    }).format(amount || 0);
  };

  if (!user) {
    return <div className="loading-container">Redirecting...</div>;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="welcome-section">
          <div className="welcome-text">
            <h1>Welcome back, {profile?.displayName?.split(' ')[0] || 'Player'}!</h1>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-details">
              <h3>Balance</h3>
              <p className="stat-value">{formatCurrency(wallet?.balance || 0)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-details">
              <h3>Total Winnings</h3>
              <p className="stat-value">{formatCurrency(winnings.total || 0)}</p>

              {console.log('Rendering winnings total:', winnings.total)} {/* ← ADD THIS */}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-details">
              <h3>Deposited</h3>
              <p className="stat-value">{formatCurrency(wallet?.totalDeposited || 0)}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-details">
              <h3>Games Played</h3>
              <p className="stat-value">{profile?.totalGames || 0}</p>
              <div className="stat-sublabel">
                <span className="wins">🏆 Wins: {profile?.totalWins || 0}</span>
                <span className="losses">💔 Losses: {profile?.totalLosses || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rank Card */}
        <div className="rank-card">
          <div className="rank-info">
            <span className="rank-icon">
              {profile?.rank === 'Bronze' && '🥉'}
              {profile?.rank === 'Silver' && '🥈'}
              {profile?.rank === 'Gold' && '🥇'}
              {profile?.rank === 'Platinum' && '💎'}
              {profile?.rank === 'Diamond' && '🔷'}
              {(!profile?.rank || profile?.rank === 'Rookie') && '🆕'}
            </span>
            <div className="rank-details">
              <span className="rank-name">{profile?.rank || 'Rookie'}</span>
              <span className="level">Level {profile?.level || 1}</span>
              <span className="win-rate">Win Rate: {calculateWinRate()}%</span>
            </div>
          </div>
          <div className="xp-bar">
            <div
              className="xp-progress"
              style={{ width: `${(profile?.experience || 0) % 100}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/games" className="action-btn primary">
              <span className="btn-icon">🎮</span>
              Play Now
            </Link>
            <Link to="/wallet" className="action-btn">
              <span className="btn-icon">💰</span>
              Deposit
            </Link>
            <Link to="/wallet" className="action-btn">
              <span className="btn-icon">💸</span>
              Withdraw
            </Link>
          </div>
        </div>

        {/* Recent Games */}
        <div className="recent-games">
          <div className="section-header">
            <h2 className='text-white'>Game Stats</h2>
            <Link to="/games" className="view-all">View All →</Link>
          </div>

          {recentGames.length > 0 ? (
            <div className="games-grid">
              {recentGames.slice(0, 3).map((game) => (
                <div key={game.id} className="game-stat-card">
                  <div className="game-stat-header">
                    <span className="game-icon">
                      {game.id === 'flappy-bird' && '🐦'}
                      {game.id === 'space-shooter' && '🚀'}
                      {game.id === 'ball-crush' && '⚽'}
                      {game.id === 'checkers' && '♟️'}
                    </span>
                    <h4>{game.id?.replace('-', ' ') || 'Game'}</h4>
                  </div>
                  <div className="game-stat-details">
                    <div className="stat-row">
                      <span>Played:</span>
                      <span>{game.totalGames || 0}</span>
                    </div>
                    <div className="stat-row">
                      <span>Wins:</span>
                      <span className="wins">{game.totalWins || 0}</span>
                    </div>
                    <div className="stat-row">
                      <span>High Score:</span>
                      <span>{game.highScore || 0}</span>
                    </div>
                  </div>
                  <Link to="/games" className="game-play-link">
                    Play →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-games">
              <p>No games played yet</p>
              <Link to="/games" className="btn-play-now">
                Start Playing!
              </Link>
            </div>
          )}
        </div>

        {/* Popular Games */}
        <div className="popular-games">
          <h2>Popular Games</h2>
          <div className="games-mini-grid">
            <div className="game-mini-card">
              <div className="game-mini-icon">🐦</div>
              <h4>Flappy Bird</h4>
              <p>Classic arcade</p>
              <p className="prize">Win up to $50</p>
              <Link to="/games" className="play-mini">Play →</Link>
            </div>
            <div className="game-mini-card">
              <div className="game-mini-icon">♟️</div>
              <h4>Checkers</h4>
              <p>Strategy game</p>
              <p className="prize">Win up to $100</p>
              <Link to="/games" className="play-mini">Play →</Link>
            </div>
            <div className="game-mini-card">
              <div className="game-mini-icon">⚽</div>
              <h4>Ball Crush</h4>
              <p>Arcade action</p>
              <p className="prize">Win up to $75</p>
              <Link to="/games" className="play-mini">Play →</Link>
            </div>
          </div>
        </div>
      </main>

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
        <button onClick={handleLogout} className="nav-item logout-nav-btn">
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>
    </div>
  );
}

export default Dashboard;