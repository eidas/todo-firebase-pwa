// pages/index.js (PWA機能を追加)
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
  where,
} from "firebase/firestore";
import Head from "next/head";
import LoginForm from "../components/LoginForm";
import TodoApp from "../components/TodoApp";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import styles from "../styles/Home.module.css";

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "your-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "your-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "your-project.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "your-app-id",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function AuthenticatedApp() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>認証情報を確認中...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginForm />;
  }

  return <TodoApp db={db} />;
}

export default function Home() {

  return (
    <>
      <Head>
        <title>My ToDo App - タスク管理PWA</title>
        <meta
          name="description"
          content="オフライン対応のタスク管理PWAアプリ"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AuthProvider auth={auth}>
        <AuthenticatedApp />
      </AuthProvider>
    </>
  );
}
