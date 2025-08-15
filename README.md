# Next.js Firebase ToDo App

Firebase と Next.js を使ったモダンな ToDo アプリケーションです。

## 機能

- ✅ タスクの追加・削除・完了切り替え
- 🔍 フィルタリング機能（すべて・アクティブ・完了済み）
- 📊 タスクの統計情報表示
- 🗑️ 完了済みタスクの一括削除
- 📱 レスポンシブデザイン
- ☁️ Firebase Firestore でのリアルタイム同期

## セットアップ

1. Firebase プロジェクトを作成
2. Firestore データベースを有効化
3. Firebase 設定を `pages/index.js` の `firebaseConfig` に設定
4. 依存関係をインストール：
   ```bash
   npm install
   ```
5. 開発サーバーを起動：
   ```bash
   npm run dev
   ```

## Firebase 設定

Firebase Console で以下の設定を行ってください：

1. プロジェクトを作成
2. Firestore Database を作成（テストモードで開始）
3. プロジェクト設定から Web アプリを追加
4. 設定値を `firebaseConfig` オブジェクトにコピー

## デプロイ

```bash
npm run build
npm start
```

または Vercel にデプロイ：

```bash
npx vercel
```