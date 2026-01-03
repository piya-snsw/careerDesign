import { db, auth } from "./firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

export const createRoom = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("未ログイン");
  }

  const initialScores = {
    [user.uid]: 0,
  };

  const roomRef = await addDoc(
    collection(db, "rooms"),
    {
      hostUid: user.uid,
      players: [user.uid],
      scores: initialScores,
      status: "waiting",
      createdAt: serverTimestamp(),
      questionIndex: 0,
      buzzedBy: null,
      buzzedAt: null,
      answerStartedAt: null,
      answeredBy: null,
      answerResult: null,
      answeredChoice: null,
    }
  );

  return roomRef.id;
};
