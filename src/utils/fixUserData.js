// src/utils/fixUserData.js
import { ref, get, set, update } from 'firebase/database';
import { database } from '../firebase';

/**
 * Fix user data for users that were incorrectly registered
 * This function checks and fixes common issues:
 * 1. Missing wallets/ path
 * 2. Missing displayName
 * 3. Missing game stats structure
 * 4. Missing lookup entries
 */

export const fixUserData = async (userId) => {
  console.log(`🔧 Fixing user data for: ${userId}`);
  const fixes = [];
  const now = new Date().toISOString();

  try {
    // 1. Check if user exists
    const userRef = ref(database, `users/${userId}`);
    const userSnapshot = await get(userRef);

    if (!userSnapshot.exists()) {
      console.log(`❌ User ${userId} not found in database`);
      return { success: false, error: 'User not found' };
    }

    const userData = userSnapshot.val();
    console.log('📦 Current user data:', userData);

    // 2. Fix wallets/ path (for Dashboard)
    const walletRef = ref(database, `wallets/${userId}`);
    const walletSnapshot = await get(walletRef);

    if (!walletSnapshot.exists()) {
      console.log('⚠️ Missing wallets/ path, creating...');
      
      // Get wallet data from users path if exists
      let walletData = {
        balance: 10.00,
        totalDeposited: 0,
        totalWithdrawn: 0,
        totalWon: 0,
        totalLost: 0,
        totalBonus: 10.00,
        currency: 'USD',
        lastUpdated: now,
        isActive: true
      };

      // If user has wallet in users path, use that data
      if (userData.wallet) {
        walletData = {
          ...walletData,
          ...userData.wallet,
          lastUpdated: now
        };
      }

      await set(walletRef, walletData);
      fixes.push('✅ Created wallets/ path');
    } else {
      fixes.push('✅ wallets/ path exists');
    }

    // 3. Fix displayName in public profile
    if (!userData.public?.displayName && userData.public?.username) {
      console.log('⚠️ Missing displayName, fixing...');
      
      await update(ref(database, `users/${userId}/public`), {
        displayName: userData.public.username
      });
      fixes.push('✅ Added displayName = username');
    }

    // 4. Fix game stats structure
    if (!userData.games) {
      console.log('⚠️ Missing games stats, creating...');
      
      const defaultGames = {
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
      };

      await set(ref(database, `users/${userId}/games`), defaultGames);
      fixes.push('✅ Created games stats');
    }

    // 5. Fix lookup entry
    const username = userData.public?.username;
    if (username) {
      const lookupRef = ref(database, `lookups/byUsername/${username.toLowerCase()}`);
      const lookupSnapshot = await get(lookupRef);

      if (!lookupSnapshot.exists()) {
        console.log('⚠️ Missing lookup entry, creating...');
        await set(lookupRef, userId);
        fixes.push('✅ Created username lookup');
      } else if (lookupSnapshot.val() !== userId) {
        console.log('⚠️ Lookup entry points to wrong user, fixing...');
        await set(lookupRef, userId);
        fixes.push('✅ Fixed username lookup');
      }
    }

    // 6. Fix user_profiles path
    const profileRef = ref(database, `user_profiles/${userId}`);
    const profileSnapshot = await get(profileRef);

    if (!profileSnapshot.exists()) {
      console.log('⚠️ Missing user_profiles, creating...');
      
      await set(profileRef, {
        displayName: userData.public?.displayName || userData.public?.username || 'Player',
        avatar: userData.public?.avatar || 'default',
        rank: userData.public?.globalRank || 'Bronze',
        level: userData.public?.globalLevel || 1,
        experience: 0,
        joinDate: userData.metadata?.createdAt || now,
        totalGames: 0,
        totalWins: 0,
        totalLosses: 0,
        winStreak: 0
      });
      fixes.push('✅ Created user_profiles');
    }

    console.log('✅ Fixes applied:', fixes);
    return { 
      success: true, 
      fixes,
      message: `Applied ${fixes.length} fixes` 
    };

  } catch (error) {
    console.error('❌ Error fixing user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Fix ALL users in the database
 * Use with caution!
 */
export const fixAllUsers = async () => {
  console.log('🔧 Fixing ALL users...');
  const results = [];

  try {
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);

    if (!usersSnapshot.exists()) {
      console.log('No users found');
      return { success: false, error: 'No users found' };
    }

    let fixed = 0;
    let failed = 0;

    for (const userId of Object.keys(usersSnapshot.val())) {
      console.log(`\n📝 Processing user: ${userId}`);
      const result = await fixUserData(userId);
      
      if (result.success) {
        fixed++;
        results.push({ userId, status: 'fixed', fixes: result.fixes });
      } else {
        failed++;
        results.push({ userId, status: 'failed', error: result.error });
      }
    }

    console.log(`\n✅ Fixed: ${fixed}, Failed: ${failed}`);
    return { success: true, fixed, failed, results };

  } catch (error) {
    console.error('❌ Error fixing all users:', error);
    return { success: false, error: error.message };
  }
};