import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { joinRoom } from '../services/roomService';
import { useNavigate, useParams } from 'react-router-dom';

export default function Lobby({ user }) {
  const [rooms, setRooms] = useState([]);
  const [joining, setJoining] = useState(null);
  const navigate = useNavigate();
  const { roomId } = useParams();

// 1. リアルタイムに部屋一覧を取得
  useEffect(() => {
    const roomsRef = collection(db, 'rooms');
    
    // onSnapshot の戻り値（関数）を unsubscribe という名前で保存
    const unsubscribe = onSnapshot(roomsRef, (snap) => {
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(list);
    }, (error) => {
      console.error("Lobby snapshot error:", error);
    });

    // コンポーネントが消える時にこの関数を呼んで接続を切る
    return () => unsubscribe();
  }, []);

  // 強制退去ガード（リセット検知）
  useEffect(() => {
    if (!roomId || rooms.length === 0) return;
    const currentRoom = rooms.find(r => r.id === roomId);
    if (currentRoom && (currentRoom.status === 'maintenance' || !currentRoom.hostId)) {
      navigate('/');
      if (currentRoom.status === 'maintenance') alert("メンテナンス中です");
    }
  }, [rooms, roomId, navigate]);

  const handleJoin = async (id) => {
    const targetRoom = rooms.find(r => r.id === id);
    if (targetRoom?.status === 'maintenance') return;

    try {
      setJoining(id);
      await joinRoom(id, user);
      navigate(`/room/${id}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setJoining(null);
    }
  };

  if (roomId) {
    // 部屋の中の表示（簡略版）
    return (
      <div style={pageBgStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h2 style={{ color: '#1a73e8' }}>🏠 ROOM: {roomId.toUpperCase()}</h2>
            <button style={{ ...buttonStyle, background: '#f1f3f4', color: '#3c4043', marginTop: 20 }} onClick={() => navigate('/')}>
              一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageBgStyle}>
      <div style={containerStyle}>
        {/* ユーザーバッジ */}
        <div style={userBadgeStyle}>
          <span style={{ marginRight: 8 }}>👤</span>
          Your Name: <strong style={{ marginLeft: 5 }}>{user.displayName || 'Guest'}</strong>
        </div>

        <header style={headerStyle}>
          <h1 style={titleStyle}>Quiz Lobby</h1>
          <p style={subtitleStyle}>
            主催者がいない部屋は「主催者」として、<br />
            いる部屋は「参加者」として入室します。
          </p>
        </header>

        <div style={gridStyle}>
          {['room1', 'room2', 'room3', 'room4', 'room5'].map(id => {
            const room = rooms.find(r => r.id === id);
            
            // ★安全なデータ取得（roomがない場合は空オブジェクトを想定）
            const members = room?.members || {};
            const realMemberCount = Object.keys(members).length;
            
            // ★ホスト判定: メンバーが1人以上いて、かつ hostId が設定されている場合のみ
            const hasHost = !!room?.hostId && realMemberCount > 0;
            const isFull = realMemberCount >= 4;
            const isJoining = joining === id;
            const isMaintenance = room?.status === 'maintenance';
            const isPlaying = room?.status === 'playing' || room?.status === 'answer';

            let label = '参加する';
            let btnBg = '#1a73e8'; // Google Blue
            let isDisabled = isJoining || (hasHost && isFull) || isMaintenance;

            if (isJoining) { 
              label = '接続中...'; 
              btnBg = '#bdc1c6'; 
            } else if (isMaintenance) { 
              label = 'メンテナンス中'; 
              btnBg = '#70757a'; 
            } else if (isPlaying) { 
              label = '試合中'; 
              btnBg = '#f9ab00'; 
              isDisabled = true; 
            } else if (!hasHost) { 
              label = '主催者として入る'; 
              btnBg = '#34a853'; 
              isDisabled = isJoining; 
            } else if (isFull) { 
              label = '満員'; 
              btnBg = '#dadce0'; 
            }

            return (
              <div key={id} style={{ ...cardStyle, borderTop: `5px solid ${btnBg}` }}>
                <div style={cardContentStyle}>
                  <div>
                    <div style={roomIdStyle}>{id.toUpperCase()}</div>
                    <div style={statusBadgeStyle(hasHost, isMaintenance)}>
                      {isMaintenance ? 'Maintenance' : hasHost ? 'Active' : 'Waiting for Host'}
                    </div>
                    <div style={countStyle}>
                      <span style={{ fontSize: '1.1rem' }}>👥</span> {realMemberCount} / 4 Players
                    </div>
                  </div>

                  <button
                    onClick={() => handleJoin(id)}
                    disabled={isDisabled}
                    style={{
                      ...buttonStyle,
                      background: btnBg,
                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- ライトモード・スタイル定義 ---

const pageBgStyle = {
  backgroundColor: '#f8f9fa',
  minHeight: '100vh',
  color: '#202124',
  fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
};

const containerStyle = {
  padding: '40px 20px',
  maxWidth: '1100px',
  margin: '0 auto'
};

const headerStyle = {
  marginBottom: '40px',
  textAlign: 'center'
};

const titleStyle = {
  fontSize: '2.5rem',
  fontWeight: '700',
  color: '#1a73e8',
  marginBottom: '10px',
  letterSpacing: '-0.5px'
};

const subtitleStyle = {
  color: '#5f6368',
  fontSize: '1rem',
  lineHeight: '1.6'
};

const userBadgeStyle = {
  marginBottom: '30px',
  padding: '10px 20px',
  background: '#ffffff',
  color: '#3c4043',
  borderRadius: '50px',
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: '0.9rem',
  fontWeight: '500',
  boxShadow: '0 1px 3px rgba(60,64,67,0.12), 0 1px 2px rgba(60,64,67,0.24)',
  border: '1px solid #dadce0'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '24px'
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  transition: 'transform 0.2s, box-shadow 0.2s',
  border: '1px solid #e8eaed'
};

const cardContentStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '100%',
  minHeight: '180px'
};

const roomIdStyle = {
  fontSize: '1.4rem',
  fontWeight: 'bold',
  color: '#202124',
  marginBottom: '8px'
};

const statusBadgeStyle = (hasHost, isMaintenance) => ({
  fontSize: '0.75rem',
  padding: '4px 12px',
  borderRadius: '20px',
  background: isMaintenance ? '#f1f3f4' : hasHost ? '#e8f0fe' : '#e6f4ea',
  color: isMaintenance ? '#5f6368' : hasHost ? '#1967d2' : '#137333',
  display: 'inline-block',
  fontWeight: '600',
  marginBottom: '16px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
});

const countStyle = {
  fontSize: '1rem',
  color: '#5f6368',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const buttonStyle = {
  width: '100%',
  padding: '14px',
  fontSize: '1rem',
  fontWeight: '600',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  transition: 'background 0.2s, transform 0.1s',
  marginTop: '20px'
};