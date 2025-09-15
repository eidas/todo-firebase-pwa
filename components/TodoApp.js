import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useLocalStorage } from "../hooks/useLocalStorage";
import UserProfile from "./UserProfile";
import PWAInstallPrompt from "./PWAInstallPrompt";
import OfflineIndicator from "./OfflineIndicator";
import styles from "../styles/Home.module.css";

export default function TodoApp({ db }) {
  const { currentUser } = useAuth();
  const [todos, setTodos] = useState([]);
  const [localTodos, setLocalTodos] = useLocalStorage(`todos-${currentUser?.uid || 'anonymous'}`, []);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const { isOnline, syncQueue, addToSyncQueue, processSyncQueue } = useOfflineSync();

  const showNotification = (title, body) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const fetchTodos = useCallback(async () => {
    if (!isOnline || !currentUser) {
      setTodos(localTodos);
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, "todos"),
        where("userId", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const todoList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTodos(todoList);
      setLocalTodos(todoList);
    } catch (error) {
      console.error("Error fetching todos:", error);
      setTodos(localTodos);
    } finally {
      setLoading(false);
    }
  }, [isOnline, currentUser, db, localTodos, setLocalTodos]);

  useEffect(() => {
    requestNotificationPermission();
    if (currentUser) {
      fetchTodos();
    }
  }, [currentUser, fetchTodos]);

  useEffect(() => {
    if (isOnline && currentUser) {
      processSyncQueue(async (item) => {
        const { action, data } = item;
        switch (action) {
          case "add":
            await addDoc(collection(db, "todos"), {
              ...data,
              userId: currentUser.uid,
            });
            break;
          case "update":
            await updateDoc(doc(db, "todos", data.id), data.updates);
            break;
          case "delete":
            await deleteDoc(doc(db, "todos", data.id));
            break;
        }
      });
      fetchTodos();
    }
  }, [isOnline, processSyncQueue, currentUser, db, fetchTodos]);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim() || !currentUser) return;

    const todoData = {
      text: newTodo.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      userId: currentUser.uid,
    };

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
        const updatedTodos = newTodos.map((todo) =>
          todo.id === tempId ? { ...todo, id: docRef.id } : todo
        );
        setTodos(updatedTodos);
        setLocalTodos(updatedTodos);
        showNotification("タスク追加", `「${todoData.text}」を追加しました`);
      } catch (error) {
        console.error("Error adding todo:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  const toggleTodo = async (id, completed) => {
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
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  const deleteTodo = async (id) => {
    const todoToDelete = todos.find((t) => t.id === id);
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    setLocalTodos(updatedTodos);

    if (!addToSyncQueue("delete", { id })) {
      try {
        await deleteDoc(doc(db, "todos", id));
        if (todoToDelete) {
          showNotification("タスク削除", `「${todoToDelete.text}」を削除しました`);
        }
      } catch (error) {
        console.error("Error deleting todo:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter((todo) => todo.completed);
    const activeTodos = todos.filter((todo) => !todo.completed);

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
        showNotification("一括削除", `${completedTodos.length}件のタスクを削除しました`);
      } catch (error) {
        console.error("Error clearing completed todos:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  };

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
    <div className={styles.container}>
      <PWAInstallPrompt />
      <OfflineIndicator isOnline={isOnline} syncQueue={syncQueue} />
      <UserProfile />

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
            <span className={styles.counter}>アクティブ: {activeTodosCount}</span>
            <span className={styles.counter}>完了済み: {completedTodosCount}</span>
            {syncQueue.length > 0 && (
              <span className={styles.counter}>同期待ち: {syncQueue.length}</span>
            )}
          </div>

          <div className={styles.filters}>
            <button
              onClick={() => setFilter("all")}
              className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
            >
              すべて
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`${styles.filterButton} ${filter === "active" ? styles.active : ""}`}
            >
              アクティブ
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`${styles.filterButton} ${filter === "completed" ? styles.active : ""}`}
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
                    className={`${styles.todoText} ${todo.completed ? styles.completed : ""}`}
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
  );
}