import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBkOnzPre6B50Z-S8HBI3kcAU_Qj4MFVbA",
  authDomain: "quiz-buster-fe-dev.firebaseapp.com",
  projectId: "quiz-buster-fe-dev",
  storageBucket: "quiz-buster-fe-dev.firebasestorage.app",
  messagingSenderId: "540101385554",
  appId: "1:540101385554:web:ef590f6b1ff2bbd59dee8b",
  measurementId: "G-GL8S4TW92L"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
