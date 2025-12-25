import { useState, useEffect } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
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
  const [status, setStatus] = useState("watching"); // "watching" | "pushed" | "result"
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);

  // 1. ログイン状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. クイズデータの取得（ログイン時のみ）
  useEffect(() => {
    if (!user) return;
    const fetchQuestion = async () => {
      const docRef = doc(db, "questions", "q1");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuestion(docSnap.data());
      }
    };
    fetchQuestion();
  }, [user]);

  // 3. 回答時のタイマーロジック
  useEffect(() => {
    if (status !== "pushed") return;
    if (timeLeft === 0) {
      handleAnswer(-1); // タイムアップ
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [status, timeLeft]);

  // ログイン処理
  const loginWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const loginAsGuest = () => {
    signInAnonymously(auth);
  };

  // クイズアクション
  const handlePush = () => {
    setStatus("pushed");
    setTimeLeft(5);
  };

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setStatus("result");
  };

  // --- 画面分岐 A: 未ログイン ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-200 text-center">
          <h1 className="text-2xl font-black text-blue-600 mb-2 italic">Quiz Buster FE</h1>
          <p className="text-slate-500 mb-10 text-sm font-medium">基本情報技術者試験 早押し対戦</p>
          
          <div className="space-y-4">
            <button 
              onClick={loginWithGoogle}
              className="w-full py-4 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="google" />
              Googleでログイン
            </button>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-[1px] bg-slate-200"></div>
              <span className="text-[10px] text-slate-400 font-bold">OR</span>
              <div className="flex-1 h-[1px] bg-slate-200"></div>
            </div>

            <button 
              onClick={loginAsGuest}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all active:scale-95"
            >
              ゲストモードで遊ぶ
            </button>
          </div>
          <p className="mt-8 text-[10px] text-slate-400">※ゲストモードでは戦績は保存されません</p>
        </div>
      </div>
    );
  }

  // --- 画面分岐 B: データ読み込み中 ---
  if (!question) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // --- 画面分岐 C: クイズメイン画面 ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans relative">
      {/* ユーザー情報とログアウト */}
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-xs font-bold text-slate-500">{user.displayName || "ゲスト"}</span>
        <button 
          onClick={() => signOut(auth)}
          className="text-[10px] bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-400 hover:text-red-500 transition-colors"
        >
          ログアウト
        </button>
      </div>

      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-xl font-black text-center mb-8 tracking-tighter text-blue-600 uppercase">
          FE Quick Quiz
        </h1>
        
        {/* 問題文エリア */}
        <div className="bg-blue-50 rounded-2xl p-6 min-h-[140px] flex items-center justify-center mb-8 border border-blue-100 relative overflow-hidden">
          <p className="text-lg font-bold leading-relaxed z-10 text-blue-900 text-center">
            {question.text}
          </p>
          {status === "pushed" && (
            <div 
              className="absolute bottom-0 left-0 h-2 bg-red-400 transition-all duration-1000 ease-linear" 
              style={{ width: `${(timeLeft / 5) * 100}%` }}
            />
          )}
        </div>

        {/* 1. 待機状態 (PUSHボタン) */}
        {status === "watching" && (
          <div className="flex flex-col items-center">
            <button 
              onClick={handlePush}
              className="w-44 h-44 bg-red-500 hover:bg-red-400 active:scale-95 transition-all rounded-full shadow-lg shadow-red-200 border-8 border-red-100 flex items-center justify-center group"
            >
              <span className="text-3xl font-black text-white tracking-widest">PUSH!</span>
            </button>
            <p className="mt-8 text-slate-400 text-sm font-bold animate-pulse">問題がわかったらボタンをタップ！</p>
          </div>
        )}

        {/* 2. 回答選択状態 */}
        {status === "pushed" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4 px-1">
              <h3 className="text-blue-700 font-bold text-sm">回答を選択してください</h3>
              <span className={`text-xl font-black ${timeLeft <= 2 ? "text-red-500 animate-pulse" : "text-blue-600"}`}>
                0:0{timeLeft}
              </span>
            </div>
            {question.options.map((option, index) => (
              <button 
                key={index} 
                onClick={() => handleAnswer(index)} 
                className="w-full py-4 px-6 bg-white hover:bg-blue-50 text-slate-700 text-left rounded-xl font-bold transition-all border border-slate-200 hover:border-blue-300 shadow-sm flex items-center"
              >
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-4 text-sm font-black">
                  {index + 1}
                </span>
                {option}
              </button>
            ))}
          </div>
        )}

        {/* 3. 結果表示状態 */}
        {status === "result" && (
          <div className="text-center pt-2">
            <div className={`text-5xl mb-6 font-black tracking-tighter ${selectedAnswer === question.answerIndex ? "text-green-500" : "text-red-500"}`}>
              {selectedAnswer === question.answerIndex ? "CORRECT" : selectedAnswer === -1 ? "TIME UP" : "WRONG"}
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 text-left">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2"> Correct Answer </p>
              <p className="text-lg font-bold text-slate-800 border-l-4 border-blue-500 pl-4 py-1">
                {question.options[question.answerIndex]}
              </p>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              NEXT QUESTION
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;