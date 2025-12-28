import { useState, useEffect } from "react";
import { db } from "../firebase";
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, 
  serverTimestamp, getDocs, query, where, Timestamp 
} from "firebase/firestore";

export const useWaiting = (user) => {
  const [waitingUsers, setWaitingUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "waitingUsers", user.uid);

    // --- 1. 放置ユーザーの掃除ロジック ---
    const cleanupGhostUsers = async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const snap = await getDocs(collection(db, "waitingUsers"));
      snap.forEach(async (d) => {
        const data = d.data();
        // 5分以上更新がないユーザーを削除
        if (data.lastActive && data.lastActive.toDate() < fiveMinutesAgo) {
          await deleteDoc(doc(db, "waitingUsers", d.id));
        }
      });
    };

    // --- 2. 自分の生存報告 (Heartbeat) ---
    const updateHeartbeat = async () => {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName || "ゲスト",
        lastActive: serverTimestamp(), // ここを常に更新
      }, { merge: true });
    };

    // 初期実行
    cleanupGhostUsers();
    updateHeartbeat();

    // 操作検知：マウス移動やクリックがあったら「活動中」とみなす
    const handleActivity = () => {
      // 負荷軽減のため、30秒に1回程度更新するなどの調整も可能
      updateHeartbeat();
    };
    window.addEventListener("mousedown", handleActivity);

    // --- 3. ブラウザを閉じた時の処理 ---
    const handleUnload = () => {
      // 100%ではないが、タブを閉じる際に削除命令を送る
      deleteDoc(userRef);
    };
    window.addEventListener("beforeunload", handleUnload);

    // リアルタイムリスナー
    const unsub = onSnapshot(collection(db, "waitingUsers"), (snap) => {
      setWaitingUsers(snap.docs.map(d => d.data()));
    });

    return () => {
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("beforeunload", handleUnload);
      deleteDoc(userRef);
      unsub();
    };
  }, [user]);

  return { waitingUsers };
};