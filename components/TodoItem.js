import { useState } from 'react';
import ProgressBar from './ProgressBar';
import SubtaskList from './SubtaskList';
import styles from '../styles/Home.module.css';

export default function TodoItem({
  todo,
  subtasks = [],
  onToggle,
  onDelete,
  onToggleSubtask,
  onDeleteSubtask,
  onAddSubtask,
  getTaskProgress
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const progress = getTaskProgress(todo.id);
  const hasSubtasks = subtasks.length > 0;

  const toggleExpanded = () => {
    if (hasSubtasks || isExpanded) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className={styles.todoItemContainer}>
      <div className={styles.todoItem}>
        <div className={styles.todoContent}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => onToggle(todo.id, todo.completed)}
            className={styles.checkbox}
          />
          <div className={styles.todoTextContainer}>
            <span className={`${styles.todoText} ${todo.completed ? styles.completed : ''}`}>
              {todo.text}
            </span>
            {progress && (
              <ProgressBar
                completed={progress.completed}
                total={progress.total}
                showText={true}
              />
            )}
          </div>
        </div>

        <div className={styles.todoActions}>
          {(hasSubtasks || isExpanded) && (
            <button
              onClick={toggleExpanded}
              className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
              title={isExpanded ? 'サブタスクを非表示' : 'サブタスクを表示'}
            >
              ▼
            </button>
          )}
          <button
            onClick={() => onDelete(todo.id)}
            className={styles.deleteButton}
            title="タスクを削除"
          >
            削除
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.subtaskSection}>
          <SubtaskList
            subtasks={subtasks}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onAddSubtask={onAddSubtask}
            parentId={todo.id}
          />
        </div>
      )}
    </div>
  );
}