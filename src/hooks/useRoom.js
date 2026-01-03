import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom'; // 追加

export function useRoom(roomId) {
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // 追加

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ref = doc(db, 'rooms', roomId);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        
        // --- 修正ポイント：自動解散の条件を厳しくする ---
        // 1. loading が完全に終わっていること
        // 2. data.hostId が明確に null または空文字であること
        // 3. 最初のデータ取得（一回目）は無視するようにする
        if (!loading && data.hostId === null) {
           console.log("📢 主催者が不在になったため退室します");
           navigate('/lobby');
           return;
        }
        // --------------------------------

        setRoom({ id: snap.id, ...data });
      } else {
        setRoom(null);
        // ルーム自体が削除された場合もロビーへ
        if (!loading) navigate('/lobby');
      }
      setLoading(false);
    });

    return () => unsub();
  }, [roomId, navigate,]);

  return { room, loading };
}