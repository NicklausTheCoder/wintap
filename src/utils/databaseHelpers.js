import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

// GET USER PROFILE
export const getUserProfile = async (userId) => {
  try {
    const profileRef = ref(database, `user_profiles/${userId}`);
    const snapshot = await get(profileRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// GET WALLET BALANCE
export const getWalletBalance = async (userId) => {
  try {
    const walletRef = ref(database, `wallets/${userId}/balance`);
    const snapshot = await get(walletRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return 0;
  }
};

// UPDATE WALLET BALANCE - Proper version
export const updateWalletBalance = async (userId, newBalance) => {
  try {
    const walletRef = ref(database, `wallets/${userId}`);
    
    // First get current wallet data
    const snapshot = await get(walletRef);
    const currentWallet = snapshot.exists() ? snapshot.val() : {
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWon: 0,
      totalLost: 0,
      totalBonus: 0,
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    };
    
    // Update with new balance
    await set(walletRef, {
      ...currentWallet,
      balance: newBalance,
      lastUpdated: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating balance:', error);
    return false;
  }
};

// ADD TO WALLET BALANCE - Fixed
export const addToWalletBalance = async (userId, amount) => {
  try {
    const walletRef = ref(database, `wallets/${userId}`);
    
    // Get current wallet
    const snapshot = await get(walletRef);
    const currentWallet = snapshot.exists() ? snapshot.val() : {
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWon: 0,
      totalLost: 0,
      totalBonus: 0,
      currency: 'USD'
    };
    
    const newBalance = (currentWallet.balance || 0) + amount;
    
    // Update entire wallet object
    await set(walletRef, {
      ...currentWallet,
      balance: newBalance,
      lastUpdated: new Date().toISOString()
    });
    
    return { success: true, newBalance };
  } catch (error) {
    console.error('Error adding to wallet:', error);
    return { success: false, error };
  }
};

// SUBTRACT FROM WALLET BALANCE - Fixed
export const subtractFromWalletBalance = async (userId, amount) => {
  try {
    const walletRef = ref(database, `wallets/${userId}`);
    
    // Get current wallet
    const snapshot = await get(walletRef);
    const currentWallet = snapshot.exists() ? snapshot.val() : {
      balance: 0,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWon: 0,
      totalLost: 0,
      totalBonus: 0,
      currency: 'USD'
    };
    
    const newBalance = (currentWallet.balance || 0) - amount;
    
    if (newBalance < 0) {
      return { success: false, error: 'Insufficient funds' };
    }
    
    // Update entire wallet object
    await set(walletRef, {
      ...currentWallet,
      balance: newBalance,
      lastUpdated: new Date().toISOString()
    });
    
    return { success: true, newBalance };
  } catch (error) {
    console.error('Error subtracting from wallet:', error);
    return { success: false, error };
  }
};

// ADD TRANSACTION RECORD
export const addTransaction = async (userId, type, amount, description) => {
  try {
    const transactionsRef = ref(database, `transactions/${userId}`);
    const newTransactionRef = push(transactionsRef);
    
    // Get current balance for the transaction record
    const walletRef = ref(database, `wallets/${userId}`);
    const walletSnapshot = await get(walletRef);
    const currentBalance = walletSnapshot.exists() ? walletSnapshot.val().balance : 0;
    
    const transaction = {
      type,
      amount,
      balance: currentBalance,
      description,
      status: 'completed',
      timestamp: new Date().toISOString(),
      currency: 'USD'
    };
    
    await set(newTransactionRef, transaction);
    return { success: true, transactionId: newTransactionRef.key };
  } catch (error) {
    console.error('Error adding transaction:', error);
    return { success: false, error };
  }
};