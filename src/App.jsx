import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [question, setQuestion] = useState(null);
  const [status, setStatus] = useState("watching");
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    const fetchQuestion = async () => {
      const docRef = doc(db, "questions", "q1");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setQuestion(docSnap.data());
      }
    };
    fetchQuestion();
  }, []);

  useEffect(() => {
    if (status !== "pushed") return;
    if (timeLeft === 0) {
      handleAnswer(-1);
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [status, timeLeft]);

  const handlePush = () => {
    setStatus("pushed");
    setTimeLeft(5);
  };

  const handleAnswer = (index) => {
    setSelectedAnswer(index);
    setStatus("result");
  };

  if (!question) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
        <h1 className="text-xl font-bold text-center mb-8 tracking-tighter text-blue-600">
          基本情報技術者試験 早押し
        </h1>
        
        {/* 問題文エリア：白背景に青の枠線 */}
        <div className="bg-blue-50 rounded-2xl p-6 min-h-[120px] flex items-center justify-center mb-8 border border-blue-100 relative overflow-hidden">
          <p className="text-lg font-bold leading-relaxed z-10 text-blue-900">{question.text}</p>
          {status === "pushed" && (
            <div 
              className="absolute bottom-0 left-0 h-1.5 bg-red-400 transition-all duration-1000" 
              style={{ width: `${(timeLeft / 5) * 100}%` }}
            />
          )}
        </div>

        {status === "watching" && (
          <div className="flex flex-col items-center">
            <button 
              onClick={handlePush}
              className="w-44 h-44 bg-red-500 hover:bg-red-400 active:scale-95 transition-all rounded-full shadow-lg shadow-red-200 border-8 border-red-100 flex items-center justify-center group"
            >
              <span className="text-3xl font-black text-white">PUSH!</span>
            </button>
            <p className="mt-8 text-slate-400 text-sm font-medium">問題がわかったらボタンをタップ</p>
          </div>
        )}

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
                className="w-full py-4 px-6 bg-white hover:bg-blue-50 text-slate-700 text-left rounded-xl font-bold transition-all border border-slate-200 hover:border-blue-300 shadow-sm"
              >
                <span className="inline-block w-6 text-blue-500">{index + 1}.</span> {option}
              </button>
            ))}
          </div>
        )}

        {status === "result" && (
          <div className="text-center pt-2">
            <div className={`text-5xl mb-6 font-black ${selectedAnswer === question.answerIndex ? "text-green-500" : "text-red-500"}`}>
              {selectedAnswer === question.answerIndex ? "CORRECT" : selectedAnswer === -1 ? "TIME UP" : "WRONG"}
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-5 mb-8 border border-slate-100 text-left">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2"> 正解の回答</p>
              <p className="text-lg font-bold text-slate-800 underline decoration-blue-200 decoration-4 underline-offset-4">
                {question.options[question.answerIndex]}
              </p>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-md transition-all active:scale-95"
            >
              次 の 問 題 へ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;