// Wallet.jsx - FIXED version
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


  const [winnings, setWinnings] = useState({
    total: 0,
    count: 0
  });

  // Load winnings data
  useEffect(() => {
    if (!user) return;

    const winningsRef = ref(database, `winnings/${user.uid}`);
    get(winningsRef).then((snapshot) => {
      if (snapshot.exists()) {
        setWinnings(snapshot.val());
      }
    });
  }, [user]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [processedPayments, setProcessedPayments] = useState(new Set());

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
    console.log('🔥 useEffect - user:', user?.uid);
    if (!user) {
      console.log('❌ No user found');
      return;
    }

    console.log('📦 Loading wallet for user:', user.uid);
    const walletRef = ref(database, `wallets/${user.uid}`);
    const unsubscribe = onValue(walletRef, (snapshot) => {
      console.log('💰 Wallet snapshot received:', snapshot.exists());
      if (snapshot.exists()) {
        const walletData = snapshot.val();
        console.log('✅ Wallet data:', walletData);
        setWallet(walletData);
      } else {
        console.log('⚠️ No wallet found, initializing...');
        initializeWallet();
      }
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading wallet:', error);
    });

    loadTransactions();

    return () => {
      console.log('🧹 Cleaning up wallet listener');
      unsubscribe();
    };
  }, [user]);

  // Check for payment result in URL
  useEffect(() => {
    console.log('🔍 Location effect - path:', location.pathname, 'search:', location.search);
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference');
    const status = params.get('status');

    if (reference && status) {
      console.log('📨 Payment return detected:', { reference, status });

      // Check if this payment was already processed
      if (processedPayments.has(reference)) {
        console.log('⏭️ Payment already processed, skipping');
        return;
      }

      if (status === 'success' || status === 'returned') {
        setMessage({
          text: `✅ Payment ${reference} was successful! Verifying...`,
          type: 'success'
        });

        // Mark as processing
        setProcessedPayments(prev => new Set([...prev, reference]));

        // Verify the payment with API
        verifyPaymentWithAPI(reference);

      } else if (status === 'failed') {
        setMessage({
          text: `❌ Payment ${reference} failed.`,
          type: 'error'
        });
      }

      // Clean up URL after 5 seconds
      setTimeout(() => {
        window.history.replaceState({}, document.title, '/wallet');
      }, 5000);
    }
  }, [location, processedPayments]);

  const initializeWallet = async () => {
    console.log('🏦 Initializing wallet for user:', user?.uid);
    try {
      const walletRef = ref(database, `wallets/${user.uid}`);
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
      console.log('📝 Setting initial wallet:', initialWallet);
      await set(walletRef, initialWallet);
      setWallet(initialWallet);
      console.log('✅ Wallet initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing wallet:', error);
    }
  };

  const loadTransactions = async () => {
    console.log('📋 Loading transactions for user:', user?.uid);
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

        transactionsData.sort((a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
        );

        console.log(`✅ Loaded ${transactionsData.length} transactions`);
        setTransactions(transactionsData.slice(0, 10));
      } else {
        console.log('📭 No transactions found');
      }
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
    }
  };

  const addTransaction = async (type, amount, description, balance, metadata = {}) => {
    console.log('➕ Adding transaction:', { type, amount, description });
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
        currency: 'USD',
        ...metadata
      };

      await set(newTransactionRef, transaction);
      await loadTransactions();

      console.log('✅ Transaction added successfully');
      return transaction;
    } catch (error) {
      console.error('❌ Error adding transaction:', error);
      throw error;
    }
  };

  const generatePaymentReference = () => {
    const reference = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    console.log('🔢 Generated payment reference:', reference);
    return reference;
  };

  const generateWithdrawalReference = () => {
    const reference = `WTH_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    console.log('🔢 Generated withdrawal reference:', reference);
    return reference;
  };

  const savePendingTransaction = async (amount, reference, apiResponse) => {
    console.log('💾 Saving pending transaction:', { amount, reference });
    try {
      const transactionsRef = ref(database, `transactions/${user.uid}`);
      const newTransactionRef = push(transactionsRef);

      await set(newTransactionRef, {
        type: 'deposit_pending',
        amount: amount,
        balance: wallet.balance,
        description: `Pending deposit of $${amount} (Ref: ${reference})`,
        status: 'pending',
        paymentReference: reference,
        apiResponse: apiResponse,
        timestamp: new Date().toISOString(),
        currency: 'USD'
      });

      await loadTransactions();
      console.log('✅ Pending transaction saved');
    } catch (error) {
      console.error('❌ Error saving pending transaction:', error);
    }
  };

  // Validate Ecocash number
  const validateEcocashNumber = (number) => {
    // Zimbabwe Ecocash format: 077XXXXXXX or 078XXXXXXX
    const cleaned = number.replace(/\s+/g, '');
    const regex = /^(07[7-8][0-9]{7})$/;
    return regex.test(cleaned);
  };

  // Format Ecocash number for display
  const formatEcocashNumber = (number) => {
    const cleaned = number.replace(/\s+/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return number;
  };

  const checkPaymentStatus = async (paymentReference) => {
    console.log('🔍 Checking payment status for:', paymentReference);

    // Check if already processed in this session
    if (processedPayments.has(paymentReference)) {
      console.log('⏭️ Payment already processed in this session');
      return;
    }

    try {
      // Get poll URL from Firebase
      const pollRef = ref(database, `payment_polls/${paymentReference}`);
      const pollSnapshot = await get(pollRef);

      if (!pollSnapshot.exists()) {
        console.log('⚠️ No poll URL found for:', paymentReference);
        return;
      }

      const pollData = pollSnapshot.val();

      // Check if this payment was already completed
      if (pollData.status === 'completed') {
        console.log('⏭️ Payment already marked as completed, skipping');
        return;
      }

      console.log('📎 Poll data:', pollData);

      // Call Laravel verify API
      console.log('🌐 Calling Laravel verify API for poll URL');
      const response = await fetch('http://127.0.0.1:8000/api/paynow/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          poll_url: pollData.pollUrl,
          reference: paymentReference
        })
      });

      const result = await response.json();
      console.log('📥 Laravel verification result:', result);

      if (result.success && result.paid) {
        // Mark as processed immediately to prevent double-processing
        setProcessedPayments(prev => new Set([...prev, paymentReference]));

        // Update poll status in Firebase
        await update(pollRef, {
          status: 'completed',
          verifiedAt: new Date().toISOString()
        });

        console.log('💰 Payment completed, updating wallet');

        // Get the payment details from Firebase
        const paymentRef = ref(database, `payments/${paymentReference}`);
        const paymentSnapshot = await get(paymentRef);

        if (paymentSnapshot.exists()) {
          const payment = paymentSnapshot.val();

          // DOUBLE-CHECK: Make sure this payment wasn't already processed
          if (payment.status === 'completed') {
            console.log('⏭️ Payment already completed in database, skipping');
            return;
          }

          const walletRef = ref(database, `wallets/${user.uid}`);
          const walletSnapshot = await get(walletRef);

          if (walletSnapshot.exists()) {
            const currentWallet = walletSnapshot.val();
            const newBalance = currentWallet.balance + payment.amount;

            console.log('💵 Updating balance:', { old: currentWallet.balance, new: newBalance });

            await update(walletRef, {
              balance: newBalance,
              totalDeposited: (currentWallet.totalDeposited || 0) + payment.amount,
              lastUpdated: new Date().toISOString()
            });

            // Add transaction record
            await addTransaction(
              'deposit',
              payment.amount,
              `Deposit of $${payment.amount} (Ref: ${paymentReference})`,
              newBalance,
              {
                paymentReference: paymentReference,
                paymentMethod: 'paynow'
              }
            );

            // Update payment status
            await update(paymentRef, {
              status: 'completed',
              verifiedAt: new Date().toISOString()
            });

            setMessage({
              text: `✅ Payment confirmed! $${payment.amount} added to your wallet.`,
              type: 'success'
            });

            console.log('✅ Wallet updated successfully');
          }
        }
      } else {
        console.log('⏳ Payment still pending:', result.message);
      }

      return result;

    } catch (error) {
      console.error('❌ Error checking payment status:', error);
    }
  };

  const verifyPaymentWithAPI = async (reference) => {
    console.log('🔍 Verifying payment with API:', reference);

    // Check if already processed
    if (processedPayments.has(reference)) {
      console.log('⏭️ Payment already processed, skipping');
      return;
    }

    try {
      // Get the payment record from Firebase
      const paymentRef = ref(database, `payments/${reference}`);
      const paymentSnapshot = await get(paymentRef);

      if (!paymentSnapshot.exists()) {
        console.log('⚠️ Payment not found in Firebase');
        return;
      }

      const payment = paymentSnapshot.val();

      // Check if already completed
      if (payment.status === 'completed') {
        console.log('⏭️ Payment already completed in database');
        setProcessedPayments(prev => new Set([...prev, reference]));
        return;
      }

      if (payment.pollUrl) {
        // Use the verification function
        await checkPaymentStatus(reference);
      } else {
        console.log('⚠️ No poll URL found for payment');
      }

    } catch (error) {
      console.error('❌ Error verifying payment:', error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    console.log('💰 handleDeposit called', { depositAmount, user: user?.uid });

    // Prevent double-submission
    if (processingPayment) {
      console.log('⏭️ Already processing a payment');
      return;
    }

    const amount = parseFloat(depositAmount);
    console.log('📊 Parsed amount:', amount);

    if (amount <= 0) {
      console.log('❌ Invalid amount:', amount);
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }

    if (amount < 1) {
      console.log('❌ Amount too low:', amount);
      setMessage({ text: 'Minimum deposit is $1', type: 'error' });
      return;
    }

    // Generate unique payment reference
    const paymentReference = generatePaymentReference();

    // Prepare payment data to send to API
    const paymentData = {
      amount: amount,
      currency: 'USD',
      reference: paymentReference,
      description: 'Wallet Deposit',

      // User details
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Player',
        phone: user.phoneNumber || null
      },

      // URLs for Paynow to redirect
      returnUrl: `${window.location.origin}/wallet?reference=${paymentReference}&status=returned`,
      resultUrl: `${window.location.origin}/api/payment-result`,

      // Additional metadata
      metadata: {
        source: 'web',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    };

    console.log('📦 Payment data prepared:', paymentData);

    setProcessingPayment(true);
    setMessage({ text: '⏳ Processing payment...', type: 'info' });

    try {
      // Make API call to your backend
      const apiUrl = 'http://127.0.0.1:8000/api/paynow/initiate';
      console.log('🌐 Making API call to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData),
        signal: AbortSignal.timeout(30000)
      });

      console.log('📥 API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API error response:', errorText);
        throw new Error(`API responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📥 API Response:', result);

      // Check if payment was successful
      if (result.success && result.redirect_url) {
        console.log('✅ Payment initiated successfully');

        // 1. STORE PAYMENT IN FIREBASE
        const paymentRecord = {
          email: user.email,
          userId: user.uid,
          amount: amount,
          reference: paymentReference,
          pollUrl: result.poll_url,
          redirectUrl: result.redirect_url,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          paymentMethod: 'paynow',
          metadata: {
            apiResponse: result,
            userAgent: navigator.userAgent
          }
        };

        console.log('💾 Saving payment to Firebase:', paymentRecord);

        // Save to Firebase payments collection
        const paymentsRef = ref(database, `payments/${paymentReference}`);
        await set(paymentsRef, paymentRecord);
        console.log('✅ Payment saved to payments/');

        // Also save under user's payments for easy lookup
        const userPaymentRef = ref(database, `users/${user.uid}/payments/${paymentReference}`);
        await set(userPaymentRef, {
          reference: paymentReference,
          amount: amount,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Payment saved to user payments/');

        // 2. SAVE PENDING TRANSACTION
        await savePendingTransaction(amount, paymentReference, result);

        // 3. STORE POLL URL FOR LATER CHECKING
        const pollRef = ref(database, `payment_polls/${paymentReference}`);
        await set(pollRef, {
          pollUrl: result.poll_url,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        console.log('✅ Poll URL saved');

        setMessage({
          text: `✅ Payment initiated! Redirecting to Paynow...`,
          type: 'success'
        });

        // 4. REDIRECT TO PAYNOW AFTER SHORT DELAY
        console.log('🚀 Redirecting to:', result.redirect_url);
        setTimeout(() => {
          window.location.href = result.redirect_url;
        }, 1500);

      } else {
        console.error('❌ Payment initiation failed:', result);
        throw new Error(result.message || 'Payment initiation failed');
      }

    } catch (error) {
      console.error('❌ API call failed:', error);

      setMessage({
        text: `❌ Payment failed: ${error.message}`,
        type: 'error'
      });
      setProcessingPayment(false);
    }
  };

  const handleWithdrawClick = () => {
    console.log('👆 Withdraw button clicked');
    // Check minimum winnings BEFORE showing form
    if (winnings.total < 5) {
      setMessage({
        text: '❌ Minimum withdrawal amount is $5. You need to win more games first.',
        type: 'error'
      });
      return;
    }
    setShowWithdrawForm(true);
    setWithdrawAmount('');
    setEcocashNumber('');
  };

  const handleWithdrawCancel = () => {
    console.log('👆 Withdraw cancelled');
    setShowWithdrawForm(false);
    setWithdrawAmount('');
    setEcocashNumber('');
    setMessage({ text: '', type: '' });
  };

  // FIXED: No API call, just save to Firebase
  // FIXED: Withdraw from winnings only, with $5 minimum
  const handleWithdraw = async (e) => {
    e.preventDefault();
    console.log('💸 handleWithdraw called', {
      withdrawAmount,
      ecocashNumber,
      winnings: winnings.total
    });

    const amount = parseFloat(withdrawAmount);
    console.log('📊 Parsed amount:', amount);

    // Validate amount
    if (amount <= 0) {
      console.log('❌ Invalid amount:', amount);
      setMessage({ text: 'Please enter a valid amount', type: 'error' });
      return;
    }

    // Check minimum withdrawal ($5)
    if (amount < 5) {
      console.log('❌ Amount below minimum: $5');
      setMessage({ text: '❌ Minimum withdrawal amount is $5', type: 'error' });
      return;
    }

    // Check against WINNINGS, not balance
    if (amount > winnings.total) {
      console.log('❌ Insufficient winnings:', { amount, winnings: winnings.total });
      setMessage({ text: `❌ You only have ${formatCurrency(winnings.total)} in winnings`, type: 'error' });
      return;
    }

    // Validate Ecocash number
    if (!ecocashNumber) {
      console.log('❌ No Ecocash number provided');
      setMessage({ text: '❌ Please enter your Ecocash number', type: 'error' });
      return;
    }

    if (!validateEcocashNumber(ecocashNumber)) {
      console.log('❌ Invalid Ecocash number:', ecocashNumber);
      setMessage({
        text: '❌ Invalid Ecocash number. Please enter a valid 10-digit number starting with 077 or 078',
        type: 'error'
      });
      return;
    }

    setProcessingPayment(true);
    setMessage({ text: '⏳ Processing withdrawal request...', type: 'info' });

    try {
      // Generate withdrawal reference
      const withdrawalReference = generateWithdrawalReference();

      console.log('📦 Saving withdrawal to Firebase:', withdrawalReference);

      // Update wallet - subtract from balance AND mark winnings as withdrawn
      const walletRef = ref(database, `wallets/${user.uid}`);
      const newBalance = wallet.balance - amount;
      const newTotalWithdrawn = (wallet.totalWithdrawn || 0) + amount;

      console.log('💵 New balance:', newBalance);

      await update(walletRef, {
        balance: newBalance,
        totalWithdrawn: newTotalWithdrawn,
        lastUpdated: new Date().toISOString()
      });

      // Also update winnings to show they've been withdrawn
      const winningsRef = ref(database, `winnings/${user.uid}`);
      await update(winningsRef, {
        total: (winnings.total || 0) - amount,
        lastWithdrawn: new Date().toISOString()
      });

      // Add transaction record
      await addTransaction(
        'withdrawal',
        -amount,
        `Withdrawal of $${amount} from winnings to Ecocash ${formatEcocashNumber(ecocashNumber)} (Ref: ${withdrawalReference})`,
        newBalance,
        {
          withdrawalReference: withdrawalReference,
          ecocashNumber: ecocashNumber.replace(/\s+/g, '')
        }
      );

      // Store withdrawal record with Ecocash details for manual processing
      const withdrawalRef = ref(database, `withdrawals/${withdrawalReference}`);
      await set(withdrawalRef, {
        userId: user.uid,
        email: user.email,
        amount: amount,
        reference: withdrawalReference,
        ecocashNumber: ecocashNumber.replace(/\s+/g, ''),
        formattedEcocashNumber: formatEcocashNumber(ecocashNumber),
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: `Withdrawal of winnings to Ecocash ${formatEcocashNumber(ecocashNumber)}`
      });
      console.log('✅ Withdrawal record saved to Firebase');

      // Also save under user's withdrawals
      const userWithdrawalRef = ref(database, `users/${user.uid}/withdrawals/${withdrawalReference}`);
      await set(userWithdrawalRef, {
        reference: withdrawalReference,
        amount: amount,
        ecocashNumber: ecocashNumber.replace(/\s+/g, ''),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Refresh winnings
      const updatedWinnings = await get(ref(database, `winnings/${user.uid}`));
      if (updatedWinnings.exists()) {
        setWinnings(updatedWinnings.val());
      }

      setMessage({
        text: `✅ Withdrawal request for $${amount} from your winnings to ${formatEcocashNumber(ecocashNumber)} submitted! Our team will process it within 24 hours.`,
        type: 'success'
      });

      // Reset form
      setWithdrawAmount('');
      setEcocashNumber('');
      setShowWithdrawForm(false);

    } catch (error) {
      console.error('❌ Withdrawal error:', error);
      setMessage({
        text: `❌ Withdrawal failed: ${error.message}`,
        type: 'error'
      });
    } finally {
      setProcessingPayment(false);
      console.log('🏁 Withdrawal processing completed');
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    console.log('⏳ Loading state');
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your wallet...</p>
      </div>
    );
  }

  console.log('🎨 Rendering wallet UI', {
    processingPayment,
    message,
    showWithdrawForm,
    totalWon: wallet.totalWon
  });

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
              onClick={() => {
                console.log('👆 Deposit button clicked (scroll)');
                document.getElementById('deposit').scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-deposit-large"
              disabled={processingPayment}
            >
              + Deposit
            </button>


            <button
              onClick={handleWithdrawClick}
              className="btn-withdraw-large"
              disabled={wallet.balance < 5 || processingPayment}
              title={wallet.balance < 5 ? "Minimum withdrawal is $5" : ""}
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
              <p className="stat-value success">{formatCurrency(winnings.total || 0)}</p>
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
            <p className="form-description">Add money to your wallet via Paynow</p>
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
                    onChange={(e) => {
                      console.log('📝 Deposit amount changed:', e.target.value);
                      setDepositAmount(e.target.value);
                    }}
                    placeholder="0"
                    required
                    disabled={processingPayment}
                  />
                </div>
              </div>
              <div className="quick-amounts">
                <button type="button" onClick={() => {
                  console.log('👆 Quick amount: $10');
                  setDepositAmount('10');
                }} disabled={processingPayment}>$10</button>
                <button type="button" onClick={() => {
                  console.log('👆 Quick amount: $25');
                  setDepositAmount('25');
                }} disabled={processingPayment}>$25</button>
                <button type="button" onClick={() => {
                  console.log('👆 Quick amount: $50');
                  setDepositAmount('50');
                }} disabled={processingPayment}>$50</button>
                <button type="button" onClick={() => {
                  console.log('👆 Quick amount: $100');
                  setDepositAmount('100');
                }} disabled={processingPayment}>$100</button>
              </div>
              <button
                type="submit"
                className="btn-deposit"
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : `Deposit $${depositAmount || '0'}`}
              </button>
            </form>
          </div>

     <div id="withdraw" className="form-card">
  {!showWithdrawForm ? (
    <>
      <h3>📤 Withdraw Funds</h3>
      <p className="form-description">Withdraw your winnings to Ecocash</p>
      <div className="withdraw-info">
        <p>💰 Total Balance: <strong>{formatCurrency(wallet.balance || 0)}</strong></p>
        <p>🏆 Available Winnings to Withdraw: <strong>{formatCurrency(winnings.total || 0)}</strong></p>
        <p className="withdraw-note">(You can only withdraw your winnings, not deposits)</p>
        <p>📋 Minimum withdrawal: <strong>$5</strong></p>
        <p>⏱️ Processing time: <strong>1 hour</strong></p>
      </div>

      <button
        onClick={handleWithdrawClick}
        className="btn-withdraw"
        disabled={winnings.total < 5 || processingPayment}
      >
        {winnings.total < 5 
          ? `Need $5 in winnings (You have ${formatCurrency(winnings.total)})` 
          : 'Start Withdrawal'}
      </button>
    </>
  ) : (
    <>
      <h3>📤 Withdraw Winnings to Ecocash</h3>
      <p className="form-description">Enter your Ecocash number</p>
      <div className="withdraw-balance-info">
        <p>🏆 Available winnings to withdraw: <strong>{formatCurrency(winnings.total || 0)}</strong></p>
        <p className="withdraw-note">(Minimum withdrawal: $5)</p>
      </div>
      
      <form onSubmit={handleWithdraw}>
        <div className="form-group">
          <label>Amount (USD) - Minimum $5</label>
          <div className="amount-input">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              min="5"
              step="1"
              max={winnings.total}
              value={withdrawAmount}
              onChange={(e) => {
                console.log('📝 Withdraw amount changed:', e.target.value);
                setWithdrawAmount(e.target.value);
              }}
              placeholder="5"
              required
              disabled={processingPayment}
            />
          </div>
          <small className="input-hint">
            Max: {formatCurrency(winnings.total || 0)} (Min: $5)
          </small>
        </div>

        <div className="form-group">
          <label>Ecocash Number</label>
          <div className="ecocash-input">
            <span className="ecocash-icon">📱</span>
            <input
              type="tel"
              value={ecocashNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setEcocashNumber(value);
              }}
              placeholder="077 123 4567"
              required
              disabled={processingPayment}
            />
          </div>
          <small className="input-hint">
            Enter your 10-digit Ecocash number (e.g., 0771234567)
          </small>
          {ecocashNumber && !validateEcocashNumber(ecocashNumber) && (
            <small className="error-hint">
              ❌ Please enter a valid Ecocash number (10 digits starting with 077 or 078)
            </small>
          )}
        </div>

        <div className="quick-amounts">
          <button
            type="button"
            onClick={() => {
              console.log('👆 Quick withdraw: $5');
              setWithdrawAmount('5');
            }}
            disabled={winnings.total < 5 || processingPayment}
          >
            $5
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('👆 Quick withdraw: $10');
              setWithdrawAmount(Math.min(10, winnings.total).toString());
            }}
            disabled={winnings.total < 10 || processingPayment}
          >
            $10
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('👆 Quick withdraw: $25');
              setWithdrawAmount(Math.min(25, winnings.total).toString());
            }}
            disabled={winnings.total < 25 || processingPayment}
          >
            $25
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('👆 Quick withdraw: $50');
              setWithdrawAmount(Math.min(50, winnings.total).toString());
            }}
            disabled={winnings.total < 50 || processingPayment}
          >
            $50
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('👆 Quick withdraw: Max');
              setWithdrawAmount(winnings.total.toString());
            }}
            disabled={winnings.total < 5 || processingPayment}
          >
            Max
          </button>
        </div>

        <div className="withdraw-actions">
          <button
            type="submit"
            className="btn-withdraw"
            disabled={
              processingPayment ||
              !withdrawAmount ||
              parseFloat(withdrawAmount) < 5 ||
              parseFloat(withdrawAmount) > winnings.total ||
              !ecocashNumber ||
              !validateEcocashNumber(ecocashNumber)
            }
          >
            {processingPayment ? 'Processing...' : 'Request Withdrawal'}
          </button>
          <button
            type="button"
            onClick={handleWithdrawCancel}
            className="btn-cancel"
            disabled={processingPayment}
          >
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
                          {transaction.type === 'deposit_pending' && '⏳ Pending Deposit'}
                          {transaction.type === 'withdrawal' && '📤 Withdrawal'}
                          {transaction.type === 'win' && '🏆 Win'}
                          {transaction.type === 'loss' && '🎮 Game Entry'}
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
            onClick={() => console.log('👆 Nav item clicked:', item.label)}
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