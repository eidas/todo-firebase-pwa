import { useState } from 'react';
import styles from '../styles/Subtask.module.css';

export default function SubtaskList({
  subtasks,
  onToggleSubtask,
  onDeleteSubtask,
  onAddSubtask,
  parentId
}) {
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubtaskText.trim()) return;

    await onAddSubtask(newSubtaskText.trim(), parentId);
    setNewSubtaskText('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setNewSubtaskText('');
    setIsAdding(false);
  };

  return (
    <div className={styles.subtaskContainer}>
      {subtasks.map((subtask) => (
        <div key={subtask.id} className={styles.subtaskItem}>
          <div className={styles.subtaskContent}>
            <input
              type="checkbox"
              checked={subtask.completed}
              onChange={() => onToggleSubtask(subtask.id, subtask.completed)}
              className={styles.subtaskCheckbox}
            />
            <span className={`${styles.subtaskText} ${subtask.completed ? styles.completed : ''}`}>
              {subtask.text}
            </span>
          </div>
          <button
            onClick={() => onDeleteSubtask(subtask.id)}
            className={styles.deleteButton}
            title="サブタスクを削除"
          >
            ×
          </button>
        </div>
      ))}

      {isAdding ? (
        <form onSubmit={handleAddSubtask} className={styles.addSubtaskForm}>
          <input
            type="text"
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            placeholder="サブタスクを入力..."
            className={styles.subtaskInput}
            autoFocus
          />
          <div className={styles.addSubtaskActions}>
            <button type="submit" className={styles.confirmButton}>
              追加
            </button>
            <button type="button" onClick={handleCancel} className={styles.cancelButton}>
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className={styles.addSubtaskButton}
        >
          + サブタスクを追加
        </button>
      )}
    </div>
  );
}