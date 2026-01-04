📝 Quiz Battle Express (FE Edition)

[APPLink](https://hayabusa-ca8f9.web.app/)

基本情報技術者試験（科目A）の知識問題を、リアルタイムで競い合うマルチプレイヤー・クイズアプリです。 人間がいない場合でも、AIボットが自動で参戦し、スピーディーな対戦体験を提供します。

🚀 主な機能
リアルタイム・早押し対戦: Firebase Firestore を利用した超低遅延の早押し判定。

インテリジェント・ボット:

待機室で20秒経過すると、不足人数分を自動補充。

人間が全員間違えて回答権を失った場合、ボットが即座に割り込んで回答。

基本情報技術者試験 完全対応: 計算問題を除いた知識問題100問を搭載。

おさらい機能: 結果発表画面で、出題された問題と正解を一覧表示。

レスポンシブデザイン: Google風のクリーンなUIで、PC・スマホ両対応。

🛠 使用技術
Frontend: React (Vite)

Backend/Database: Firebase (Firestore, Authentication, Hosting)

Styling: Inline Styles (Google Clean Design)

📦 セットアップ
リポジトリをクローン

Bash

git clone https://github.com/your-username/quiz-battle-express.git
cd quiz-battle-express
依存関係のインストール

Bash

npm install
Firebase の設定 src/firebase.js に自身の Firebase プロジェクトの構成情報を貼り付けてください。

ローカル実行

Bash

npm run dev
🌐 デプロイ方法
本アプリは Firebase Hosting に最適化されています。

Bash

# ビルドとデプロイを同時に実行
npm run build && firebase deploy
📖 クイズデータ構造
問題データは以下の形式で管理されています。

JavaScript

{
  q: '関係データベースの操作において、重複する行を取り除く操作はどれか？',
  answer: '射影',
  options: ['選択', '射影', '結合', '直積']
}
⚙️ システムロジックのこだわり
ボットの動的思考: useEffect の依存配列に room.answeredUsers を入れることで、人間が間違えた瞬間にリアクティブにボットが反応する設計にしています。

ルームの自動クリーンアップ: 最後のユーザーがロビーに戻る際、await を用いて確実に Firestore のルーム状態をリセットし、ゴースト部屋の発生を防いでいます。