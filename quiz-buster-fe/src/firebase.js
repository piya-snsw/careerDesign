import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf08T7zK8F6mVhYF3P9Q4pXl71ToWyEI0",
  authDomain: "quiz-buster-6f456.firebaseapp.com",
  projectId: "quiz-buster-6f456",
  storageBucket: "quiz-buster-6f456.firebasestorage.app",
  messagingSenderId: "1026025613924",
  appId: "1:1026025613924:web:ef0f96108db42c0891cd71",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
