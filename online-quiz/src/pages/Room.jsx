import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import {
  doc, collection, onSnapshot, updateDoc, query, orderBy, getDocs, arrayUnion
} from "firebase/firestore";

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const playerName = searchParams.get("name") || "ゲスト";
  const isSpectator = searchParams.get("spectator") === "true";

  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timer, setTimer] = useState(5);
  const [buzzedPlayer, setBuzzedPlayer] = useState(null);
  const [answer, setAnswer] = useState("");
  const [streaks, setStreaks] = useState({}); // 連続正解管理

  // Firestoreで部屋情報をリアルタイム監視
  useEffect(() => {
    const roomRef = doc(db, "rooms", roomId);
    const unsubscribe = onSnapshot(roomRef, snap => {
      const data = snap.data();
      if (!data) return;
      setPlayers(data.players || []);
      setBuzzedPlayer(data.buzzedPlayer || null);
      setCurrentQIndex(data.currentQuestion ?? 0);
    });
  }, [roomId]);

  // 問題取得
  useEffect(() => {
    const qCol = collection(db, "rooms", roomId, "questions");
    const qQuery = query(qCol, orderBy("text"));
    getDocs(qQuery).then(snap => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [roomId]);

  // タイマー
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const buzz = async () => {
    if (buzzedPlayer || isSpectator) return;
    setBuzzedPlayer(playerName);
    await updateDoc(doc(db, "rooms", roomId), { buzzedPlayer: playerName });
  };

  const submitAnswer = async () => {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    const isCorrect = answer.trim().toLowerCase() === currentQ.answer.toLowerCase();
    const prevStreak = streaks[playerName] || 0;
    const newStreak = isCorrect ? prevStreak + 1 : 0;
    const scoreChange = isCorrect ? 10 * newStreak : -5; // ボーナス＆ペナルティ

    const newPlayers = players.map(p =>
      p.name === playerName ? { ...p, score: (p.score || 0) + scoreChange } : p
    );

    setStreaks(prev => ({ ...prev, [playerName]: newStreak }));

    await updateDoc(doc(db, "rooms", roomId), {
      players: newPlayers,
      buzzedPlayer: null,
      currentQuestion: currentQIndex + 1
    });

    setPlayers(newPlayers);
    setBuzzedPlayer(null);
    setAnswer("");
    setTimer(5);
    setCurrentQIndex(idx => idx + 1);
  };

  const currentQuestion = questions[currentQIndex];

  return (
    <div>
      <h1>部屋: {roomId}</h1>

      <div style={{ border: "1px solid #000", padding: "10px", marginBottom: "20px" }}>
        <h2>問題</h2>
        {currentQuestion ? currentQuestion.text : "すべての問題が終了しました"}
        <div>タイマー: {timer}s</div>
      </div>

      <h2>プレイヤー</h2>
      <ul>
        {players.map(p => (
          <li key={p.name}>
            {p.name} - スコア: {p.score || 0} - 連続正解: {streaks[p.name] || 0}
            {!buzzedPlayer && !isSpectator && p.name === playerName && (
              <button onClick={buzz}>早押し</button>
            )}
          </li>
        ))}
      </ul>

      {buzzedPlayer === playerName && (
        <div>
          <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="答え"/>
          <button onClick={submitAnswer}>回答送信</button>
        </div>
      )}

      <h2>ランキング</h2>
      <ul>
        {[...players].sort((a,b) => (b.score || 0) - (a.score || 0)).map(p => (
          <li key={p.name}>{p.name}: {p.score || 0}</li>
        ))}
      </ul>
    </div>
  );
}
