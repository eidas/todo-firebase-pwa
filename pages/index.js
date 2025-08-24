// pages/index.js (PWA機能を追加)
import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
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
} from "firebase/firestore";
import Head from "next/head";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import OfflineIndicator from "../components/OfflineIndicator";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useLocalStorage } from "../hooks/useLocalStorage";
import styles from "../styles/Home.module.css";

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.NEXT_FIREBASE_API_KEY || "your-api-key",
  authDomain:
    process.env.NEXT_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.NEXT_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket:
    process.env.NEXT_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId:
    process.env.NEXT_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_FIREBASE_APP_ID || "your-app-id",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [localTodos, setLocalTodos] = useLocalStorage("todos", []);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const { isOnline, syncQueue, addToSyncQueue, processSyncQueue } =
    useOfflineSync();

  // PWA用の通知関数
  const showNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      });
    }
  };

  // 通知許可をリクエスト
  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    fetchTodos();
  }, []);

  // オンライン復帰時の同期処理
  useEffect(() => {
    if (isOnline) {
      processSyncQueue(async (item) => {
        const { action, data } = item;
        switch (action) {
          case "add":
            await addDoc(collection(db, "todos"), data);
            break;
          case "update":
            await updateDoc(doc(db, "todos", data.id), data.updates);
            break;
          case "delete":
            await deleteDoc(doc(db, "todos", data.id));
            break;
        }
      });
      fetchTodos(); // 最新データを取得
    }
  }, [isOnline, processSyncQueue]);

  // ToDoリストを取得
  const fetchTodos = async () => {
    if (!isOnline) {
      setTodos(localTodos);
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "todos"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const todoList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTodos(todoList);
      setLocalTodos(todoList); // ローカルにも保存
    } catch (error) {
      console.error("Error fetching todos:", error);
      setTodos(localTodos); // エラー時はローカルデータを使用
    } finally {
      setLoading(false);
    }
  };

  // 新しいToDoを追加
  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todoData = {
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    // 楽観的更新
    const tempId = `temp-${Date.now()}`;
    const optimisticTodo = { ...todoData, id: tempId };
    const newTodos = [optimisticTodo, ...todos];
    setTodos(newTodos);
    setLocalTodos(newTodos);
    setNewTodo("");

    if (!addToSyncQueue("add", { ...todoData, createdAt: serverTimestamp() })) {
      try {
        const docRef = await addDoc(collection(db, "todos"), {
          ...todoData,
          createdAt: serverTimestamp(),
        });
        // 実際のIDで更新
        const updatedTodos = newTodos.map((todo) =>
          todo.id === tempId ? { ...todo, id: docRef.id } : todo
        );
        setTodos(updatedTodos);
        setLocalTodos(updatedTodos);
        showNotification("タスク追加", `「${todoData.text}」を追加しました`);
      } catch (error) {
        console.error("Error adding todo:", error);
        // エラー時は楽観的更新を取り消し
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  // ToDoの完了状態を切り替え
  const toggleTodo = async (id, completed) => {
    // 楽観的更新
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !completed } : todo
    );
    setTodos(updatedTodos);
    setLocalTodos(updatedTodos);

    if (!addToSyncQueue("update", { id, updates: { completed: !completed } })) {
      try {
        const todoRef = doc(db, "todos", id);
        await updateDoc(todoRef, { completed: !completed });
      } catch (error) {
        console.error("Error updating todo:", error);
        // エラー時は元に戻す
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  // ToDoを削除
  const deleteTodo = async (id) => {
    const todoToDelete = todos.find((t) => t.id === id);

    // 楽観的更新
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    setLocalTodos(updatedTodos);

    if (!addToSyncQueue("delete", { id })) {
      try {
        await deleteDoc(doc(db, "todos", id));
        if (todoToDelete) {
          showNotification(
            "タスク削除",
            `「${todoToDelete.text}」を削除しました`
          );
        }
      } catch (error) {
        console.error("Error deleting todo:", error);
        // エラー時は元に戻す
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  // 完了済みToDoを全削除
  const clearCompleted = async () => {
    const completedTodos = todos.filter((todo) => todo.completed);
    const activeTodos = todos.filter((todo) => !todo.completed);

    // 楽観的更新
    setTodos(activeTodos);
    setLocalTodos(activeTodos);

    if (!isOnline) {
      completedTodos.forEach((todo) => {
        addToSyncQueue("delete", { id: todo.id });
      });
    } else {
      try {
        await Promise.all(
          completedTodos.map((todo) => deleteDoc(doc(db, "todos", todo.id)))
        );
        showNotification(
          "一括削除",
          `${completedTodos.length}件のタスクを削除しました`
        );
      } catch (error) {
        console.error("Error clearing completed todos:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  // フィルタリングされたToDoリスト
  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const activeTodosCount = todos.filter((todo) => !todo.completed).length;
  const completedTodosCount = todos.filter((todo) => todo.completed).length;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>読み込み中...</div>
      </div>
    );
  }

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

      <div className={styles.container}>
        <PWAInstallPrompt />
        <OfflineIndicator isOnline={isOnline} syncQueue={syncQueue} />

        <header className={styles.header}>
          <h1 className={styles.title}>📱 My ToDo PWA</h1>
          <p className={styles.subtitle}>
            Firebase × Next.js PWA アプリ {!isOnline && "(オフライン)"}
          </p>
        </header>

        <main className={styles.main}>
          <form onSubmit={addTodo} className={styles.addForm}>
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="新しいタスクを入力..."
              className={styles.input}
            />
            <button type="submit" className={styles.addButton}>
              追加
            </button>
          </form>

          <div className={styles.stats}>
            <div className={styles.counters}>
              <span className={styles.counter}>
                アクティブ: {activeTodosCount}
              </span>
              <span className={styles.counter}>
                完了済み: {completedTodosCount}
              </span>
              {syncQueue.length > 0 && (
                <span className={styles.counter}>
                  同期待ち: {syncQueue.length}
                </span>
              )}
            </div>

            <div className={styles.filters}>
              <button
                onClick={() => setFilter("all")}
                className={`${styles.filterButton} ${
                  filter === "all" ? styles.active : ""
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setFilter("active")}
                className={`${styles.filterButton} ${
                  filter === "active" ? styles.active : ""
                }`}
              >
                アクティブ
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`${styles.filterButton} ${
                  filter === "completed" ? styles.active : ""
                }`}
              >
                完了済み
              </button>
            </div>
          </div>

          <div className={styles.todoList}>
            {filteredTodos.length === 0 ? (
              <div className={styles.emptyState}>
                {filter === "all" && "タスクがありません"}
                {filter === "active" && "アクティブなタスクがありません"}
                {filter === "completed" && "完了済みタスクがありません"}
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <div key={todo.id} className={styles.todoItem}>
                  <div className={styles.todoContent}>
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id, todo.completed)}
                      className={styles.checkbox}
                    />
                    <span
                      className={`${styles.todoText} ${
                        todo.completed ? styles.completed : ""
                      }`}
                    >
                      {todo.text}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className={styles.deleteButton}
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>

          {completedTodosCount > 0 && (
            <div className={styles.actions}>
              <button onClick={clearCompleted} className={styles.clearButton}>
                完了済みタスクを全削除 ({completedTodosCount})
              </button>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
