import { useEffect, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

function App() {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestion = async () => {
      const docRef = doc(db, "questions", "q1");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setQuestion(docSnap.data());
      } else {
        console.log("問題が見つかりません");
      }
      setLoading(false);
    };

    fetchQuestion();
  }, []);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!question) {
    return <div>問題データがありません</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>早押しクイズ準備中 🚀</h1>

      <h2>{question.text}</h2>

      <ul>
        {question.options.map((opt, index) => (
          <li key={index}>{opt}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
