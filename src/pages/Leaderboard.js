// Leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ref, get, onValue, off, query, orderByChild, limitToFirst } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { auth, database } from '../firebase';
import './Leaderboard.css';

function Leaderboard({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('alltime');
  const [gameFilter, setGameFilter] = useState('all');
  const [topWinner, setTopWinner] = useState(null);
  const [userRank, setUserRank] = useState(null);

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  useEffect(() => {
    if (!user) {
      // Even without login, leaderboard is public
      loadLeaderboard();
    } else {
      loadUserProfile();
      loadLeaderboard();
    }

    return () => {
      // Cleanup listeners if any
    };
  }, [user, timeFilter, gameFilter]);

  const loadUserProfile = async () => {
    try {
      // Load user profile
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      const profileSnapshot = await get(profileRef);
      if (profileSnapshot.exists()) {
        setProfile(profileSnapshot.val());
      }

      // Load wallet
      const walletRef = ref(database, `wallets/${user.uid}`);
      const walletSnapshot = await get(walletRef);
      if (walletSnapshot.exists()) {
        setWallet(walletSnapshot.val());
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all user profiles with their wallet stats
      const profilesRef = ref(database, 'user_profiles');
      const walletsRef = ref(database, 'wallets');
      
      const [profilesSnapshot, walletsSnapshot] = await Promise.all([
        get(profilesRef),
        get(walletsRef)
      ]);

      const leaderboardData = [];

      if (profilesSnapshot.exists()) {
        profilesSnapshot.forEach((profileChild) => {
          const userId = profileChild.key;
          const profile = profileChild.val();
          const wallet = walletsSnapshot.exists() ? walletsSnapshot.val()[userId] : null;

          // Calculate total winnings based on time filter
          let totalWon = wallet?.totalWon || 0;

          leaderboardData.push({
            userId,
            displayName: profile.displayName || 'Anonymous',
            rank: profile.rank || 'Bronze',
            level: profile.level || 1,
            totalWon,
            totalGames: profile.totalGames || 0,
            totalWins: profile.totalWins || 0,
            winRate: profile.totalGames > 0 
              ? Math.round((profile.totalWins / profile.totalGames) * 100) 
              : 0,
            avatar: profile.avatar || 'default',
            joinDate: profile.joinDate
          });
        });
      }

      // Sort by total winnings
      const sorted = leaderboardData.sort((a, b) => b.totalWon - a.totalWon);
      
      // Get top winner
      if (sorted.length > 0) {
        setTopWinner(sorted[0]);
      }

      // Find current user's rank
      if (user) {
        const userIndex = sorted.findIndex(p => p.userId === user.uid);
        if (userIndex !== -1) {
          setUserRank({
            rank: userIndex + 1,
            ...sorted[userIndex]
          });
        }
      }

      setPlayers(sorted.slice(0, 100)); // Top 100 players
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return 'gold';
      case 2: return 'silver';
      case 3: return 'bronze';
      default: return '';
    }
  };

  const getRankIcon = (rank) => {
    const icons = {
      1: '🥇',
      2: '🥈',
      3: '🥉'
    };
    return icons[rank] || '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <header className="leaderboard-header">
        <div className="header-content">
          <h1>🏆 Leaderboard</h1>
          <p>Top players competing for the biggest prizes</p>
        </div>
    
      </header>

      {/* Main Content */}
      <main className="leaderboard-main">
        {/* Top Winner Spotlight */}
        {topWinner && (
          <div className="top-winner-spotlight">
            <div className="spotlight-content">
              <div className="crown">👑</div>
              <div className="winner-avatar">
                {topWinner.displayName[0].toUpperCase()}
              </div>
              <h2>Top Winner</h2>
              <div className="winner-name">{topWinner.displayName}</div>
              <div className="winner-prize">{formatCurrency(topWinner.totalWon)}</div>
              <div className="winner-stats">
                <div className="stat">
                  <span>Games</span>
                  <strong>{formatNumber(topWinner.totalGames)}</strong>
                </div>
                <div className="stat">
                  <span>Wins</span>
                  <strong>{formatNumber(topWinner.totalWins)}</strong>
                </div>
                <div className="stat">
                  <span>Win Rate</span>
                  <strong>{topWinner.winRate}%</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="leaderboard-filters">
          <div className="filter-group">
            <label>Time Period:</label>
            <div className="filter-buttons">
              <button 
                className={timeFilter === 'alltime' ? 'active' : ''}
                onClick={() => setTimeFilter('alltime')}
              >
                All Time
              </button>
              <button 
                className={timeFilter === 'monthly' ? 'active' : ''}
                onClick={() => setTimeFilter('monthly')}
              >
                This Month
              </button>
              <button 
                className={timeFilter === 'weekly' ? 'active' : ''}
                onClick={() => setTimeFilter('weekly')}
              >
                This Week
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label>Game:</label>
            <div className="filter-buttons">
              <button 
                className={gameFilter === 'all' ? 'active' : ''}
                onClick={() => setGameFilter('all')}
              >
                All Games
              </button>
              <button 
                className={gameFilter === 'flappy-bird' ? 'active' : ''}
                onClick={() => setGameFilter('flappy-bird')}
              >
                Flappy Bird
              </button>
              <button 
                className={gameFilter === 'space-shooter' ? 'active' : ''}
                onClick={() => setGameFilter('space-shooter')}
              >
                Space Shooter
              </button>
              <button 
                className={gameFilter === 'ball-crush' ? 'active' : ''}
                onClick={() => setGameFilter('ball-crush')}
              >
                Ball Crush
              </button>
            </div>
          </div>
        </div>

        {/* User's Rank Card (if logged in) */}
        {user && userRank && (
          <div className="user-rank-card">
            <div className="user-rank-header">
              <span className="your-rank">Your Ranking</span>
              <span className="rank-number">#{userRank.rank}</span>
            </div>
            <div className="user-rank-content">
              <div className="rank-avatar">
                {userRank.displayName[0].toUpperCase()}
              </div>
              <div className="rank-info">
                <h3>{userRank.displayName}</h3>
                <div className="rank-badges">
                  <span className={`rank-badge ${userRank.rank.toLowerCase()}`}>
                    {userRank.rank} Player
                  </span>
                  <span className="level-badge">Level {userRank.level}</span>
                </div>
              </div>
              <div className="rank-stats">
                <div className="stat">
                  <span>Winnings</span>
                  <strong>{formatCurrency(userRank.totalWon)}</strong>
                </div>
                <div className="stat">
                  <span>Win Rate</span>
                  <strong>{userRank.winRate}%</strong>
                </div>
                <div className="stat">
                  <span>Games</span>
                  <strong>{formatNumber(userRank.totalGames)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="leaderboard-table-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Rank</th>
                <th>Level</th>
                <th>Games</th>
                <th>Wins</th>
                <th>Win Rate</th>
                <th>Total Winnings</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const rank = index + 1;
                const isCurrentUser = user && player.userId === user.uid;
                
                return (
                  <tr 
                    key={player.userId} 
                    className={`
                      ${isCurrentUser ? 'current-user' : ''}
                      ${rank <= 3 ? 'top-three' : ''}
                    `}
                  >
                    <td className="rank-column">
                      <span className={`rank-badge ${getRankColor(rank)}`}>
                        {rank <= 3 ? getRankIcon(rank) : `#${rank}`}
                      </span>
                    </td>
                    <td className="player-column">
                      <div className="player-info">
                        <div className="player-avatar">
                          {player.displayName[0].toUpperCase()}
                        </div>
                        <div className="player-name">
                          {player.displayName}
                          {isCurrentUser && <span className="you-badge">You</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`rank-text ${player.rank.toLowerCase()}`}>
                        {player.rank}
                      </span>
                    </td>
                    <td>
                      <span className="level-text">Lv.{player.level}</span>
                    </td>
                    <td>{formatNumber(player.totalGames)}</td>
                    <td>{formatNumber(player.totalWins)}</td>
                    <td>
                      <span className={`win-rate ${player.winRate >= 50 ? 'high' : 'medium'}`}>
                        {player.winRate}%
                      </span>
                    </td>
                    <td className="winnings-column">
                      <span className="winnings-amount">
                        {formatCurrency(player.totalWon)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* No Players State */}
        {players.length === 0 && (
          <div className="no-players">
            <div className="no-players-icon">🏆</div>
            <h3>No players yet</h3>
            <p>Be the first to join the leaderboard!</p>
            {!user && (
              <Link to="/register" className="join-now-btn">
                Join Now
              </Link>
            )}
          </div>
        )}

        {/* Footer Stats */}
        <div className="leaderboard-footer">
          <div className="footer-stat">
            <span className="stat-label">Total Players</span>
            <span className="stat-value">{formatNumber(players.length)}</span>
          </div>
          <div className="footer-stat">
            <span className="stat-label">Total Prize Money</span>
            <span className="stat-value">
              {formatCurrency(players.reduce((sum, p) => sum + p.totalWon, 0))}
            </span>
          </div>
          <div className="footer-stat">
            <span className="stat-label">Total Games</span>
            <span className="stat-value">
              {formatNumber(players.reduce((sum, p) => sum + p.totalGames, 0))}
            </span>
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

export default Leaderboard;