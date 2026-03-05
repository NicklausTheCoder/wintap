import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, get, set, update } from "firebase/database";
import { firebaseConfig } from "./firebase-config";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Helper for incrementing values in Firebase
export const increment = (amount) => {
  return {
    '.sv': {
      'increment': amount
    }
  };
};

// Get user balance
export const getUserBalance = async (userId) => {
  try {
    const balanceRef = ref(database, `wallets/${userId}/balance`);
    const snapshot = await get(balanceRef);
    return snapshot.exists() ? snapshot.val() : 0;
  } catch (error) {
    console.error("Error getting balance:", error);
    return 0;
  }
};

// Update user balance
export const updateUserBalance = async (userId, newBalance) => {
  try {
    const balanceRef = ref(database, `wallets/${userId}/balance`);
    await set(balanceRef, newBalance);
    return true;
  } catch (error) {
    console.error("Error updating balance:", error);
    return false;
  }
};

export default app;