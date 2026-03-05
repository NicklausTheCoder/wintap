import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ref, get, set, update, push, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { auth, database } from '../firebase';
import './Referrals.css';

function Referrals({ user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalEarned: 0,
    pendingEarnings: 0,
    rank: 'Bronze'
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referrerCode, setReferrerCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Generate or load referral code
  useEffect(() => {
    if (!user?.uid) {
      navigate('/login');
      return;
    }

    loadReferralData();
    loadUserProfile();
  }, [user]);

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

  const loadReferralData = async () => {
    setLoading(true);
    try {
      // Get or generate user's referral code
      const userRef = ref(database, `users/${user.uid}`);
      const userSnapshot = await get(userRef);
      
      let code;
      if (userSnapshot.exists() && userSnapshot.val().referralCode) {
        code = userSnapshot.val().referralCode;
      } else {
        // Generate unique referral code
        code = generateReferralCode();
        await update(userRef, {
          referralCode: code,
          referralCodeGenerated: new Date().toISOString()
        });
      }
      setReferralCode(code);

      // Load user's referrals
      const referralsRef = ref(database, `referrals/${user.uid}`);
      const referralsSnapshot = await get(referralsRef);
      
      const referralsList = [];
      let totalEarned = 0;
      let activeReferrals = 0;

      if (referralsSnapshot.exists()) {
        referralsSnapshot.forEach((child) => {
          const referral = {
            id: child.key,
            ...child.val()
          };
          referralsList.push(referral);
          
          if (referral.status === 'active') {
            activeReferrals++;
          }
          if (referral.bonusEarned) {
            totalEarned += referral.bonusEarned;
          }
        });
      }

      // Sort by date joined (newest first)
      referralsList.sort((a, b) => 
        new Date(b.joinedAt) - new Date(a.joinedAt)
      );

      setReferrals(referralsList);
      
      // Calculate stats
      const rank = calculateRank(referralsList.length);
      setReferralStats({
        totalReferrals: referralsList.length,
        activeReferrals,
        totalEarned,
        pendingEarnings: referralsList.length * 5 - totalEarned,
        rank
      });

      // Check if user was referred by someone
      if (userSnapshot.exists() && userSnapshot.val().referredBy) {
        setReferrerCode(userSnapshot.val().referredBy);
      }

    } catch (error) {
      console.error('Error loading referral data:', error);
      setMessage({ 
        text: 'Failed to load referral data', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = () => {
    const prefix = user.displayName ? 
      user.displayName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() : 
      'USER';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${random}`;
  };

  const calculateRank = (total) => {
    if (total >= 20) return 'Diamond';
    if (total >= 15) return 'Platinum';
    if (total >= 10) return 'Gold';
    if (total >= 5) return 'Silver';
    return 'Bronze';
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = (platform) => {
    const text = `Join me on WinTap Games and get a $10 welcome bonus! Use my referral code: ${referralCode}`;
    const link = `${window.location.origin}/register?ref=${referralCode}`;
    
    let url = '';
    switch(platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        break;
    }
    
    window.open(url, '_blank', 'width=600,height=400');
  };

  const submitReferralCode = async () => {
    if (!referrerCode.trim()) {
      setMessage({ text: 'Please enter a referral code', type: 'error' });
      return;
    }

    try {
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      let referrerId = null;
      usersSnapshot.forEach((child) => {
        if (child.val().referralCode === referrerCode.toUpperCase()) {
          referrerId = child.key;
        }
      });

      if (!referrerId) {
        setMessage({ text: 'Invalid referral code', type: 'error' });
        return;
      }

      if (referrerId === user.uid) {
        setMessage({ text: 'You cannot refer yourself', type: 'error' });
        return;
      }

      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        referredBy: referrerId,
        referredAt: new Date().toISOString()
      });

      const referralRef = ref(database, `referrals/${referrerId}/${user.uid}`);
      await set(referralRef, {
        userId: user.uid,
        username: user.displayName || 'New Player',
        joinedAt: new Date().toISOString(),
        status: 'pending',
        bonusEarned: 0
      });

      setMessage({ 
        text: '✅ Referral code applied successfully!', 
        type: 'success' 
      });
      
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      
    } catch (error) {
      console.error('Error submitting referral:', error);
      setMessage({ text: 'Failed to apply referral code', type: 'error' });
    }
  };

  const getRankIcon = (rank) => {
    const ranks = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '💎',
      'Diamond': '🔷'
    };
    return ranks[rank] || '🥉';
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
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading referral program...</p>
      </div>
    );
  }

  return (
    <div className="referrals-page">
      {/* Sidebar */}
      <div className="referrals-sidebar">
        <div className="sidebar-header">
          <span className="logo">🎮 WinTap</span>
        </div>
        
        <div className="user-profile-mini">
          <div className="user-avatar-large">
            {profile?.displayName?.[0] || user?.email?.[0] || 'P'}
          </div>
          <div className="user-info">
            <h3>{profile?.displayName || user?.displayName || 'Player'}</h3>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <div className="user-rank-card">
          <div className="rank-header">
            <div className="rank-badge">
              <span className="rank-icon">{getRankIcon(profile?.rank)}</span>
              <span className="rank-name">{profile?.rank || 'Bronze'} Player</span>
            </div>
            <div className="level-badge">
              <span>⭐</span>
              <span>Level {profile?.level || 1}</span>
            </div>
          </div>
          
          <div className="xp-container">
            <div className="xp-info">
              <span className="xp-text">{profile?.experience || 0} XP</span>
              <span className="xp-max">/ 100 XP</span>
            </div>
            <div className="xp-bar">
              <div 
                className="xp-progress" 
                style={{ width: `${(profile?.experience || 0) % 100}%` }}
              ></div>
            </div>
            <div className="next-level">
              <span>🎯</span>
              <span><strong>{100 - ((profile?.experience || 0) % 100)} XP</strong> to next level</span>
            </div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">📊 Dashboard</Link>
          <Link to="/games" className="nav-item">🎯 Games</Link>
          <Link to="/wallet" className="nav-item">💰 Wallet</Link>
          <Link to="/profile" className="nav-item">👤 Profile</Link>
          <Link to="/leaderboard" className="nav-item">🏆 Leaderboard</Link>
          <Link to="/referrals" className="nav-item active">👥 Referrals</Link>
          <Link to="/achievements" className="nav-item">⭐ Achievements</Link>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="referrals-main">
        {/* Header */}
        <div className="referrals-header">
          <div className="header-content">
            <h1>👥 Refer & Earn</h1>
            <p>Invite friends and earn up to $20 per referral!</p>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`referrals-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="referrals-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <span className="stat-label">Total Referrals</span>
              <span className="stat-value">{referralStats.totalReferrals}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value">{formatCurrency(referralStats.totalEarned)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{formatCurrency(referralStats.pendingEarnings)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <span className="stat-label">Rank</span>
              <span className="stat-value rank">
                {getRankIcon(referralStats.rank)} {referralStats.rank}
              </span>
            </div>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="referral-code-card">
          <div className="card-header">
            <h2>Your Referral Link</h2>
            <span className="badge">Active</span>
          </div>
          <p className="card-description">
            Share this link with friends. You get $5 when they sign up and another $15 when they make their first deposit!
          </p>
          
          <div className="code-display">
            <div className="code-box">
              <span className="code">{referralCode}</span>
              <button onClick={copyReferralLink} className="copy-btn">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className="share-buttons">
              <button onClick={() => shareReferral('whatsapp')} className="share-btn whatsapp">
                📱 WhatsApp
              </button>
              <button onClick={() => shareReferral('facebook')} className="share-btn facebook">
                📘 Facebook
              </button>
              <button onClick={() => shareReferral('twitter')} className="share-btn twitter">
                🐦 Twitter
              </button>
              <button onClick={() => shareReferral('telegram')} className="share-btn telegram">
                ✈️ Telegram
              </button>
            </div>
          </div>
        </div>

        {/* Referral Progress */}
        <div className="referral-progress">
          <h2>Referral Rewards</h2>
          <div className="progress-steps">
            <div className={`step ${referralStats.totalReferrals >= 1 ? 'completed' : ''}`}>
              <div className="step-icon">🥉</div>
              <div className="step-info">
                <h4>Bronze</h4>
                <p>1+ referrals</p>
                <span className="reward">$10 bonus</span>
              </div>
            </div>
            <div className={`step ${referralStats.totalReferrals >= 5 ? 'completed' : ''}`}>
              <div className="step-icon">🥈</div>
              <div className="step-info">
                <h4>Silver</h4>
                <p>5+ referrals</p>
                <span className="reward">$25 bonus + 2% cashback</span>
              </div>
            </div>
            <div className={`step ${referralStats.totalReferrals >= 10 ? 'completed' : ''}`}>
              <div className="step-icon">🥇</div>
              <div className="step-info">
                <h4>Gold</h4>
                <p>10+ referrals</p>
                <span className="reward">$50 bonus + 5% cashback</span>
              </div>
            </div>
            <div className={`step ${referralStats.totalReferrals >= 20 ? 'completed' : ''}`}>
              <div className="step-icon">💎</div>
              <div className="step-info">
                <h4>Diamond</h4>
                <p>20+ referrals</p>
                <span className="reward">$100 bonus + 10% cashback</span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Referral Code (if user wasn't referred) */}
        {!referrerCode && (
          <div className="add-referral-section">
            <div className="section-header">
              <h2>🎁 Have a referral code?</h2>
              <button 
                onClick={() => setShowReferralInput(!showReferralInput)}
                className="toggle-btn"
              >
                {showReferralInput ? '− Hide' : '+ Add Code'}
              </button>
            </div>
            
            {showReferralInput && (
              <div className="referral-input-card">
                <p>Enter the referral code you received from a friend</p>
                <div className="input-group">
                  <input
                    type="text"
                    value={referrerCode}
                    onChange={(e) => setReferrerCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="referral-input"
                  />
                  <button onClick={submitReferralCode} className="submit-btn">
                    Apply Code
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Referral History */}
        <div className="referral-history">
          <div className="section-header">
            <h2>📋 Your Referrals</h2>
            <span className="total-count">{referrals.length} total</span>
          </div>

          {referrals.length > 0 ? (
            <div className="referrals-list">
              <table className="referrals-table">
                <thead>
                  <tr>
                    <th>Friend</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td className="friend-column">
                        <div className="friend-info">
                          <div className="friend-avatar">
                            {referral.username?.[0] || 'F'}
                          </div>
                          <span className="friend-name">
                            {referral.username || 'New Player'}
                          </span>
                        </div>
                      </td>
                      <td>{formatDate(referral.joinedAt)}</td>
                      <td>
                        <span className={`status-badge ${referral.status}`}>
                          {referral.status === 'active' ? '✅ Active' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="bonus-column">
                        <span className="bonus-amount">
                          {referral.bonusEarned ? `+$${referral.bonusEarned}` : '$0'}
                        </span>
                        {referral.status === 'pending' && (
                          <span className="bonus-pending">
                            (Pending first deposit)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-referrals">
              <div className="no-referrals-icon">👥</div>
              <h3>No referrals yet</h3>
              <p>Share your referral link and start earning!</p>
              <button onClick={copyReferralLink} className="share-now-btn">
                📋 Copy Referral Link
              </button>
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="how-it-works">
          <h2>📌 How It Works</h2>
          <div className="steps-grid">
            <div className="step-item">
              <div className="step-number">1</div>
              <h4>Share Your Link</h4>
              <p>Share your unique referral link with friends</p>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <h4>Friend Signs Up</h4>
              <p>They create an account using your link</p>
              <span className="step-reward">You earn $5</span>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <h4>First Deposit</h4>
              <p>Your friend makes their first deposit</p>
              <span className="step-reward">You earn $15</span>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <h4>They Play & Win</h4>
              <p>You earn 5% of their game entry fees forever!</p>
              <span className="step-reward">Lifetime earnings</span>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="referral-faq">
          <h2>❓ Frequently Asked Questions</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>How do I earn from referrals?</h4>
              <p>$5 when they sign up, $15 when they make their first deposit, and 5% of all their game entry fees forever!</p>
            </div>
            <div className="faq-item">
              <h4>When do I get paid?</h4>
              <p>Bonuses are credited instantly when your friend signs up and makes their first deposit.</p>
            </div>
            <div className="faq-item">
              <h4>Is there a limit?</h4>
              <p>No limit! The more friends you invite, the more you earn. Plus, you unlock higher ranks with better rewards.</p>
            </div>
            <div className="faq-item">
              <h4>Can I refer myself?</h4>
              <p>No, you cannot refer yourself. Each referral must be a unique user.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Referrals;