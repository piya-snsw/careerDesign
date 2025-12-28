import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut
} from "firebase/auth";

function App() {
  const [user, setUser] = useState(null);
  const [question, setQuestion] = useState(null);
  const [status, setStatus] = useState("waiting");
  const [buzzerUser, setBuzzerUser] = useState("");
  const [joinedUsers, setJoinedUsers] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await updateDoc(doc(db, "rooms", "room1"), {
          joinedUsers: arrayUnion(u.displayName || "ゲスト")
        });
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "rooms", "room1"), (snap) => {
      const data = snap.data();
      if (!data) return;
      setStatus(data.status);
      setBuzzerUser(data.buzzerUser || "");
      setJoinedUsers(data.joinedUsers || []);
      setCurrentQuestionId(data.currentQuestionId || null);
      if (data.status === "watching" || data.status === "waiting") {
        setSelectedAnswer(null);
        setTimeLeft(5);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (status === "waiting") return;
    if (!currentQuestionId) return;
    const fetchQuestion = async () => {
      const snap = await getDoc(doc(db, "questions", currentQuestionId));
      if (snap.exists()) {
        setQuestion(snap.data());
      }
    };
    fetchQuestion();
  }, [status, currentQuestionId]);

  useEffect(() => {
    if (status !== "pushed") return;
    if (timeLeft === 0) {
      if (buzzerUser === (user.displayName || "ゲスト")) {
        handleAnswer(-1);
      }
      return;
    }
    const t = setTimeout(() => {
      setTimeLeft((v) => v - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [status, timeLeft]);

  const loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
  const loginAsGuest = () => signInAnonymously(auth);

  const handleStartGame = async () => {
    await updateDoc(doc(db, "rooms", "room1"), {
      status: "watching",
      buzzerUser: ""
    });
  };

  const handlePush = async () => {
    if (status !== "watching") return;
    await updateDoc(doc(db, "rooms", "room1"), {
      status: "pushed",
      buzzerUser: user.displayName || "ゲスト"
    });
  };

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setStatus("result");
  };

  const handleBackToLobby = async () => {
    await updateDoc(doc(db, "rooms", "room1"), {
      status: "waiting",
      buzzerUser: ""
    });
  };

  // --- UI構成 ---

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
          <h1 className="text-3xl font-black text-blue-600 mb-2 italic">Quiz Buster FE</h1>
          <p className="text-slate-400 text-sm mb-8 font-medium tracking-tight">ITエンジニアの登竜門、早押し対戦</p>
          <div className="space-y-3">
            <button onClick={loginWithGoogle} className="w-full py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="G" />
              Googleでログイン
            </button>
            <button onClick={loginAsGuest} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">
              ゲストモードで開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = buzzerUser === (user.displayName || "ゲスト");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 border border-slate-100 relative overflow-hidden">
        
        {/* ヘッダー装飾 */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
            {status} mode
          </div>
          <button onClick={() => signOut(auth)} className="text-[10px] font-bold text-slate-300 hover:text-red-400 transition-colors uppercase">Logout</button>
        </div>

        {/* ロビー画面 */}
        {status === "waiting" && (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black mb-6 text-slate-800 tracking-tight">待機ロビー</h2>
            <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 shadow-inner">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">参加プレイヤー</p>
              <div className="flex flex-wrap justify-center gap-2">
                {joinedUsers.map((u, i) => (
                  <span key={i} className="px-4 py-2 bg-white border border-blue-100 text-blue-600 rounded-full text-sm font-bold shadow-sm animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>
                    👤 {u}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={handleStartGame} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-500 transition-all active:scale-95 text-lg">
              ゲームを開始する
            </button>
          </div>
        )}

        {/* クイズ進行画面 */}
        {status !== "waiting" && question && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {/* 問題文パネル */}
            <div className="bg-blue-600 rounded-[2rem] p-8 mb-8 text-center shadow-xl shadow-blue-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>
              <p className="text-lg font-bold text-white leading-relaxed tracking-tight">{question.text}</p>
              {status === "pushed" && (
                <div 
                  className="absolute bottom-0 left-0 h-2 bg-red-400 transition-all duration-1000 ease-linear" 
                  style={{ width: `${(timeLeft / 5) * 100}%` }}
                />
              )}
            </div>

            {/* 早押しボタンフェーズ */}
            {status === "watching" && (
              <div className="flex flex-col items-center py-6">
                <button 
                  onClick={handlePush} 
                  className="w-44 h-44 bg-red-500 hover:bg-red-400 active:scale-90 transition-all rounded-full shadow-[0_20px_50px_rgba(239,68,68,0.3)] border-[12px] border-red-50 flex items-center justify-center group"
                >
                  <span className="text-3xl font-black text-white tracking-widest group-hover:scale-110 transition-transform">PUSH!</span>
                </button>
                <p className="mt-8 text-slate-300 font-bold text-sm animate-pulse uppercase tracking-widest">Wait for the signal</p>
              </div>
            )}

            {/* 回答入力フェーズ */}
            {status === "pushed" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-4 px-2">
                   <p className="font-black text-red-500 flex items-center gap-2">
                     <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                     {buzzerUser}
                   </p>
                   {isMyTurn && <span className="text-xl font-mono font-black text-blue-600">0:0{timeLeft}</span>}
                </div>
                
                {isMyTurn ? (
                  question.options.map((o, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleAnswer(i)} 
                      className="w-full py-4 px-6 bg-white border-2 border-slate-100 rounded-2xl font-bold text-left hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98] flex items-center gap-4"
                    >
                      <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">{i + 1}</span>
                      {o}
                    </button>
                  ))
                ) : (
                  <div className="py-16 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100 text-center">
                    <p className="text-slate-400 font-bold animate-pulse">相手の回答を待っています...</p>
                  </div>
                )}
              </div>
            )}

            {/* 結果表示フェーズ */}
            {status === "result" && (
              <div className="text-center py-4 animate-in zoom-in duration-300">
                <div className={`text-6xl font-black mb-8 italic tracking-tighter ${selectedAnswer === question.answerIndex ? "text-green-500" : "text-red-500"}`}>
                  {selectedAnswer === question.answerIndex ? "CORRECT!" : selectedAnswer === -1 ? "TIME UP" : "WRONG"}
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Answer</p>
                   <p className="font-bold text-slate-700">{question.options[question.answerIndex]}</p>
                </div>
                <button onClick={handleBackToLobby} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95">
                  ロビーに戻る
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* ユーザーフッター */}
      <p className="mt-8 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Logged in as: {user.displayName || "Guest"}</p>
    </div>
  );
}

export default App;