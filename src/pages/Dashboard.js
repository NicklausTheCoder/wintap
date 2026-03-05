// Dashboard.jsx
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
    totalBonus: 0
  });
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
    const walletRef = ref(database, `users/${user.uid}/wallet`); // Note the 'users/' prefix
    const profileRef = ref(database, `user_profiles/${user.uid}`);
    const gamesRef = ref(database, `game_stats/${user.uid}`);

    const walletUnsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      } else {
        initializeUserData();
      }
      setLoading(false);
    });

    const profileUnsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      }
    });

    // Load recent games
    const gamesUnsubscribe = onValue(gamesRef, (snapshot) => {
      if (snapshot.exists()) {
        const games = [];
        snapshot.forEach((child) => {
          games.push({ id: child.key, ...child.val() });
        });
        setRecentGames(games);
      }
    });

    return () => {
      off(walletRef);
      off(profileRef);
      off(gamesRef);
    };
  }, [user?.uid]);

  const initializeUserData = async () => {
    try {
      const userId = user.uid;
      
      // Initialize wallet
      const walletRef = ref(database, `wallets/${userId}`);
      await set(walletRef, {
        balance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalWon: 0,
        totalLost: 0,
        totalBonus: 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        isActive: true
      });

      // Initialize profile
      const profileRef = ref(database, `user_profiles/${userId}`);
      const profileSnapshot = await get(profileRef);
      
      if (!profileSnapshot.exists()) {
        await set(profileRef, {
          displayName: user.displayName || user.email?.split('@')[0] || 'Player',
          avatar: 'default',
          rank: 'Bronze',
          level: 1,
          experience: 0,
          joinDate: new Date().toISOString(),
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          winStreak: 0
        });
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('gameUser');
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
            <h1>Welcome back, {profile?.displayName?.split(' ')[0] || 'Player'}! 👋</h1>
            <span className="subtitle">Ready to play?</span>
          </div>
          <div className="header-actions">
            <button className="notification-btn">
              <span className="notification-icon">🔔</span>
              <span className="notification-badge">3</span>
            </button>
            <div className="avatar">
              {profile?.displayName?.[0] || user?.email?.[0] || 'P'}
            </div>
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
              <h3>Winnings</h3>
              <p className="stat-value">{formatCurrency(wallet?.totalWon || 0)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-details">
              <h3>Games</h3>
              <p className="stat-value">{profile?.totalGames || 0}</p>
              <div className="stat-sublabel">
                <span className="wins">🏆 {profile?.totalWins || 0}</span>
                <span className="losses">💔 {profile?.totalLosses || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-details">
              <h3>Win Rate</h3>
              <p className="stat-value">{calculateWinRate()}%</p>
              <div className="stat-sublabel">
                <span className="streak">🔥 {profile?.winStreak || 0}</span>
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
          </div>
        </div>

        {/* Recent Games */}
        <div className="recent-games">
          <div className="section-header">
            <h2>Recent Games</h2>
            <Link to="/games" className="view-all">View All →</Link>
          </div>
          
          {recentGames.length > 0 ? (
            <table className="games-table">
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Result</th>
                  <th>Score</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.slice(0, 3).map((game) => (
                  <tr key={game.id}>
                    <td>
                      {game.id === 'flappy-bird' && '🐦 Flappy Bird'}
                      {game.id === 'space-shooter' && '🚀 Space Shooter'}
                      {game.id === 'ball-crush' && '⚽ Ball Crush'}
                    </td>
                    <td>
                      <span className={`result-badge ${game.wins > 0 ? 'won' : 'lost'}`}>
                        {game.wins > 0 ? 'WON' : 'LOST'}
                      </span>
                    </td>
                    <td>{game.bestScore || 0}</td>
                    <td className={game.totalEarnings > 0 ? 'profit' : ''}>
                      {game.totalEarnings > 0 ? `+$${game.totalEarnings}` : '$0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
   {/* Popular Games */}
<div className="popular-games">
  <h2>Popular Games</h2>
  <div className="games-mini-grid">
    <div className="game-mini-card">
      <div className="game-mini-icon">🐦</div>
      <h4>Flappy Bird</h4>
      <p>Classic arcade</p>
      <p className="prize">Win up to $50</p>
      <Link to="/games/flappy-bird" className="play-mini">Play →</Link>
    </div>
    <div className="game-mini-card">
      <div className="game-mini-icon">🚀</div>
      <h4>Space Shooter</h4>
      <p>1v1 battles</p>
      <p className="prize">Win up to $100</p>
      <Link to="/games/space-shooter" className="play-mini">Play →</Link>
    </div>
    <div className="game-mini-card">
      <div className="game-mini-icon">⚽</div>
      <h4>Ball Crush</h4>
      <p>Arcade action</p>
      <p className="prize">Win up to $75</p>
      <Link to="/games/ball-crush" className="play-mini">Play →</Link>
    </div>
    {/* Add a fourth card to demonstrate scrolling */}
    <div className="game-mini-card">
      <div className="game-mini-icon">🎯</div>
      <h4>Coming Soon</h4>
      <p>New game</p>
      <p className="prize">Stay tuned!</p>
      <span className="play-mini" style={{ opacity: 0.5 }}>Soon →</span>
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
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default Dashboard;