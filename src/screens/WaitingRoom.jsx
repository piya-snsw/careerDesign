import { useEffect, useState } from 'react'; // ★ useStateを追加
import { startCountdown, addBots } from '../services/quizService';

export default function WaitingRoom({ room, user }) {
  // --- 追加：表示用の秒数管理 ---
  const [displaySeconds, setDisplaySeconds] = useState(20);

  if (!room) return <div style={{ padding: 20 }}>Loading...</div>;

  const roomId = room.id;
  const members = Object.entries(room.members || {});
  const playerCount = members.length;
  const isHost = room.hostId === user.uid;

  // 1. 既存ロジック（そのまま維持）: 30秒後にボット追加＆開始
  useEffect(() => {
    if (!isHost || room.status !== 'waiting') return;

    const timer = setTimeout(async () => {
      const needed = 4 - playerCount;
      if (needed > 0) {
        try {
          await addBots(roomId, needed);
          await startCountdown(roomId);
        } catch (err) {
          console.error("❌ ボット追加エラー:", err);
        }
      }
    }, 20000); 

    return () => clearTimeout(timer);
  }, [isHost, playerCount, roomId, room.status]);

  // 2. 表示用ロジック（追加）: 1秒ごとにカウントを減らすだけ
  useEffect(() => {
    if (playerCount >= 4 || room.status !== 'waiting') {
      setDisplaySeconds(20); // 満員ならリセット
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [playerCount, room.status]);

  return (
    <div style={{ padding: 20, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1a73e8' }}>⏳ Waiting Room</h2>
      
      {/* ★ カウントダウンの表示エリア */}
      {playerCount < 4 && room.status === 'waiting' && (
        <div style={countdownBannerStyle}>
          🤖 ボット参戦まで あと <strong>{displaySeconds}</strong> 秒
          <div style={progressBg}>
            <div style={progressFill(displaySeconds)} />
          </div>
        </div>
      )}

      <p style={{ fontSize: '1.4rem', margin: '10px 0', fontWeight: 'bold' }}>
        Players: {playerCount} / 4
      </p>

      <ul style={{ listStyle: 'none', padding: 0, maxWidth: 320, margin: '20px auto' }}>
        {members.map(([uid, data]) => (
          <li
            key={uid}
            style={{
              padding: '12px',
              margin: '8px 0',
              background: uid === room.hostId ? '#e8f0fe' : '#ffffff',
              borderRadius: '12px',
              border: uid === room.hostId ? '2px solid #1a73e8' : '1px solid #dee2e6',
              fontWeight: uid === room.hostId ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{data.isBot ? '🤖' : '👤'}</span>
            <span style={{ fontSize: '1.1rem' }}>
              {data.name || (data.isBot ? `Bot ${uid.slice(0,3)}` : uid.slice(0, 8))}
            </span>
            {uid === room.hostId && <small style={{ fontSize: '0.7rem', color: '#1a73e8', marginLeft: 5 }}>[HOST]</small>}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '30px' }}>
        {playerCount < 4 ? (
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            Waiting for more players...
          </p>
        ) : (
          <p style={{ color: '#34a853', fontWeight: 'bold', fontSize: '1.2rem' }}>
            ✅ All slots filled! Starting soon...
          </p>
        )}
      </div>
    </div>
  );
}

// --- シンプルな表示用スタイル ---
const countdownBannerStyle = {
  background: '#f8f9fa',
  padding: '15px',
  borderRadius: '15px',
  border: '1px solid #e8eaed',
  maxWidth: '350px',
  margin: '20px auto',
  fontSize: '1rem',
  color: '#5f6368'
};

const progressBg = {
  width: '100%',
  height: '6px',
  background: '#e8eaed',
  borderRadius: '3px',
  marginTop: '10px',
  overflow: 'hidden'
};

const progressFill = (sec) => ({
  width: `${(sec / 20) * 100}%`,
  height: '100%',
  background: '#1a73e8',
  transition: 'width 1s linear'
});