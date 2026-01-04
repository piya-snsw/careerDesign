import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, deleteField, increment } from 'firebase/firestore';
import { db } from '../firebase';

// --- 部屋に参加 ---
// uid だけでなく user オブジェクトを受け取るように変更
export async function joinRoom(roomId, user) {
  const { uid, displayName } = user;
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);

  const name = displayName || `名無しの動物_${uid.slice(0, 4)}`;
  let room = snap.exists() ? snap.data() : null;

  if (!room) {
    await setDoc(ref, {
      hostId: uid,
      status: 'waiting',
      createdAt: serverTimestamp(),
      revivedAt: serverTimestamp(),
      members: {
        [uid]: { 
          score: 0, // pointsではなくscoreに統一
          isBot: false,
          name: name
        }
      },
      quiz: { questions: [], currentIndex: 0 },
      buzzer: { uid: null, limitAt: null },
      answeredUsers: []
    });
    return;
  }

  const memberCount = Object.keys(room.members || {}).length;
  if (memberCount >= 4) throw new Error('Room is full');
  if (room.status !== 'waiting') throw new Error('Game already started');

  await updateDoc(ref, {
    [`members.${uid}`]: { 
      score: 0, 
      isBot: false,
      name: name
    }
  });
}

// --- 部屋から退出 (修正なし) ---
export const leaveRoom = async (roomId, userId) => {
  const roomRef = doc(db, 'rooms', roomId);
  
  try {
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;

    const roomData = snap.data();
    const members = { ...(roomData.members || {}) };

    // 1. 自分をメンバーから削除
    delete members[userId];

    // 2. 「人間」が残っているか確認
    const remainingHumans = Object.values(members).filter(m => !m.isBot);

    if (remainingHumans.length === 0) {
      // 人間が一人もいなくなった場合
      console.log("人間がいなくなったため、ルームを完全リセットします。");
      await updateDoc(roomRef, {
        members: {},        // ボットも削除
        activeCount: 0,     // ★ここを追加：カウントを0にする
        hostId: null,       // ★ここを追加：ホストを不在にする
        status: 'waiting',
        "quiz.currentIndex": 0,
        answeredUsers: [],
        buzzer: null,
        updatedAt: serverTimestamp()
      });
    } else {
      // まだ人間が残っている場合
      const isHost = roomData.hostId === userId;
      const nextHostId = isHost ? remainingHumans[0].uid : roomData.hostId;

      await updateDoc(roomRef, {
        members: members,
        activeCount: remainingHumans.length, // ★ここを追加：残った人間の数を反映
        hostId: nextHostId,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("退出処理に失敗:", error);
  }
};

// --- 早押しボタン (修正なし) ---
export async function pressButton(roomId, uid) {
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data();
  if (room.buzzer.uid !== null) return;

  const answeredUsers = room.answeredUsers || [];
  if (answeredUsers.includes(uid)) return;

  console.log('🔔 Buzzer pressed:', uid);
  await updateDoc(ref, {
    'buzzer.uid': uid,
    'buzzer.limitAt': new Date(Date.now() + 5000)
  });
}

// --- 回答送信 (修正なし) ---
// --- 回答送信 (スコア加算のロジック) ---
export async function submitAnswer(roomId, uid, answerText, isCorrectManual = null) {
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data();
  const currentQ = room.quiz.questions[room.quiz.currentIndex];
  const correct = isCorrectManual !== null ? isCorrectManual : (answerText === currentQ.answer);

  if (correct) {
    // 正解：スコアを +10 し、回答画面へ
    await updateDoc(ref, {
      'status': 'answer',
      'buzzer.uid': null,
      'buzzer.limitAt': null,
      'lastAnswer': {
        uid: uid,
        text: answerText,
        isCorrect: true
      },
      // 1ではなく10ポイント加算にするとランキングが動きやすくて楽しいです
      [`members.${uid}.score`]: increment(10) 
    });
  } else {
    // 不正解：回答権を失わせ、他の人が押せるように戻す（または全員終了なら回答画面へ）
    const newAnsweredUsers = [...(room.answeredUsers || []), uid];
    const totalMembers = Object.keys(room.members || {}).length;
    
    if (newAnsweredUsers.length >= totalMembers) {
      await updateDoc(ref, {
        'status': 'answer',
        'buzzer.uid': null,
        'buzzer.limitAt': null,
        'answeredUsers': newAnsweredUsers,
        'lastAnswer': { uid: uid, text: answerText, isCorrect: false }
      });
    } else {
      await updateDoc(ref, {
        'status': 'playing', 
        'buzzer.uid': null,
        'buzzer.limitAt': null,
        'answeredUsers': newAnsweredUsers,
        'lastAnswer': null
      });
    }
  }
}