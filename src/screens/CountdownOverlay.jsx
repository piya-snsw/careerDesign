import { useEffect } from 'react';
import { startQuiz } from '../services/quizService';

export default function CountdownOverlay({ room, user }) {
  // 主催者かどうかを確認
  const isHost = room.hostId === user.uid;

  useEffect(() => {
    // 主催者だけが「クイズ開始」の命令を出す権利を持つ
    if (!isHost) return;

    // カウントダウン時間をシミュレート（例：3秒）
    const timer = setTimeout(() => {
      console.log("🚀 カウントダウン終了！クイズを開始します");
      startQuiz(room.id).catch(console.error);
    }, 3000); // 3秒後に playing ステータスへ

    return () => clearTimeout(timer);
  }, [isHost, room.id]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.8)', color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem'
    }}>
      READY...
    </div>
  );
}