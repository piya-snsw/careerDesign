import { useEffect, useState, useRef } from "react";
import { db } from "./firebase";
import {
  doc,
  updateDoc,
  Timestamp,
  runTransaction,
} from "firebase/firestore";

function QuizApp({ questions, room, user, playerNames }) {
  const [history, setHistory] = useState([]);
  const [questionRemainingSec, setQuestionRemainingSec] = useState(null);
  const [answerRemainingSec, setAnswerRemainingSec] = useState(null);
  if (!room.questionIds || room.questionIds.length === 0) {
    return <div className="card">問題を準備中...</div>;
  }
  const currentIndex = room.questionIndex;
  const currentAnswerer = room.buzzedBy;
  const answered = room.answerResult !== null;
  const roomRef = doc(db, "rooms", room.id);
  const isHost = room.hostUid === user.uid;
  const questionsForRoom = room.questionIds.map(
    (id) => questions[id]
  );

  // --------------------
  // 同期タイマー
  // --------------------
  useEffect(() => {
    if (!room.questionStartedAt) return;

    const update = () => {
      const now = Date.now();

      // 誰かが回答中
      if (room.buzzedBy) {
        // 問題の残り時間は止める
        const answerStart = room.answerStartedAt?.toDate().getTime();
        if (!answerStart) return;

        const answerLimit = 5 * 1000; // 解答制限時間5秒
        const sec = Math.max(0, Math.floor((answerStart + answerLimit - now) / 1000));
        setAnswerRemainingSec(sec);
        setQuestionRemainingSec((prev) => prev ?? 20); // 停止中は前回値を維持
      } else {
        // 誰も回答中でない → 問題時間を減らす
        const questionStart = room.questionStartedAt.toDate().getTime();
        const questionLimit = 20 * 1000;
        const sec = Math.max(0, Math.floor((questionStart + questionLimit - now) / 1000));
        setQuestionRemainingSec(sec);
        setAnswerRemainingSec(null);
      }
    };

    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [room.questionStartedAt, room.answerStartedAt, room.buzzedBy, room.questionIndex]);

  useEffect(() => {
    if (!isHost) return;
    if (room.status !== "playing") return;
    if (!room.questionIds || room.questionIds.length === 0) return;
    if (!room.questionStartedAt) {

      updateDoc(roomRef, {
        questionIndex: 0,
        questionStartedAt: Timestamp.now(),
        answerStartedAt: null,
        buzzedBy: null,
        buzzedAt: null,
        answeredBy: null,
        answerResult: null,
        answeredChoice: null,
      });
    }
  }, [room.status, room.questionIds]);

  useEffect(() => {
    if (!isHost) return;
    if (!room.buzzedBy) return;               // 回答中のみ
    if (answerRemainingSec === null) return;
    if (answerRemainingSec > 0) return;

    runTransaction(db, async (transaction) => {
      const snap = await transaction.get(roomRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (!data.buzzedBy) return;

      const uid = data.buzzedBy;
      const wrongAnswerers = [...(data.wrongAnswerers || []), uid];

      transaction.update(roomRef, {
        buzzedBy: null,            // 回答権を失う
        answerStartedAt: null,
        answeredChoice: null,
        [`scores.${uid}`]: (data.scores?.[uid] ?? 0) - 1,
        wrongAnswerers,
      });
    });
  }, [answerRemainingSec]);

  useEffect(() => {
    if (!isHost) return;
    if (!room.answerResult) return;
    if (!room.questionIds || room.questionIndex === null) return;

    const isLastQuestion = room.questionIndex >= room.questionIds.length - 1;
    if (isLastQuestion) return;

    const timer = setTimeout(async () => {
      await updateDoc(roomRef, {
        questionIndex: room.questionIndex + 1,
        questionStartedAt: Timestamp.now(),
        answerStartedAt: null,
        buzzedBy: null,
        buzzedAt: null,
        answeredBy: null,
        answerResult: null,
        answeredChoice: null,
        wrongAnswerers: [],
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [room.answerResult]);

  const q =
    questionsForRoom?.[room.questionIndex ?? 0] ??
    null;

  // --------------------
  // 早押しボタン
  // --------------------
  const handleBuzz = async () => {
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);

        if (!snap.exists()) return;

        const data = snap.data();

        if (data.buzzedBy) return;

        transaction.update(roomRef, {
          buzzedBy: user.uid,
          buzzedAt: Timestamp.now(),
          answerStartedAt: Timestamp.now(),
        });
      });
    } catch (e) {
      console.error("buzz transaction failed", e);
    }
  };

  const handleAnswer = async (choiceIdx, uid) => {
    if (!q) return;

    const isBot = uid.startsWith("Bot");
    const isCorrect = isBot ? Math.random() < 0.5 : choiceIdx === q.answer;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);
        if (!snap.exists()) return;

        const data = snap.data();

        // 回答権がある人しか回答できない
        if (data.buzzedBy !== uid) return;

        // 回答済みの人はスキップ
        if (data.answerResult === "correct") return;

        if (isCorrect) {
          transaction.update(roomRef, {
            answeredBy: uid,
            answerResult: "correct",
            answeredChoice: choiceIdx,
            [`scores.${uid}`]: (data.scores?.[uid] ?? 0) + 1,
            wrongAnswerers: [], // 正解したら wrongAnswerers をリセット
          });
        } else {
          const wrongAnswerers = [...(data.wrongAnswerers || []), uid];

          transaction.update(roomRef, {
            [`scores.${uid}`]: (data.scores?.[uid] ?? 0) - 1,
            buzzedBy: null,               // 他の人に回答権を渡す
            answerStartedAt: null,
            answeredChoice: null,
            wrongAnswerers,
          });
        }
      });
    } catch (e) {
      console.error("answer transaction failed", e);
      return;
    }

    const userAnswer = isBot
      ? isCorrect
        ? q.choices[q.answer]
        : q.choices[(q.answer + 1) % 4]
      : q.choices[choiceIdx];

    setHistory((prev) => [
      ...prev,
      {
        uid,
        question: q.text,
        isCorrect,
        userAnswer,
        correctAnswer: q.choices[q.answer],
        explanation: q.explanation,
      },
    ]);
  };



  // --------------------
  // Bot自動早押し
  // --------------------
  useEffect(() => {
    if (room.status !== "playing") return;
    if (!room.questionStartedAt) return;
    if (questions.length === 0) return;
    if (currentAnswerer) return;

    const bots = room.players.filter((p) => p.startsWith("Bot"));
    if (bots.length === 0) return;

    // 1問につき1体だけ選ぶ
    const bot = bots[Math.floor(Math.random() * bots.length)];

    // 押すかどうか（60%）
    if (Math.random() > 0.6) return;

    const delay = 2000 + Math.random() * 5000;

    const timer = setTimeout(async () => {
      if (room.buzzedBy) return;

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);
        if (!snap.exists()) return;

        const data = snap.data();
        if (data.buzzedBy) return;

        transaction.update(roomRef, {
          buzzedBy: bot,
          buzzedAt: Timestamp.now(),
          answerStartedAt: Timestamp.now(),
        });
      });

      setTimeout(async () => {
        try {
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(roomRef);
            if (!snap.exists()) return;

            const data = snap.data();
            if (data.answeredBy || data.answerResult) return;

            const isCorrect = Math.random() < 0.5;

            if (isCorrect) {
              transaction.update(roomRef, {
                answeredBy: bot,
                answerResult: "correct",
                answeredChoice: null,
                [`scores.${bot}`]: (data.scores?.[bot] ?? 0) + 1,
                wrongAnswerers: [], // 正解ならリセット
              });
            } else {
              const wrongAnswerers = [...(data.wrongAnswerers || []), bot];

              transaction.update(roomRef, {
                [`scores.${bot}`]: (data.scores?.[bot] ?? 0) - 1,
                buzzedBy: null,               // 回答権を失う
                answerStartedAt: null,
                answeredChoice: null,
                wrongAnswerers,
              });
            }
          });
        } catch (e) {
          console.error("bot answer failed", e);
        }
      }, 1500);
    }, delay);

    return () => clearTimeout(timer);
  }, [
    room.status,
    room.questionStartedAt,
    currentIndex,
    room.players,
    questions.length,
    currentAnswerer,
  ]);

  return (
    <div className="card">
      {!q ? (
        <div>問題を準備中...</div>
      ) : (
        <>
          <div className="category-label">
            {q.category} | {currentIndex + 1} / {questionsForRoom.length}
          </div>

          <div className="question-text">{q.text}</div>

          <div className="score-board">
            <h4>スコア</h4>
            <ul>
              {room.players.map((uid) => (
                <li key={uid}>
                  {playerNames[uid] ?? uid} : {room.scores?.[uid] ?? 0} 点
                </li>
              ))}
            </ul>
          </div>

          {!room.answeredBy && !room.buzzedBy && (
            <button
              onClick={handleBuzz}
              disabled={
                !!room.buzzedBy ||                        // 誰かが回答中
                (room.wrongAnswerers?.includes(user.uid) ?? false) // 間違えた人は押せない
              }
            >
              早押しボタン
            </button>
          )}

          {currentAnswerer && currentAnswerer !== user.uid && (
            <div>解答中: {playerNames[currentAnswerer] ?? currentAnswerer}</div>
          )}

          <div>
            {q.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i, user.uid)}
                disabled={
                  currentAnswerer !== user.uid ||               // 回答権がない
                  !!room.answerResult ||                        // 正解済み
                  (room.wrongAnswerers?.includes(user.uid) ?? false) // 間違えた人は無効
                }
              >
                {["ア", "イ", "ウ", "エ"][i]} {choice}
              </button>
            ))}
          </div>

          {room.answeredBy && (
            <div className="answer-result">
              <div>
                回答者：{playerNames[room.answeredBy] ?? room.answeredBy}
              </div>

              <div>
                選んだ答え：
                {room.answeredChoice !== null
                  ? q.choices[room.answeredChoice]
                  : "（未選択）"}
              </div>

              <div>
                結果：
                {room.answerResult === "correct" && "⭕ 正解"}
                {room.answerResult === "wrong" && "❌ 不正解"}
                {room.answerResult === "timeout" && "⌛ 時間切れ"}
              </div>

              <div>
                正解：
                {q.choices[q.answer]}
              </div>
            </div>
          )}

          {room.buzzedBy ? (
            answerRemainingSec !== null && (
              <div>解答残り時間: {answerRemainingSec}s</div>
            )
          ) : (
            questionRemainingSec !== null && (
              <div>問題残り時間: {questionRemainingSec}s</div>
            )
          )}

          {currentIndex + 1 === questionsForRoom.length && answered && (
            <div className="card">
              <h2>結果</h2>
              {history.map((h, i) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  問{i + 1}: {h.question} <br />
                  回答: {h.userAnswer} ({h.isCorrect ? "正解" : "不正解"})
                  <br />
                  正解: {h.correctAnswer} <br />
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {h.explanation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default QuizApp;
