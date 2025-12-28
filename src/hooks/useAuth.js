import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 匿名ログイン
  const loginAnonymously = () => signInAnonymously(auth);

  // Googleログイン
  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return { user, loading, loginAnonymously, loginWithGoogle, logout };
};