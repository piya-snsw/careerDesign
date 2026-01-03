import { useEffect } from 'react';
import { startCountdown, addBots } from '../services/quizService';

export default function WaitingRoom({ room, user }) {
  if (!room) return <div style={{ padding: 20 }}>Loading...</div>;

  const roomId = room.id;
  const members = Object.entries(room.members || {});
  const playerCount = members.length;
  const isHost = room.hostId === user.uid;

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
    }, 30000); 

    return () => clearTimeout(timer);
  }, [isHost, playerCount, roomId, room.status]);

  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <h2>⏳ Waiting Room</h2>
      <p style={{ fontSize: '1.4rem', margin: '10px 0' }}>
        Players: {playerCount} / 4
      </p>

      <ul style={{ listStyle: 'none', padding: 0, maxWidth: 300, margin: '20px auto' }}>
        {members.map(([uid, data]) => (
          <li
            key={uid}
            style={{
              padding: '12px',
              margin: '8px 0',
              background: uid === room.hostId ? '#fff3cd' : '#f8f9fa',
              borderRadius: '10px',
              border: uid === room.hostId ? '1px solid #ffeeba' : '1px solid #dee2e6',
              fontWeight: uid === room.hostId ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span>{data.isBot ? '🤖' : '👤'}</span>
            {/* ★ 修正箇所: data.name があれば表示、なければ UID の一部を表示 */}
            <span style={{ fontSize: '1.1rem' }}>
              {data.name || (data.isBot ? `Bot ${uid.slice(0,3)}` : uid.slice(0, 8))}
            </span>
            {uid === room.hostId && <small style={{ fontSize: '0.7rem', color: '#856404' }}>(Host)</small>}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: '30px' }}>
        {playerCount < 4 ? (
          <p style={{ color: '#666', lineHeight: '1.6' }}>
            Waiting for more players...<br />
            <span style={{ fontSize: '0.9rem' }}>
              Bots will join and game starts in 30 seconds.
            </span>
          </p>
        ) : (
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>
            ✅ All slots filled! Starting soon...
          </p>
        )}
      </div>
    </div>
  );
}