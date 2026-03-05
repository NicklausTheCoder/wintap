// Wallet.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ref, get, set, update, push, onValue } from 'firebase/database';
import { database } from '../firebase';
import './Wallet.css';

function Wallet({ user }) {
  const location = useLocation();
  const [wallet, setWallet] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalWon: 0,
    totalLost: 0,
    totalBonus: 0,
    currency: 'USD',
    lastUpdated: null
  });
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // Navigation items for bottom bar
  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' }
  ];

  // Load wallet data and listen for real-time updates
  useEffect(() => {
    if (!user) return;

    // Listen to wallet updates in real-time
    const walletRef = ref(database, `wallets/${user.uid}`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      } else {
        // Initialize wallet if it doesn't exist
        initializeWallet();
      }
      setLoading(false);
    });

    // Load transactions
    loadTransactions();

    return () => unsubscribe();
  }, [user]);

  const initializeWallet = async () => {
    try {
     const walletRef = ref(database, `users/${user.uid}/wallet`); // Note the 'users/' prefix
      const initialWallet = {
        balance: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalWon: 0,
        totalLost: 0,
        totalBonus: 0,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        isActive: true
      };
      await set(walletRef, initialWallet);
      setWallet(initialWallet);
    } catch (error) {
      console.error('Error initializing wallet:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionsRef = ref(database, `transactions/${user.uid}`);
      const snapshot = await get(transactionsRef);
      
      if (snapshot.exists()) {
        const transactionsData = [];
        snapshot.forEach((child) => {
          transactionsData.push({
            id: child.key,
            ...child.val()
          });
        });
        
        // Sort by timestamp descending (newest first)
        transactionsData.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        setTransactions(transactionsData.slice(0, 10)); // Last 10 transactions
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const addTransaction = async (type, amount, description, balance) => {
    try {
      const transactionsRef = ref(database, `transactions/${user.uid}`);
      const newTransactionRef = push(transactionsRef);
      
      const transaction = {
        type,
        amount,
        balance,
        description,
        status: 'completed',
        timestamp: new Date().toISOString(),
        currency: 'USD'
      };
      
      await set(newTransactionRef, transaction);
      await loadTransactions(); // Reload transactions
      
      return transaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    
    if (amount <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }

    try {
      const walletRef = ref(database, `wallets/${user.uid}`);
      const newBalance = wallet.balance + amount;
      const newTotalDeposited = wallet.totalDeposited + amount;
      
      // Update wallet
      await update(walletRef, {
        balance: newBalance,
        totalDeposited: newTotalDeposited,
        lastUpdated: new Date().toISOString()
      });
      
      // Add transaction record
      await addTransaction(
        'deposit',
        amount,
        `Deposit of $${amount}`,
        newBalance
      );
      
      setMessage({ 
        text: `✅ Successfully deposited $${amount.toFixed(2)}!`, 
        type: 'success' 
      });
      setDepositAmount('');
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      
    } catch (error) {
      console.error('Deposit error:', error);
      setMessage({ 
        text: '❌ Failed to deposit. Please try again.', 
        type: 'error' 
      });
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    
    if (amount <= 0) {
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }
    
    if (amount > wallet.balance) {
      setMessage({ text: '❌ Insufficient balance', type: 'error' });
      return;
    }

    try {
      const walletRef = ref(database, `wallets/${user.uid}`);
      const newBalance = wallet.balance - amount;
      const newTotalWithdrawn = wallet.totalWithdrawn + amount;
      
      // Update wallet
      await update(walletRef, {
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn,
        lastUpdated: new Date().toISOString()
      });
      
      // Add transaction record
      await addTransaction(
        'withdrawal',
        -amount,
        `Withdrawal of $${amount}`,
        newBalance
      );
      
      setMessage({ 
        text: `✅ Successfully withdrew $${amount.toFixed(2)}!`, 
        type: 'success' 
      });
      setWithdrawAmount('');
      
      // Clear message after 5 seconds
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage({ 
        text: '❌ Failed to withdraw. Please try again.', 
        type: 'error' 
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
        <p>Loading your wallet...</p>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      {/* Header */}
      <header className="wallet-header">
        <h1>My Wallet</h1>
        <div className="user-badge">
          <span className="user-avatar">{user?.displayName?.[0] || user?.email?.[0]}</span>
          <span className="user-name">{user?.displayName || user?.email}</span>
        </div>
      </header>

      {/* Message notification */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Main Content */}
      <main className="wallet-main">
        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-icon">💰</div>
          <div className="balance-info">
            <h2>Current Balance</h2>
            <div className="balance-amount">{formatCurrency(wallet.balance || 0)}</div>
            <p className="balance-note">Available for play and withdrawal</p>
          </div>
          <div className="balance-actions">
            <button 
              onClick={() => document.getElementById('deposit').scrollIntoView({ behavior: 'smooth' })}
              className="btn-deposit-large"
            >
              + Deposit
            </button>
            <button 
              onClick={() => document.getElementById('withdraw').scrollIntoView({ behavior: 'smooth' })}
              className="btn-withdraw-large"
              disabled={wallet.balance <= 0}
            >
              - Withdraw
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📥</div>
            <div className="stat-details">
              <h4>Total Deposited</h4>
              <p className="stat-value">{formatCurrency(wallet.totalDeposited || 0)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📤</div>
            <div className="stat-details">
              <h4>Total Withdrawn</h4>
              <p className="stat-value">{formatCurrency(wallet.totalWithdrawn || 0)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-details">
              <h4>Total Winnings</h4>
              <p className="stat-value success">{formatCurrency(wallet.totalWon || 0)}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎁</div>
            <div className="stat-details">
              <h4>Bonus Earned</h4>
              <p className="stat-value">{formatCurrency(wallet.totalBonus || 0)}</p>
            </div>
          </div>
        </div>

        {/* Wallet Forms */}
        <div className="wallet-forms">
          <div id="deposit" className="form-card">
            <h3>📥 Deposit Funds</h3>
            <p className="form-description">Add money to your wallet to start playing</p>
            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label>Amount (USD)</label>
                <div className="amount-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
              <div className="quick-amounts">
                <button type="button" onClick={() => setDepositAmount('10')}>$10</button>
                <button type="button" onClick={() => setDepositAmount('25')}>$25</button>
                <button type="button" onClick={() => setDepositAmount('50')}>$50</button>
                <button type="button" onClick={() => setDepositAmount('100')}>$100</button>
              </div>
              <button type="submit" className="btn-deposit">
                Deposit ${depositAmount || '0'}
              </button>
            </form>
          </div>

          <div id="withdraw" className="form-card">
            <h3>📤 Withdraw Funds</h3>
            <p className="form-description">Withdraw your winnings to your bank account</p>
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label>Amount (USD)</label>
                <div className="amount-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    max={wallet.balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <small className="input-hint">
                  Available: {formatCurrency(wallet.balance || 0)}
                </small>
              </div>
              <div className="quick-amounts">
                <button 
                  type="button" 
                  onClick={() => setWithdrawAmount(Math.min(10, wallet.balance).toString())}
                  disabled={wallet.balance < 10}
                >
                  $10
                </button>
                <button 
                  type="button" 
                  onClick={() => setWithdrawAmount(Math.min(25, wallet.balance).toString())}
                  disabled={wallet.balance < 25}
                >
                  $25
                </button>
                <button 
                  type="button" 
                  onClick={() => setWithdrawAmount(Math.min(50, wallet.balance).toString())}
                  disabled={wallet.balance < 50}
                >
                  $50
                </button>
                <button 
                  type="button" 
                  onClick={() => setWithdrawAmount(wallet.balance.toString())}
                  disabled={wallet.balance <= 0}
                >
                  Max
                </button>
              </div>
              <button 
                type="submit" 
                className="btn-withdraw"
                disabled={wallet.balance <= 0}
              >
                Withdraw ${withdrawAmount || '0'}
              </button>
            </form>
          </div>
        </div>

        {/* Transaction History */}
        <div className="transaction-history">
          <div className="section-header">
            <h3>📋 Recent Transactions</h3>
            <Link to="/wallet/history" className="view-all">View All →</Link>
          </div>
          
          {transactions.length > 0 ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>{formatDate(transaction.timestamp)}</td>
                      <td>
                        <span className={`transaction-type ${transaction.type}`}>
                          {transaction.type === 'deposit' && '📥 Deposit'}
                          {transaction.type === 'withdrawal' && '📤 Withdraw'}
                          {transaction.type === 'win' && '🏆 Win'}
                          {transaction.type === 'loss' && '🎮 Entry'}
                          {transaction.type === 'bonus' && '🎁 Bonus'}
                        </span>
                      </td>
                      <td>{transaction.description}</td>
                      <td className={transaction.amount > 0 ? 'deposit' : 'withdraw'}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </td>
                      <td>{formatCurrency(transaction.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-transactions">
              <p>No transactions yet</p>
              <Link to="/games" className="btn-play-now">Play Games to Start Winning!</Link>
            </div>
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

export default Wallet;