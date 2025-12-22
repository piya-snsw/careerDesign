import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCpL9TiaXmi5ynfS8NHpjYbGOY4cpL76MI",
  authDomain: "hayabusa-ca8f9.firebaseapp.com",
  projectId: "hayabusa-ca8f9",
  storageBucket: "hayabusa-ca8f9.firebasestorage.app",
  messagingSenderId: "847439164096",
  appId: "1:847439164096:web:b9bf4d6f8bbd70b7dfb325"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// 他のファイルで使えるようにエクスポート
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); // 追加