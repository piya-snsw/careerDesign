import { useEffect } from "react";
import { auth, db } from "./firebase";

import {
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

function App() {
  // 🔹 匿名ログイン
  const loginAnonymously = async () => {
    await signInAnonymously(auth);
  };

  // 🔹 Googleログイン
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // 🔹 Firestore保存
  const saveUser = async (user) => {
    const ref = doc(db, "users", user.uid);

    await setDoc(
      ref,
      {
        uid: user.uid,
        displayName: user.displayName ?? "匿名ユーザー",
        isAnonymous: user.isAnonymous,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  // 🔹 認証監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      await saveUser(user);

      // ⭐ uidごとに1回だけ表示
      const dialogKey = `login-dialog-shown-${user.uid}`;
      const hasShown = localStorage.getItem(dialogKey);

      if (!hasShown) {
        if (user.isAnonymous) {
          alert("匿名ログインに成功しました");
        } else {
          alert(`Googleログイン成功！\n${user.displayName}`);
        }

        localStorage.setItem(dialogKey, "true");
      }
    });

    return () => unsub();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Quiz Buster</h1>

      <button onClick={loginAnonymously}>
        匿名ログイン
      </button>

      <br /><br />

      <button onClick={loginWithGoogle}>
        Googleログイン
      </button>
    </div>
  );
}

export default App;
