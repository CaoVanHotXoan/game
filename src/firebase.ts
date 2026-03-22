import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot, getDocFromServer, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Sign in anonymously to allow reading/writing to Firestore
signInAnonymously(auth).catch((error) => {
  if (error.code === 'auth/admin-restricted-operation') {
    console.error("Anonymous sign-in is disabled. Please enable it in the Firebase Console (Authentication -> Sign-in method).");
  } else {
    console.error("Anonymous sign-in failed:", error);
  }
});

export { collection, addDoc, query, orderBy, limit, onSnapshot };
