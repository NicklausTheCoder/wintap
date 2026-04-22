// Games.jsx - Mobile Optimized
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ref, onValue, off, set, get, update } from 'firebase/database';
import { database } from '../firebase';
import CryptoJS from 'crypto-js';
import './Games.css';

function Games({ user }) {
  const location = useLocation();
  const [balance, setBalance] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [profile, setProfile] = useState(null);
  const [winnings, setWinnings] = useState({ total: 0, count: 0 });
  const [gameStats, setGameStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    bestStreak: 0,
    totalSpent: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);

  const SECRET_KEY = 'my-super-secret-key-123';
  const GAME_URL_BASE = 'https://games.wintapgames.com';

  const GAME_URLS = {
    'flappy-bird': `${GAME_URL_BASE}/flappy-bird`,
    'space-shooter': `${GAME_URL_BASE}/space-shooter`,
    'ball-crush': `${GAME_URL_BASE}/ball-crush`,
    'checkers': `${GAME_URL_BASE}/checkers`
  };

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  const [games, setGames] = useState([
    {
      id: 'flappy-bird',
      title: 'Flappy Bird',
      description: 'Navigate through pipes',
      image: '🐦',
      entryFee: 0,
      prize: 50,
      players: 1234,
      difficulty: 'Medium',
      active: true,
      category: 'arcade',
      featured: true,
      color: '#f59e0b'
    },
    {
      id: 'checkers',
      title: 'Checkers',
      description: 'Classic strategy game',
      image: '♟️',
      entryFee: 0,
      prize: 50,
      players: 892,
      difficulty: 'Hard',
      active: true,
      category: 'action',
      featured: true,
      color: '#7F77DD'
    },
    {
      id: 'ball-crush',
      title: 'Ball Crush',
      description: 'Addictive arcade action',
      image: '⚽',
      entryFee: 0,
      prize: 30,
      players: 756,
      difficulty: 'Easy',
      active: true,
      category: 'arcade',
      featured: false,
      color: '#1D9E75'
    }
  ]);

  const categories = [
    { id: 'all', label: 'All', icon: '🎮' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'action', label: 'Action', icon: '⚡' },
    { id: 'featured', label: '⭐', icon: '⭐' }
  ];

  const encryptData = (data) => {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
      return encrypted.replace(/\//g, '_').replace(/\+/g, '-');
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  };

  const loadGameStats = async (userId) => {
    try {
      const userGamesRef = ref(database, `users/${userId}/games`);
      const snapshot = await get(userGamesRef);
      
      let totalGames = 0, totalWins = 0, totalLosses = 0, totalSpent = 0, bestStreak = 0;

      if (snapshot.exists()) {
        Object.values(snapshot.val()).forEach(game => {
          totalGames += game.totalGames || 0;
          totalWins += game.totalWins || 0;
          totalLosses += game.totalLosses || 0;
          totalSpent += game.totalSpent || 0;
          bestStreak = Math.max(bestStreak, game.bestWinStreak || 0);
        });
      }

      setGameStats({
        totalGames, totalWins, totalLosses,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        bestStreak, totalSpent
      });
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  };

  const loadWinnings = async (userId) => {
    try {
      const winningsRef = ref(database, `winnings`);
      const snapshot = await get(winningsRef);
      let total = 0, count = 0;
      if (snapshot.exists()) {
        snapshot.forEach((gameNode) => {
          const userWins = gameNode.child(userId);
          if (userWins.exists()) {
            total += userWins.val().total || 0;
            count += userWins.val().count || 0;
          }
        });
      }
      setWinnings({ total, count });
    } catch (error) {
      console.error('Error loading winnings:', error);
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    const walletRef = ref(database, `wallets/${user.uid}`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        const walletData = snapshot.val();
        setWallet(walletData);
        setBalance(walletData.balance || 0);
      }
      setLoading(false);
    });

    const loadProfile = async () => {
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      const profileSnapshot = await get(profileRef);
      if (profileSnapshot.exists()) setProfile(profileSnapshot.val());
    };

    loadProfile();
    loadGameStats(user.uid);
    loadWinnings(user.uid);
    loadPlayerCounts();

    return () => off(walletRef);
  }, [user?.uid]);

  const loadPlayerCounts = async () => {
    try {
      const gamesRef = ref(database, 'games');
      const snapshot = await get(gamesRef);
      if (snapshot.exists()) {
        const gamesData = snapshot.val();
        setGames(prevGames => prevGames.map(game => ({
          ...game,
          players: gamesData[game.id]?.activePlayers || game.players
        })));
      }
    } catch (error) {
      console.error('Error loading player counts:', error);
    }
  };

  const handlePlayGame = async (game) => {
    if (!user?.uid) {
      alert('Please login to play');
      return;
    }

    if (game.entryFee === 0) {
      await redirectToGame(game);
      return;
    }

    if (balance < game.entryFee) {
      alert(`Insufficient balance! Need $${game.entryFee}`);
      return;
    }

    try {
      const walletRef = ref(database, `wallets/${user.uid}`);
      const walletSnapshot = await get(walletRef);
      const currentWallet = walletSnapshot.exists() ? walletSnapshot.val() : { balance: 0, totalLost: 0 };
      const newBalance = currentWallet.balance - game.entryFee;

      await update(walletRef, {
        balance: newBalance,
        totalLost: (currentWallet.totalLost || 0) + game.entryFee,
        lastUpdated: new Date().toISOString()
      });

      const transactionRef = ref(database, `transactions/${user.uid}/${Date.now()}`);
      await set(transactionRef, {
        type: 'game_entry',
        amount: -game.entryFee,
        balance: newBalance,
        game: game.id,
        description: `Entry fee for ${game.title}`,
        timestamp: new Date().toISOString()
      });

      await redirectToGame(game);
    } catch (error) {
      console.error('Error playing game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  const redirectToGame = async (game) => {
    try {
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      let username = user.email?.split('@')[0] || 'player';
      let displayName = username;

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        username = userData.public?.username || userData.username || username;
        displayName = userData.public?.displayName || userData.displayName || username;
      }

      const userData = {
        username, displayName, uid: user.uid, email: user.email,
        loginTime: Date.now(), sessionId: Math.random().toString(36).substring(2, 15),
        gameId: game.id, balance: balance
      };

      const encrypted = encryptData(userData);
      if (!encrypted) throw new Error('Encryption failed');

      sessionStorage.setItem('gameUser', JSON.stringify(userData));
      localStorage.setItem('gameUser', JSON.stringify(userData));

      const gameUrl = GAME_URLS[game.id] || `${GAME_URL_BASE}?game=${game.id}`;
      window.location.href = `${gameUrl}?user=${encrypted}`;
    } catch (error) {
      console.error('Redirect error:', error);
      alert('Failed to launch game. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    const showDecimals = amount % 1 !== 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const filteredGames = activeCategory === 'all' ? games : 
    activeCategory === 'featured' ? games.filter(g => g.featured) : 
    games.filter(g => g.category === activeCategory);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div className="games-page">
      {/* Mobile Header */}
      <header className="games-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
          <h1>Play & Win</h1>
        </div>
        <div className="user-badge" onClick={() => setMenuOpen(false)}>
          <Link to="/profile" className="user-avatar">
            {profile?.displayName?.[0] || user?.displayName?.[0] || user?.email?.[0]}
          </Link>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3>Menu</h3>
          <button onClick={() => setMenuOpen(false)}>✕</button>
        </div>
        <nav className="menu-nav">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="menu-item" onClick={() => setMenuOpen(false)}>
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      {menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}></div>}

      <main className="games-main">
        {/* Balance Card - Mobile Optimized */}
        <div className="balance-card">
          <div className="balance-icon">💰</div>
          <div className="balance-info">
            <h3>Your Balance</h3>
            <div className="balance-amount">{formatCurrency(balance)}</div>
          </div>
          <Link to="/wallet" className="add-funds-btn">+ Add</Link>
        </div>

        {/* Stats Grid - 3x2 on mobile */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-value">{gameStats.totalGames}</div>
            <div className="stat-label">Played</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-value won">{gameStats.totalWins}</div>
            <div className="stat-label">Won</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-value won">{formatCurrency(winnings.total)}</div>
            <div className="stat-label">Won</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-value">{gameStats.winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{gameStats.bestStreak}</div>
            <div className="stat-label">Best Streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💔</div>
            <div className="stat-value lost">{gameStats.totalLosses}</div>
            <div className="stat-label">Lost</div>
          </div>
        </div>

        {/* Category Tabs - Horizontal Scroll */}
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <span className="tab-icon">{cat.icon}</span>
              <span className="tab-label">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Games Grid - Vertical Cards */}
        <div className="games-grid">
          {filteredGames.map(game => (
            <div key={game.id} className="game-card" style={{ borderTopColor: game.color }}>
              <div className="game-card-header">
                <div className="game-icon" style={{ background: `${game.color}20`, color: game.color }}>
                  {game.image}
                </div>
                <div className="game-info">
                  <h2>{game.title}</h2>
                  <p>{game.description}</p>
                </div>
              </div>

              <div className="game-meta">
                <span className="difficulty" data-level={game.difficulty}>
                  {game.difficulty}
                </span>
                <span className="players">👥 {game.players.toLocaleString()}</span>
                {game.active && <span className="live-badge">LIVE</span>}
              </div>

              <div className="game-prize-info">
                <div className="prize-item">
                  <span>Prize Pool</span>
                  <strong>{formatCurrency(game.prize)}</strong>
                </div>
                <div className="prize-item">
                  <span>Entry</span>
                  <strong>FREE</strong>
                </div>
                <div className="prize-item">
                  <span>Players</span>
                  <strong>{game.players.toLocaleString()}</strong>
                </div>
              </div>

              <button
                className={`btn-play-game ${game.featured ? 'featured' : ''}`}
                onClick={() => handlePlayGame(game)}
                style={{ background: game.color }}
              >
                Play {game.title} →
              </button>
            </div>
          ))}
        </div>

        {/* How to Play - Horizontal Scroll */}
        <div className="how-to-play">
          <h3>How to Play</h3>
          <div className="steps-horizontal">
            <div className="step">
              <div className="step-icon">💳</div>
              <span>Add Funds</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-icon">🎮</div>
              <span>Play Game</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-icon">🏆</div>
              <span>Win Prize</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="step">
              <div className="step-icon">💸</div>
              <span>Withdraw</span>
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
      </nav>
    </div>
  );
}

export default Games;