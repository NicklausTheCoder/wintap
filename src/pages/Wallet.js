// Wallet.jsx - Paynow integrated via own backend (mobile/EcoCash, no external redirect)
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ref, get, set, update, push, onValue } from 'firebase/database';
import { database } from '../firebase';
import './Wallet.css';

const API_BASE = process.env.REACT_APP_API_URL || 'https://game-server-xvdu.onrender.com';

function Wallet({ user }) {
  const location = useLocation();
  const pollIntervalRef = useRef(null);

  const [wallet, setWallet] = useState({
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalWon: 0,
    totalLost: 0,
    totalBonus: 0,
    currency: 'USD',
    lastUpdated: null,
  });

  const [winnings, setWinnings] = useState({ total: 0, count: 0 });
  const [transactions, setTransactions] = useState([]);
  const [winningsList, setWinningsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositMethod, setDepositMethod] = useState('ecocash');

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState('ecocash'); // 'ecocash' | 'paypal'
  const [paypalEmail, setPaypalEmail] = useState('');

  // Withdrawal confirmation popup
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [pendingWithdrawData, setPendingWithdrawData] = useState(null);

  // Payment flow state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [pollStatus, setPollStatus] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const navItems = [
    { path: '/dashboard', icon: '📊', label: 'Home' },
    { path: '/games', icon: '🎮', label: 'Games' },
    { path: '/wallet', icon: '💰', label: 'Wallet' },
    { path: '/profile', icon: '👤', label: 'Profile' },
    { path: '/leaderboard', icon: '🏆', label: 'Rank' },
  ];

  // ── Load wallet & winnings ────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const walletRef = ref(database, `wallets/${user.uid}`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      if (snapshot.exists()) {
        setWallet(snapshot.val());
      } else {
        initializeWallet();
      }
      setLoading(false);
    });

    const winningsRef = ref(database, `winningsBalance/${user.uid}`);
    const winningsUnsub = onValue(winningsRef, (snap) => {
      let total = 0;
      if (snap.exists()) {
        total = snap.child('balance').val() || 0;
      }
      setWinnings({ balance: total });
    });

    loadTransactions();
    loadWinningsList();

    return () => {
      unsubscribe();
      winningsUnsub();
    };
  }, [user]);

  // ── Resume pending payment on mount ───────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const stored = sessionStorage.getItem(`pending_payment_${user.uid}`);
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setPendingPayment(p);
        setPollStatus('polling');
        setMessage({ text: `⏳ Waiting for payment confirmation (${p.method.toUpperCase()})…`, type: 'info' });
        startPolling(p);
      } catch (_) { }
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const initializeWallet = async () => {
    const initial = {
      balance: 0, totalDeposited: 0, totalWithdrawn: 0,
      totalWon: 0, totalLost: 0, totalBonus: 0,
      currency: 'USD', lastUpdated: new Date().toISOString(), isActive: true,
    };
    await set(ref(database, `wallets/${user.uid}`), initial);
    setWallet(initial);
  };

  const loadTransactions = async () => {
    try {
      const snap = await get(ref(database, `transactions/${user.uid}`));
      if (!snap.exists()) return;
      const list = [];
      snap.forEach((c) => list.push({ id: c.key, ...c.val() }));
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransactions(list.slice(0, 10));
    } catch (e) {
      console.error('loadTransactions error:', e);
    }
  };

  // ── Load winnings list from firebase winnings node ────────────────────────
  // Structure: winnings/{userId}/{periodId} → { amount, awardedAt, game, ... }
  const loadWinningsList = async () => {
    try {
      const snap = await get(ref(database, `winnings/${user.uid}`));
      if (!snap.exists()) return;
      const list = [];
      snap.forEach((periodNode) => {
        const val = periodNode.val();
        if (typeof val === 'object' && val !== null) {
          list.push({
            id: periodNode.key,
            game: val.game || 'unknown',
            amount: val.amount || 0,
            awardedAt: val.awardedAt || val.createdAt || null,
            periodId: val.periodId || val.lobbyId || periodNode.key,
          });
        } else if (typeof val === 'number') {
          // fallback: bare number stored directly
          list.push({
            id: periodNode.key,
            game: 'unknown',
            amount: val,
            awardedAt: null,
            periodId: periodNode.key,
          });
        }
      });
      list.sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt));
      setWinningsList(list);
    } catch (e) {
      console.error('loadWinningsList error:', e);
    }
  };

  const addTransaction = async (type, amount, description, balance, metadata = {}) => {
    const newRef = push(ref(database, `transactions/${user.uid}`));
    await set(newRef, {
      type, amount, balance, description,
      status: 'completed',
      timestamp: new Date().toISOString(),
      currency: 'USD',
      ...metadata,
    });
    await loadTransactions();
  };

  const validateZimPhone = (number) => {
    const cleaned = number.replace(/\s+/g, '');
    return /^(07[3-8][0-9]{7})$/.test(cleaned);
  };

  const validatePaypalEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const formatPhone = (number) => {
    const c = number.replace(/\s+/g, '');
    return c.length === 10 ? `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}` : number;
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount || 0);

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getGameLabel = (game) => {
    const labels = {
      'flappy-bird': '🐦 Flappy Bird',
      'ball-crush': '🔵 Ball Crush',
      'checkers': '♟️ Checkers',
    };
    return labels[game] || `🎮 ${game}`;
  };

  const showMsg = (text, type = 'info', autoClear = 0) => {
    setMessage({ text, type });
    if (autoClear) setTimeout(() => setMessage({ text: '', type: '' }), autoClear);
  };

  // ── Polling logic ─────────────────────────────────────────────────────────

  const startPolling = (payment) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let attempts = 0;
    const MAX_ATTEMPTS = 40;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(
          `${API_BASE}/api/paynow/poll?pollUrl=${encodeURIComponent(payment.pollUrl)}&userId=${user.uid}&plan=wallet_deposit&billingCycle=once&amount=${payment.amount}&reference=${payment.reference}`
        );
        const data = await res.json();

        if (data.paid) {
          clearInterval(pollIntervalRef.current);
          sessionStorage.removeItem(`pending_payment_${user.uid}`);
          setPendingPayment(null);
          setPollStatus('paid');
          setProcessingPayment(false);
          showMsg(`✅ $${payment.amount} added to your wallet!`, 'success', 8000);
          await loadTransactions();
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollIntervalRef.current);
          sessionStorage.removeItem(`pending_payment_${user.uid}`);
          setPendingPayment(null);
          setPollStatus('failed');
          setProcessingPayment(false);
          showMsg('⏰ Payment timed out. If you approved the prompt, please contact support.', 'error', 10000);
        }
      } catch (err) {
        console.error('Poll error:', err);
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollIntervalRef.current);
          setProcessingPayment(false);
          setPollStatus('failed');
          showMsg('❌ Could not verify payment. Please contact support.', 'error', 10000);
        }
      }
    }, 3000);
  };

  const cancelPendingPayment = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    sessionStorage.removeItem(`pending_payment_${user.uid}`);
    setPendingPayment(null);
    setPollStatus('');
    setProcessingPayment(false);
    setMessage({ text: '', type: '' });
  };

  // ── Deposit handler ───────────────────────────────────────────────────────

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (processingPayment) return;

    const amount = parseFloat(depositAmount);
    if (!amount || amount < 1) {
      showMsg('❌ Minimum deposit is $1', 'error');
      return;
    }

    const method = 'web';

    setProcessingPayment(true);
    setPollStatus('polling');
    showMsg(`⏳ Sending payment request to Paynow…`, 'info');

    try {
      const res = await fetch(`${API_BASE}/api/paynow/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: user.email,
          phone: '',
          plan: 'wallet_deposit',
          billingCycle: 'once',
          userId: user.uid,
          method: 'web',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      if (data.redirectUrl) {
        const pending = { reference: data.reference, pollUrl: data.pollUrl, amount, method: 'web' };
        sessionStorage.setItem(`pending_payment_${user.uid}`, JSON.stringify(pending));
        window.location.href = data.redirectUrl;
        return;
      }

      const pending = {
        reference: data.reference,
        pollUrl: data.pollUrl,
        amount,
        method: 'web',
      };
      setPendingPayment(pending);
      sessionStorage.setItem(`pending_payment_${user.uid}`, JSON.stringify(pending));
      showMsg('Complete payment in the Paynow window. Checking…', 'info');
      startPolling(pending);

    } catch (err) {
      console.error('Deposit error:', err);
      setProcessingPayment(false);
      setPollStatus('');
      showMsg(`❌ ${err.message}`, 'error', 8000);
    }
  };

  // ── Withdraw click — show confirmation popup first ────────────────────────

  const handleWithdrawClick = () => {
    if ((winnings.balance || 0) < 3) {
      showMsg('❌ Minimum withdrawal is $3 from winnings.', 'error');
      return;
    }
    setShowWithdrawForm(true);
    setWithdrawAmount('');
    setEcocashNumber('');
    setPaypalEmail('');
    setWithdrawMethod('ecocash');
  };

  const handleWithdrawCancel = () => {
    setShowWithdrawForm(false);
    setWithdrawAmount('');
    setEcocashNumber('');
    setPaypalEmail('');
    setMessage({ text: '', type: '' });
    setShowWithdrawConfirm(false);
    setPendingWithdrawData(null);
  };

  // Step 1: validate and show confirmation popup
  const handleWithdrawSubmitRequest = (e) => {
    e.preventDefault();
    if (processingPayment) return;

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 3) { showMsg('❌ Minimum withdrawal is $3', 'error'); return; }
    if (amount > (winnings.balance || 0)) {
      showMsg(`❌ Only ${formatCurrency(winnings.balance)} available in winnings`, 'error');
      return;
    }

    if (withdrawMethod === 'ecocash') {
      const phone = ecocashNumber.replace(/\s+/g, '');
      if (!phone) { showMsg('❌ Enter your Ecocash number', 'error'); return; }
      if (!validateZimPhone(phone)) {
        showMsg('❌ Invalid Ecocash number (10 digits, starts with 077/078)', 'error');
        return;
      }
      setPendingWithdrawData({ amount, method: 'ecocash', phone });
    } else {
      if (!paypalEmail) { showMsg('❌ Enter your PayPal email', 'error'); return; }
      if (!validatePaypalEmail(paypalEmail)) { showMsg('❌ Invalid PayPal email address', 'error'); return; }
      if (amount < 10) { showMsg('❌ Minimum withdrawal via PayPal is $10', 'error'); return; }
      setPendingWithdrawData({ amount, method: 'paypal', paypalEmail });
    }

    setShowWithdrawConfirm(true);
  };

  // Step 2: confirmed — actually process withdrawal
  const handleWithdrawConfirmed = async () => {
    setShowWithdrawConfirm(false);
    if (!pendingWithdrawData || processingPayment) return;

    const { amount, method, phone, paypalEmail: pEmail } = pendingWithdrawData;

    setProcessingPayment(true);
    showMsg('⏳ Processing withdrawal…', 'info');

    try {
      const withdrawalRef = `WTH_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const winningsSnap = await get(ref(database, `winnings`));
      let currentWinnings = 0;
      if (winningsSnap.exists()) {
        winningsSnap.forEach((gameNode) => {
          const userWins = gameNode.child(user.uid);
          if (userWins.exists()) {
            currentWinnings += userWins.val().total || 0;
          }
        });
      }

      const newWinningsBalance = currentWinnings - amount;

      await update(ref(database, `winnings/checkers/${user.uid}`), {
        total: newWinningsBalance,
        lastWithdrawn: new Date().toISOString(),
      });

      const descPart = method === 'paypal'
        ? `Withdrawal of $${amount} to PayPal (${pEmail})`
        : `Withdrawal of $${amount} to Ecocash ${formatPhone(phone)}`;

      await addTransaction(
        'withdrawal', -amount,
        `${descPart} (Ref: ${withdrawalRef})`,
        newWinningsBalance,
        method === 'paypal'
          ? { withdrawalReference: withdrawalRef, paypalEmail: pEmail, withdrawMethod: 'paypal' }
          : { withdrawalReference: withdrawalRef, ecocashNumber: phone, withdrawMethod: 'ecocash' }
      );

      await set(ref(database, `withdrawals/${withdrawalRef}`), {
        userId: user.uid,
        email: user.email,
        amount,
        reference: withdrawalRef,
        withdrawMethod: method,
        ...(method === 'ecocash'
          ? { ecocashNumber: phone, formattedEcocashNumber: formatPhone(phone) }
          : { paypalEmail: pEmail }),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setEcocashNumber('');
      setPaypalEmail('');
      setPendingWithdrawData(null);

      const successMsg = method === 'paypal'
        ? `✅ Withdrawal of $${amount} to PayPal (${pEmail}) submitted! Processing within 24 hours.`
        : `✅ Withdrawal of $${amount} to ${formatPhone(phone)} submitted! Processing within ~1 hour.`;
      showMsg(successMsg, 'success', 10000);

    } catch (err) {
      console.error('Withdraw error:', err);
      showMsg(`❌ Withdrawal failed: ${err.message}`, 'error', 8000);
    } finally {
      setProcessingPayment(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your wallet…</p>
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <header className="wallet-header">
        <h1>My Wallet</h1>
        <div className="user-badge">
          <span className="user-avatar">{user?.displayName?.[0] || user?.email?.[0]}</span>
          <span className="user-name">{user?.displayName || user?.email}</span>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      {/* ── Pending payment status banner ── */}
      {pendingPayment && pollStatus === 'polling' && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: '12px', padding: '16px 20px',
          margin: '0 16px 16px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div>
            <div style={{ fontWeight: '700', color: '#92400e' }}>
              ⏳ Awaiting payment confirmation
            </div>
            <div style={{ fontSize: '13px', color: '#78350f', marginTop: '4px' }}>
              {pendingPayment.method !== 'web'
                ? `Approve the ${pendingPayment.method.toUpperCase()} prompt on ${pendingPayment.phone}`
                : 'Complete payment in the Paynow window'}
              {' — '}Ref: <strong>{pendingPayment.reference}</strong>
            </div>
          </div>
          <button
            onClick={cancelPendingPayment}
            style={{
              background: '#dc2626', color: 'white', border: 'none',
              borderRadius: '8px', padding: '8px 14px',
              fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Withdrawal Confirmation Popup ── */}
      {showWithdrawConfirm && pendingWithdrawData && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px', padding: '28px 24px',
            maxWidth: '360px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💡</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px', color: '#1a1a2e', fontWeight: '700' }}>
              A Quick Note Before You Withdraw
            </h3>
            <p style={{
              color: '#555', fontSize: '14px', lineHeight: '1.6',
              margin: '0 0 16px', padding: '0 4px',
            }}>
              You're about to withdraw <strong>{formatCurrency(pendingWithdrawData.amount)}</strong>
              {' '}via{' '}
              <strong>{pendingWithdrawData.method === 'paypal' ? `PayPal (${pendingWithdrawData.paypalEmail})` : `Ecocash (${formatPhone(pendingWithdrawData.phone)})`}</strong>.
            </p>
            <div style={{
              background: '#fff8e7', border: '1px solid #f59e0b',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
              textAlign: 'left',
            }}>
              <p style={{ margin: '0', fontSize: '13px', color: '#78350f', lineHeight: '1.6' }}>
                <strong>💛 Friendly reminder:</strong> To be considerate to Wintap Games and help us cover
                processing charges, we encourage withdrawing <strong>larger balances</strong> when possible
                rather than small frequent withdrawals. This helps keep the platform running smoothly for everyone!
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowWithdrawConfirm(false); setPendingWithdrawData(null); }}
                style={{
                  flex: 1, padding: '12px', border: '2px solid #e5e7eb',
                  borderRadius: '10px', background: '#fff', color: '#555',
                  fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleWithdrawConfirmed}
                style={{
                  flex: 1, padding: '12px', border: 'none',
                  borderRadius: '10px', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                Yes, Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="wallet-main">

        {/* Balance Card */}
        <div className="balance-card">
          <div className="balance-icon">💰</div>
          <div className="balance-info">
            <h2>Current Balance</h2>
            <div className="balance-amount">{formatCurrency(wallet.balance || 0)}</div>
            <p className="balance-note">Available for play ONLY</p>
          </div>
          <div className="balance-actions">
            <button
              onClick={() => document.getElementById('deposit').scrollIntoView({ behavior: 'smooth' })}
              className="btn-deposit-large"
              disabled={processingPayment}
            >
              + Deposit
            </button>
            <button
              onClick={handleWithdrawClick}
              className="btn-withdraw-large"
              disabled={(winnings.balance || 0) < 3 || processingPayment}
              title={(winnings.balance || 0) < 3 ? 'Minimum withdrawal is $3 from winnings' : ''}
            >
              - Withdraw
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { icon: '📥', label: 'Total Deposited', value: wallet.totalDeposited || 0 },
            { icon: '📤', label: 'Total Withdrawn', value: wallet.totalWithdrawn || 0 },
            { icon: '🏆', label: 'Total Winnings', value: winnings.balance || 0, green: true },
            { icon: '🎁', label: 'Bonus Earned', value: wallet.totalBonus || 0 },
          ].map(({ icon, label, value, green }) => (
            <div key={label} className="stat-card">
              <div className="stat-icon">{icon}</div>
              <div className="stat-details">
                <h4>{label}</h4>
                <p className={`stat-value${green ? ' success' : ''}`}>{formatCurrency(value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Forms */}
        <div className="wallet-forms">

          {/* ── Deposit Form ── */}
          <div id="deposit" className="form-card">
            <h3>📥 Deposit Funds</h3>
            <p className="form-description">Add money instantly via Paynow (Ecocash/Onemoney/Card)</p>

            <form onSubmit={handleDeposit}>
              <div className="form-group">
                <label>Amount (USD)</label>
                <div className="amount-input">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number" min="1" step="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0"
                    required
                    disabled={processingPayment}
                  />
                </div>
              </div>

              <div className="quick-amounts">
                {['5', '10', '25', '50', '100'].map((v) => (
                  <button key={v} type="button"
                    onClick={() => setDepositAmount(v)}
                    disabled={processingPayment}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="btn-deposit"
                disabled={processingPayment}
                style={{ marginTop: '12px' }}
              >
                {processingPayment
                  ? '⏳ Processing…'
                  : `Pay $${depositAmount || '0'} via Paynow`}
              </button>
            </form>
          </div>

          {/* ── Withdraw Form ── */}
          <div id="withdraw" className="form-card">
            {!showWithdrawForm ? (
              <>
                <h3>📤 Withdraw Funds</h3>
                <p className="form-description">Withdraw your winnings to Ecocash or PayPal</p>
                <div className="withdraw-info">
                  <p>💰 Total Balance: <strong>{formatCurrency(wallet.balance || 0)}</strong></p>
                  <p>🏆 Available Winnings: <strong>{formatCurrency(winnings.balance || 0)}</strong></p>
                  <p className="withdraw-note">(Only winnings can be withdrawn, not deposits)</p>
                  <p>📋 Minimum: <strong>$3 (Ecocash)</strong> / <strong>$10 (PayPal)</strong></p>
                  <p className="withdraw-note">⚠️ Withdrawals are processed manually within 1-24 hours. Please be patient!</p>
                </div>
                <button
                  onClick={handleWithdrawClick}
                  className="btn-withdraw"
                  disabled={winnings.balance < 3 || processingPayment}
                >
                  {(winnings.balance || 0) < 3
                    ? `Need $3 in winnings (you have ${formatCurrency(winnings.balance || 0)})`
                    : 'Start Withdrawal'}
                </button>
              </>
            ) : (
              <>
                <h3>📤 Withdraw Winnings</h3>
                <div className="withdraw-balance-info">
                  <p>🏆 Available: <strong>{formatCurrency(winnings.balance || 0)}</strong></p>
                </div>

                {/* Method selector */}
                <div className="withdraw-method-tabs" style={{
                  display: 'flex', gap: '8px', marginBottom: '20px',
                }}>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('ecocash')}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '10px', border: '2px solid',
                      borderColor: withdrawMethod === 'ecocash' ? '#667eea' : '#e5e7eb',
                      background: withdrawMethod === 'ecocash' ? '#f0f0ff' : '#fff',
                      color: withdrawMethod === 'ecocash' ? '#667eea' : '#888',
                      fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    📱 Ecocash
                    <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '2px' }}>Zimbabwe only · min $3</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawMethod('paypal')}
                    style={{
                      flex: 1, padding: '10px 8px', borderRadius: '10px', border: '2px solid',
                      borderColor: withdrawMethod === 'paypal' ? '#009cde' : '#e5e7eb',
                      background: withdrawMethod === 'paypal' ? '#e8f4fd' : '#fff',
                      color: withdrawMethod === 'paypal' ? '#003087' : '#888',
                      fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    🌍 PayPal
                    <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '2px' }}>International · min $10</div>
                  </button>
                </div>

                <form onSubmit={handleWithdrawSubmitRequest}>
                  <div className="form-group">
                    <label>Amount (USD)</label>
                    <div className="amount-input">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        min={withdrawMethod === 'paypal' ? '10' : '3'}
                        step="1"
                        max={winnings.balance || 0}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder={withdrawMethod === 'paypal' ? '10' : '3'}
                        required
                        disabled={processingPayment}
                      />
                    </div>
                    <small className="input-hint">
                      Min: {withdrawMethod === 'paypal' ? '$10' : '$3'} · Max: {formatCurrency(winnings.balance || 0)}
                    </small>
                  </div>

                  {withdrawMethod === 'ecocash' ? (
                    <div className="form-group">
                      <label>Ecocash Number</label>
                      <div className="ecocash-input">
                        <span className="ecocash-icon">📱</span>
                        <input
                          type="tel"
                          value={ecocashNumber}
                          onChange={(e) => setEcocashNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="077 123 4567"
                          required
                          disabled={processingPayment}
                        />
                      </div>
                      <small className="input-hint">10-digit (077 or 078)</small>
                      {ecocashNumber && !validateZimPhone(ecocashNumber) && (
                        <small className="error-hint">❌ Invalid number</small>
                      )}
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>PayPal Email Address</label>
                      <div className="ecocash-input">
                        <span className="ecocash-icon">🌍</span>
                        <input
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          disabled={processingPayment}
                        />
                      </div>
                      <small className="input-hint">For international players outside Zimbabwe</small>
                      {paypalEmail && !validatePaypalEmail(paypalEmail) && (
                        <small className="error-hint">❌ Invalid email address</small>
                      )}
                    </div>
                  )}

                  <div className="quick-amounts">
                    {(withdrawMethod === 'paypal' ? [10, 25, 50, 100] : [5, 10, 25, 50]).map((v) => (
                      <button key={v} type="button"
                        onClick={() => setWithdrawAmount(Math.min(v, winnings.balance || 0).toString())}
                        disabled={(winnings.balance || 0) < v || processingPayment}
                      >
                        ${v}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setWithdrawAmount((winnings.balance || 0).toString())}
                      disabled={(winnings.balance || 0) < (withdrawMethod === 'paypal' ? 10 : 3) || processingPayment}
                    >
                      Max
                    </button>
                  </div>

                  {withdrawMethod === 'paypal' && (
                    <div style={{
                      background: '#e8f4fd', border: '1px solid #009cde',
                      borderRadius: '10px', padding: '12px 14px', marginTop: '12px',
                      fontSize: '13px', color: '#003087', lineHeight: '1.5',
                    }}>
                      🌍 <strong>PayPal withdrawals</strong> are for international players who don't have access to Ecocash.
                      Funds will be wired directly to your PayPal account within 24 hours.
                    </div>
                  )}

                  <div className="withdraw-actions" style={{ marginTop: '16px' }}>
                    <button
                      type="submit"
                      className="btn-withdraw"
                      disabled={
                        processingPayment ||
                        !withdrawAmount ||
                        parseFloat(withdrawAmount) < (withdrawMethod === 'paypal' ? 10 : 3) ||
                        parseFloat(withdrawAmount) > (winnings.balance || 0) ||
                        (withdrawMethod === 'ecocash' && (!ecocashNumber || !validateZimPhone(ecocashNumber))) ||
                        (withdrawMethod === 'paypal' && (!paypalEmail || !validatePaypalEmail(paypalEmail)))
                      }
                    >
                      {processingPayment ? 'Processing…' : 'Request Withdrawal'}
                    </button>
                    <button type="button" onClick={handleWithdrawCancel}
                      className="btn-cancel" disabled={processingPayment}>
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* ── Winnings History ── */}
        <div className="transaction-history" style={{ marginTop: '20px' }}>
          <div className="section-header">
            <h3>🏆 My Winnings</h3>
            <span style={{ fontSize: '13px', color: '#888' }}>{winningsList.length} entries</span>
          </div>
          {winningsList.length > 0 ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Game</th>
                    <th>Period / Lobby</th>
                    <th>Amount Won</th>
                  </tr>
                </thead>
                <tbody>
                  {winningsList.map((w) => (
                    <tr key={w.id}>
                      <td>{formatDate(w.awardedAt)}</td>
                      <td>{getGameLabel(w.game)}</td>
                      <td style={{ fontSize: '12px', color: '#888', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.periodId || '—'}
                      </td>
                      <td className="deposit" style={{ fontWeight: '700' }}>
                        +{formatCurrency(w.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-transactions">
              <p>No winnings yet — go play!</p>
              <Link to="/games" className="btn-play-now">🎮 Play Games Now</Link>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="transaction-history" style={{ marginTop: '20px' }}>
          <div className="section-header">
            <h3>📋 Recent Transactions</h3>
            <Link to="/wallet/history" className="view-all">View All →</Link>
          </div>
          {transactions.length > 0 ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.timestamp)}</td>
                      <td>
                        <span className={`transaction-type ${tx.type}`}>
                          {{ deposit: '📥 Deposit', deposit_pending: '⏳ Pending', withdrawal: '📤 Withdrawal', win: '🏆 Win', loss: '🎮 Entry', bonus: '🎁 Bonus' }[tx.type] || tx.type}
                        </span>
                      </td>
                      <td>{tx.description}</td>
                      <td className={tx.amount > 0 ? 'deposit' : 'withdraw'}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                      <td>{formatCurrency(tx.balance)}</td>
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