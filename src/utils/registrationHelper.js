// src/utils/registrationHelper.js
import { ref, set, get, update } from 'firebase/database';
import { database } from '../firebase';

// Generate random username
export const generateRandomUsername = () => {
  const adjectives = ['Cool', 'Super', 'Happy', 'Lucky', 'Swift', 'Brave', 'Smart', 'Wild', 'Epic', 'Pro'];
  const nouns = ['Player', 'Gamer', 'Winner', 'Champion', 'Master', 'Star', 'Legend', 'Hero', 'Ace', 'King'];
  const randomNum = Math.floor(Math.random() * 1000);
  
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${randomAdj}${randomNoun}${randomNum}`;
};

// Check if username exists
export const checkUsernameExists = async (usernameToCheck) => {
  try {
    const usernameRef = ref(database, `lookups/byUsername/${usernameToCheck.toLowerCase()}`);
    const snapshot = await get(usernameRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

// Generate unique username
export const generateUniqueUsername = async () => {
  let generatedUsername = '';
  let usernameExists = true;
  
  while (usernameExists) {
    generatedUsername = generateRandomUsername();
    usernameExists = await checkUsernameExists(generatedUsername);
  }
  
  return generatedUsername;
};

// Create user in database - FIXED with both wallet paths
export const createUserInDatabase = async (userId, userEmail, username, referralCode = null, photoURL = null) => {
  const now = new Date().toISOString();

  // 1. Create main user document
  await set(ref(database, `users/${userId}`), {
    public: {
      uid: userId,
      username: username.toLowerCase(),
      displayName: username,
      avatar: photoURL || 'default',
      globalRank: 'Rookie',
      globalLevel: 1,
      createdAt: now,
      isOnline: true
    },
    private: {
      email: userEmail,
      lastLogin: now,
      isActive: true,
      role: 'player',
      referredBy: referralCode || null
    },
    wallet: {
      balance: 0.00,
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalWon: 0,
      totalLost: 0,
      totalBonus: 0.00,
      currency: 'USD',
      lastUpdated: now
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastGamePlayed: null,
      totalPlayTime: 0,
      favoriteGame: null
    },
    games: {
      'flappy-bird': {
        highScore: 0,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        experience: 0,
        level: 1,
        rank: 'Rookie',
        achievements: [],
        lastPlayed: now,
        averageScore: 0,
        totalScore: 0,
        gamesWon: 0,
        gamesLost: 0
      },
      'space-shooter': {
        highScore: 0,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        experience: 0,
        level: 1,
        rank: 'Rookie',
        achievements: [],
        lastPlayed: now,
        averageScore: 0,
        totalScore: 0,
        gamesWon: 0,
        gamesLost: 0
      },
      'ball-crush': {
        highScore: 0,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winStreak: 0,
        bestWinStreak: 0,
        experience: 0,
        level: 1,
        rank: 'Rookie',
        achievements: [],
        lastPlayed: now,
        averageScore: 0,
        totalScore: 0,
        gamesWon: 0,
        gamesLost: 0
      }
    }
  });

  // 2. CRITICAL FIX: Create wallet in separate wallets path for Dashboard
  await set(ref(database, `wallets/${userId}`), {
    balance: 0.00,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalWon: 0,
    totalLost: 0,
    totalBonus: 0.00,
    currency: 'USD',
    lastUpdated: now,
    isActive: true
  });

  // 3. Create user_profiles for profile page
  await set(ref(database, `user_profiles/${userId}`), {
    displayName: username,
    avatar: photoURL || 'default',
    rank: 'Bronze',
    level: 1,
    experience: 0,
    joinDate: now,
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    winStreak: 0
  });

  // 4. Create lookup for username
  await set(ref(database, `lookups/byUsername/${username.toLowerCase()}`), userId);

  // 5. Create welcome transaction
  const transactionId = `txn_${Date.now()}`;
  await set(ref(database, `transactions/${userId}/${transactionId}`), {
    type: 'bonus',
    amount: 0.00,
    balance: 0.00,
    description: 'Welcome bonus',
    status: 'completed',
    timestamp: now
  });

  // 6. Handle referral if provided
  if (referralCode) {
    try {
      const referrerSnapshot = await get(ref(database, `lookups/byUsername/${referralCode.toLowerCase()}`));

      if (referrerSnapshot.exists()) {
        const referrerId = referrerSnapshot.val();

        // Get referrer's current wallet
        const walletSnapshot = await get(ref(database, `users/${referrerId}/wallet`));
        
        if (walletSnapshot.exists()) {
          const wallet = walletSnapshot.val();
          const newBalance = wallet.balance + 5.00;

          // Update in users path
          await update(ref(database, `users/${referrerId}/wallet`), {
            balance: newBalance,
            totalBonus: wallet.totalBonus + 5.00,
            lastUpdated: now
          });

          // Update in wallets path (for Dashboard)
          await update(ref(database, `wallets/${referrerId}`), {
            balance: newBalance,
            totalBonus: wallet.totalBonus + 5.00,
            lastUpdated: now
          });

          // Add referral record
          await set(ref(database, `users/${referrerId}/referrals/${userId}`), {
            username: username,
            joinedAt: now,
            bonus: 5.00
          });

          // Add transaction for referrer
          const referrerTxnId = `txn_${Date.now()}_ref`;
          await set(ref(database, `transactions/${referrerId}/${referrerTxnId}`), {
            type: 'bonus',
            amount: 5.00,
            balance: newBalance,
            description: `Referral bonus for ${username}`,
            status: 'completed',
            timestamp: now
          });
        }
      }
    } catch (refError) {
      console.error('❌ Referral error:', refError);
    }
  }

  console.log('✅ User fully registered with all paths');
  return true;
};

// Store session data
export const storeUserSession = (username) => {
  const sessionData = {
    username: username,
    displayName: username,
    loginTime: Date.now(),
    sessionId: Math.random().toString(36).substring(2, 15),
    rememberMe: true
  };

  sessionStorage.setItem('gameUser', JSON.stringify(sessionData));
  localStorage.setItem('gameUser', JSON.stringify(sessionData));
  
  return sessionData;
};

// Check if user exists in database
export const checkUserExists = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error checking user:', error);
    return null;
  }
};