import { useEffect, useState } from "react";
import { auth, db } from "./firebase";

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
  getDocs,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomRole, setRoomRole] = useState(null); // "host" | "guest"
  const [playerNames, setPlayerNames] = useState({});
  const [unsubscribeRoom, setUnsubscribeRoom] = useState(null);
  const [forceHome, setForceHome] = useState(false);

  // --------------------
  // Auth
  // --------------------
  const loginAnonymously = async () => {
    await signInAnonymously(auth);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
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
    setForceHome(false);
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

  // --------------------
  // F5更新後もルーム復元
  // --------------------
  useEffect(() => {
    if (!user) return;

    const restoreRoom = async () => {
      const roomsRef = collection(db, "rooms");
      const q = await getDocs(roomsRef);
      for (const docSnap of q.docs) {
        const data = docSnap.data();
        if (data.players.includes(user.uid)) {
          setRoomRole(data.hostUid === user.uid ? "host" : "guest");
          watchRoom(docSnap.id);
          break;
        }
      }
    };

    restoreRoom();
  }, [user]);

  // --------------------
  // Room watch
  // --------------------
  const watchRoom = (roomId) => {
    const ref = doc(db, "rooms", roomId);

    const unsub = onSnapshot(ref, async (snap) => {
      if (forceHome) return;

      if (!snap.exists()) {
        cleanupRoom();
        alert("ルームが解散されました");
        return;
      }

      const data = snap.data();
      setCurrentRoom({ id: snap.id, ...data });

      // --------------------
      // 自分が抜けていたら強制メインメニューに戻す
      if (!data.players.includes(user.uid)) {
        cleanupRoom();
        return;
      }

      const names = {};
      for (const uid of data.players) {
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
  const createRoom = async () => {
    const ref = await addDoc(collection(db, "rooms"), {
      hostUid: user.uid,
      players: [user.uid],
      status: "waiting",
      createdAt: serverTimestamp(),
    });

    setRoomRole("host");
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

    await updateDoc(ref, {
      players: arrayUnion(user.uid),
    });

    setRoomRole("guest");
    watchRoom(roomIdInput);
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

  const leaveRoom = async () => {
    if (!user || !currentRoom) return;

    await updateDoc(doc(db, "rooms", currentRoom.id), {
      players: arrayRemove(user.uid),
    });

    cleanupRoom();
  };

  const startGame = async () => {
    if (!currentRoom) return;
    await updateDoc(doc(db, "rooms", currentRoom.id), {
      status: "playing",
    });
  };

  const copyRoomId = async () => {
    if (!currentRoom) return;
    await navigator.clipboard.writeText(currentRoom.id);
    alert("roomIdをコピーしました");
  };

  // --------------------
  // UI
  // --------------------

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h1>メインメニュー</h1>
        <button onClick={loginAnonymously}>匿名ログイン</button>
        <br />
        <br />
        <button onClick={loginWithGoogle}>Googleログイン</button>
      </div>
    );
  }

  if (currentRoom) {
    const isHost = roomRole === "host";

    return (
      <div style={{ padding: 20 }}>
        <h1>ルーム待機中</h1>

        <p>
          roomId: {currentRoom.id}{" "}
          <button onClick={copyRoomId}>コピー</button>
        </p>

        <h3>参加者（{currentRoom.players.length}人）</h3>
        <ul>
          {currentRoom.players.map((uid) => (
            <li key={uid}>{playerNames[uid]}</li>
          ))}
        </ul>

        {isHost && (
          <>
            <button onClick={startGame}>ゲーム開始</button>
            <br />
            <br />
            <button onClick={disbandRoom}>ルーム解散</button>
          </>
        )}

        {!isHost && <button onClick={leaveRoom}>ルーム退出</button>}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>メインメニュー</h1>

      <p>ログイン中：{user.isAnonymous ? "匿名ユーザー" : user.displayName}</p>

      <button onClick={logout}>ログアウト</button>

      <hr />

      <button onClick={createRoom}>ルーム作成</button>
      <br />
      <br />
      <input
        placeholder="roomIdを入力"
        value={roomIdInput}
        onChange={(e) => setRoomIdInput(e.target.value)}
      />
      <button onClick={joinRoom}>ルーム参加</button>
    </div>
  );
}

export default App;
