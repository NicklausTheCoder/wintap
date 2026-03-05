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
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  // Load user data - SIMPLIFIED
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
      
      // Try to read profile
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      const profileSnapshot = await get(profileRef);
      
      if (profileSnapshot.exists()) {
        console.log('✅ Profile found:', profileSnapshot.val());
        const profileData = profileSnapshot.val();
        setProfile(profileData);
        setDisplayName(profileData.displayName || user.displayName || 'Player');
        setBio(profileData.bio || '');
      } else {
        console.log('🆕 No profile found, creating default...');
        // Create default profile
        const defaultProfile = {
          displayName: user.displayName || 'Player',
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
        setBio(defaultProfile.bio);
      }
      
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
      
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'PERMISSION_DENIED') {
        setError('Database permission denied. Please check Firebase Realtime Database rules.');
      } else {
        setError('Failed to load profile: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      const profileRef = ref(database, `user_profiles/${user.uid}`);
      await update(profileRef, {
        displayName,
        bio,
        lastUpdated: new Date().toISOString()
      });

      // Update Firebase Auth display name
      if (user.displayName !== displayName) {
        await updateProfile(user, { displayName });
      }

      // Update local state
      setProfile(prev => ({ ...prev, displayName, bio }));
      setEditMode(false);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
              <span>Total Won</span>
              <span className="won">{formatCurrency(wallet?.totalWon || 0)}</span>
            </div>
            <div className="stat-row">
              <span>Total Lost</span>
              <span className="lost">{formatCurrency(wallet?.totalLost || 0)}</span>
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
                    setBio(profile?.bio || '');
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