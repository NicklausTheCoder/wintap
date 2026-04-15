// Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ref, get, set, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { auth, database } from '../firebase';
import './Profile.css';

function Profile({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [winnings, setWinnings] = useState({ total: 0, count: 0 });

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  // Check if username exists
  const checkUsernameExists = async (usernameToCheck, currentUserId) => {
    try {
      const usernameRef = ref(database, `lookups/byUsername/${usernameToCheck.toLowerCase()}`);
      const snapshot = await get(usernameRef);

      // If username exists and it's not the current user's, it's taken
      if (snapshot.exists()) {
        const existingUserId = snapshot.val();
        return existingUserId !== currentUserId;
      }
      return false;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  };

  // Validate username
  const validateUsername = (username) => {
    if (!username) return 'Username is required';
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return '';
  };

  // Load user data
  useEffect(() => {
    if (!user) {
      console.log('❌ No user, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('✅ User authenticated:', user.uid, user.email);
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('📂 Loading profile for:', user.uid);

      // Try to read profile from user_profiles
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      const profileSnapshot = await get(profileRef);

      // ALSO get the public user data which contains the username
      const userPublicRef = ref(database, `users/${user.uid}/public`);
      const userPublicSnapshot = await get(userPublicRef);

      // Get username from the public path
      let userPublicData = {};
      if (userPublicSnapshot.exists()) {
        userPublicData = userPublicSnapshot.val();
        console.log('✅ Public user data found:', userPublicData);
      }

      if (profileSnapshot.exists()) {
        console.log('✅ Profile found:', profileSnapshot.val());
        const profileData = profileSnapshot.val();
        setProfile(profileData);
        setDisplayName(profileData.displayName || user.displayName || 'Player');
        // Get username from public data, fallback to displayName
        setUsername(userPublicData.username || profileData.displayName || user.displayName || 'Player');
        setBio(profileData.bio || '');
      } else {
        console.log('🆕 No profile found, creating default...');
        // Create default profile
        const defaultUsername = userPublicData.username || user.displayName?.toLowerCase().replace(/\s+/g, '_') || 'player';

        const defaultProfile = {
          displayName: user.displayName || 'Player',
          username: defaultUsername,
          bio: 'I love playing games and winning real money! 🎮',
          rank: 'Bronze',
          level: 1,
          experience: 0,
          joinDate: new Date().toISOString(),
          totalGames: 0,
          totalWins: 0,
          totalLosses: 0,
          winStreak: 0
        };

        await set(profileRef, defaultProfile);
        console.log('✅ Default profile created');
        setProfile(defaultProfile);
        setDisplayName(defaultProfile.displayName);
        setUsername(defaultProfile.username);
        setBio(defaultProfile.bio);
      }

      // Load wallet (rest of your code stays the same)
      // Load wallet
      const walletRef = ref(database, `wallets/${user.uid}`);
      const walletSnapshot = await get(walletRef);

      if (walletSnapshot.exists()) {
        console.log('💰 Wallet found:', walletSnapshot.val());
        setWallet(walletSnapshot.val());
      } else {
        console.log('🆕 No wallet found, creating default...');
        const defaultWallet = {
          balance: 0,
          totalWon: 0,
          totalLost: 0,
          currency: 'USD'
        };
        await set(walletRef, defaultWallet);
        setWallet(defaultWallet);
      }

      // ALWAYS load winnings regardless of wallet
      await loadWinnings(user.uid);
    } catch (error) {
      console.error('❌ Error loading profile:', error);

      if (error.code === 'PERMISSION_DENIED') {
        setError('Database permission denied. Please check Firebase Realtime Database rules.');
      } else {
        setError('Failed to load profile: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadWinnings = async (userId) => {
    try {
      const winningsRef = ref(database, `winnings`);
      const snapshot = await get(winningsRef);
      let total = 0;
      let count = 0;
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

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    // Validate username if it changed
    if (username !== profile?.username) {
      const validationError = validateUsername(username);
      if (validationError) {
        setUsernameError(validationError);
        return;
      }

      // Check if username is taken
      setSaving(true);
      const isTaken = await checkUsernameExists(username, user.uid);
      setSaving(false);

      if (isTaken) {
        setUsernameError('Username is already taken');
        return;
      }
    }

    setSaving(true);
    setError('');
    setUsernameError('');

    try {
      // Update user_profiles (add username field here too!)
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      await update(profileRef, {
        displayName,
        username, // Add this line to save username in user_profiles too
        bio,
        lastUpdated: new Date().toISOString()
      });

      // Update main users path
      const userRef = ref(database, `users/${user.uid}/public`);
      await update(userRef, {
        displayName,
        username: username.toLowerCase(),
        updatedAt: new Date().toISOString()
      });

      // If username changed, update lookups
      if (username !== profile?.username) {
        // Delete old lookup
        if (profile?.username) {
          await set(ref(database, `lookups/byUsername/${profile.username.toLowerCase()}`), null);
        }
        // Create new lookup
        await set(ref(database, `lookups/byUsername/${username.toLowerCase()}`), user.uid);
      }

      // Update Firebase Auth display name
      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      // Update local state
      setProfile(prev => ({ ...prev, displayName, username, bio }));
      setEditMode(false);

    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    const showDecimals = amount % 1 !== 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: showDecimals ? 2 : 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
        {error && <p className="error-text">{error}</p>}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="profile-error">
        <div className="error-icon">⚠️</div>
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={loadUserData} className="retry-btn">
            🔄 Try Again
          </button>
          <Link to="/dashboard" className="back-to-dashboard-btn">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <Link to="/dashboard" className="back-btn">← Back</Link>
          <h1>My Profile</h1>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="edit-profile-btn">
              ✏️ Edit
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="profile-content">
        {/* Avatar & Rank Card */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-large">
            <span className="avatar-text">
              {displayName?.[0] || user?.email?.[0] || 'P'}
            </span>
          </div>
          <h2>{displayName || user?.displayName || 'Player'}</h2>
          <div className="profile-username">
            <span className="username-label">@</span>
            <span className="username-value">{username || profile?.username || 'username'}</span>
          </div>
          <div className="profile-rank">
            <span className="rank-icon">
              {profile?.rank === 'Bronze' && '🥉'}
              {profile?.rank === 'Silver' && '🥈'}
              {profile?.rank === 'Gold' && '🥇'}
              {profile?.rank === 'Platinum' && '💎'}
              {(!profile?.rank || profile?.rank === 'Rookie') && '🆕'}
            </span>
            <span className="rank-name">{profile?.rank || 'Rookie'} Player</span>
          </div>
          <div className="profile-level">
            <span className="level-badge">Level {profile?.level || 1}</span>
            <div className="xp-bar">
              <div
                className="xp-progress"
                style={{ width: `${(profile?.experience || 0) % 100}%` }}
              ></div>
            </div>
            <span className="xp-text">{profile?.experience || 0} / 100 XP</span>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="profile-wallet-summary">
          <h3>💰 Wallet</h3>
          <div className="wallet-balance">
            <span>Balance</span>
            <strong>{formatCurrency(wallet?.balance || 0)}</strong>
          </div>
          <div className="wallet-stats">
            <div className="stat-row">
              <span>Total Winnings</span>
              <span className="won">{formatCurrency(winnings.total || 0)}</span>
            </div>
          </div>
          <Link to="/wallet" className="manage-wallet-btn">
            Manage Wallet →
          </Link>
        </div>

        {/* Join Date */}
        <div className="profile-join-date">
          <span className="join-icon">📅</span>
          <div>
            <span className="label">Member since</span>
            <span className="date">{formatDate(profile?.joinDate)}</span>
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="profile-main">
          {!editMode ? (
            // VIEW MODE
            <div className="profile-view">
              <div className="info-group">
                <label>Username</label>
                <p>@{profile?.username || 'Not set'}</p>
              </div>
              <div className="info-group">
                <label>Display Name</label>
                <p>{profile?.displayName || user?.displayName || 'Not set'}</p>
              </div>
              <div className="info-group">
                <label>Email</label>
                <p>{user?.email}</p>
              </div>
              <div className="info-group">
                <label>Bio</label>
                <p>{profile?.bio || 'No bio yet'}</p>
              </div>
            </div>
          ) : (
            // EDIT MODE
            <form onSubmit={handleProfileUpdate} className="profile-edit-form">
              <div className="form-group">
                <label>Username</label>
                <div className="username-input-wrapper">
                  <span className="username-prefix">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''));
                      setUsernameError('');
                    }}
                    placeholder="username"
                    className="username-input"
                    required
                  />
                </div>
                {usernameError && <small className="error-text">{usernameError}</small>}
                <small className="hint">Only letters, numbers, and underscores. 3-20 characters.</small>
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setEditMode(false);
                    setDisplayName(profile?.displayName || user?.displayName || 'Player');
                    setUsername(profile?.username || profile?.displayName || user?.displayName || 'Player');
                    setBio(profile?.bio || '');
                    setUsernameError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
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

export default Profile;