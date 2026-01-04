import { useEffect, useState } from 'react'; // useStateを追加
import { pressButton, submitAnswer } from '../services/roomService';
import { runBotIfNeeded, runBotAnswerIfNeeded } from '../services/botLogic';
import { useCountdown } from '../hooks/useCountdown';
import LiveRanking from '../components/LiveRanking';

export default function QuizScreen({ room, user }) {
  const roomId = room?.id;
  const isHost = room?.hostId === user.uid;
  const currentQ = room.quiz?.questions?.[room.quiz.currentIndex];
  const buzzerUid = room.buzzer?.uid;
  const isBuzzer = buzzerUid === user.uid;
  const buzzerUser = room.members?.[buzzerUid];
  const buzzerName = buzzerUser?.name || (buzzerUser?.isBot ? '🤖 Bot' : '👤 Player');
  const seconds = useCountdown(room.buzzer?.limitAt, 5000);

  // --- レスポンシブ判定 ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 850);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ボットの思考ロジック（人間が全員間違えたら即回答）
  useEffect(() => {
    if (!room || !isHost || room.status !== 'playing') return;

    const members = room.members || {};
    const answeredUsers = room.answeredUsers || [];
    const humans = Object.values(members).filter(m => !m.isBot);
    const activeHumans = humans.filter(h => !answeredUsers.includes(h.uid));

    // --- 1. 【超速】人間が全滅した時の即時実行 ---
    if (!buzzerUid && humans.length > 0 && activeHumans.length === 0) {
      console.log("⚡ 人間全滅！ボットが即座にボタンを押します");
      runBotIfNeeded(roomId, room);
      // ここで即実行されるので、下のタイマーを待たずにボタンが押されます
    }

    // --- 2. 【通常】ボットの思考タイマー ---
    const botTimer = setInterval(() => {
      if (!buzzerUid) {
        // ★ ここがポイント：人間が残っている時は、以前の 2500ms(2.5秒) のペースを維持
        runBotIfNeeded(roomId, room);
      } else if (room.members?.[buzzerUid]?.isBot) {
        // ボットがボタンを押した後の「回答入力」は 2.5秒だと遅いので、ここは早めに
        runBotAnswerIfNeeded(roomId, room);
      }
    }, 2500); // ★ ここを 2500 に戻すことで、通常の回答速度を落とします

    return () => clearInterval(botTimer);

  }, [room.answeredUsers, buzzerUid, isHost, roomId, room.status]);

  useEffect(() => {
    if (isBuzzer && seconds === 0) handleAnswer("時間切れ");
  }, [isBuzzer, seconds]);

  const handleBuzz = () => {
    const answeredUsers = room.answeredUsers || [];
    if (!buzzerUid && !answeredUsers.includes(user.uid)) pressButton(roomId, user.uid);
  };

  const handleAnswer = (optionText) => {
    const isCorrect = optionText === currentQ.answer;
    submitAnswer(roomId, user.uid, optionText, isCorrect);
  };

  if (!room || !currentQ) return <div style={loadingStyle}>Loading...</div>;
  const hasAnswered = (room.answeredUsers || []).includes(user.uid);

  return (
    <div style={layoutWrapperStyle(isMobile)}>
      {/* 1. メイン：クイズ（スマホで一番上、PCで右側） */}
      <main style={mainContentStyle(isMobile)}>
        <div style={headerInfoStyle}>
          <span style={roundBadgeStyle}>ROUND {room.quiz.currentIndex + 1} / 10</span>
        </div>

        <div style={questionCardStyle(isMobile)}>
          {currentQ.text || currentQ.q}
        </div>

        <div style={actionAreaStyle(isMobile)}>
          {!buzzerUid ? (
            <div style={buzzWrapperStyle}>
              <button
                onClick={handleBuzz}
                disabled={hasAnswered}
                style={getBuzzButtonStyle(hasAnswered, isMobile)}
              >
                {hasAnswered ? '✕' : 'PUSH!'}
              </button>
              <p style={buzzHintStyle}>
                {hasAnswered ? '次の問題を待機中...' : '答えがわかったらタップ！'}
              </p>
            </div>
          ) : isBuzzer ? (
            <div style={answerSelectionStyle}>
              <div style={timerNoticeStyle}>
                <span style={flashLabelStyle}>YOUR TURN!</span>
                <span style={timerValueStyle}>{seconds}s</span>
              </div>
              <div style={optionsGridStyle(isMobile)}>
                {(currentQ.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    style={optionButtonStyle(i, isMobile)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={otherThinkingStyle}>
              <div style={buzzerUserBadgeStyle}>{buzzerName} 回答中...</div>
              <div style={waitTimerStyle}>{seconds}s</div>
            </div>
          )}
        </div>
      </main>

      {/* 2. サイドバー：ランキング（スマホで一番下、PCで左側） */}
      <aside style={sidebarStyle(isMobile)}>
        <div style={rankingContainerStyle(isMobile)}>
          <h4 style={rankingTitleStyle}>LIVE RANKING</h4>
          <LiveRanking room={room} />
        </div>
      </aside>
    </div>
  );
}

// --- スタイル定義 (関数にして isMobile で切り替える) ---

const layoutWrapperStyle = (isMobile) => ({
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row', // スマホなら縦並び
  gap: '20px',
  maxWidth: '1100px',
  margin: '0 auto',
  padding: isMobile ? '10px' : '20px',
});

const mainContentStyle = (isMobile) => ({
  flex: '1',
  order: isMobile ? 1 : 2, // スマホでクイズを上に、PCで右に
  width: '100%',
});

const sidebarStyle = (isMobile) => ({
  width: isMobile ? '100%' : '280px',
  order: isMobile ? 2 : 1, // スマホでランキングを下に、PCで左に
  position: isMobile ? 'static' : 'sticky',
  top: '20px',
});

const questionCardStyle = (isMobile) => ({
  background: '#ffffff',
  padding: isMobile ? '25px 15px' : '40px 30px',
  borderRadius: '16px',
  boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
  fontSize: isMobile ? '1.1rem' : '1.5rem',
  fontWeight: 'bold',
  lineHeight: '1.6',
  color: '#202124',
  marginBottom: '20px',
  borderLeft: '8px solid #1a73e8',
  textAlign: 'center',
  minHeight: isMobile ? '100px' : '160px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const rankingContainerStyle = (isMobile) => ({
  background: isMobile ? 'transparent' : '#fff',
  padding: isMobile ? '10px' : '20px',
  borderRadius: '12px',
  border: isMobile ? 'none' : '1px solid #e0e0e0',
  marginTop: isMobile ? '40px' : '0', // スマホで少し距離を置く
});

const optionsGridStyle = (isMobile) => ({
  display: 'grid',
  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', // スマホなら1列、PCなら2列
  gap: '12px',
  maxWidth: '600px',
  margin: '0 auto',
});

const getBuzzButtonStyle = (used, isMobile) => ({
  width: isMobile ? '140px' : '180px',
  height: isMobile ? '140px' : '180px',
  fontSize: isMobile ? '1.5rem' : '2.2rem',
  fontWeight: '900',
  borderRadius: '50%',
  border: 'none',
  cursor: used ? 'not-allowed' : 'pointer',
  background: used ? '#dadce0' : '#d93025',
  color: 'white',
  boxShadow: used ? 'none' : '0 8px 0 #a50e0e, 0 12px 20px rgba(0,0,0,0.2)',
  transition: 'transform 0.1s',
  transform: used ? 'translateY(8px)' : 'none',
  outline: 'none',
});

const optionButtonStyle = (i, isMobile) => {
  const colors = ['#1a73e8', '#34a853', '#f9ab00', '#9334e6'];
  return {
    padding: isMobile ? '16px' : '24px',
    fontSize: isMobile ? '0.95rem' : '1.1rem',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: colors[i % 4],
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    minHeight: isMobile ? '60px' : '80px',
  };
};

// その他の固定スタイル
const headerInfoStyle = { marginBottom: '15px', display: 'flex', justifyContent: 'center' };
const roundBadgeStyle = { background: '#e8f0fe', color: '#1967d2', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '0.8rem' };
const buzzWrapperStyle = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' };
const buzzHintStyle = { color: '#5f6368', fontSize: '0.85rem', fontWeight: '500' };
const rankingTitleStyle = { fontSize: '0.8rem', color: '#5f6368', marginBottom: '10px', textAlign: 'center', letterSpacing: '1px' };
const actionAreaStyle = (isMobile) => ({ minHeight: isMobile ? '280px' : '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center' });
const timerNoticeStyle = { marginBottom: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' };
const flashLabelStyle = { color: '#d93025', fontWeight: '900', fontSize: '1rem' };
const timerValueStyle = { fontSize: '2rem', fontWeight: '900', color: '#202124' };
const otherThinkingStyle = { background: '#fff', padding: '30px 20px', borderRadius: '16px', border: '1px solid #e0e0e0', textAlign: 'center' };
const buzzerUserBadgeStyle = { fontSize: '1.2rem', fontWeight: 'bold', color: '#d93025', marginBottom: '5px' };
const waitTimerStyle = { fontSize: '2.5rem', fontWeight: '900', color: '#f1f3f4' };
const loadingStyle = { padding: '50px', textAlign: 'center', color: '#5f6368' };
const answerSelectionStyle = { width: '100%' };