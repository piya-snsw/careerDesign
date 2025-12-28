import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, 
  serverTimestamp, getDocs, query, where, Timestamp 
} from "firebase/firestore";

export const useWaiting = (user) => {
  const [waitingUsers, setWaitingUsers] = useState([]);
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "waitingUsers", user.uid);

    // 1. 参加と同時に「掃除」も行う
    const joinAndCleanup = async () => {
      // 5分以上更新がないユーザーを古いとみなす（ゾンビ対策）
      const now = new Date();
      const threshold = new Date(now.getTime() - 5 * 60 * 1000); 

      const snap = await getDocs(collection(db, "waitingUsers"));
      
      // 掃除：古いデータを消す（もし残っていたら）
      snap.docs.forEach(async (d) => {
        const data = d.data();
        if (data.joinedAt && data.joinedAt.toDate() < threshold) {
          await deleteDoc(doc(db, "waitingUsers", d.id));
        }
      });

      // 自分の参加処理
      const currentUsers = snap.docs.filter(d => d.id !== user.uid);
      if (currentUsers.length < 4) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName || "ゲスト",
          joinedAt: serverTimestamp(),
        });
        setIsFull(false);
      } else {
        setIsFull(true);
      }
    };

    joinAndCleanup();

    // 2. ブラウザを閉じるときの処理（visibilitychangeが最近の主流です）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 完全に消える保証はないが、タブ切り替えや最小化でも動く
        deleteDoc(userRef);
      }
    };
    window.addEventListener("visibilitychange", handleVisibilityChange);

    const unsub = onSnapshot(collection(db, "waitingUsers"), (snap) => {
      const users = snap.docs.map(doc => doc.data());
      setWaitingUsers(users);
    });

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      deleteDoc(userRef);
      unsub();
    };
  }, [user]);

  return { waitingUsers, isFull };
};