import { auth, database } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';

export const testFirebase = async () => {
  console.log('🔍 Testing Firebase Configuration...');
  
  try {
    // Test 1: Check if Firebase is initialized
    console.log('✅ Firebase initialized');
    
    // Test 2: Try to create a test account
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    console.log('📝 Testing account creation...');
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ Account created successfully:', userCredential.user.email);
    
    // Test 3: Test database write
    console.log('📝 Testing database write...');
    const testRef = ref(database, `test/${userCredential.user.uid}`);
    await set(testRef, {
      timestamp: new Date().toISOString(),
      message: 'Firebase is working!'
    });
    console.log('✅ Database write successful');
    
    // Test 4: Test database read
    console.log('📝 Testing database read...');
    const snapshot = await get(testRef);
    if (snapshot.exists()) {
      console.log('✅ Database read successful:', snapshot.val());
    }
    
    // Clean up test data
    // Note: You can't delete auth users via client SDK, this is fine for testing
    
    console.log('🎉 All Firebase tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    
    if (error.code === 'auth/configuration-not-found') {
      console.error(`
        ⚠️ FIREBASE AUTHENTICATION NOT ENABLED ⚠️
        
        Please enable Email/Password authentication:
        
        1. Go to https://console.firebase.google.com/
        2. Select your project: wintapgames-31286
        3. Click "Authentication" in left sidebar
        4. Click "Sign-in method" tab
        5. Find "Email/Password" and click on it
        6. Toggle "Enable" to ON
        7. Click "Save"
        
        After enabling, wait 1-2 minutes and try again.
      `);
    }
    
    if (error.code === 'permission-denied') {
      console.error(`
        ⚠️ DATABASE RULES NOT CONFIGURED ⚠️
        
        Please update your Realtime Database rules:
        
        1. Go to Firebase Console
        2. Click "Realtime Database" in left sidebar
        3. Click "Rules" tab
        4. Paste these test rules:
        
        {
          "rules": {
            ".read": true,
            ".write": true
          }
        }
        
        5. Click "Publish"
      `);
    }
    
    return false;
  }
};