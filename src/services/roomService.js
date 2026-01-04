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
    console.log(`🏃‍♂️ Leaving room: ${roomId}`);
    
    // 1. まず自分を削除
    await updateDoc(roomRef, {
      [`members.${userId}`]: deleteField(),
      updatedAt: serverTimestamp()
    });

    // 2. 最新の全データを取得して判定
    const snap = await getDoc(roomRef);
    if (!snap.exists()) return;
    const data = snap.data();
    
    const members = data.members || {};
    const memberEntries = Object.entries(members);
    const humanMembers = memberEntries.filter(([uid, m]) => !m.isBot && uid !== userId);

    // ★ ここが重要：人間が0人なら、部屋を完全に初期化する
    if (humanMembers.length === 0) {
      console.log("🧹 Room is empty. Resetting to waiting status...");
      await updateDoc(roomRef, {
        status: 'waiting', // 待機状態に戻す
        members: {},       // メンバーを空に
        activeCount: 0,
        hostId: null,
        buzzer: { uid: null, limitAt: null },
        answeredUsers: [],
        finalResults: null, // スコア結果を消去
        quiz: { questions: [], currentIndex: 0 },
        updatedAt: serverTimestamp()
      });
    } else {
      // まだ人間がいるなら、ホスト権限のチェックだけ行う
      if (data.hostId === userId) {
        await updateDoc(roomRef, {
          hostId: humanMembers[0][0],
          activeCount: humanMembers.length
        });
      } else {
        await updateDoc(roomRef, {
          activeCount: humanMembers.length
        });
      }
    }
  } catch (error) {
    console.error("❌ Leave error:", error);
    throw error;
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