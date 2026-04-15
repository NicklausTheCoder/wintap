// Login.jsx
import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, database } from '../firebase';
import { ref, get } from 'firebase/database';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Auth.css';

function Login() {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
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

  // Store user session after login
  const storeUserSession = async (user) => {
    try {
      // Get user data from database
      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);
      
      let username = 'Player';
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        username = userData.public?.username || userData.public?.displayName || user.email?.split('@')[0] || 'Player';
      } else {
        username = user.displayName || user.email?.split('@')[0] || 'Player';
      }

      // Store session data
      const sessionData = {
        uid: user.uid,
        username: username,
        displayName: username,
        email: user.email,
        loginTime: Date.now(),
        sessionId: Math.random().toString(36).substring(2, 15)
      };

      sessionStorage.setItem('gameUser', JSON.stringify(sessionData));
      localStorage.setItem('gameUser', JSON.stringify(sessionData));
      
      console.log('✅ Session stored for:', username);
      return true;
    } catch (error) {
      console.error('❌ Error storing session:', error);
      return false;
    }
  };

  // Handle email/password login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Try to log in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Store session
      await storeUserSession(user);
      
      // Success! Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      // Show friendly error messages
      switch(error.code) {
        case 'auth/user-not-found':
          setError('No account found with this email');
          break;
        case 'auth/wrong-password':
          setError('Wrong password');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled');
          break;
        default:
          setError('Failed to login: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google login
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('✅ Google login successful:', user.uid);

      // Store session
      await storeUserSession(user);
      
      // Navigate to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('❌ Google login failed:', error);
      
      if (error.code === 'auth/operation-not-allowed') {
        setError('Google Sign-In is not enabled in Firebase Console');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Pop-up blocked by browser. Please allow pop-ups.');
      } else {
        setError('Failed to login with Google');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="back-to-home">← Back</Link>
          <h1>🎮 WinTap Games</h1>
          <h2>Welcome Back!</h2>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {/* Google Login Button */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={googleLoading} 
          className="google-button"
        >
          <span className="google-icon">G</span>
          {googleLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="auth-divider">
          <span style={{ color: 'white' }}>or login with email</span>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
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
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          
          <div className="form-options">
            <label  style={{ color: 'white' }} className="remember-me">
              <input  type="checkbox" /> Remember me
            </label>
                <p className="auth-link">
            <Link   to="/forgot-password" >
              Forgot Password?
            </Link>
            </p>
          </div>
          
          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="auth-divider">
          <span>or</span>
        </div>
        
        <p className="auth-link">
          Don't have an account? <Link to="/register">Sign up here</Link>
        </p>
        
        <p className="auth-terms">
          By continuing, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/terms">Privacy Policy</Link>
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

export default Login;