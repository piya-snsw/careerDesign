import { pressButton, submitAnswer } from './roomService';

/**
 * Botが早押しするか判定
 */
export function runBotIfNeeded(roomId, room) {
  // すでに誰かが押している、またはplaying以外なら何もしない
  if (room.status !== 'playing' || room.buzzer?.uid) return;

  const bots = Object.entries(room.members || {})
    .filter(([, v]) => v.isBot);

  if (bots.length === 0) return;

  // 30%の確率でBotが押す
  if (Math.random() < 0.3) {
    const [botUid] = bots[Math.floor(Math.random() * bots.length)];
    console.log('🤖 Bot buzz:', botUid);
    pressButton(roomId, botUid);
  }
}

/**
 * Botが回答するか判定
 */
export async function runBotAnswerIfNeeded(roomId, room) {
  const buzzerUid = room.buzzer?.uid;
  if (!buzzerUid || room.status !== 'playing') return;

  const currentQ = room.quiz.questions[room.quiz.currentIndex];
  
  // ボットが正解するかどうかの判定 (70%で正解)
  const isCorrect = Math.random() > 0.3;
  const answerText = isCorrect ? (currentQ.answer || "正解") : "わかりません...";

  console.log(`🤖 ボット(${buzzerUid})が回答します: ${answerText}`);

  try {
    // roomServiceの回答送信処理を呼ぶ
    await submitAnswer(roomId, buzzerUid, answerText, isCorrect);
  } catch (error) {
    console.error("❌ ボットの回答送信に失敗しました:", error);
  }
}