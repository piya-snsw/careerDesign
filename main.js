import { db } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";

const createRoomButton = document.getElementById("createRoom");
const joinRoomButton = document.getElementById("joinRoom");
const roomIdInput = document.getElementById("roomIdInput");
const categorySelect = document.getElementById("categorySelect");

// 部屋作成
createRoomButton.addEventListener("click", async () => {
  const roomId = crypto.randomUUID();
  const category = categorySelect.value;

  await setDoc(doc(db, "rooms", roomId), {
    players: [],
    status: "waiting",
    currentQuestion: null,
    category,
    createdAt: Date.now()
  });

  alert("部屋を作成しました！ID: " + roomId);
});

// 部屋参加
joinRoomButton.addEventListener("click", async () => {
  const roomId = roomIdInput.value.trim();
  if (!roomId) return alert("部屋IDを入力してください");

  const roomRef = doc(db, "rooms", roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    alert("部屋が存在しません");
    return;
  }

  window.location.href = `room.html?roomId=${roomId}`;
});
