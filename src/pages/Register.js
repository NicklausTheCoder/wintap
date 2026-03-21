// Register.js
import React, { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';
import { 
  generateUniqueUsername,
  checkUsernameExists,
  createUserInDatabase,
  storeUserSession,
  checkUserExists
} from '../utils/registrationHelper';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Register.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Check for referral code in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      console.log('📨 Referral code detected:', ref);
    }
  }, [location]);

  // Navigation items for bottom bar
  const navItems = [
    { path: '/', icon: '🏠', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/login', icon: '🔐', label: 'Login' },
    { path: '/register', icon: '📝', label: 'Sign Up' },
    { path: '/contact', icon: '📞', label: 'Contact' }
  ];

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google sign-in successful:', user.uid);

      // Check if user already exists
      const existingUser = await checkUserExists(user.uid);

      if (existingUser) {
        console.log('👋 Existing user, logging in...');
        
        const existingUsername = existingUser.public?.username;
        storeUserSession(existingUsername);
        navigate('/dashboard');
        return;
      }

      // New user - generate unique username
      const generatedUsername = await generateUniqueUsername();
      console.log('🎲 Generated username:', generatedUsername);

      // Create user in database
      await createUserInDatabase(
        user.uid, 
        user.email || '', 
        generatedUsername,
        referralCode,
        user.photoURL
      );

      // Store session
      storeUserSession(generatedUsername);
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in Firebase Console');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed');
      } else {
        setError('Failed to sign in with Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle email registration
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

    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      return setError('Username already taken');
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      await updateProfile(userCredential.user, {
        displayName: username
      });

      await createUserInDatabase(userId, email, username, referralCode);
      storeUserSession(username);
      navigate('/dashboard');

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Email is already registered');
      } else {
        setError('Registration failed');
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
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Google Button - Clean and Simple */}
        <button 
          onClick={handleGoogleSignIn} 
          disabled={googleLoading} 
          className="google-button"
        >
          <span className="google-icon">G</span>
          {googleLoading ? 'Signing in...' : 'Sign up with Google'}
        </button>

        <div className="auth-divider">
          <span>Or sign up with email</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a username"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label>Referral Code (Optional)</label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code"
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
            />
          </div>

          <div className="form-terms">
            <label className="terms-checkbox">
              <input type="checkbox" required />
              I agree to the <Link to="/terms">Terms</Link>
            </label>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Creating account...' : 'Sign Up Now'}
          </button>
        </form>

        <div className="auth-divider">
          <span>Already have an account?</span>
        </div>

        <p className="auth-link">
          <Link to="/login">Log in here</Link>
        </p>
      </div>

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

export default Register;