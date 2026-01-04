import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useRoom } from './hooks/useRoom';
import { leaveRoom } from './services/roomService';
import { addBots, startCountdown } from './services/quizService';
import { doc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

import Lobby from './screens/Lobby';
import WaitingRoom from './screens/WaitingRoom';
import CountdownOverlay from './screens/CountdownOverlay';
import QuizScreen from './screens/QuizScreen';
import AnswerScreen from './screens/AnswerScreen';
import ScoreScreen from './screens/ScoreScreen';


// --- サブコンポーネント: ルームの論理制御 ---
function RoomContainer({ user }) {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { room, loading: roomLoading } = useRoom(roomId);
  const [isExiting, setIsExiting] = useState(false);

  // 1. 自動入室ロジック
  useEffect(() => {
    // スコア画面だろうが退室中だろうが、不要な書き込みを徹底排除
    if (roomLoading || !user || !room || isExiting || room.status === 'score') return;

    if (room.status !== 'waiting' && !room.members[user.uid]) {
      alert('このゲームはすでに開始されているか、終了しています。');
      navigate('/lobby', { replace: true });
      return;
    }

    const checkAndJoin = async () => {
      const currentMembers = room.members || {};
      if (!currentMembers[user.uid]) {
        if (Object.keys(currentMembers).length >= 4) {
          alert('このルームは満員です。');
          navigate('/lobby', { replace: true });
          return;
        }
        try {
          const roomRef = doc(db, 'rooms', roomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const latestMembers = snap.data().members || {};
            if (Object.keys(latestMembers).length < 4) {
              await updateDoc(roomRef, {
                [`members.${user.uid}`]: {
                  uid: user.uid,
                  name: user.displayName || 'Player',
                  isBot: false,
                  score: 0
                },
                activeCount: Object.keys(latestMembers).length + 1,
                updatedAt: serverTimestamp()
              });
            }
          }
        } catch (err) { navigate('/lobby'); }
      }
    };
    checkAndJoin();
  }, [room, roomLoading, roomId, user, navigate, isExiting, room?.status]);

// 2. ホスト主張ロジック
  useEffect(() => {
    if (roomLoading || !room || room.hostId || isExiting || room.status === 'score') return;
    const claimHost = async () => {
      try {
        const roomRef = doc(db, 'rooms', roomId);
        const snap = await getDoc(roomRef);
        if (snap.exists() && !snap.data().hostId) {
          await updateDoc(roomRef, { hostId: user.uid, updatedAt: serverTimestamp() });
        }
      } catch (err) {}
    };
    claimHost();
  }, [room, roomLoading, roomId, user.uid, isExiting, room?.status]);

  // 3. 退室ハンドラー（この関数をすべての画面に配る）
  const handleLeave = async () => {
    // 多重クリック防止
    if (isExiting) return;

    if (window.confirm('ロビーに戻りますか？')) {
      setIsExiting(true); 
      try {
        console.log("🏃‍♂️ Starting exit process...");
        await leaveRoom(roomId, user.uid);
        console.log("✅ Exit process finished in DB");
      } catch (e) {
        console.error("❌ Exit process failed:", e);
        setIsExiting(false);
      } finally {
        navigate('/lobby', { replace: true });
      }
    }
  };

  // 4. ブラウザバックやタブ閉じ対策（スコア画面でも実行）
  useEffect(() => {
    const handleBeforeUnload = () => {
      // スコア画面でも、ブラウザを閉じるときはデータを消す
      leaveRoom(roomId, user.uid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user.uid]);

  if (roomLoading) return <div style={loadingStyle}>Loading room...</div>;
  if (!room) return <div style={loadingStyle}>Room not found.</div>;

  return (
    <div style={appContainerStyle}>
      <RoomHeader room={room} user={user} onLeave={handleLeave} />
      <main style={mainContentStyle}>
        {room.status === 'waiting' && <WaitingRoom room={room} user={user} />}
        {room.status === 'countdown' && <CountdownOverlay room={room} user={user} />}
        {room.status === 'playing' && <QuizScreen room={room} user={user} />}
        {room.status === 'answer' && <AnswerScreen room={room} user={user} />}
        {/* ★ ScoreScreen にも onLeave={handleLeave} を渡すのがポイント！ */}
        {room.status === 'score' && <ScoreScreen room={room} user={user} onLeave={handleLeave} />}
      </main>
    </div>
  );
}

// --- メイン App コンポーネント ---
export default function App() {
  const { user, loading: authLoading, loginAnonymous, loginGoogle, logout } = useAuth();

  if (authLoading) return <div style={loadingStyle}>Initializing...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <Route path="*" element={<LoginView onAnon={loginAnonymous} onGoogle={loginGoogle} />} />
        ) : (
          <>
            <Route path="/lobby" element={<LobbyWrapper user={user} logout={logout} />} />
            <Route path="/room/:roomId" element={<RoomContainer user={user} />} />
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

function LobbyWrapper({ user, logout }) {
  const navigate = useNavigate();
  return (
    <div style={appContainerStyle}>
      <Header user={user} onLogout={logout} />
      <main style={mainContentStyle}>
        <Lobby user={user} onJoin={(id) => navigate(`/room/${id}`)} />
      </main>
    </div>
  );
}

// --- UI コンポーネント ---
function LoginView({ onAnon, onGoogle }) {
  return (
    <div style={loginBgStyle}>
      <div style={loginCardStyle}>
        <h1 style={titleStyle}>FE QUIZ<br /><span style={subTitleStyle}>基本情報早押しバトル</span></h1>
        <div style={buttonGroupStyle}>
          <button onClick={onAnon} style={primaryBtnStyle}>ゲストログイン</button>
          <button onClick={onGoogle} style={googleBtnStyle}>Googleログイン</button>
        </div>
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header style={headerStyle}>
      <div style={brandStyle}>FE QUIZ</div>
      <div style={userActionsStyle}>
        <span style={displayNameStyle}>👤 {user.displayName || 'Guest'}</span>
        <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
      </div>
    </header>
  );
}

function RoomHeader({ room, user, onLeave }) {
  return (
    <header style={headerStyle}>
      <div style={brandStyle}>
        <span style={roomTagStyle}>ROOM: {room.id?.slice(0, 5)}</span>
      </div>
      <div style={userActionsStyle}>
        <span style={displayNameStyle}>{user.displayName || 'Player'}</span>
        <button onClick={onLeave} style={backBtnStyle}>EXIT</button>
      </div>
    </header>
  );
}

// --- スタイル定義 ---
const appContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#F8F9FA',
  color: '#202124',
  fontFamily: '"Google Sans", Roboto, Helvetica, Arial, sans-serif',
};

const mainContentStyle = {
  padding: '20px',
  maxWidth: '800px',
  margin: '0 auto',
};

const headerStyle = {
  height: '64px',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid #DADCE0',
  position: 'sticky',
  top: 0,
  zIndex: 1000,
};

const brandStyle = { fontSize: '1.25rem', fontWeight: '600', color: '#1A73E8' };
const userActionsStyle = { display: 'flex', alignItems: 'center', gap: '12px' };
const displayNameStyle = { fontSize: '0.875rem', fontWeight: '500', color: '#3C4043' };

const loginBgStyle = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F8F9FA',
};

const loginCardStyle = {
  textAlign: 'center',
  padding: '48px 32px',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  width: '100%',
  maxWidth: '360px',
};

const titleStyle = { color: '#1A73E8', fontSize: '2rem', marginBottom: '32px' };
const subTitleStyle = { fontSize: '0.875rem', color: '#5F6368' };
const buttonGroupStyle = { display: 'flex', flexDirection: 'column', gap: '10px' };

const baseBtn = {
  padding: '10px 20px',
  fontSize: '0.9rem',
  fontWeight: '600',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const primaryBtnStyle = { ...baseBtn, backgroundColor: '#1A73E8', color: '#FFFFFF' };
const googleBtnStyle = { ...baseBtn, backgroundColor: '#FFFFFF', color: '#3C4043', border: '1px solid #DADCE0' };
const logoutBtnStyle = { ...baseBtn, backgroundColor: 'transparent', color: '#D93025', fontSize: '0.75rem' };
const backBtnStyle = { ...baseBtn, padding: '6px 14px', backgroundColor: '#F1F3F4', color: '#5F6368' };
const roomTagStyle = { fontSize: '0.75rem', background: '#E8F0FE', padding: '4px 10px', borderRadius: '4px', color: '#1967D2' };
const loadingStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A73E8' };