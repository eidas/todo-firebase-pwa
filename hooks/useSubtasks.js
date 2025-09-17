import { useCallback } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

export const useSubtasks = ({
  db,
  currentUser,
  todos,
  setTodos,
  setLocalTodos,
  addToSyncQueue,
  showNotification
}) => {

  // サブタスク追加
  const addSubtask = useCallback(async (text, parentId) => {
    if (!currentUser) return;

    const existingSubtasks = todos.filter(todo => todo.parentId === parentId);
    const maxOrder = existingSubtasks.length > 0 ? Math.max(...existingSubtasks.map(t => t.order || 0)) : 0;

    const subtaskData = {
      text: text,
      completed: false,
      createdAt: new Date().toISOString(),
      userId: currentUser.uid,
      parentId: parentId,
      order: maxOrder + 1,
    };

    const tempId = `temp-sub-${Date.now()}`;
    const optimisticSubtask = { ...subtaskData, id: tempId };
    const newTodos = [...todos, optimisticSubtask];
    setTodos(newTodos);
    setLocalTodos(newTodos);

    if (!addToSyncQueue("add", { ...subtaskData, createdAt: serverTimestamp() })) {
      try {
        const docRef = await addDoc(collection(db, "todos"), {
          ...subtaskData,
          createdAt: serverTimestamp(),
        });
        const updatedTodos = newTodos.map((todo) =>
          todo.id === tempId ? { ...todo, id: docRef.id } : todo
        );
        setTodos(updatedTodos);
        setLocalTodos(updatedTodos);
        showNotification("サブタスク追加", `「${subtaskData.text}」を追加しました`);
      } catch (error) {
        console.error("Error adding subtask:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  }, [db, currentUser, todos, setTodos, setLocalTodos, addToSyncQueue, showNotification]);

  // サブタスク完了状態切り替え
  const toggleSubtask = useCallback(async (id, completed) => {
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
        console.error("Error updating subtask:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  }, [db, todos, setTodos, setLocalTodos, addToSyncQueue]);

  // サブタスク削除
  const deleteSubtask = useCallback(async (id) => {
    const subtaskToDelete = todos.find((t) => t.id === id);
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    setLocalTodos(updatedTodos);

    if (!addToSyncQueue("delete", { id })) {
      try {
        await deleteDoc(doc(db, "todos", id));
        if (subtaskToDelete) {
          showNotification("サブタスク削除", `「${subtaskToDelete.text}」を削除しました`);
        }
      } catch (error) {
        console.error("Error deleting subtask:", error);
        setTodos(todos);
        setLocalTodos(todos);
      }
    }
  }, [db, todos, setTodos, setLocalTodos, addToSyncQueue, showNotification]);

  // 進捗計算
  const getTaskProgress = useCallback((taskId, subtasksByParent) => {
    const taskSubtasks = subtasksByParent[taskId] || [];
    if (taskSubtasks.length === 0) return null;
    const completed = taskSubtasks.filter(st => st.completed).length;
    return { completed, total: taskSubtasks.length };
  }, []);

  // サブタスクデータ処理
  const processSubtasks = useCallback((todos) => {
    const mainTodos = todos.filter((todo) => !todo.parentId);
    const subtasks = todos.filter((todo) => todo.parentId);

    // サブタスクをparentIdでグループ化
    const subtasksByParent = subtasks.reduce((acc, subtask) => {
      if (!acc[subtask.parentId]) acc[subtask.parentId] = [];
      acc[subtask.parentId].push(subtask);
      return acc;
    }, {});

    // 各グループ内でorderでソート
    Object.keys(subtasksByParent).forEach(parentId => {
      subtasksByParent[parentId].sort((a, b) => (a.order || 0) - (b.order || 0));
    });

    return { mainTodos, subtasksByParent };
  }, []);

  return {
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    getTaskProgress,
    processSubtasks,
  };
};