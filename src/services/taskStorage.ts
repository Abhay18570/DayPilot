import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReminderMetadata } from '../types/notification';
import type { Task, TaskInput } from '../types/task';
import { validateTask } from '../utils/taskValidation';

export const taskStorageKey = (userId: string) => `daypilot_tasks:${encodeURIComponent(userId)}`;
export class TaskStorageError extends Error {}
export const taskErrorMessage = (error: unknown) => error instanceof TaskStorageError ? error.message : 'Your tasks could not be saved. Please try again.';
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem'>;
type Mutation = { task: Task; tasks: Task[] };
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const timestamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value));
function validTask(value: unknown, userId: string): value is Task {
  if (!record(value) || value.userId !== userId || typeof value.id !== 'string' || !value.id) return false;
  if (Object.keys(validateTask(value as unknown as TaskInput)).length) return false;
  if (value.notificationId != null && typeof value.notificationId !== 'string') return false;
  if (value.notificationScheduledFor != null && !timestamp(value.notificationScheduledFor)) return false;
  if (value.notificationError != null && typeof value.notificationError !== 'string') return false;
  return typeof value.completed === 'boolean' && timestamp(value.createdAt) && timestamp(value.updatedAt) &&
    (value.completed ? timestamp(value.completedAt) : value.completedAt === null);
}
const nextTimestamp = (task: Task) => new Date(Math.max(Date.now(), Date.parse(task.updatedAt) + 1)).toISOString();
function cleanInput(input: TaskInput): TaskInput {
  if (Object.keys(validateTask(input)).length) throw new TaskStorageError('Please check the task fields.');
  // Whitelist editable fields: callers cannot replace IDs, ownership or completion metadata.
  return { title: input.title.trim(), description: input.description.trim(), date: input.date, time: input.time,
    category: input.category, priority: input.priority, reminderEnabled: input.reminderEnabled, reminderOffset: input.reminderOffset ?? 'at_time', repeat: input.repeat };
}
export function createTaskStorage(storage: Storage) {
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(userId: string, action: () => Promise<T>): Promise<T> {
    const result = pending.then(() => {
      if (!userId.trim()) throw new TaskStorageError('Please log in to access tasks.');
      return action();
    }).catch(error => { throw error instanceof TaskStorageError ? error : new TaskStorageError('Your tasks could not be accessed. Please try again.'); });
    pending = result.catch(() => undefined);
    return result;
  }
  async function read(userId: string): Promise<Task[]> {
    const raw = await storage.getItem(taskStorageKey(userId));
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !Array.isArray(data.tasks) || !data.tasks.every(task => validTask(task, userId)) || new Set(data.tasks.map(task => task.id)).size !== data.tasks.length) {
      throw new TaskStorageError('Saved task data could not be read. Your data has been kept. Please try again.');
    }
    return data.tasks.map(task => ({ ...task, reminderOffset: task.reminderOffset ?? 'at_time', notificationId: task.notificationId ?? null, notificationScheduledFor: task.notificationScheduledFor ?? null, notificationError: task.notificationError ?? null }));
  }
  const write = (userId: string, tasks: Task[]) => storage.setItem(taskStorageKey(userId), JSON.stringify({ version: 1, tasks }));
  function modify(userId: string, id: string, update: (task: Task) => Task): Promise<Mutation> {
    return serial(userId, async () => {
      const tasks = await read(userId);
      const index = tasks.findIndex(task => task.id === id && task.userId === userId);
      if (index === -1) throw new TaskStorageError('This task is no longer available.');
      const task = update(tasks[index]);
      tasks[index] = task;
      await write(userId, tasks);
      return { task, tasks };
    });
  }
  return {
    getUserTasks: (userId: string) => serial(userId, () => read(userId)),
    createTask: (userId: string, input: TaskInput): Promise<Mutation> => serial(userId, async () => {
      const fields = cleanInput(input);
      const tasks = await read(userId);
      const now = new Date().toISOString();
      let id: string;
      do { id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; } while (tasks.some(task => task.id === id));
      const task: Task = { ...fields, reminderOffset: fields.reminderOffset ?? 'at_time', notificationId: null, notificationScheduledFor: null, notificationError: null, id, userId, completed: false, completedAt: null, createdAt: now, updatedAt: now };
      const next = [...tasks, task];
      await write(userId, next);
      return { task, tasks: next };
    }),
    updateTask: (userId: string, id: string, input: TaskInput) => modify(userId, id, task => ({ ...task, ...cleanInput(input), notificationId: null, notificationScheduledFor: null, notificationError: null, updatedAt: nextTimestamp(task) })),
    toggleTaskCompletion: (userId: string, id: string) => modify(userId, id, task => {
      const now = nextTimestamp(task);
      return { ...task, notificationId: null, notificationScheduledFor: null, notificationError: null, completed: !task.completed, completedAt: task.completed ? null : now, updatedAt: now };
    }),
    setReminderMetadata: (userId: string, id: string, metadata: ReminderMetadata) => modify(userId, id, task => ({ ...task, notificationId: metadata.notificationId, notificationScheduledFor: metadata.notificationScheduledFor, notificationError: metadata.notificationError })),
    deleteTask: (userId: string, id: string) => serial(userId, async () => {
      const tasks = await read(userId);
      if (!tasks.some(task => task.id === id)) throw new TaskStorageError('This task is no longer available.');
      const next = tasks.filter(task => task.id !== id);
      await write(userId, next);
      return next;
    }),
    clearUserTasks: (userId: string) => serial(userId, () => write(userId, [])),
  };
}
export const taskStorage = createTaskStorage(AsyncStorage);
