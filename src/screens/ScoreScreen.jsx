import React from 'react';
import { resetRoom } from '../services/quizService';

export default function ScoreScreen({ room, user }) {
  const isHost = room.hostId === user.uid;
  const members = Object.entries(room.members || {});

  // 1. スコアの高い順にソート
  const sortedMembers = members.sort((a, b) => b[1].score - a[1].score);

  const handleBackToLobby = async () => {
    if (isHost) {
      await resetRoom(room.id);
    }
    // 実際にはナビゲーションや状態のリセットなどをここで行う
    window.location.href = '/'; 
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🏆 Final Results</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>Game Over! Everyone did great!</p>

      <div style={listContainerStyle}>
        {sortedMembers.map(([uid, data], index) => {
          const isMe = uid === user.uid;
          const isTop3 = index < 3;
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <div
              key={uid}
              style={{
                ...rankItemStyle,
                backgroundColor: isMe ? '#e3f2fd' : 'white',
                border: isMe ? '2px solid #2196F3' : '1px solid #eee',
                transform: isTop3 ? `scale(${1 - index * 0.05})` : 'scale(1)'
              }}
            >
              <div style={rankNumberStyle}>
                {isTop3 ? medals[index] : `${index + 1}th`}
              </div>
              
              <div style={nameStyle}>
                <span style={{ marginRight: '10px' }}>
                  {data.isBot ? '🤖' : '👤'}
                </span>
                {/* ★ UIDではなく動物名/Bot名を表示 */}
                <strong>{data.name || (data.isBot ? 'Bot' : 'Player')}</strong>
                {isMe && <span style={meTagStyle}>YOU</span>}
              </div>

              <div style={scoreValueStyle}>
                {data.score} <span style={{ fontSize: '1rem' }}>pts</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '40px' }}>
        <button onClick={handleBackToLobby} style={buttonStyle}>
          {isHost ? 'Back to Lobby (Reset Room)' : 'Back to Lobby'}
        </button>
      </div>
    </div>
  );
}

// --- スタイル定義 ---

const containerStyle = {
  minHeight: '100vh',
  padding: '40px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: '#f8f9fa'
};

const listContainerStyle = {
  width: '100%',
  maxWidth: '500px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const rankItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '15px 25px',
  borderRadius: '16px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  transition: 'all 0.3s'
};

const rankNumberStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  width: '50px'
};

const nameStyle = {
  flex: 1,
  fontSize: '1.2rem',
  textAlign: 'left',
  display: 'flex',
  alignItems: 'center'
};

const meTagStyle = {
  marginLeft: '8px',
  fontSize: '0.7rem',
  background: '#2196F3',
  color: 'white',
  padding: '2px 6px',
  borderRadius: '4px'
};

const scoreValueStyle = {
  fontSize: '1.8rem',
  fontWeight: 'bold',
  color: '#444'
};

const buttonStyle = {
  padding: '15px 40px',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  color: 'white',
  background: '#333',
  border: 'none',
  borderRadius: '30px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
};