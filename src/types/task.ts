export const TASK_CATEGORIES = ['college', 'dsa', 'project', 'personal', 'fitness', 'work', 'other'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_REPEATS = ['none', 'daily', 'weekly', 'monthly'] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];
export type TaskPriority = typeof TASK_PRIORITIES[number];
export type TaskRepeat = typeof TASK_REPEATS[number];

export type ReminderOffset = 'at_time' | '5_minutes' | '15_minutes' | '30_minutes' | '1_hour' | '1_day';

export interface TaskInput {
  title: string;
  description: string;
  /** Local calendar date, YYYY-MM-DD. Never parse as UTC. */
  date: string;
  /** Local wall-clock time, HH:mm. */
  time: string;
  category: TaskCategory;
  priority: TaskPriority;
  reminderEnabled: boolean;
  reminderOffset?: ReminderOffset;
  repeat: TaskRepeat;
}
export interface Task extends TaskInput {
  reminderOffset: ReminderOffset;
  notificationId: string | null;
  notificationScheduledFor: string | null;
  notificationError: string | null;
  id: string;
  userId: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export type TaskErrors = Partial<Record<keyof TaskInput, string>>;
export type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed' | 'overdue';
export type TaskSort = 'date' | 'priority' | 'recent';
