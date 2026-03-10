import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import './App.css';
import MobileOnly from './components/MobileWarning';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Referrals from './pages/Referrals';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Leaderboard from './pages/Leaderboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // THIS IS THE KEY - it listens to Firebase auth state and updates automatically
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('🔥 Auth state changed:', currentUser?.email || 'No user');
      setUser(currentUser);

      // Store in localStorage as backup for Phaser game
      if (currentUser) {
        localStorage.setItem('wintap_user', JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        }));
        currentUser.getIdToken().then(token => {
          localStorage.setItem('wintap_token', token);
        });
      } else {
        localStorage.removeItem('wintap_user');
        localStorage.removeItem('wintap_token');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Also check localStorage on initial load as backup
  useEffect(() => {
    const checkStoredUser = async () => {
      if (!user) {
        const storedUser = localStorage.getItem('wintap_user');
        if (storedUser) {
          console.log('📦 Found stored user, but Firebase will validate');
          // Don't set user from localStorage - let Firebase handle it
          // Just clear if it's stale
          try {
            await auth.currentUser?.reload();
          } catch (e) {
            localStorage.removeItem('wintap_user');
            localStorage.removeItem('wintap_token');
          }
        }
      }
    };

    checkStoredUser();
  }, [user]);

  if (loading) {
    return <div className="loading-screen">Loading WinTap Games...</div>;
  }
  

  return (

   
      <Router>
        <div className="App">
          <div className="app-wrapper" style={{
            minHeight: 'var(--window-height, 100vh)',
            width: '100%',
            overflowX: 'hidden',
            position: 'relative'
          }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home user={user} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route path="/profile" element={user ? <Profile user={user} /> : <Login />} />
              <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Login />} />
              <Route path="/games" element={user ? <Games user={user} /> : <Login />} />
              <Route path="/wallet" element={user ? <Wallet user={user} /> : <Login />} />
              <Route path="/referrals" element={user ? <Referrals user={user} /> : <Login />} />
              <Route path="/leaderboard" element={<Leaderboard user={user} />} />
            </Routes>
          </div>
        </div>
      </Router>

  );
}

export default App;