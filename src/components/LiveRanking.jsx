import React from 'react';

export default function LiveRanking({ room }) {
  if (!room || !room.members) return null;

  // メンバーを配列に変換し、スコア順にソート
  const sortedMembers = Object.entries(room.members)
    .map(([uid, data]) => ({
      uid,
      ...data,
      // pointsが未定義の場合は0、正解数(correctCount)などもあれば加味
      score: data.score || 0 
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div style={rankingContainerStyle}>
      <h3 style={rankingTitleStyle}>🏆 REAL-TIME RANKING</h3>
      <div style={rankingListStyle}>
        {sortedMembers.map((member, index) => (
          <div key={member.uid} style={rankItemStyle(index === 0)}>
            <div style={rankNumberStyle(index)}>
              {index + 1}
            </div>
            <div style={rankNameStyle}>
              {member.isBot ? '🤖' : '👤'} {member.name}
            </div>
            <div style={rankScoreStyle}>
              {member.score}<span style={{fontSize: '0.7rem'}}>pt</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- スタイル (ライトモード & レスポンシブ) ---
const rankingContainerStyle = {
  background: '#fff',
  borderRadius: '16px',
  padding: '15px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  marginBottom: '20px',
  border: '1px solid #e9ecef'
};

const rankingTitleStyle = {
  fontSize: '0.8rem',
  color: '#0056b3',
  margin: '0 0 10px 0',
  letterSpacing: '1px',
  fontWeight: '800'
};

const rankingListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const rankItemStyle = (isFirst) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  background: isFirst ? '#fff9c4' : '#f8f9fa',
  borderRadius: '10px',
  border: isFirst ? '1px solid #fbc02d' : '1px solid transparent',
  transition: 'all 0.3s ease'
});

const rankNumberStyle = (index) => ({
  width: '24px',
  fontWeight: 'bold',
  color: index === 0 ? '#fbc02d' : '#adb5bd',
  fontSize: '1.1rem'
});

const rankNameStyle = {
  flex: 1,
  textAlign: 'left',
  fontWeight: '600',
  fontSize: '0.9rem',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis'
};

const rankScoreStyle = {
  fontWeight: 'bold',
  color: '#212529'
};