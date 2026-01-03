import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useRoom } from './hooks/useRoom';
import { leaveRoom } from './services/roomService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

  useEffect(() => {
    const handleBeforeUnload = () => {
      leaveRoom(roomId, user.uid);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user.uid]);

  // ★ 修正ポイント: 自動ホスト登録は残しつつ、メンテナンス中のガードを追加
  useEffect(() => {
    if (!roomLoading && room && !room.hostId && room.status !== 'maintenance') {
      const ref = doc(db, 'rooms', roomId);
      updateDoc(ref, {
        hostId: user.uid,
        createdAt: serverTimestamp(),
        status: 'waiting'
      }).catch(console.error);
    }
  }, [room, roomLoading, user.uid, roomId]);

  if (roomLoading) return <div style={loadingStyle}>Loading room...</div>;
  if (!room) return <div style={loadingStyle}>Room not found.</div>;

  const handleLeave = async () => {
    if (window.confirm('ルームを退出してロビーに戻りますか？')) {
      try {
        await leaveRoom(roomId, user.uid);
        navigate('/lobby');
      } catch (e) {
        navigate('/lobby');
      }
    }
  }

  return (
    <div style={appContainerStyle}>
      <RoomHeader room={room} user={user} onLeave={handleLeave} />
      <main style={mainContentStyle}>
        {room.status === 'waiting' && <WaitingRoom room={room} user={user} />}
        {room.status === 'countdown' && <CountdownOverlay room={room} user={user} />}
        {room.status === 'playing' && <QuizScreen room={room} user={user} />}
        {room.status === 'answer' && <AnswerScreen room={room} user={user} />}
        {room.status === 'score' && <ScoreScreen room={room} user={user} />}
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
        <span style={displayNameStyle}>👤 {user.displayName}</span>
        <button onClick={onLogout} style={logoutBtnStyle}>LOGOUT</button>
      </div>
    </header>
  );
}

function RoomHeader({ room, user, onLeave }) {
  return (
    <header style={{...headerStyle, borderBottom: '1px solid #E8EAED'}}>
      <div style={brandStyle}>
        <span style={roomTagStyle}>ROOM: {room.id}</span>
      </div>
      <div style={userActionsStyle}>
        <span style={displayNameStyle}>{user.displayName}</span>
        <button onClick={onLeave} style={backBtnStyle}>EXIT</button>
      </div>
    </header>
  );
}

// --- スタイル定義 (Light Theme) ---

const appContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#F8F9FA', // 明るいグレー背景
  color: '#202124',           // 濃いグレー（文字用）
  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const mainContentStyle = {
  padding: '20px',
  maxWidth: '1200px',
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
  boxShadow: '0 1px 2px rgba(60,64,67,0.1)',
};

const brandStyle = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#1A73E8', // Google Blue
};

const userActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const displayNameStyle = {
  fontSize: '0.875rem',
  fontWeight: '500',
  color: '#3C4043',
};

const loginBgStyle = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F8F9FA',
  padding: '20px',
};

const loginCardStyle = {
  textAlign: 'center',
  padding: '48px 32px',
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(60,64,67,0.1), 0 1px 3px rgba(60,64,67,0.15)',
  width: '100%',
  maxWidth: '400px',
  border: '1px solid #DADCE0',
};

const titleStyle = {
  color: '#1A73E8',
  fontSize: '2.25rem',
  fontWeight: 'bold',
  marginBottom: '32px',
  lineHeight: '1.1',
};

const subTitleStyle = {
  fontSize: '0.875rem',
  color: '#5F6368',
  fontWeight: 'normal',
};

const buttonGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const baseBtn = {
  padding: '12px 24px',
  fontSize: '0.9rem',
  fontWeight: '600',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const primaryBtnStyle = { 
  ...baseBtn, 
  backgroundColor: '#1A73E8', 
  color: '#FFFFFF',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)' 
};

const googleBtnStyle = { 
  ...baseBtn, 
  backgroundColor: '#FFFFFF', 
  color: '#3C4043', 
  border: '1px solid #DADCE0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const logoutBtnStyle = { 
  ...baseBtn, 
  padding: '6px 12px', 
  fontSize: '0.75rem', 
  backgroundColor: 'transparent', 
  color: '#D93025', 
  border: '1px solid #DADCE0' 
};

const backBtnStyle = { 
  ...baseBtn, 
  padding: '6px 12px', 
  fontSize: '0.75rem', 
  backgroundColor: 'transparent', 
  color: '#5F6368', 
  border: '1px solid #DADCE0' 
};

const roomTagStyle = {
  fontSize: '0.75rem',
  background: '#E8F0FE',
  padding: '4px 12px',
  borderRadius: '16px',
  color: '#1967D2',
  fontWeight: '600',
};

const loadingStyle = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FFFFFF',
  color: '#1A73E8',
  fontSize: '1rem',
};