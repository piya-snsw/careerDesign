import React from "react";
import { useAuth } from "./hooks/useAuth";
import { useRoom } from "./hooks/useRoom";
import Login from "./components/Login";
import Waiting from "./components/Waiting";
import Room from "./components/Room";

/**
 * Appコンポーネント
 * ユーザーのログイン状態を監視し、認証済みならメインコンテンツを表示します。
 */
function App() {
  const { user, loading, loginAnonymously, loginWithGoogle } = useAuth();

  // 1. 認証状態の確認中（ロード画面）
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          <p className="text-slate-400 font-black italic tracking-widest uppercase text-xs">Authenticating...</p>
        </div>
      </div>
    );
  }

  // 2. 未ログインならログイン画面を表示
  if (!user) {
    return (
      <Login 
        onLoginAnonymously={loginAnonymously} 
        onLoginWithGoogle={loginWithGoogle} 
      />
    );
  }

  // 3. ログイン済みなら、ルームの状況に応じたコンテンツを表示
  return <Content user={user} />;
}

/**
 * Contentコンポーネント
 * Firestoreのルームデータ(status)を監視し、表示する画面を切り替えます。
 */
const Content = ({ user }) => {
  const { roomData } = useRoom("room1");

  // ルームデータの読み込み中
  if (!roomData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <div className="animate-pulse text-blue-600 font-black italic text-xl">
          CONNECTING...
        </div>
      </div>
    );
  }

  /**
   * status による画面分岐:
   * - "waiting": 全員がロビーにいる状態
   * - それ以外 ("watching", "pushed", "result"): クイズ進行中
   */
  return roomData.status === "waiting" ? (
    <Waiting user={user} />
  ) : (
    <Room user={user} />
  );
};

export default App;