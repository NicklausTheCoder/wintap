import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../firebase';
import { useNavigate } from 'react-router-dom';

function Home({ user }) {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load user balance from database
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          setBalance(snapshot.val().balance || 0);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const games = [
    {
      id: 1,
      name: 'Coin Rush',
      description: 'Tap coins as fast as you can! Win real money!',
      entryFee: 10,
      prize: 100,
      image: '💰',
      path: '/game?game=coinrush'
    },
    {
      id: 2,
      name: 'Speed Clicker',
      description: 'Test your clicking speed. Top scores win!',
      entryFee: 5,
      prize: 50,
      image: '⚡',
      path: '/game?game=speedclicker'
    },
    {
      id: 3,
      name: 'Treasure Hunt',
      description: 'Find the hidden treasure and win big!',
      entryFee: 20,
      prize: 200,
      image: '🏆',
      path: '/game?game=treasurehunt'
    }
  ];

  return (
    <div className="home-container">
      {/* Header with user info */}
      <header className="home-header">
        <div className="user-info">
          <h1>Welcome, {user.displayName || 'Player'}! 🎮</h1>
          <div className="balance">
            <span>💰 Balance: </span>
            <strong>${balance.toFixed(2)}</strong>
          </div>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="home-main">
        <div className="featured-section">
          <h2>🎯 Featured Games</h2>
          <p>Play now and win real money!</p>
          
          <div className="games-grid">
            {games.map(game => (
              <div key={game.id} className="game-card">
                <div className="game-emoji">{game.image}</div>
                <h3>{game.name}</h3>
                <p>{game.description}</p>
                <div className="game-details">
                  <span>Entry: ${game.entryFee}</span>
                  <span>Prize: ${game.prize}</span>
                </div>
                <button 
                  onClick={() => navigate(game.path)}
                  disabled={balance < game.entryFee}
                  className={balance < game.entryFee ? 'disabled' : ''}
                >
                  {balance < game.entryFee ? 'Insufficient Balance' : 'Play Now'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h2>📊 Today's Winners</h2>
          <div className="winners-list">
            <div className="winner-item">
              <span>🥇 Player123</span>
              <span>Won $500</span>
            </div>
            <div className="winner-item">
              <span>🥈 GameMaster</span>
              <span>Won $250</span>
            </div>
            <div className="winner-item">
              <span>🥉 LuckyStar</span>
              <span>Won $100</span>
            </div>
          </div>
        </div>

        <div className="how-it-works">
          <h2>💡 How It Works</h2>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <h3>Deposit</h3>
              <p>Add funds to your account</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <h3>Play</h3>
              <p>Enter games and compete</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <h3>Win</h3>
              <p>Withdraw your winnings</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;