import type { Task, TaskInput } from '../types/task';
import type { ReminderMetadata, ScheduledReminder, TaskNotificationAdapter } from '../types/notification';
import { calculateReminderDate, isTaskReminder, reminderIdentifier, reminderSignature } from '../utils/reminders';
import { validateTask } from '../utils/taskValidation';
import { createTaskStorage, TaskStorageError } from './taskStorage';

type Repository = ReturnType<typeof createTaskStorage>;
const emptyMetadata: ReminderMetadata = { notificationId: null, notificationScheduledFor: null, notificationError: null };
const matching = (request: ScheduledReminder, task: Task) => isTaskReminder(request.data) && request.data.userId === task.userId && request.data.taskId === task.id;

/** Coordinates OS side effects with the existing repository. No notification failure
 * after a successful task save is reported as a failed task creation. */
export function createTaskReminderManager(repository: Repository, notifications: TaskNotificationAdapter, clock = () => new Date()) {
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(action: () => Promise<T>): Promise<T> {
    const result = queue.then(action);
    queue = result.catch(() => undefined);
    return result;
  }
  async function metadata(task: Task, value: ReminderMetadata): Promise<Task> {
    if (task.notificationId === value.notificationId && task.notificationScheduledFor === value.notificationScheduledFor && task.notificationError === value.notificationError) return task;
    return (await repository.setReminderMetadata(task.userId, task.id, value)).task;
  }
  async function cancel(task: Task, requests?: ScheduledReminder[]) {
    for (const request of requests ?? await notifications.getScheduledNotifications()) {
      if (matching(request, task)) await notifications.cancelNotification(request.identifier);
    }
  }
  async function synchronize(task: Task, requests?: ScheduledReminder[]): Promise<Task> {
    let scheduledId: string | null = null;
    try {
      if (!requests && !task.notificationId && (!task.reminderEnabled || task.completed)) return await metadata(task, emptyMetadata);
      const pending = (requests ?? await notifications.getScheduledNotifications()).filter(request => matching(request, task));
      let issue: string | null = null;
      let date: Date | null = null;
      if (task.reminderEnabled && !task.completed) {
        try { date = calculateReminderDate(task); } catch { issue = 'The task time is invalid for this timezone. Choose another time.'; }
        if (date && date.getTime() <= clock().getTime()) {
          if (task.notificationScheduledFor === date.toISOString() && !task.notificationError) {
            await cancel(task, pending);
            return await metadata(task, { ...emptyMetadata, notificationScheduledFor: date.toISOString() });
          }
          issue = 'The selected reminder time has already passed.';
        }
        if (!issue) {
          const permission = await notifications.getNotificationPermissionStatus();
          if (permission.status !== 'enabled') issue = permission.status === 'unavailable'
            ? 'Notifications are temporarily unavailable. Your task is saved.'
            : 'Notifications are disabled. Enable them in iPhone Settings to receive task reminders.';
        }
      }
      if (!task.reminderEnabled || task.completed || issue || !date) {
        await cancel(task, pending);
        return await metadata(task, { ...emptyMetadata, notificationError: issue });
      }
      // Reuse a matching OS request on restart; recover an ID if the app was closed
      // between scheduling and persisting it. Cancel only this task's stale requests.
      const existing = pending.find(request => request.data.signature === reminderSignature(task) && request.data.scheduledFor === date.toISOString());
      for (const request of pending) if (request.identifier !== existing?.identifier) await notifications.cancelNotification(request.identifier);
      scheduledId = existing?.identifier ?? await notifications.scheduleTaskNotification(task, date);
      return await metadata(task, { notificationId: scheduledId, notificationScheduledFor: date.toISOString(), notificationError: null });
    } catch {
      // A deterministic request ID and scoped payload let reconciliation recover even
      // if both native compensation and the metadata write fail.
      let cancellationFailed = false;
      try { await cancel(task); await notifications.cancelNotification(scheduledId ?? reminderIdentifier(task)); }
      catch { cancellationFailed = true; }
      const value: ReminderMetadata = {
        ...emptyMetadata,
        notificationId: cancellationFailed ? scheduledId ?? task.notificationId : null,
        notificationError: cancellationFailed
          ? 'Your task is saved, but its reminder could not be updated. A previous reminder may still arrive. Retry from Notifications.'
          : 'Your task is saved, but its reminder could not be scheduled. Retry from Notifications.',
      };
      try { return await metadata(task, value); } catch { return { ...task, ...value }; }
    }
  }
  async function find(userId: string, id: string) {
    const task = (await repository.getUserTasks(userId)).find(task => task.id === id);
    if (!task) throw new TaskStorageError('This task is no longer available.');
    return task;
  }
  async function beforeChange(task: Task) {
    // Tasks with no reminder keep working if notifications are unavailable.
    if (!task.reminderEnabled && !task.notificationId) return;
    try { await cancel(task); }
    catch { throw new TaskStorageError('The existing reminder could not be canceled. Your task has not changed. Please try again.'); }
  }
  async function result(task: Task, tasks: Task[]) {
    const updated = await synchronize(task);
    return { task: updated, tasks: tasks.map(value => value.id === updated.id ? updated : value) };
  }
  return {
    createTask: (userId: string, input: TaskInput) => serial(async () => {
      const saved = await repository.createTask(userId, input);
      return result(saved.task, saved.tasks);
    }),
    updateTask: (userId: string, id: string, input: TaskInput) => serial(async () => {
      if (Object.keys(validateTask(input)).length) throw new TaskStorageError('Please check the task fields.');
      const old = await find(userId, id);
      await beforeChange(old);
      try {
        const saved = await repository.updateTask(userId, id, input);
        return await result(saved.task, saved.tasks);
      } catch (error) { await synchronize(old); throw error; }
    }),
    toggleTaskCompletion: (userId: string, id: string) => serial(async () => {
      const old = await find(userId, id);
      await beforeChange(old);
      try {
        const saved = await repository.toggleTaskCompletion(userId, id);
        return await result(saved.task, saved.tasks);
      } catch (error) { await synchronize(old); throw error; }
    }),
    deleteTask: (userId: string, id: string) => serial(async () => {
      const old = await find(userId, id);
      await beforeChange(old);
      try { return await repository.deleteTask(userId, id); }
      catch (error) { await synchronize(old); throw error; }
    }),
    reconcileTaskNotifications: (userId: string) => serial(async () => {
      const tasks = await repository.getUserTasks(userId);
      let scheduled: ScheduledReminder[];
      try { scheduled = await notifications.getScheduledNotifications(); }
      catch { return { tasks, warning: 'Reminders could not be checked. Your tasks are available; retry from Notifications.' }; }
      let warning: string | null = null;
      const currentIds = new Set(tasks.map(task => task.id));
      for (const request of scheduled) {
        if (isTaskReminder(request.data) && request.data.userId === userId && !currentIds.has(request.data.taskId)) {
          try { await notifications.cancelNotification(request.identifier); }
          catch { warning = 'An old reminder could not be canceled. Retry from Notifications.'; }
        }
      }
      const updated: Task[] = [];
      for (const task of tasks) {
        const value = await synchronize(task, scheduled);
        updated.push(value);
        if (value.notificationError && value.notificationError !== 'The selected reminder time has already passed.') warning = 'Some reminders are not scheduled. Check task details or retry from Notifications.';
      }
      return { tasks: updated, warning };
    }),
  };
}
