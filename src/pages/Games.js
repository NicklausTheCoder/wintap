// Games.jsx
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
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // SECRET KEY - must match the one in your Phaser game
  const SECRET_KEY = 'my-super-secret-key-123';
  
  // Game URLs
  const GAME_URLS = {
    'flappy-bird': 'http://localhost:8080/flappy-bird',
    'space-shooter': 'http://localhost:8080/space-shooter'
  };
  
  // Navigation items for bottom bar
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
      description: 'Navigate through pipes. Classic arcade game with cash rewards.',
      image: '🐦',
      entryFee: 5,
      prize: 50,
      players: 1234,
      difficulty: 'Medium',
      active: true,
      category: 'arcade',
      featured: true
    },
    {
      id: 'space-shooter',
      title: 'Space Shooter',
      description: '1v1 space battle. Shoot down your opponent and win!',
      image: '🚀',
      entryFee: 10,
      prize: 100,
      players: 892,
      difficulty: 'Hard',
      active: true,
      category: 'action',
      featured: true
    },
    {
      id: 'ball-crush',
      title: 'Ball Crush',
      description: 'Crush balls and score points in this addictive arcade game.',
      image: '⚽',
      entryFee: 3,
      prize: 30,
      players: 756,
      difficulty: 'Easy',
      active: true,
      category: 'arcade',
      featured: false
    }
  ]);

  // Filter games by category
  const filteredGames = activeCategory === 'all' 
    ? games 
    : games.filter(game => game.category === activeCategory);

  // Categories for tabs
  const categories = [
    { id: 'all', label: 'All Games', icon: '🎮' },
    { id: 'arcade', label: 'Arcade', icon: '🕹️' },
    { id: 'action', label: 'Action', icon: '⚡' },
    { id: 'featured', label: 'Featured', icon: '⭐' }
  ];

  // Encrypt data for secure transfer to game
  const encryptData = (data) => {
    try {
      const jsonString = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
      
      // Make URL safe
      const urlSafe = encrypted
        .replace(/\//g, '_')
        .replace(/\+/g, '-');
      
      return urlSafe;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  };

  // Load REAL wallet balance from database
  useEffect(() => {
    if (!user?.uid) return;

    console.log('🎮 Games page loading for user:', user.uid);

    // Listen to wallet balance in real-time
const walletRef = ref(database, `users/${user.uid}/wallet`); // Note the 'users/' prefix
    
    const unsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        const walletData = snapshot.val();
        console.log('💰 Wallet loaded:', walletData);
        setWallet(walletData);
        setBalance(walletData.balance || 0);
      } else {
        console.log('⚠️ No wallet found');
        setBalance(0);
      }
      setLoading(false);
    });

    // Load real-time player counts from database
    loadPlayerCounts();

    return () => {
      off(walletRef);
    };
  }, [user?.uid]);

  // Load real player counts from database
  const loadPlayerCounts = async () => {
    try {
      const gamesRef = ref(database, 'games');
      const snapshot = await get(gamesRef);
      
      if (snapshot.exists()) {
        const gamesData = snapshot.val();
        
        // Update games with real player counts
        setGames(prevGames => 
          prevGames.map(game => ({
            ...game,
            players: gamesData[game.id]?.activePlayers || game.players
          }))
        );
      }
    } catch (error) {
      console.error('Error loading player counts:', error);
    }
  };

  // Handle playing a game
  const handlePlayGame = async (game) => {
    if (!user?.uid) {
      alert('Please login to play');
      return;
    }

    // For Flappy Bird and Space Shooter, redirect without fee check
    if (game.id === 'flappy-bird' || game.id === 'space-shooter' || game.id === 'ball-crush') {
      await redirectToGame(game);
      return;
    }

    // For other games, check balance
    if (balance < game.entryFee) {
      alert(`Insufficient balance! You need $${game.entryFee} to play.`);
      return;
    }

    try {
      // Deduct entry fee from wallet
      const walletRef = ref(database, `wallets/${user.uid}`);
      const newBalance = balance - game.entryFee;
      
      await update(walletRef, {
        balance: newBalance,
        totalLost: (wallet?.totalLost || 0) + game.entryFee,
        lastUpdated: new Date().toISOString()
      });

      // Create transaction record
      const transactionId = `txn_${Date.now()}_${game.id}`;
      const transactionRef = ref(database, `transactions/${user.uid}/${transactionId}`);
      await set(transactionRef, {
        type: 'game_entry',
        amount: -game.entryFee,
        balance: newBalance,
        game: game.id,
        description: `Entry fee for ${game.title}`,
        status: 'completed',
        timestamp: new Date().toISOString()
      });

      // Update game stats
      const gameStatsRef = ref(database, `game_stats/${user.uid}/${game.id}`);
      const statsSnapshot = await get(gameStatsRef);
      
      if (statsSnapshot.exists()) {
        const currentStats = statsSnapshot.val();
        await update(gameStatsRef, {
          totalGames: (currentStats.totalGames || 0) + 1,
          lastPlayed: new Date().toISOString(),
          totalSpent: (currentStats.totalSpent || 0) + game.entryFee
        });
      } else {
        await set(gameStatsRef, {
          totalGames: 1,
          wins: 0,
          losses: 0,
          bestScore: 0,
          totalEarnings: 0,
          totalSpent: game.entryFee,
          lastPlayed: new Date().toISOString()
        });
      }

      // Increment active players count
      const activePlayersRef = ref(database, `games/${game.id}/activePlayers`);
      const playersSnapshot = await get(activePlayersRef);
      const currentPlayers = playersSnapshot.exists() ? playersSnapshot.val() : game.players;
      await set(activePlayersRef, currentPlayers + 1);

      // Redirect to game
      await redirectToGame(game);

    } catch (error) {
      console.error('❌ Error playing game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  // Redirect to game with encrypted user data
  const redirectToGame = async (game) => {
    try {
      // Get user data from Firebase
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      let username = user.email?.split('@')[0] || 'player';
      let displayName = username;
      
      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        username = userData.public?.username || userData.username || username;
        displayName = userData.public?.displayName || userData.displayName || username;
      }
      
      // Create user data object for the game
      const userData = {
        username: username,
        displayName: displayName,
        uid: user.uid,
        email: user.email,
        loginTime: Date.now(),
        sessionId: Math.random().toString(36).substring(2, 15),
        rememberMe: true,
        gameId: game.id,
        balance: balance
      };
      
      console.log('📦 Preparing game data:', userData);
      
      // Encrypt the data
      const encrypted = encryptData(userData);
      
      if (!encrypted) {
        throw new Error('Encryption failed');
      }
      
      // Save to storage as backup
      sessionStorage.setItem('gameUser', JSON.stringify(userData));
      localStorage.setItem('gameUser', JSON.stringify(userData));
      
      // Get the correct game URL
      let gameUrl = GAME_URLS[game.id];
      
      // If no specific URL, use default with game param
      if (!gameUrl) {
        gameUrl = `http://localhost:8080?game=${game.id}`;
      }
      
      // Redirect with encrypted data
      const redirectUrl = `${gameUrl}?user=${encrypted}`;
      console.log('🚀 Redirecting to:', redirectUrl);
      
      window.location.href = redirectUrl;
      
    } catch (error) {
      console.error('❌ Redirect error:', error);
      alert('Failed to launch game. Please try again.');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

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
      {/* Header */}
      <header className="games-header">
        <h1>Play & Win</h1>
        <div className="user-badge">
          <span className="user-avatar">{user?.displayName?.[0] || user?.email?.[0]}</span>
          <span className="user-name">{user?.displayName || user?.email}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="games-main">
        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-icon">💰</div>
          <div className="balance-info">
            <h3>Your Balance</h3>
            <div className="balance-amount">{formatCurrency(balance)}</div>
            <div className="balance-note">Ready to play</div>
          </div>
          <Link to="/wallet" className="add-funds-btn">+ Add Funds</Link>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <h4>Total Won</h4>
            <p className="stat-value won">{formatCurrency(wallet?.totalWon || 0)}</p>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💔</div>
            <h4>Total Lost</h4>
            <p className="stat-value lost">{formatCurrency(wallet?.totalLost || 0)}</p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="games-grid">
          {filteredGames.map(game => (
            <div key={game.id} className="game-card">
              <div className="game-icon-large">{game.image}</div>
              <div className="game-info">
                <h2>{game.title}</h2>
                <p>{game.description}</p>
                
                <div className="game-meta">
                  <span className="difficulty" data-level={game.difficulty}>
                    {game.difficulty}
                  </span>
                  <span className="players">
                    👥 {game.players.toLocaleString()}
                  </span>
                  {game.active && (
                    <span className="live-badge">LIVE</span>
                  )}
                </div>
                
                <div className="game-prize-info">
                  <div className="entry-fee">
                    <span>Entry</span>
                    <strong>{formatCurrency(game.entryFee)}</strong>
                  </div>
                  <div className="prize-pool">
                    <span>Prize</span>
                    <strong>{formatCurrency(game.prize)}</strong>
                  </div>
                  <div className="roi">
                    <span>ROI</span>
                    <strong className={game.prize > game.entryFee ? 'positive' : 'negative'}>
                      {Math.round((game.prize / game.entryFee) * 100 - 100)}%
                    </strong>
                  </div>
                </div>
                
                <button 
                  className={`btn-play-game ${game.featured ? 'featured-game' : ''}`}
                  onClick={() => handlePlayGame(game)}
                >
                  Play {game.title}
                </button>

                <div className="game-footer">
                  <span>🏆 Guaranteed Prize</span>
                  <span>⏱️ 2 min</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* How to Play Section */}
        <div className="how-to-play">
          <h3>How to Play & Win</h3>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h4>Add Funds</h4>
              <p>Deposit to your wallet</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h4>Choose Game</h4>
              <p>Select any game</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h4>Play & Win</h4>
              <p>Compete for prizes</p>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <h4>Withdraw</h4>
              <p>Get your winnings</p>
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

export default Games;