import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth, googleProvider } from "../firebase";
import { doc, setDoc, collection } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";

export default function Home() {
  const [category, setCategory] = useState("general");
  const [numQuestions, setNumQuestions] = useState(3);
  const [playerName, setPlayerName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [isSpectator, setIsSpectator] = useState(false);
  const navigate = useNavigate();

  // Googleログイン
  const loginGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setPlayerName(result.user.displayName || "ゲスト");
  };

  const createRoom = async () => {
    const roomId = crypto.randomUUID();

    // 部屋作成
    const roomRef = doc(db, "rooms", roomId);
    await setDoc(roomRef, {
      players: [],
      status: "waiting",
      currentQuestion: 0,
      buzzedPlayer: null,
      category,
      numQuestions,
      createdAt: Date.now()
    });

    // サンプル問題生成（ここは本番はFirebaseに分野ごと問題を用意）
    const sampleQuestions = [];
    for (let i = 1; i <= numQuestions; i++) {
      sampleQuestions.push({
        text: `問題${i}（${category}）`,
        answer: "答え" + i,
        category
      });
    }

    for (let q of sampleQuestions) {
      const qRef = doc(collection(db, "rooms", roomId, "questions"));
      await setDoc(qRef, q);
    }

    navigate(`/room/${roomId}?name=${playerName || "ゲスト"}&spectator=${isSpectator}`);
  };

  const joinRoom = () => {
    if (!joinId) return alert("部屋IDを入力してください");
    navigate(`/room/${joinId}?name=${playerName || "ゲスト"}&spectator=${isSpectator}`);
  };

  return (
    <div>
      <h1>オンラインクイズ</h1>
      <div>
        <button onClick={loginGoogle}>Googleログイン</button>
        <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="名前"/>
        <label>
          <input type="checkbox" checked={isSpectator} onChange={e => setIsSpectator(e.target.checked)} />
          観戦モード
        </label>
      </div>

      <div>
        <h2>部屋を作る</h2>
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="general">一般</option>
          <option value="geography">地理</option>
          <option value="science">科学</option>
        </select>
        <input type="number" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))}/>
        <button onClick={createRoom}>部屋作成</button>
      </div>

      <div>
        <h2>部屋に参加</h2>
        <input value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="部屋ID"/>
        <button onClick={joinRoom}>参加</button>
      </div>
    </div>
  );
}
