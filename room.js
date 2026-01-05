import { db } from "./firebase.js";
import {
  doc, getDoc, updateDoc, onSnapshot, collection, setDoc
} from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get("roomId");

const questionEl = document.getElementById("question");
const buzzBtn = document.getElementById("buzz");
const answerInput = document.getElementById("answer");
const submitBtn = document.getElementById("submitAnswer");
const timerEl = document.getElementById("timer");
const scoreListEl = document.getElementById("scoreList");

let playerName = prompt("名前を入力"); // 簡易ゲスト
let buzzed = false;
let currentQuestionId = null;
let currentQuestionData = null;
let timer = 5;
let timerInterval = null;

// プレイヤーを部屋に登録
const roomRef = doc(db, "rooms", roomId);
onSnapshot(roomRef, async (snapshot) => {
  const room = snapshot.data();
  if (!room) return;

  // プレイヤー追加
  if (!room.players.includes(playerName)) {
    await updateDoc(roomRef, { players: [...room.players, playerName] });
  }

  // 問題切り替え
  if (room.currentQuestion && room.currentQuestion !== currentQuestionId) {
    currentQuestionId = room.currentQuestion;
    const qSnap = await getDoc(doc(db, "rooms", roomId, "questions", currentQuestionId));
    if (qSnap.exists()) {
      currentQuestionData = qSnap.data();
      questionEl.textContent = currentQuestionData.text;
      startTimer();
      buzzed = false;
    }
  }

  // スコア表示（簡易版: 全員10点固定表示）
  scoreListEl.innerHTML = "";
  room.players.forEach(p => {
    const li = document.createElement("li");
    li.textContent = `${p}: 0`; // スコア更新は後で追加
    scoreListEl.appendChild(li);
  });
});

// 早押し
buzzBtn.addEventListener("click", () => {
  if (buzzed) return alert("すでに早押し済み");
  buzzed = true;
  alert("早押し完了！回答してください");
});

// タイマー
function startTimer() {
  clearInterval(timerInterval);
  timer = 5;
  timerEl.textContent = timer;
  timerInterval = setInterval(() => {
    timer--;
    timerEl.textContent = timer;
    if (timer <= 0) {
      clearInterval(timerInterval);
      alert("時間切れ！");
      buzzed = false;
      // タイムアウトのペナルティ処理
    }
  }, 1000);
}

// 回答
submitBtn.addEventListener("click", () => {
  if (!currentQuestionData) return;
  const answer = answerInput.value.trim();
  if (answer === currentQuestionData.answer) {
    alert("正解！");
    // Firestoreでスコア更新
  } else {
    alert("不正解…");
    // Firestoreでペナルティ
  }
  answerInput.value = "";
  buzzed = false;
  startTimer(); // 次の問題に備える
});
