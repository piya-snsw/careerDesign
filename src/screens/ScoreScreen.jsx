import React from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'; // ★ 追加
import { db } from '../firebase'; // ★ 追加（パスは環境に合わせて調整してください）

export default function ScoreScreen({ room, user }) {
  if (!room || !user) return null;

  const isHost = room.hostId === user.uid;
  const members = Object.entries(room.members || {});

  // 1. スコアの高い順にソート
  const sortedMembers = members.sort((a, b) => b[1].score - a[1].score);

  const handleBackToLobby = async () => {
    try {
      const roomRef = doc(db, 'rooms', room.id);
      const currentMembers = { ...room.members };
      
      // 退出する自分のデータを削除
      delete currentMembers[user.uid];

      const remainingHumans = Object.values(currentMembers).filter(m => !m.isBot);
      const hasHumanLeft = remainingHumans.length > 0;

      if (hasHumanLeft) {
        // --- 他の人間がいる場合：ホスト権限を移譲して自分だけ抜ける ---
        const nextHostId = isHost ? remainingHumans[0].uid : room.hostId;

        await updateDoc(roomRef, {
          members: currentMembers,
          activeCount: Object.keys(currentMembers).length,
          hostId: nextHostId,
          updatedAt: serverTimestamp()
        });
      } else {
        // --- 誰もいなくなる場合：部屋を完全に初期化する ---
        await updateDoc(roomRef, {
          status: 'waiting',
          hostId: null,
          members: {},
          activeCount: 0,
          answeredUsers: [],
          "quiz.currentIndex": 0,
          buzzer: null,
          updatedAt: serverTimestamp()
        });
      }

      // ★ 全ての更新が終わってから遷移
      window.location.href = '/';

    } catch (e) {
      console.error("退出エラー:", e);
      window.location.href = '/'; // エラー時も強制終了を防ぐため戻す
    }
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>🏆 Results</h1>
        <p style={subtitleStyle}>おつかれさまでした！</p>
      </div>

      <div style={listContainerStyle}>
        {sortedMembers.map(([uid, data], index) => {
          const isMe = uid === user.uid;
          const medals = ['🥇', '🥈', '🥉'];

          return (
            <div
              key={uid}
              style={{
                ...rankItemStyle,
                backgroundColor: isMe ? '#e8f0fe' : 'white',
                border: isMe ? '2px solid #1a73e8' : '1px solid #e0e0e0',
                transform: index === 0 ? 'scale(1.05)' : 'scale(1)',
                zIndex: index === 0 ? 1 : 0
              }}
            >
              <div style={rankNumberStyle}>
                {index < 3 ? medals[index] : `${index + 1}`}
              </div>

              <div style={nameStyle}>
                <span style={avatarStyle}>{data.isBot ? '🤖' : '👤'}</span>
                <span style={nameTextStyle}>
                  {data.name || (data.isBot ? 'Bot' : 'Player')}
                </span>
                {isMe && <span style={meTagStyle}>YOU</span>}
              </div>

              <div style={scoreValueStyle}>
                {data.score} <span style={ptsStyle}>pts</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={reviewSectionStyle}>
        <h3 style={reviewTitleStyle}>📖 今回の問題をおさらい</h3>
        <div style={reviewListStyle}>
          {room.quiz.questions.map((q, index) => (
            <div key={index} style={reviewCardStyle}>
              <div style={questionHeaderStyle}>
                <span style={questionNumberStyle}>Question {index + 1}</span>
                <span style={correctLabelStyle}>CORRECT ANSWER</span>
              </div>
              <p style={reviewQuestionTextStyle}>{q.text || q.q}</p>
              <div style={answerBoxStyle}>
                {q.answer}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={footerStyle}>
        <button onClick={handleBackToLobby} style={buttonStyle}>
          {isHost ? '部屋を閉じてロビーへ' : 'ロビーへ戻る'}
        </button>
      </div>
    </div>
  );
}

// --- スタイル定義（Googleクリーン風） ---

const containerStyle = {
  minHeight: '100vh',
  padding: '60px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: '#f1f3f4', // 薄いグレー
  fontFamily: '"Google Sans", Roboto, Arial, sans-serif'
};

const headerStyle = { textAlign: 'center', marginBottom: '40px' };
const titleStyle = { fontSize: '3.5rem', margin: 0, fontWeight: '800', color: '#202124' };
const subtitleStyle = { color: '#5f6368', fontSize: '1.1rem' };

const listContainerStyle = {
  width: '100%',
  maxWidth: '480px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginBottom: '50px'
};

const rankItemStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px 24px',
  borderRadius: '16px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  transition: 'transform 0.2s ease'
};

const rankNumberStyle = { fontSize: '1.6rem', fontWeight: 'bold', width: '45px' };
const avatarStyle = { marginRight: '12px', fontSize: '1.4rem' };
const nameStyle = { flex: 1, display: 'flex', alignItems: 'center', overflow: 'hidden' };
const nameTextStyle = { fontSize: '1.1rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

const meTagStyle = {
  marginLeft: '10px',
  fontSize: '0.65rem',
  background: '#1a73e8',
  color: 'white',
  padding: '2px 8px',
  borderRadius: '10px',
  fontWeight: 'bold'
};

const scoreValueStyle = { fontSize: '1.8rem', fontWeight: '800', color: '#3c4043' };
const ptsStyle = { fontSize: '0.9rem', color: '#70757a', fontWeight: 'normal' };

const reviewSectionStyle = { width: '100%', maxWidth: '600px', margin: '0 auto' };
const reviewTitleStyle = { color: '#202124', fontSize: '1.3rem', marginBottom: '20px', textAlign: 'center' };
const reviewListStyle = { display: 'flex', flexDirection: 'column', gap: '16px' };

const reviewCardStyle = {
  background: '#fff',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #dadce0',
};

const questionHeaderStyle = {
  display: 'flex', 
  justifyContent: 'space-between', 
  marginBottom: '10px'
};

const questionNumberStyle = {
  fontSize: '0.75rem',
  color: '#1a73e8',
  background: '#e8f0fe',
  padding: '4px 12px',
  borderRadius: '20px',
  fontWeight: 'bold'
};

const correctLabelStyle = { fontSize: '0.7rem', color: '#188038', fontWeight: 'bold' };
const reviewQuestionTextStyle = { fontSize: '1rem', color: '#3c4043', marginBottom: '15px', lineHeight: '1.5' };

const answerBoxStyle = {
  background: '#f1f8e9',
  padding: '12px 16px',
  borderRadius: '8px',
  color: '#1b5e20',
  fontSize: '1rem',
  fontWeight: 'bold',
  border: '1px solid #c8e6c9'
};

const footerStyle = { marginTop: '60px', marginBottom: '40px' };

const buttonStyle = {
  padding: '18px 48px',
  fontSize: '1.1rem',
  fontWeight: '600',
  color: 'white',
  background: '#202124',
  border: 'none',
  borderRadius: '32px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  transition: 'background 0.2s'
};