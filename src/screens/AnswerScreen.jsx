import { useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { submitAnswer } from '../services/roomService';
import { nextQuestion } from '../services/quizService';

export default function AnswerScreen({ room, user }) {
  const isHost = room.hostId === user.uid;
  const currentQ = room.quiz.questions[room.quiz.currentIndex];
  
  // 結果発表モードか、入力モードかの判定
  const showResult = !!room.lastAnswer;
  
  // 入力モード用のデータ
  const buzzerUid = room.buzzer?.uid;
  const isBuzzer = buzzerUid === user.uid;
  const seconds = useCountdown(room.buzzer?.limitAt, 5000);

  // タイマー切れ処理（入力モード時のみ）
  useEffect(() => {
    if (!showResult && isBuzzer && seconds === 0) {
      submitAnswer(room.id, user.uid, "時間切れ", false);
    }
  }, [showResult, isBuzzer, seconds, room.id, user.uid]);

  // 結果発表後、主催者が次の問題へ進める（結果発表モード時のみ）
  useEffect(() => {
    if (showResult && isHost) {
      const timer = setTimeout(() => {
        nextQuestion(room.id, room);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showResult, isHost, room.id]);

  const handleAnswer = (answerText) => {
    const correct = answerText === currentQ.answer;
    submitAnswer(room.id, user.uid, answerText, correct);
  };

  if (!currentQ) return <div style={{ padding: 20 }}>⚠️ Question missing</div>;

  // --- A. 結果発表モード ---
  if (showResult) {
    const { uid, text, isCorrect } = room.lastAnswer;
    const member = room.members[uid];
    // ★ 名前を表示（なければフォールバック）
    const displayName = member?.name || (member?.isBot ? "Bot" : "Player");

    return (
      <div style={{ ...containerStyle, background: isCorrect ? '#e8f5e9' : '#ffebee' }}>
        <h1 style={{ fontSize: '3rem' }}>{isCorrect ? '⭕ 正解！' : '❌ 不正解...'}</h1>
        <div style={cardStyle}>
          <p>
            {member?.isBot ? '🤖' : '👤'} <strong>{displayName}</strong> の回答
          </p>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: 10 }}>{text}</p>
        </div>
        <p style={{ marginTop: 25, fontSize: '1.2rem' }}>
          正解は: <strong style={{ color: '#2e7d32' }}>{currentQ.answer}</strong>
        </p>
        <p style={{ color: '#666', marginTop: 10 }}>Next question soon...</p>
      </div>
    );
  }

  // --- B. 入力待ちモード (回答者が自分ではないとき) ---
  if (!isBuzzer) {
    const member = room.members[buzzerUid];
    const displayName = member?.name || (member?.isBot ? "Bot" : "Player");

    return (
      <div style={containerStyle}>
        <h3>⏳ Waiting...</h3>
        <div style={{ ...cardStyle, background: '#fff3e0' }}>
          <p style={{ fontSize: '1.5rem' }}>
            {member?.isBot ? '🤖' : '👤'} <strong>{displayName}</strong> is answering
          </p>
          <p style={{ fontSize: '5rem', color: '#ff6b6b', margin: '20px 0' }}>⏱️ {seconds}s</p>
        </div>
      </div>
    );
  }

  // --- C. 自分が回答するモード ---
  return (
    <div style={containerStyle}>
      <h3 style={{ color: '#ff6b6b', fontSize: '1.5rem' }}>Your turn! ⏱️ {seconds}s</h3>
      <div style={questionBoxStyle}>
        {currentQ.q || currentQ.text}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 400, margin: '0 auto' }}>
        {(currentQ.options || []).map((opt, i) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            style={{ ...buttonStyle, background: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'][i % 4] }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// スタイル定義
const containerStyle = {
  height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 20, transition: 'background 0.5s'
};
const cardStyle = { background: 'white', padding: '30px 50px', borderRadius: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 300 };
const questionBoxStyle = { fontSize: '1.8rem', fontWeight: 'bold', margin: '30px 0', padding: 30, background: '#fff8e1', borderRadius: 16, border: '3px solid #ffd700', maxWidth: 600 };
const buttonStyle = { padding: '20px', fontSize: '1.3rem', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 0 rgba(0,0,0,0.2)', active: { transform: 'translateY(2px)', boxShadow: 'none' } };