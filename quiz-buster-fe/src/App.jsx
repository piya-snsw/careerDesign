import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import QuizApp from "./QuizApp";

import {
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  onSnapshot,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import { MANAGEMENT_QUESTIONS } from "./questions/questions_management";
import { STRATEGY_QUESTIONS } from "./questions/questions_strategy";
import { TECHNOLOGY_QUESTIONS } from "./questions/questions_technology";

const QUESTIONS = [
  ...MANAGEMENT_QUESTIONS,
  ...STRATEGY_QUESTIONS,
  ...TECHNOLOGY_QUESTIONS,
];

function App() {
  const [user, setUser] = useState(null);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomRole, setRoomRole] = useState(null);
  const [playerNames, setPlayerNames] = useState({});
  const [unsubscribeRoom, setUnsubscribeRoom] = useState(null);
  const [isRandomMatch, setIsRandomMatch] = useState(false);
  const [showPrivateMatchMenu, setShowPrivateMatchMenu] = useState(false);
  const [joinedViaJoin, setJoinedViaJoin] = useState(false);
  const [remainingSec, setRemainingSec] = useState(null);
  const [leavingSilently, setLeavingSilently] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("management");
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(10);

  // --------------------
  // Auth
  // --------------------
  const loginAnonymously = async () => {
    await signInAnonymously(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    cleanupRoom();
    await signOut(auth);
    setUser(null);
  };

  // --------------------
  // Utils
  // --------------------
  const cleanupRoom = () => {
    if (unsubscribeRoom) unsubscribeRoom();
    setUnsubscribeRoom(null);
    setCurrentRoom(null);
    setRoomRole(null);
    setPlayerNames({});
    setRoomIdInput("");
    setIsRandomMatch(false);
    setShowPrivateMatchMenu(false);
    setJoinedViaJoin(false);
  };

  // --------------------
  // User save
  // --------------------
  const saveUser = async (u) => {
    await setDoc(
      doc(db, "users", u.uid),
      {
        uid: u.uid,
        displayName: u.displayName ?? "匿名ユーザー",
        isAnonymous: u.isAnonymous,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      setUser(u);
      await saveUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentRoom?.waitingEndAt) {
      setRemainingSec(null);
      return;
    }

    const update = () => {
      const now = Date.now();
      const end = currentRoom.waitingEndAt.toDate().getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemainingSec(diff);
    };

    update(); // 初回即計算

    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [currentRoom?.waitingEndAt]);

  useEffect(() => {
    if (!currentRoom) return;
    if (currentRoom.status !== "waiting") return;

    const shouldStart =
      (remainingSec !== null && remainingSec <= 0) ||
      currentRoom.players.length >= 4;

    if (!shouldStart) return;

    const startWithBots = async () => {
      if (!currentRoom) return;

      const ref = doc(db, "rooms", currentRoom.id);

      const players = [...currentRoom.players];
      const bots = ["Bot1", "Bot2", "Bot3"];
      const scores = { ...(currentRoom.scores ?? {}) };

      for (const bot of bots) {
        if (players.length >= 4) break;
        if (!players.includes(bot)) {
          players.push(bot);
          scores[bot] = 0;
        }
      }

      const genres = ["management", "strategy", "technology"];
      const selectedGenre = genres[Math.floor(Math.random() * genres.length)];

      const poolMap = {
        management: MANAGEMENT_QUESTIONS,
        strategy: STRATEGY_QUESTIONS,
        technology: TECHNOLOGY_QUESTIONS,
      };
      const pool = poolMap[selectedGenre];
      const questionIds = [...Array(pool.length).keys()]
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

      await updateDoc(ref, {
        status: "playing",
        players,
        scores,
        questionSource: selectedGenre,
        questionCount: 10,
        questionIds,
        questionIndex: 0,
        questionStartedAt: Timestamp.now(),
        buzzedBy: null,
        buzzedAt: null,
        answeredBy: null,
        answerResult: null,
      });
    };

    startWithBots();
  }, [remainingSec, currentRoom]);

  // --------------------
  // Room watch
  // --------------------
  const watchRoom = (roomId) => {
    const ref = doc(db, "rooms", roomId);

    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) {
        cleanupRoom();
        if (!leavingSilently) {
          alert("ルームが解散されました");
        }
        return;
      }

      const data = snap.data();
      setCurrentRoom({ id: snap.id, ...data });

      if (!data.players.includes(user.uid)) {
        cleanupRoom();
        return;
      }

      const names = {};
      for (const uid of data.players) {
        if (uid.startsWith("Bot")) {
          names[uid] = uid;
          continue;
        }
        const us = await getDoc(doc(db, "users", uid));
        names[uid] = us.exists() ? us.data().displayName : "不明";
      }
      setPlayerNames(names);
    });

    setUnsubscribeRoom(() => unsub);
  };

  // --------------------
  // Room actions
  // --------------------
  const createRoom = async (status = "waiting", isRandom = false) => {
    const waitingEndAt = isRandom
      ? Timestamp.fromDate(new Date(Date.now() + 10 * 1000))
      : null;

    const ref = await addDoc(collection(db, "rooms"), {
      hostUid: user.uid,
      players: [user.uid],
      scores: {
        [user.uid]: 0,
      },
      status,
      createdAt: serverTimestamp(),
      waitingEndAt,
      isRandom,
      questionIndex: 0,
      questionStartedAt: null,
      answerStartedAt: null,
      buzzedBy: null,
      buzzedAt: null,
      answeredBy: null,
      answerResult: null,
      answeredChoice: null,
    });

    // 即座に待機画面へ反映
    setCurrentRoom({
      id: ref.id,
      hostUid: user.uid,
      players: [user.uid],
      status,
      waitingEndAt,
      isRandom,
    });
    setRoomRole("host");
    setIsRandomMatch(isRandom);
    setShowPrivateMatchMenu(false);

    watchRoom(ref.id);
  };

  const joinRoom = async () => {
    if (!roomIdInput) return alert("roomIdを入力してください");

    const ref = doc(db, "rooms", roomIdInput);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      alert("そのルームは存在しません");
      return;
    }

    const roomData = snap.data();
    await updateDoc(ref, { players: arrayUnion(user.uid) });

    // 即座に待機画面へ反映
    setCurrentRoom({
      id: snap.id,
      ...roomData,
      players: [...(roomData.players || []), user.uid],
    });
    setRoomRole("guest");
    setShowPrivateMatchMenu(false);

    watchRoom(snap.id);
  };

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

    // ランダムマッチ & 自分1人 → ルーム削除
    if (currentRoom.isRandom && currentRoom.players.length === 1) {
      await deleteDoc(doc(db, "rooms", currentRoom.id));
      cleanupRoom();
      return;
    }

    // それ以外（通常退出）
    await updateDoc(doc(db, "rooms", currentRoom.id), {
      players: arrayRemove(user.uid),
    });

    cleanupRoom();
  };

  const leaveRoomSilently = async () => {
    if (!user || !currentRoom) return;

    setLeavingSilently(true);

    // ランダム & 自分1人 → 部屋ごと削除
    if (currentRoom.isRandom && currentRoom.players.length === 1) {
      await deleteDoc(doc(db, "rooms", currentRoom.id));
    } else {
      // それ以外は players から抜けるだけ
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        players: arrayRemove(user.uid),
      });
    }

    cleanupRoom();
    setLeavingSilently(false);
  };

  const disbandRoom = async () => {
    if (!window.confirm("本当にルームを解散しますか？")) return;
    if (unsubscribeRoom) unsubscribeRoom();
    const roomIdToDelete = currentRoom?.id;
    cleanupRoom();
    if (roomIdToDelete) {
      await deleteDoc(doc(db, "rooms", roomIdToDelete));
    }
  };

  const startGame = async (roomId, genre, questionCount) => {
    const ref = doc(db, "rooms", roomId);

    let pool;
    if (genre === "management") pool = MANAGEMENT_QUESTIONS;
    if (genre === "strategy") pool = STRATEGY_QUESTIONS;
    if (genre === "technology") pool = TECHNOLOGY_QUESTIONS;

    const questionIds = [...Array(pool.length).keys()]
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount);

    await updateDoc(ref, {
      status: "playing",
      questionSource: genre,
      questionCount,
      questionIds,
      questionIndex: 0,
      questionStartedAt: Timestamp.now(),
      buzzedBy: null,
      buzzedAt: null,
      answeredBy: null,
      answerResult: null,
    });
  };

  const copyRoomId = async () => {
    if (!currentRoom) return;
    await navigator.clipboard.writeText(currentRoom.id);
    alert("roomIdをコピーしました");
  };

  // --------------------
  // ランダムマッチ
  // --------------------
  const joinRandomMatch = async () => {
    const q = query(
      collection(db, "rooms"),
      where("status", "==", "waiting"),
      where("isRandom", "==", true)
    );
    const snap = await getDocs(q);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.players.length < 4) {
        await updateDoc(doc(db, "rooms", docSnap.id), {
          players: arrayUnion(user.uid),
          waitingEndAt: Timestamp.fromDate(new Date(Date.now() + 10 * 1000)),
        });
        setRoomRole("guest");
        setIsRandomMatch(true);
        setCurrentRoom({ id: docSnap.id, ...data, players: [...data.players, user.uid] });
        setJoinedViaJoin(false);
        watchRoom(docSnap.id);
        return;
      }
    }

    await createRoom("waiting", true);
  };

  // --------------------
  // UI
  // --------------------
  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1>ログイン画面</h1>
        <button onClick={loginAnonymously}>匿名ログイン</button>
        <br /><br />
        <button onClick={loginWithGoogle}>Googleログイン</button>
      </div>
    );
  }

  if (showPrivateMatchMenu) {
    return (
      <div style={{ padding: 20 }}>
        <h1>プライベートマッチ</h1>
        <p>ログイン中：{user.isAnonymous ? "匿名ユーザー" : user.displayName}</p>
        <button onClick={() => createRoom()}>ルーム作成</button>
        <br /><br />
        <input
          placeholder="roomIdを入力"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
        />
        <button onClick={joinRoom}>ルーム参加</button>
        <br /><br />
        <button onClick={() => setShowPrivateMatchMenu(false)}>メインメニューへ戻る</button>
      </div>
    );
  }

  if (!currentRoom) {
    return (
      <div style={{ padding: 20 }}>
        <h1>メインメニュー</h1>
        <p>ログイン中：{user.isAnonymous ? "匿名ユーザー" : user.displayName}</p>
        <button onClick={logout}>ログアウト</button>
        <br /><br />
        <button onClick={joinRandomMatch}>ランダムマッチ</button>
        <br /><br />
        <button onClick={() => setShowPrivateMatchMenu(true)}>プライベートマッチ</button>
      </div>
    );
  }

  // 待機画面
  if (currentRoom && currentRoom.status === "waiting") {
    const isHost = roomRole === "host";

    const isSoloRandom =
      currentRoom.isRandom && currentRoom.players.length === 1;

    return (
      <div style={{ padding: 20 }}>
        <h1>ルーム待機中</h1>
        
        {currentRoom.isRandom && remainingSec !== null && (
          <h2 style={{ color: remainingSec <= 10 ? "red" : "black" }}>
            マッチ開始まで {remainingSec} 秒
          </h2>
        )}

        {!currentRoom.isRandom && (
          <p>
            roomId: {currentRoom.id} <button onClick={copyRoomId}>コピー</button>
          </p>
        )}

        <h3>参加者（{currentRoom.players.length}人）</h3>
        <ul>
          {currentRoom.players.map((uid) => (
            <li key={uid}>{playerNames[uid]}</li>
          ))}
        </ul>

        {/* ルーム参加からの遷移のみ「メインメニューへ戻る」 */}
        {!currentRoom.isRandom && !isHost && (
          <button onClick={leaveRoomSilently}>
            メインメニューへ戻る
          </button>
        )}

        {/* ランダムマッチで自分1人のときだけ戻れる */}
        {isSoloRandom && (
          <button onClick={leaveRoomSilently}>
            メインメニューへ戻る
          </button>
        )}

        {isHost && !currentRoom.isRandom && (
          <>
            {/* ★ ジャンル選択 */}
            <div>
              <label>ジャンル：</label>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                <option value="management">マネジメント</option>
                <option value="strategy">ストラテジ</option>
                <option value="technology">テクノロジ</option>
              </select>
            </div>

            <br />

            {/* ★ 問題数選択 */}
            <div>
              <label>問題数：</label>
              <select
                value={selectedQuestionCount}
                onChange={(e) => setSelectedQuestionCount(Number(e.target.value))}
              >
                <option value={10}>10問</option>
                <option value={50}>50問</option>
              </select>
            </div>

            <br /><br />

            <button
              onClick={() =>
                startGame(
                  currentRoom.id,
                  selectedGenre,
                  selectedQuestionCount
                )
              }
            >
              ゲーム開始
            </button>

            <br /><br />
            <button onClick={disbandRoom}>ルーム解散</button>
          </>
        )}
      </div>
    );
  }

  // ゲーム中
  if (currentRoom && currentRoom.status === "playing") {
    return <QuizApp questions={QUESTIONS} room={currentRoom} user={user} playerNames={playerNames} />;
  }

  return null;
}

export default App;
