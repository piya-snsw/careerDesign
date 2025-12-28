import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:REACT_APP_FIREBASE_API_KEY,
  authDomain:REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:REACT_APP_FIREBASE_APP_ID
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 他のファイルで使えるようにエクスポート
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // 追加