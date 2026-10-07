import { AppState } from 'react-native';
import { notificationService } from '@/services/notificationService';
import { createTaskReminderManager } from '@/services/taskReminders';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { taskStorage, taskErrorMessage, TaskStorageError } from '@/services/taskStorage';
import type { Task, TaskInput } from '@/types/task';
import { selectTasks, sortTasks } from '@/utils/taskSelectors';
import { toDateKey } from '@/utils/taskDates';
import { useNow } from '@/hooks/useNow';

type TaskState = {
  tasks: Task[]; isLoading: boolean; isSaving: boolean; loadError: string | null;
  feedback: string | null; clearFeedback: () => void; reload: () => Promise<void>;
  now: Date; reconcileReminders: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (id: string, input: TaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  getTasksForDate: (date: string) => Task[];
  getTodayTasks: () => Task[]; getUpcomingTasks: () => Task[]; getCompletedTasks: () => Task[];
};
const reminderManager = createTaskReminderManager(taskStorage, notificationService);
const TaskContext = createContext<TaskState | null>(null);

// The protected app layout keys this provider by user ID. Switching accounts unmounts
// all old task state, so a late storage result cannot enter the next user's context.
export function TaskProvider({ userId, children }: PropsWithChildren<{ userId: string }>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const busy = useRef(false);
  const now = useNow();
  useEffect(() => {
    let active = true;
    void reminderManager.reconcileTaskNotifications(userId)
      .then(value => { if (active) { setTasks(value.tasks); if (value.warning) setFeedback(value.warning); } })
      .catch(error => { if (active) setLoadError(taskErrorMessage(error)); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [userId]);
  const reload = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setIsLoading(true);
    setLoadError(null);
    try { const result = await reminderManager.reconcileTaskNotifications(userId); setTasks(result.tasks); if (result.warning) setFeedback(result.warning); }
    catch (error) { setLoadError(taskErrorMessage(error)); }
    finally { setIsLoading(false); busy.current = false; }
  }, [userId]);
  const reconcileReminders = useCallback(async () => {
    if (busy.current || isLoading || loadError) return;
    busy.current = true;
    setIsSaving(true);
    try {
      const result = await reminderManager.reconcileTaskNotifications(userId);
      setTasks(result.tasks);
      setFeedback(result.warning ?? 'Reminders checked.');
    } catch (error) { setFeedback(taskErrorMessage(error)); }
    finally { busy.current = false; setIsSaving(false); }
  }, [userId, isLoading, loadError]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void reconcileReminders(); });
    return () => listener.remove();
  }, [reconcileReminders]);
  async function mutate<T>(operation: () => Promise<T>): Promise<T> {
    if (busy.current || isLoading || loadError) throw new TaskStorageError('Please wait for your tasks to finish loading or saving.');
    busy.current = true;
    setIsSaving(true);
    try { return await operation(); }
    finally { busy.current = false; setIsSaving(false); }
  }
  return <TaskContext.Provider value={{
    tasks, isLoading, isSaving, loadError, now, feedback, reconcileReminders, clearFeedback: () => setFeedback(null), reload,
    createTask: input => mutate(async () => {
      const result = await reminderManager.createTask(userId, input);
      setTasks(result.tasks); setFeedback(result.task.notificationError ?? (result.task.notificationId ? 'Task created. Reminder scheduled.' : 'Task created. You’re one step closer.'));
      return result.task;
    }),
    updateTask: (id, input) => mutate(async () => {
      const result = await reminderManager.updateTask(userId, id, input);
      setTasks(result.tasks); setFeedback(result.task.notificationError ?? 'Changes saved.');
      return result.task;
    }),
    deleteTask: id => mutate(async () => {
      setTasks(await reminderManager.deleteTask(userId, id)); setFeedback('Task deleted.');
    }),
    toggleTask: id => mutate(async () => {
      const previous = tasks;
      const timestamp = new Date().toISOString();
      setTasks(tasks.map(task => task.id !== id ? task : { ...task, completed: !task.completed, completedAt: task.completed ? null : timestamp, updatedAt: timestamp }));
      try { const result = await reminderManager.toggleTaskCompletion(userId, id); setTasks(result.tasks); if (result.task.notificationError) setFeedback(result.task.notificationError); }
      catch (error) { setTasks(previous); throw error; }
    }),
    getTasksForDate: date => sortTasks(tasks.filter(task => task.date === date), 'priority'),
    getTodayTasks: () => sortTasks(tasks.filter(task => task.date === toDateKey(now)), 'priority'),
    getUpcomingTasks: () => selectTasks(tasks, 'upcoming', '', 'date', now),
    getCompletedTasks: () => selectTasks(tasks, 'completed', '', 'date', now),
  }}>{children}</TaskContext.Provider>;
}
export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used inside TaskProvider');
  return context;
}
