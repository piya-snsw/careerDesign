import { useEffect } from 'react';
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

  // ボットの思考ロジック
  useEffect(() => {
    if (!room || !isHost || room.status !== 'playing') return;

    const botTimer = setInterval(() => {
      if (!buzzerUid) {
        runBotIfNeeded(roomId, room);
      } else if (room.members?.[buzzerUid]?.isBot) {
        runBotAnswerIfNeeded(roomId, room);
      }
    }, 2500);

    // 人間（!isBot）が一人もいない場合はボットを動かさない
    const hasHuman = Object.values(room.members).some(m => !m.isBot);
    if (!hasHuman) return;

    return () => clearInterval(botTimer);
  }, [room, isHost, roomId, buzzerUid]);


  // タイムアップ処理
  useEffect(() => {
    if (isBuzzer && seconds === 0) {
      handleAnswer("時間切れ");
    }
  }, [isBuzzer, seconds]);

  const handleBuzz = () => {
    const answeredUsers = room.answeredUsers || [];
    if (!buzzerUid && !answeredUsers.includes(user.uid)) {
      pressButton(roomId, user.uid);
    }
  };

  const handleAnswer = (optionText) => {
    const isCorrect = optionText === currentQ.answer;
    submitAnswer(roomId, user.uid, optionText, isCorrect);
  };

  if (!room || !currentQ) return <div style={loadingStyle}>Loading...</div>;

  const answeredUsers = room.answeredUsers || [];
  const hasAnswered = answeredUsers.includes(user.uid);

return (
    <div style={layoutWrapperStyle}>
      {/* 左サイドバー: リアルタイムランキング */}
      <aside style={sidebarStyle}>
        <LiveRanking room={room} />
      </aside>

      {/* メインエリア: クイズ本体 */}
      <main style={mainContentStyle}>
        {/* 上部の情報 */}
        <div style={headerInfoStyle}>
          <span style={roundBadgeStyle}>ROUND {room.quiz.currentIndex + 1} / 10</span>
        </div>

        {/* 問題文カード（高さを少し確保して中央に配置） */}
        <div style={questionCardStyle}>
          {currentQ.text || currentQ.q}
        </div>

        {/* アクションエリア（ここが画面中央〜下部を占める） */}
        <div style={actionAreaStyle}>
          {!buzzerUid ? (
            <div style={buzzWrapperStyle}>
              <button
                onClick={handleBuzz}
                disabled={hasAnswered}
                style={getBuzzButtonStyle(hasAnswered)}
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
              <div style={optionsGridStyle}>
                {(currentQ.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    style={optionButtonStyle(i)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={otherThinkingStyle}>
              <div style={buzzerUserBadgeStyle}>
                {buzzerUser?.isBot ? '🤖' : '👤'} {buzzerName}
              </div>
              <p style={{ color: '#666', marginBottom: 15 }}>回答を待っています...</p>
              <div style={waitTimerStyle}>{seconds}s</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// --- スタイル定義 ---

// --- スタイル定義 (不足分を全て補完) ---

const layoutWrapperStyle = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    alignItems: 'flex-start',
    minHeight: 'calc(100vh - 100px)',
};

const sidebarStyle = {
    flex: '1 1 280px',
    maxWidth: '320px',
    position: 'sticky',
    top: '80px',
};

const mainContentStyle = {
    flex: '2 1 450px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '70vh',
};

const headerInfoStyle = {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
};

const roundBadgeStyle = {
    background: '#e3f2fd',
    color: '#0056b3',
    padding: '6px 16px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
};

const questionCardStyle = {
    background: '#ffffff',
    padding: '40px 30px',
    borderRadius: '24px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
    fontSize: '1.6rem',
    fontWeight: 'bold',
    lineHeight: '1.6',
    color: '#2c3e50',
    marginBottom: '40px',
    borderLeft: '12px solid #0056b3',
    minHeight: '180px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const actionAreaStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '350px',
};

// ★今回のエラー原因：buzzWrapperStyle を定義
const buzzWrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
};

const buzzHintStyle = {
    color: '#6c757d',
    fontWeight: 'bold',
    fontSize: '0.95rem',
};

const answerSelectionStyle = {
    animation: 'fadeIn 0.3s',
};

const timerNoticeStyle = {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
};

const flashLabelStyle = { color: '#d32f2f', fontWeight: '900', fontSize: '1.2rem' };
const timerValueStyle = { fontSize: '2.5rem', fontWeight: '900', color: '#212529' };

const optionsGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    maxWidth: '600px',
    margin: '0 auto',
};

const otherThinkingStyle = {
    background: '#fff',
    padding: '40px 20px',
    borderRadius: '24px',
    border: '2px dashed #dee2e6',
};

const buzzerUserBadgeStyle = { fontSize: '1.4rem', fontWeight: 'bold', color: '#d32f2f', marginBottom: '10px' };
const waitTimerStyle = { fontSize: '3rem', fontWeight: '900', color: '#dee2e6' };
const loadingStyle = { padding: '50px', fontSize: '1.2rem', color: '#6c757d' };

// getBuzzButtonStyle と optionButtonStyle は関数形式なのでそのまま維持
const getBuzzButtonStyle = (used) => ({
    width: '180px',
    height: '180px',
    fontSize: '2.2rem',
    fontWeight: '900',
    borderRadius: '50%',
    border: 'none',
    cursor: used ? 'not-allowed' : 'pointer',
    background: used ? '#ced4da' : 'linear-gradient(145deg, #ff5f5f, #e60000)',
    color: 'white',
    boxShadow: used ? 'inset 4px 4px 8px #adb5bd' : '0 10px 0 #b71c1c, 0 15px 25px rgba(0,0,0,0.2)',
    transition: 'all 0.1s',
    transform: used ? 'translateY(10px)' : 'none',
    outline: 'none',
});

const optionButtonStyle = (i) => {
    const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE'];
    return {
        padding: '24px 10px',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: colors[i % 4],
        border: 'none',
        borderRadius: '16px',
        cursor: 'pointer',
        boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
        minHeight: '85px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };
};