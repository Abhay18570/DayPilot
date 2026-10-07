import type { ReminderOffset, Task } from '../types/task';
import { combineTaskDateTime, toDateKey, toTimeKey } from './taskDates';

export const REMINDER_OPTIONS: { value: ReminderOffset; label: string; minutes: number }[] = [
  { value: 'at_time', label: 'At task time', minutes: 0 },
  { value: '5_minutes', label: '5 minutes before', minutes: 5 },
  { value: '15_minutes', label: '15 minutes before', minutes: 15 },
  { value: '30_minutes', label: '30 minutes before', minutes: 30 },
  { value: '1_hour', label: '1 hour before', minutes: 60 },
  { value: '1_day', label: '1 day before', minutes: 1440 },
];
export function calculateReminderDate(task: Pick<Task, 'date' | 'time' | 'reminderOffset'>): Date {
  const date = combineTaskDateTime(task.date, task.time);
  // Do not silently shift nonexistent local times across a daylight-saving jump.
  if (toDateKey(date) !== task.date || toTimeKey(date) !== task.time) throw new Error('This local time does not exist. Choose another task time.');
  const option = REMINDER_OPTIONS.find(option => option.value === (task.reminderOffset ?? 'at_time'));
  if (!option) throw new Error('Choose a valid reminder time.');
  return new Date(date.getTime() - option.minutes * 60_000);
}
export const reminderLabel = (offset: ReminderOffset = 'at_time') => REMINDER_OPTIONS.find(option => option.value === offset)?.label ?? 'At task time';
export const reminderSignature = (task: Task) => JSON.stringify([task.title, task.date, task.time, task.reminderOffset ?? 'at_time']);
export const reminderIdentifier = (task: Task) => `daypilot-task:${encodeURIComponent(task.userId)}:${encodeURIComponent(task.id)}:${encodeURIComponent(task.updatedAt)}`;
export function taskReminderPayload(task: Task, date: Date) {
  return { app: 'daypilot', type: 'task-reminder', taskId: task.id, userId: task.userId, signature: reminderSignature(task), scheduledFor: date.toISOString() };
}
export function isTaskReminder(data: unknown): data is Record<string, unknown> & { taskId: string; userId: string } {
  return typeof data === 'object' && data !== null && 'app' in data && 'type' in data && 'taskId' in data && 'userId' in data && data.app === 'daypilot' && data.type === 'task-reminder' && typeof data.taskId === 'string' && !!data.taskId && typeof data.userId === 'string' && !!data.userId;
}
export function notificationTaskTarget(data: Record<string, unknown>, userId: string, tasks: Task[]): string | null {
  if (!isTaskReminder(data) || data.userId !== userId) return null;
  return tasks.find(task => task.id === data.taskId && task.userId === userId)?.id ?? null;
}
