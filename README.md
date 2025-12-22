# 基本情報技術者試験 早押しクイズアプリ (Quiz Buster FE)

基本情報技術者試験（FE）の知識を問う、リアルタイム性の高い早押しクイズアプリです。
現在は一人用プロトタイプとして、クイズの取得・タイマー・正誤判定が実装されています。

## 🛠 使用技術 (Tech Stack)

- **Frontend:** React (Vite)
- **Styling:** Tailwind CSS (v4)
- **Backend:** Firebase (Firestore)
- **Design:** ライトテーマ（青・白・グレー基調）

## 🚀 現在実装済みの機能

- **Firestore連携:** Firebase上の `questions` コレクションから問題をリアルタイム取得。
- **早押しロジック:** - 読み上げ中の「PUSH!」ボタン待機状態。
  - ボタン押下後の回答選択モード。
- **5秒制限タイマー:** - 回答選択開始から5秒でタイムアップ。
  - 視覚的な残り時間ゲージとカウントダウン表示。
- **レスポンシブデザイン:** モバイルでも操作しやすいUI。

## 📂 データベース構造 (Firestore)

### Collection: `questions`
| フィールド名 | 型 | 説明 |
| :--- | :--- | :--- |
| `text` | string | 問題文 |
| `options` | array | 4択の選択肢 (0-3) |
| `answerIndex` | number | 正解のインデックス番号 |

## ⚙️ セットアップ手順

1. **パッケージのインストール**
   ```bash
   npm install
Tailwind CSS (v4) の準備

Bash

npm install @tailwindcss/postcss tailwindcss
開発サーバーの起動

Bash

npm run dev
