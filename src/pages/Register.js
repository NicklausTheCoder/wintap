// Register.tsx
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, database } from '../firebase';
import { ref, set, get, update } from 'firebase/database';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Register.css';

// Game types - ONLY your actual games
type GameId = 'flappy-bird' | 'space-shooter' | 'ball-crush';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Navigation items for bottom bar (logged out users)
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/login', icon: '🔐', label: 'Login' },
    { path: '/register', icon: '📝', label: 'Sign Up' },
    { path: '/contact', icon: '📞', label: 'Contact' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (!username.trim()) {
      return setError('Username is required');
    }

    setLoading(true);
    setError('');

    try {
      // 1. CREATE AUTHENTICATION
      console.log('📝 Creating user account...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      console.log('✅ User created:', userId);

      // 2. SET DISPLAY NAME - Use username as display name
      await updateProfile(userCredential.user, {
        displayName: username
      });

      // 3. WRITE TO DATABASE (Multi-game structure)
      try {
        console.log('📝 Writing to database with multi-game structure...');
        const now = new Date().toISOString();

        // Create user document with ONLY your actual games
        await set(ref(database, `users/${userId}`), {
          // Public profile (visible to everyone)
          public: {
            uid: userId,
            username: username.toLowerCase(), // Store lowercase for searching
            displayName: username, // Use username as display name
            avatar: 'default',
            globalRank: 'Rookie',
            globalLevel: 1,
            createdAt: now,
            isOnline: true
          },

          // Private data (user's own data)
          private: {
            email: email,
            lastLogin: now,
            isActive: true,
            role: 'player',
            referredBy: referralCode || null
          },

          // Wallet (coins/currency) - Note: This is nested under users, not at root
          wallet: {
            balance: 10.00, // Welcome bonus
            totalDeposited: 0,
            totalWithdrawn: 0,
            totalWon: 0,
            totalLost: 0,
            totalBonus: 10.00,
            currency: 'USD',
            lastUpdated: now
          },

          // Metadata (user statistics)
          metadata: {
            createdAt: now,
            updatedAt: now,
            lastGamePlayed: null,
            totalPlayTime: 0,
            favoriteGame: null
          },

          // Game-specific stats - ONLY your 3 games
          games: {
            'flappy-bird': {
              highScore: 0,
              totalGames: 0,
              totalWins: 0,
              totalLosses: 0,
              winStreak: 0,
              bestWinStreak: 0,
              experience: 0,
              level: 1,
              rank: 'Rookie',
              achievements: [],
              lastPlayed: now,
              averageScore: 0,
              totalScore: 0,
              gamesWon: 0,
              gamesLost: 0
            },
            'space-shooter': {
              highScore: 0,
              totalGames: 0,
              totalWins: 0,
              totalLosses: 0,
              winStreak: 0,
              bestWinStreak: 0,
              experience: 0,
              level: 1,
              rank: 'Rookie',
              achievements: [],
              lastPlayed: now,
              averageScore: 0,
              totalScore: 0,
              gamesWon: 0,
              gamesLost: 0
            },
            'ball-crush': {
              highScore: 0,
              totalGames: 0,
              totalWins: 0,
              totalLosses: 0,
              winStreak: 0,
              bestWinStreak: 0,
              experience: 0,
              level: 1,
              rank: 'Rookie',
              achievements: [],
              lastPlayed: now,
              averageScore: 0,
              totalScore: 0,
              gamesWon: 0,
              gamesLost: 0
            }
          }
        });

        console.log('✅ User document created with your 3 games');

        // Create lookup indexes for searching
        await set(ref(database, `lookups/byUsername/${username.toLowerCase()}`), userId);

        console.log('✅ Lookup indexes created');

        // Create welcome transaction
        const transactionId = `txn_${Date.now()}`;
        await set(ref(database, `transactions/${userId}/${transactionId}`), {
          type: 'bonus',
          amount: 10.00,
          balance: 10.00,
          description: 'Welcome bonus',
          status: 'completed',
          timestamp: now
        });

        console.log('✅ Transaction created');

        // Handle referral if provided
        if (referralCode) {
          try {
            // Get referrer's data
            const referrerSnapshot = await get(ref(database, `lookups/byUsername/${referralCode.toLowerCase()}`));

            if (referrerSnapshot.exists()) {
              const referrerId = referrerSnapshot.val();

              // Get referrer's current wallet
              const walletRef = ref(database, `users/${referrerId}/wallet`);
              const walletSnapshot = await get(walletRef);

              if (walletSnapshot.exists()) {
                const wallet = walletSnapshot.val();
                const newBalance = wallet.balance + 5.00;

                // Update referrer's wallet
                await update(ref(database, `users/${referrerId}/wallet`), {
                  balance: newBalance,
                  totalBonus: wallet.totalBonus + 5.00,
                  lastUpdated: now
                });

                // Add referral record
                await set(ref(database, `users/${referrerId}/referrals/${userId}`), {
                  username: username,
                  joinedAt: now,
                  bonus: 5.00
                });

                // Add transaction for referrer
                const referrerTxnId = `txn_${Date.now()}_ref`;
                await set(ref(database, `transactions/${referrerId}/${referrerTxnId}`), {
                  type: 'bonus',
                  amount: 5.00,
                  balance: newBalance,
                  description: `Referral bonus for ${username}`,
                  status: 'completed',
                  timestamp: now
                });

                console.log('✅ Referral bonus applied');
              }
            }
          } catch (refError) {
            console.error('❌ Referral error:', refError);
            // Don't fail registration if referral fails
          }
        }

        console.log('🎉 All database writes successful!');

      } catch (dbError) {
        console.error('❌ Database write failed:', dbError);

        if (dbError.code === 'PERMISSION_DENIED') {
          setError('Database permission denied. Please check Firebase Realtime Database rules.');
        } else {
          setError('Failed to save user data: ' + dbError.message);
        }
        setLoading(false);
        return;
      }

      // 4. Store session data for game login
      const sessionData = {
        username: username,
        displayName: username,
        loginTime: Date.now(),
        sessionId: Math.random().toString(36).substring(2, 15),
        rememberMe: true
      };

      // Store in sessionStorage for the game to use
      sessionStorage.setItem('gameUser', JSON.stringify(sessionData));
      localStorage.setItem('gameUser', JSON.stringify(sessionData));

      // 5. SUCCESS - REDIRECT TO DASHBOARD
      navigate('/dashboard');

    } catch (authError) {
      console.error('❌ Authentication failed:', authError);

      switch (authError.code) {
        case 'auth/email-already-in-use':
          setError('Email is already registered');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        default:
          setError('Failed to register: ' + authError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="back-to-home">← Back</Link>
          <h1>🎮 WinTap Games</h1>
          <h2>Create Account</h2>
          <p className="auth-subtitle">Get $10 Welcome Bonus!</p>
          <p className="game-list">🎯 Flappy Bird • Space Shooter • Ball Crush</p>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
            />
            <small className="hint">This will be your display name</small>
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Referral Code (Optional)</label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code"
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
              autoComplete="new-password"
            />
          </div>

          <div className="form-terms">
            <label className="terms-checkbox">
              <input type="checkbox" required />
              I agree to the <Link to="/terms">Terms</Link> & <Link to="/privacy">Privacy</Link>
            </label>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating account...' : 'Sign Up & Get $10'}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <p className="auth-link">
          <Link to="/login">Log in here</Link>
        </p>

        <div className="preview-note">
          <small>You'll be: <strong>{username || 'username'}</strong></small>
        </div>
      </div>

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

export default Register;