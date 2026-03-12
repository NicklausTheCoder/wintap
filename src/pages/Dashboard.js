// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { ref, onValue, off, set, get } from 'firebase/database';
import { auth, database } from '../firebase';
import { getUserProfile, getWalletBalance } from './../utils/databaseHelpers';
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
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' },
    { path: '/logout', icon: '🚪', label: 'Logout', action: 'logout' }
  ];

  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }

    // Load user data from correct paths based on your database structure
    const userRef = ref(database, `users/${user.uid}`);
    const profileRef = ref(database, `user_profiles/${user.uid}`);
    const walletRef = ref(database, `wallets/${user.uid}`); // Fixed: using wallets/ path
    const gamesRef = ref(database, `users/${user.uid}/games`); // Games are under users/${uid}/games

    // Listen to wallet changes
    const walletUnsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      } else {
        // If wallet doesn't exist in wallets/, check users/${uid}/wallet as fallback
        const userWalletRef = ref(database, `users/${user.uid}/wallet`);
        get(userWalletRef).then((userWalletSnapshot) => {
          if (userWalletSnapshot.exists()) {
            setWallet(userWalletSnapshot.val());
          }
        });
      }
      setLoading(false);
    });

    // Listen to profile changes
    const profileUnsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.val());
      }
    });

    // Load recent games from users/${uid}/games
    const gamesUnsubscribe = onValue(gamesRef, (snapshot) => {
      if (snapshot.exists()) {
        const games = [];
        snapshot.forEach((gameSnapshot) => {
          const gameData = gameSnapshot.val();
          games.push({ 
            id: gameSnapshot.key, 
            ...gameData,
            // Add derived fields for display
            totalEarnings: gameData.totalWins * 10 || 0, // Example calculation
            bestScore: gameData.highScore || 0
          });
        });
        setRecentGames(games);
      }
    });

    return () => {
      walletUnsubscribe();
      profileUnsubscribe();
      gamesUnsubscribe();
    };
  }, [user?.uid, navigate]);

  const initializeUserData = async () => {
    try {
      const userId = user.uid;
      
      // Check if wallet exists in wallets/
      const walletRef = ref(database, `wallets/${userId}`);
      const walletSnapshot = await get(walletRef);
      
      if (!walletSnapshot.exists()) {
        // Check if wallet exists in users/${userId}/wallet
        const userWalletRef = ref(database, `users/${userId}/wallet`);
        const userWalletSnapshot = await get(userWalletRef);
        
        if (userWalletSnapshot.exists()) {
          // Migrate wallet data to wallets/ path
          await set(walletRef, userWalletSnapshot.val());
        } else {
          // Create new wallet
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
        }
      }

      // Check if profile exists
      const profileRef = ref(database, `user_profiles/${userId}`);
      const profileSnapshot = await get(profileRef);
      
      if (!profileSnapshot.exists()) {
        // Check if profile data exists in users/${userId}/public
        const userPublicRef = ref(database, `users/${userId}/public`);
        const userPublicSnapshot = await get(userPublicRef);
        
        if (userPublicSnapshot.exists()) {
          const publicData = userPublicSnapshot.val();
          await set(profileRef, {
            displayName: publicData.displayName || 'Player',
            avatar: publicData.avatar || 'default',
            rank: publicData.globalRank || 'Bronze',
            level: publicData.globalLevel || 1,
            experience: 0,
            joinDate: publicData.createdAt || new Date().toISOString(),
            totalGames: 0,
            totalWins: 0,
            totalLosses: 0,
            winStreak: 0
          });
        } else {
          // Create new profile
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
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
    }
  };

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate total winnings from wallet
  const getTotalWinnings = () => {
    return (wallet?.totalWon || 0) - (wallet?.totalLost || 0);
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
              <h3>Total Won</h3>
              <p className="stat-value">{formatCurrency(wallet?.totalWon || 0)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-details">
              <h3>Net Profit</h3>
              <p className="stat-value">{formatCurrency(getTotalWinnings())}</p>
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
            <Link to="/wallet" className="action-btn">
              <span className="btn-icon">💸</span>
              Withdraw
            </Link>
          </div>
        </div>

        {/* Recent Games */}
        <div className="recent-games">
          <div className="section-header">
            <h2>Game Stats</h2>
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
                  <Link to={`/games/${game.id}`} className="game-play-link">
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
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        {navItems.map((item) => {
          if (item.action === 'logout') {
            return (
              <button
                key={item.path}
                onClick={handleLogout}
                className="nav-item logout-btn"
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          }
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default Dashboard;