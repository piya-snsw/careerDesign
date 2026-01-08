import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_IDD,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 各サービスを初期化してエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// 他のファイルで使うための関数もエクスポートしておくと便利です
export { signInWithPopup, signOut };

console.log('✅ Firebase initialized');