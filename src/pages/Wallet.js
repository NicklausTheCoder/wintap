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
  const [loading, setLoading] = useState(true);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [depositMethod, setDepositMethod] = useState('ecocash'); // 'ecocash' | 'innbucks' | 'web'

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Payment flow state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null); // { reference, pollUrl, amount, method }
  const [pollStatus, setPollStatus] = useState(''); // 'polling' | 'paid' | 'failed' | ''
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

    get(ref(database, `winnings/${user.uid}`)).then((snap) => {
      if (snap.exists()) setWinnings(snap.val());
    });

    loadTransactions();
    return () => unsubscribe();
  }, [user]);

  // ── Resume pending payment on mount (e.g. user refreshed mid-poll) ────────

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
      } catch (_) {}
    }
  }, [user]);

  // ── Cleanup polling on unmount ────────────────────────────────────────────

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

  const showMsg = (text, type = 'info', autoClear = 0) => {
    setMessage({ text, type });
    if (autoClear) setTimeout(() => setMessage({ text: '', type: '' }), autoClear);
  };

  // ── Polling logic ─────────────────────────────────────────────────────────

  const startPolling = (payment) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~2 minutes at 3s interval

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

    const phone = depositPhone.replace(/\s+/g, '');

    if (depositMethod !== 'web') {
      if (!phone) {
        showMsg('❌ Please enter your mobile number', 'error');
        return;
      }
      if (!validateZimPhone(phone)) {
        showMsg('❌ Invalid Zimbabwe number. Use format: 077 123 4567', 'error');
        return;
      }
    }

    setProcessingPayment(true);
    setPollStatus('polling');
    showMsg(`⏳ Sending ${depositMethod === 'web' ? 'payment request' : `${depositMethod.toUpperCase()} prompt`} to ${depositMethod !== 'web' ? formatPhone(phone) : 'Paynow'}…`, 'info');

    try {
      const res = await fetch(`${API_BASE}/api/paynow/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          email: user.email,
          phone,
          plan: 'wallet_deposit',
          billingCycle: 'once',
          userId: user.uid,
          method: depositMethod,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      // Web redirect (USSD/browser flow)
      if (data.redirectUrl && depositMethod === 'web') {
        // Save pending so we can resume on return
        const pending = { reference: data.reference, pollUrl: data.pollUrl, amount, method: 'web' };
        sessionStorage.setItem(`pending_payment_${user.uid}`, JSON.stringify(pending));
        window.location.href = data.redirectUrl;
        return;
      }

      // Mobile (EcoCash / InnBucks) — poll in-page
      const pending = {
        reference: data.reference,
        pollUrl: data.pollUrl,
        amount,
        method: depositMethod,
        phone: formatPhone(phone),
      };
      setPendingPayment(pending);
      sessionStorage.setItem(`pending_payment_${user.uid}`, JSON.stringify(pending));
      showMsg(
        `📱 USSD prompt sent to ${formatPhone(phone)}. Please approve it on your phone. Checking…`,
        'info'
      );
      startPolling(pending);
    } catch (err) {
      console.error('Deposit error:', err);
      setProcessingPayment(false);
      setPollStatus('');
      showMsg(`❌ ${err.message}`, 'error', 8000);
    }
  };

  // ── Withdraw handler (unchanged logic, credits winnings) ─────────────────

  const handleWithdrawClick = () => {
    if (winnings.total < 5) {
      showMsg('❌ Minimum withdrawal is $5 from winnings.', 'error');
      return;
    }
    setShowWithdrawForm(true);
    setWithdrawAmount('');
    setEcocashNumber('');
  };

  const handleWithdrawCancel = () => {
    setShowWithdrawForm(false);
    setWithdrawAmount('');
    setEcocashNumber('');
    setMessage({ text: '', type: '' });
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (processingPayment) return;

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 5) { showMsg('❌ Minimum withdrawal is $5', 'error'); return; }
    if (amount > winnings.total) { showMsg(`❌ Only ${formatCurrency(winnings.total)} available in winnings`, 'error'); return; }

    const phone = ecocashNumber.replace(/\s+/g, '');
    if (!phone) { showMsg('❌ Enter your Ecocash number', 'error'); return; }
    if (!validateZimPhone(phone)) { showMsg('❌ Invalid Ecocash number (10 digits, starts with 077/078)', 'error'); return; }

    setProcessingPayment(true);
    showMsg('⏳ Processing withdrawal…', 'info');

    try {
      const withdrawalRef = `WTH_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const walletSnap = await get(ref(database, `wallets/${user.uid}`));
      const current = walletSnap.val();
      const newBalance = current.balance - amount;

      await update(ref(database, `wallets/${user.uid}`), {
        balance: newBalance,
        totalWithdrawn: (current.totalWithdrawn || 0) + amount,
        lastUpdated: new Date().toISOString(),
      });
      await update(ref(database, `winnings/${user.uid}`), {
        total: (winnings.total || 0) - amount,
        lastWithdrawn: new Date().toISOString(),
      });

      await addTransaction(
        'withdrawal', -amount,
        `Withdrawal of $${amount} to Ecocash ${formatPhone(phone)} (Ref: ${withdrawalRef})`,
        newBalance,
        { withdrawalReference: withdrawalRef, ecocashNumber: phone }
      );

      await set(ref(database, `withdrawals/${withdrawalRef}`), {
        userId: user.uid, email: user.email, amount,
        reference: withdrawalRef,
        ecocashNumber: phone,
        formattedEcocashNumber: formatPhone(phone),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      const updatedWinnings = await get(ref(database, `winnings/${user.uid}`));
      if (updatedWinnings.exists()) setWinnings(updatedWinnings.val());

      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setEcocashNumber('');
      showMsg(`✅ Withdrawal of $${amount} to ${formatPhone(phone)} submitted! Processing within 24 hours.`, 'success', 10000);
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
              disabled={processingPayment}
            >
              + Deposit
            </button>
            <button
              onClick={handleWithdrawClick}
              className="btn-withdraw-large"
              disabled={winnings.total < 5 || processingPayment}
              title={winnings.total < 5 ? 'Minimum withdrawal is $5 from winnings' : ''}
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
            { icon: '🏆', label: 'Total Winnings', value: winnings.total || 0, green: true },
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
            <p className="form-description">Add money instantly via Paynow (EcoCash, InnBucks, or web)</p>

            <form onSubmit={handleDeposit}>

              {/* Method selector */}
              <div className="form-group">
                <label>Payment Method</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'ecocash', label: '📱 EcoCash' },
                    { id: 'innbucks', label: '💸 InnBucks' },
                    { id: 'web', label: '🌐 Web / Card' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDepositMethod(id)}
                      disabled={processingPayment}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none',
                        cursor: 'pointer', fontWeight: '600', fontSize: '13px',
                        background: depositMethod === id ? '#059669' : '#f3f4f6',
                        color: depositMethod === id ? 'white' : '#374151',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
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

              {/* Quick amounts */}
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

              {/* Phone number (mobile methods only) */}
              {depositMethod !== 'web' && (
                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label>{depositMethod === 'ecocash' ? 'EcoCash' : 'InnBucks'} Number</label>
                  <div className="ecocash-input">
                    <span className="ecocash-icon">📱</span>
                    <input
                      type="tel"
                      value={depositPhone}
                      onChange={(e) => setDepositPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="077 123 4567"
                      required={depositMethod !== 'web'}
                      disabled={processingPayment}
                    />
                  </div>
                  <small className="input-hint">10-digit Zimbabwe number (e.g. 0771234567)</small>
                  {depositPhone && !validateZimPhone(depositPhone) && (
                    <small className="error-hint">❌ Invalid number</small>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-deposit"
                disabled={processingPayment}
                style={{ marginTop: '12px' }}
              >
                {processingPayment
                  ? '⏳ Processing…'
                  : depositMethod === 'web'
                    ? `Pay $${depositAmount || '0'} via Paynow`
                    : `Send $${depositAmount || '0'} ${depositMethod.toUpperCase()} Prompt`}
              </button>
            </form>
          </div>

          {/* ── Withdraw Form ── */}
          <div id="withdraw" className="form-card">
            {!showWithdrawForm ? (
              <>
                <h3>📤 Withdraw Funds</h3>
                <p className="form-description">Withdraw your winnings to Ecocash</p>
                <div className="withdraw-info">
                  <p>💰 Total Balance: <strong>{formatCurrency(wallet.balance || 0)}</strong></p>
                  <p>🏆 Available Winnings: <strong>{formatCurrency(winnings.total || 0)}</strong></p>
                  <p className="withdraw-note">(Only winnings can be withdrawn, not deposits)</p>
                  <p>📋 Minimum: <strong>$5</strong> · ⏱️ Processing: <strong>~1 hour</strong></p>
                </div>
                <button
                  onClick={handleWithdrawClick}
                  className="btn-withdraw"
                  disabled={winnings.total < 5 || processingPayment}
                >
                  {winnings.total < 5
                    ? `Need $5 in winnings (you have ${formatCurrency(winnings.total)})`
                    : 'Start Withdrawal'}
                </button>
              </>
            ) : (
              <>
                <h3>📤 Withdraw Winnings to Ecocash</h3>
                <div className="withdraw-balance-info">
                  <p>🏆 Available: <strong>{formatCurrency(winnings.total || 0)}</strong></p>
                  <p className="withdraw-note">(Minimum $5)</p>
                </div>
                <form onSubmit={handleWithdraw}>
                  <div className="form-group">
                    <label>Amount (USD)</label>
                    <div className="amount-input">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number" min="5" step="1" max={winnings.total}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="5" required disabled={processingPayment}
                      />
                    </div>
                    <small className="input-hint">Max: {formatCurrency(winnings.total || 0)}</small>
                  </div>
                  <div className="form-group">
                    <label>Ecocash Number</label>
                    <div className="ecocash-input">
                      <span className="ecocash-icon">📱</span>
                      <input
                        type="tel"
                        value={ecocashNumber}
                        onChange={(e) => setEcocashNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="077 123 4567"
                        required disabled={processingPayment}
                      />
                    </div>
                    <small className="input-hint">10-digit (077 or 078)</small>
                    {ecocashNumber && !validateZimPhone(ecocashNumber) && (
                      <small className="error-hint">❌ Invalid number</small>
                    )}
                  </div>
                  <div className="quick-amounts">
                    {[5, 10, 25, 50].map((v) => (
                      <button key={v} type="button"
                        onClick={() => setWithdrawAmount(Math.min(v, winnings.total).toString())}
                        disabled={winnings.total < v || processingPayment}
                      >
                        ${v}
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => setWithdrawAmount(winnings.total.toString())}
                      disabled={winnings.total < 5 || processingPayment}
                    >
                      Max
                    </button>
                  </div>
                  <div className="withdraw-actions">
                    <button
                      type="submit" className="btn-withdraw"
                      disabled={
                        processingPayment ||
                        !withdrawAmount ||
                        parseFloat(withdrawAmount) < 5 ||
                        parseFloat(withdrawAmount) > winnings.total ||
                        !ecocashNumber ||
                        !validateZimPhone(ecocashNumber)
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