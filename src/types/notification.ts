import type { Task } from './task';
export type NotificationPermission = {
  status: 'enabled' | 'disabled' | 'not_determined' | 'unavailable';
  canAskAgain: boolean;
  quiet?: boolean;
};
export type ScheduledReminder = { identifier: string; data: Record<string, unknown> };
export interface TaskNotificationAdapter {
  getNotificationPermissionStatus(): Promise<NotificationPermission>;
  getScheduledNotifications(): Promise<ScheduledReminder[]>;
  scheduleTaskNotification(task: Task, date: Date): Promise<string>;
  cancelNotification(identifier: string): Promise<void>;
}
export type ReminderMetadata = Pick<Task, 'notificationId' | 'notificationScheduledFor' | 'notificationError'>;
