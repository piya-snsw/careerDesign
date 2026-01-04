import React from 'react';
import { addBots, startCountdown } from '../services/quizService';

export default function WaitingRoom({ room, user }) {
  if (!room) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;

  const roomId = room.id;
  const members = Object.entries(room.members || {});
  const playerCount = members.length;
  const isHost = room.hostId === user.uid;

  // ホスト専用：ボットを補充して開始するハンドラー
  const handleAddBotsManually = async () => {
    const needed = 4 - playerCount;
    try {
      if (needed > 0) {
        // 不足分があればボットを追加
        await addBots(roomId, needed);
      }
      // カウントダウン（試合開始）へ移行
      await startCountdown(roomId);
    } catch (err) {
      console.error("開始エラー:", err);
    }
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#1a73e8', marginBottom: '10px' }}>⏳ Waiting Room</h2>
      
      <p style={subtitleStyle}>
        {playerCount < 4 
          ? "他のプレイヤーを待っています..." 
          : "全員揃いました！"}
      </p>

      <p style={{ fontSize: '1.4rem', margin: '20px 0', fontWeight: 'bold', color: '#3c4043' }}>
        Players: {playerCount} / 4
      </p>

      {/* プレイヤーリスト */}
      <div style={listWrapperStyle}>
        {members.map(([uid, data]) => (
          <div key={uid} style={memberItemStyle(uid === room.hostId)}>
            <span style={{ fontSize: '1.4rem' }}>{data.isBot ? '🤖' : '👤'}</span>
            <div style={memberInfoStyle}>
              <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                {data.name || (data.isBot ? 'Bot' : 'Player')}
              </span>
              {uid === room.hostId && <span style={hostBadgeStyle}>HOST</span>}
            </div>
            {uid === user.uid && <span style={youBadgeStyle}>YOU</span>}
          </div>
        ))}
      </div>

      {/* アクションエリア（ここにあるボタンのみに統合） */}
      <div style={actionAreaStyle}>
        {isHost ? (
          <button 
            onClick={handleAddBotsManually} 
            style={activeButtonStyle}
          >
            {playerCount < 4 ? "🤖 ボットを補充して開始" : "🚀 ゲームを開始する"}
          </button>
        ) : (
          <div style={waitingTextStyle}>
            ホストがゲームを開始するのを待っています...
          </div>
        )}
      </div>
      
      {isHost && playerCount < 4 && (
        <p style={{ fontSize: '0.8rem', color: '#9aa0a6', marginTop: '15px' }}>
          ※ボタンを押すと不足人数にボットが割り当てられ、即座に開始します
        </p>
      )}
    </div>
  );
}

// --- スタイル定義 ---
const containerStyle = {
  padding: '60px 20px',
  textAlign: 'center',
  fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
  maxWidth: '500px',
  margin: '0 auto',
  minHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const subtitleStyle = {
  color: '#5f6368',
  fontSize: '1rem',
  marginBottom: '20px'
};

const listWrapperStyle = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const memberItemStyle = (isHost) => ({
  padding: '16px 20px',
  background: isHost ? '#e8f0fe' : '#ffffff',
  borderRadius: '16px',
  border: isHost ? '2px solid #1a73e8' : '1px solid #dadce0',
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
  width: '100%', // 横幅を固定
  boxSizing: 'border-box'
});

const memberInfoStyle = {
  flex: 1,
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const hostBadgeStyle = {
  fontSize: '0.65rem',
  color: '#1a73e8',
  background: '#d2e3fc',
  padding: '2px 8px',
  borderRadius: '10px',
  fontWeight: 'bold'
};

const youBadgeStyle = {
  fontSize: '0.65rem',
  color: '#5f6368',
  background: '#f1f3f4',
  padding: '2px 8px',
  borderRadius: '10px',
  fontWeight: 'bold'
};

const actionAreaStyle = {
  marginTop: '40px',
  width: '100%'
};

const activeButtonStyle = {
  width: '100%', // ボタンを横いっぱいに
  padding: '18px 40px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: 'white',
  background: '#1a73e8',
  border: 'none',
  borderRadius: '35px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
  transition: 'background 0.2s, transform 0.1s',
  outline: 'none'
};

const waitingTextStyle = {
  color: '#70757a',
  background: '#f8f9fa',
  padding: '15px',
  borderRadius: '12px',
  fontStyle: 'italic'
};