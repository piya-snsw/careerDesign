import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

export const useRoom = (roomId = "room1") => {
    const [roomData, setRoomData] = useState(null);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // 必須フィールドが欠けている場合のデフォルト値を保証
                setRoomData({
                    questionOrder: [],
                    currentQuestionIndex: 0,
                    status: "waiting",
                    ...data
                });
            }
        });
        return () => unsub();
    }, [roomId]);

    const updateRoom = async (updates) => {
        await updateDoc(doc(db, "rooms", roomId), updates);
    };

    return { roomData, updateRoom };
};