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

  const roomRef = await addDoc(
    collection(db, "rooms"),
    {
      hostUid: user.uid,
      players: [user.uid],
      status: "waiting",
      createdAt: serverTimestamp(),
    }
  );

  return roomRef.id;
};
