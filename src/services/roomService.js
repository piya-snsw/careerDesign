import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp, deleteField, increment } from 'firebase/firestore';
import { db } from '../firebase';

// --- 部屋に参加 ---
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
          score: 0,
          isBot: false,
          name: name,
          uid: uid
        }
      },
      activeCount: 1,
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
      name: name,
      uid: uid
    },
    activeCount: memberCount + 1
  });
}

// --- 部屋から退室 (最強版) ---
export const leaveRoom = async (roomId, userId) => {
  if (!roomId || !userId) return;
  const roomRef = doc(db, 'rooms', roomId);
  
  try {
    // 1. まず自分を消す（これだけに集中する）
    await updateDoc(roomRef, {
      [`members.${userId}`]: deleteField(),
      updatedAt: serverTimestamp()
    });
    
    // 2. 確実に反映させるために最新の状態を取得
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const data = snap.data();
    
    // 3. 自分を除いた残りの人間を判定
    const members = data.members || {};
    const humanMembers = Object.entries(members).filter(([uid, m]) => !m.isBot && uid !== userId);

    if (humanMembers.length === 0) {
      // 人間が一人もいなくなったら完全初期化
      await updateDoc(roomRef, {
        members: {},
        activeCount: 0,
        hostId: null,
        status: 'waiting',
        quiz: { questions: [], currentIndex: 0 },
        buzzer: { uid: null, limitAt: null },
        answeredUsers: []
      });
    } else if (data.hostId === userId) {
      // 自分がホストだった場合は移譲
      await updateDoc(roomRef, {
        hostId: humanMembers[0][0],
        activeCount: humanMembers.length
      });
    } else {
      // それ以外は人数だけ更新
      await updateDoc(roomRef, {
        activeCount: humanMembers.length
      });
    }
  } catch (error) {
    console.error("Leave error:", error);
    throw error; // App.jsx 側でキャッチさせるために throw する
  }
};

// --- 早押しボタン ---
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

// --- 回答送信 ---
export async function submitAnswer(roomId, uid, answerText, isCorrectManual = null) {
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const room = snap.data();
  const currentQ = room.quiz.questions[room.quiz.currentIndex];
  const correct = isCorrectManual !== null ? isCorrectManual : (answerText === currentQ.answer);

  if (correct) {
    await updateDoc(ref, {
      'status': 'answer',
      'buzzer.uid': null,
      'buzzer.limitAt': null,
      'lastAnswer': {
        uid: uid,
        text: answerText,
        isCorrect: true
      },
      [`members.${uid}.score`]: increment(10)
    });
  } else {
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