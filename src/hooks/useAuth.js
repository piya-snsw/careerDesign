import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithPopup, 
  GoogleAuthProvider, 
  updateProfile // ★ プロフィール更新用に追加
} from 'firebase/auth';
import { auth } from '../firebase';
import { generateRandomName } from '../utils/nameGenerator'; // ★ インポート

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log('🔐 Auth state changed:', u?.uid, 'Name:', u?.displayName);
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 匿名ログイン
  const loginAnonymous = async () => {
    console.log('🔑 Attempting anonymous login...');
    try {
      const result = await signInAnonymously(auth);
      // 名前が未設定（新規）の場合のみ名前を付ける
      if (!result.user.displayName) {
        const randomName = generateRandomName();
        await updateProfile(result.user, { displayName: randomName });
        console.log('📛 Name set:', randomName);
      }
      return result;
    } catch (error) {
      console.error('Anonymous login error:', error);
      throw error;
    }
  };
  
  // Googleログイン
  const loginGoogle = async () => {
    console.log('🔑 Attempting Google login...');
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      // Googleの場合は元から名前があることが多いが、なければ付ける
      if (!result.user.displayName) {
        await updateProfile(result.user, { displayName: generateRandomName() });
      }
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };
  
  const logout = () => auth.signOut();

  return { user, loading, loginAnonymous, loginGoogle, logout };
}