# 📝 Quiz Battle Express (FE Edition)

🔗 https://hayabusa-ca8f9.web.app/

---

## 📌 概要
基本情報技術者試験（科目A）の知識問題を、リアルタイムで競い合うマルチプレイヤー・クイズアプリです。  
人間がいない場合でもAIボットが自動で参戦し、スピーディーな対戦体験を提供します。

---

## 🚀 主な機能

### ⚡ リアルタイム・早押し対戦
Firebase Firestore を利用した超低遅延の早押し判定。

### 🤖 インテリジェント・ボット
- 待機室で20秒経過すると、不足人数分を自動補充  
- 人間が全員間違えて回答権を失った場合、ボットが即座に回答

### 📚 基本情報技術者試験 完全対応
- 計算問題を除いた知識問題100問を搭載

### 🔁 おさらい機能
- 結果画面で出題された問題と正解を一覧表示

### 📱 レスポンシブデザイン
- Google風のクリーンなUI  
- PC・スマホ両対応

---

## 🛠 使用技術

- Frontend: React (Vite)  
- Backend / Database: Firebase (Firestore, Authentication, Hosting)  
- Styling: Inline Styles（Google Clean Design）

---

⚙️ システムロジックのこだわり
🤖 ボットの動的思考

useEffect の依存配列に room.answeredUsers を入れることで、
人間が間違えた瞬間にリアクティブにボットが反応する設計にしています。

🧹 ルームの自動クリーンアップ

最後のユーザーがロビーに戻る際、await を用いて確実に Firestore のルーム状態をリセットし、
ゴースト部屋の発生を防いでいます。
