import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRoom } from "../hooks/useRoom";

const Room = ({ user }) => {
  const { roomData, updateRoom } = useRoom("room1");
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);

  // 1. 問題データの取得
  useEffect(() => {
    if (!roomData?.currentQuestionId) return;

    const fetchQuestion = async () => {
      const snap = await getDoc(doc(db, "questions", roomData.currentQuestionId));
      if (snap.exists()) {
        setQuestion(snap.data());
      }
    };
    fetchQuestion();
  }, [roomData?.currentQuestionId]);

  // 2. 問題が変わるたびに回答状態とタイマーをリセット
  useEffect(() => {
    if (roomData?.status === "watching") {
      setSelectedAnswer(null);
      setTimeLeft(5);
    }
  }, [roomData?.status, roomData?.currentQuestionIndex]);

  // 3. 早押し後のタイマー処理
  useEffect(() => {
    if (roomData?.status !== "pushed") return;
    if (timeLeft === 0) {
      if (roomData.buzzerUser === (user.displayName || "ゲスト")) {
        handleAnswer(-1); // タイムアップは不正解扱い
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [roomData?.status, timeLeft, roomData?.buzzerUser, user]);

  // --- ハンドラー群 ---

  const handlePush = async () => {
    if (roomData.status !== "watching") return;
    await updateRoom({
      status: "pushed",
      buzzerUser: user.displayName || "ゲスト"
    });
  };

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    updateRoom({ status: "result" });
  };

  const handleNextOrFinish = async () => {
    const nextIndex = roomData.currentQuestionIndex + 1;
    const totalQuestions = roomData.questionOrder?.length || 4;

    if (nextIndex < totalQuestions) {
      // 次の問題へ進む
      await updateRoom({
        status: "watching",
        currentQuestionIndex: nextIndex,
        currentQuestionId: roomData.questionOrder[nextIndex],
        buzzerUser: ""
      });
    } else {
      // 🚨 4問終了：ステータスを waiting に戻して全員をロビーへ送る
      await updateRoom({
        status: "waiting",
        currentQuestionIndex: 0,
        questionOrder: [],
        currentQuestionId: "",
        buzzerUser: ""
      });
    }
  };

  if (!question || !roomData) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-400 font-bold italic animate-pulse">
      LOADING QUESTION...
    </div>
  );

  const isMyTurn = roomData.buzzerUser === (user.displayName || "ゲスト");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 border border-slate-100">
        
        {/* ヘッダー：問題番号表示 */}
        <div className="mb-4 flex justify-between items-center px-2">
          <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
            Question {roomData.currentQuestionIndex + 1} / {roomData.questionOrder?.length || 4}
          </span>
          <span className="text-[10px] font-bold text-slate-300 uppercase italic">Quiz Battle Mode</span>
        </div>

        {/* 問題文パネル */}
        <div className="bg-blue-600 rounded-[2rem] p-8 mb-8 text-center shadow-xl relative overflow-hidden min-h-[140px] flex items-center justify-center">
          <p className="text-white text-lg font-bold leading-relaxed">{question.text}</p>
          {roomData.status === "pushed" && (
            <div 
              className="absolute bottom-0 left-0 h-2 bg-red-400 transition-all duration-1000 ease-linear" 
              style={{ width: `${(timeLeft / 5) * 100}%` }} 
            />
          )}
        </div>

        {/* 中央コンテンツエリア */}
        <div className="min-h-[220px] flex flex-col justify-center">
          {/* 1. 待機中（早押し待ち） */}
          {roomData.status === "watching" && (
            <div className="flex flex-col items-center">
              <button 
                onClick={handlePush} 
                className="w-36 h-36 bg-red-500 text-white font-black rounded-full shadow-2xl border-[10px] border-red-50 active:scale-90 transition-all text-2xl hover:bg-red-400 mb-4"
              >
                PUSH!
              </button>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Waiting for buzzer...</p>
            </div>
          )}

          {/* 2. 回答権獲得時（ボタン押し後） */}
          {roomData.status === "pushed" && (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-black border border-red-100">
                  🔔 {roomData.buzzerUser} IS ANSWERING...
                </span>
              </div>
              {isMyTurn ? (
                question.options.map((option, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAnswer(i)} 
                    className="w-full py-4 px-6 border-2 border-slate-100 rounded-2xl font-bold text-left hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98]"
                  >
                    <span className="text-blue-500 mr-3">{i + 1}.</span> {option}
                  </button>
                ))
              ) : (
                <div className="py-10 text-center">
                  <div className="animate-bounce mb-2">🤔</div>
                  <p className="text-slate-400 font-bold text-sm italic">相手の回答を待っています...</p>
                </div>
              )}
            </div>
          )}

          {/* 3. 結果発表（正解/不正解） */}
          {roomData.status === "result" && (
            <div className="text-center animate-in zoom-in duration-300">
              <p className={`text-6xl font-black mb-8 ${selectedAnswer === question.answerIndex ? "text-green-500" : "text-red-500"}`}>
                {selectedAnswer === question.answerIndex ? "正解!" : "不正解"}
              </p>
              <button 
                onClick={handleNextOrFinish} 
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                {roomData.currentQuestionIndex + 1 >= (roomData.questionOrder?.length || 4) 
                  ? "全問終了：ロビーへ戻る" 
                  : "次の問題へ進む"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;