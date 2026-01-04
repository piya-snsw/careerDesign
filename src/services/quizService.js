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

export const addBots = async (roomId, count) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);
  if (!roomSnap.exists()) return;

  const room = roomSnap.data();
  const members = { ...room.members };

  const botNames = ['メタル', 'アイアン', 'チップ', 'データ'];
  
  for (let i = 0; i < count; i++) {
    const botId = `bot_${Math.random().toString(36).substr(2, 9)}`;
    members[botId] = {
      uid: botId,
      name: botNames[i % botNames.length] + (members.length > 4 ? i : ''),
      isBot: true,
      score: 0
    };
  }

  await updateDoc(roomRef, {
    members: members,
    activeCount: Object.keys(members).length
  });
};

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

// quizService.js の一部 (ステータスを score に変える関数を想定)
export const finishGame = async (roomId, currentMembers) => {
  const roomRef = doc(db, 'rooms', roomId);
  
  // 1. 全員の順位を配列として確定させる（表示用）
  const finalResults = Object.entries(currentMembers)
    .map(([uid, data]) => ({ uid, ...data }))
    .sort((a, b) => b.score - a.score);

  // 2. メンバーからボットだけを削除した新しいオブジェクトを作成
  const onlyHumans = {};
  Object.entries(currentMembers).forEach(([uid, data]) => {
    if (!data.isBot) {
      onlyHumans[uid] = data;
    }
  });

  // 3. 更新実行
  await updateDoc(roomRef, {
    status: 'score',
    finalResults: finalResults, // ★ ボット込みの全記録をここに保存
    members: onlyHumans,        // ★ 裏側のmembersからはボットを消去
    activeCount: Object.keys(onlyHumans).length,
    updatedAt: serverTimestamp()
  });
};

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