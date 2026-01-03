import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getRandomQuestions } from '../data/questions';

export async function startCountdown(roomId) {
  console.log('🎬 Starting countdown for room:', roomId);
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    console.error('❌ Room does not exist');
    return;
  }
  
  const room = snap.data();
  const playerCount = Object.keys(room.members || {}).length;
  
  if (playerCount < 1) {
    console.error('❌ Need at least 1 player');
    throw new Error('Need at least 1 player to start');
  }

  await updateDoc(ref, {
    status: 'countdown',
    'countdown.startAt': serverTimestamp(),
    'countdown.type': 'wait'
  });
}

export async function startQuiz(roomId) {
  const ref = doc(db, 'rooms', roomId);
  const questions = getRandomQuestions(10); 

  if (!questions || questions.length === 0) {
    console.error("❌ 問題データが空です");
    return;
  }

  await updateDoc(ref, {
    status: 'playing',
    'quiz.questions': questions,
    'quiz.currentIndex': 0,
    'quiz.startTime': serverTimestamp(),
    'buzzer.uid': null,
    'answeredUsers': [], 
    'countdown': null,
    'lastAnswer': null // 前回の回答をクリア
  });
}

export async function addBots(roomId, count) {
  const ref = doc(db, 'rooms', roomId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const newMembers = { ...(data.members || {}) };

  // 既存のボット数をカウントして、番号が重ならないようにする工夫
  const existingBotCount = Object.values(newMembers).filter(m => m.isBot).length;

  for (let i = 0; i < count; i++) {
    const botId = `bot_${Math.random().toString(36).slice(2, 7)}`;
    newMembers[botId] = { 
      score: 0, 
      isBot: true,
      name: `Bot ${existingBotCount + i + 1}` // ★ 動物名は使わず "Bot X" 形式
    };
  }

  await updateDoc(ref, { members: newMembers });
  console.log('✅ Bots added successfully');
}

// ★ 追加: 次の問題へ進む、またはリザルトへ
export async function nextQuestion(roomId, room) {
  console.log('⏭ Moving to next question');
  const ref = doc(db, 'rooms', roomId);
  const nextIndex = (room.quiz?.currentIndex || 0) + 1;
  const totalQuestions = room.quiz?.questions?.length || 10;

  if (nextIndex >= totalQuestions) {
    // 全問終了 -> スコア画面へ
    await updateDoc(ref, {
      status: 'score',
      'buzzer.uid': null,
      'lastAnswer': null
    });
  } else {
    // 次の問題へ
    await updateDoc(ref, {
      status: 'playing',
      'quiz.currentIndex': nextIndex,
      'answeredUsers': [], // 不正解リストをリセット
      'buzzer.uid': null,
      'lastAnswer': null   // 表示した回答結果をクリア
    });
  }
}

export async function resetRoom(roomId) {
  const ref = doc(db, 'rooms', roomId);
  await updateDoc(ref, {
    status: 'waiting',
    'quiz.questions': [],
    'quiz.currentIndex': 0,
    'buzzer.uid': null,
    'buzzer.limitAt': null,
    'answeredUsers': [],
    'countdown': null,
    'lastAnswer': null
  });
  console.log('✅ Room reset');
}