import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { NotificationPermission, TaskNotificationAdapter } from '../types/notification';
import type { Task } from '../types/task';
import { isTaskReminder, reminderIdentifier, taskReminderPayload } from '../utils/reminders';

export class NotificationError extends Error {}
export const notificationErrorMessage = (error: unknown) => error instanceof NotificationError ? error.message : 'Notifications are temporarily unavailable. Please try again.';
export const permissionMessage = 'Notifications are disabled. Enable them in iPhone Settings to receive task reminders.';
const channelId = 'daypilot-task-reminders';
let permissionRequest: Promise<NotificationPermission> | null = null;

export function initializeNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}
function permission(value: Notifications.NotificationPermissionsStatus): NotificationPermission {
  const quiet = value.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const enabled = value.granted || quiet || value.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
  return { status: enabled ? 'enabled' : value.status === 'undetermined' ? 'not_determined' : 'disabled', canAskAgain: value.canAskAgain, quiet };
}
async function ensureChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, { name: 'Task reminders', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
}
export async function getNotificationPermissionStatus(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return { status: 'unavailable', canAskAgain: false };
  try { return permission(await Notifications.getPermissionsAsync()); }
  catch { return { status: 'unavailable', canAskAgain: false }; }
}
export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (permissionRequest) return permissionRequest;
  permissionRequest = (async () => {
    const current = await getNotificationPermissionStatus();
    if (current.status !== 'not_determined' || !current.canAskAgain) return current;
    try {
      await ensureChannel();
      return permission(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
    } catch { return { status: 'unavailable', canAskAgain: false } as NotificationPermission; }
  })().finally(() => { permissionRequest = null; });
  return permissionRequest;
}
export async function getScheduledNotifications() {
  if (Platform.OS === 'web') return [];
  return (await Notifications.getAllScheduledNotificationsAsync()).map(request => ({ identifier: request.identifier, data: request.content.data ?? {} }));
}
export async function scheduleTaskNotification(task: Task, date: Date): Promise<string> {
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new NotificationError('The selected reminder time has already passed.');
  if ((await getNotificationPermissionStatus()).status !== 'enabled') throw new NotificationError(permissionMessage);
  await ensureChannel();
  // Re-check after asynchronous permission/channel work; never pass a stale date
  // to native scheduling, which could otherwise deliver immediately.
  if (date.getTime() <= Date.now() + 1000) throw new NotificationError('The selected reminder time has already passed or is too close. Choose a later time.');
  return Notifications.scheduleNotificationAsync({
    identifier: reminderIdentifier(task),
    content: { title: task.title, body: task.reminderOffset === 'at_time' ? "It’s time to start your task." : 'Your task is coming up soon.', sound: 'default', data: taskReminderPayload(task, date) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
  });
}
export async function cancelNotification(identifier: string) {
  if (Platform.OS !== 'web') await Notifications.cancelScheduledNotificationAsync(identifier);
}
export async function cancelTaskNotification(task: Task) {
  const requests = await getScheduledNotifications();
  for (const request of requests) {
    if (isTaskReminder(request.data) && request.data.userId === task.userId && request.data.taskId === task.id) await cancelNotification(request.identifier);
  }
}
export const notificationService: TaskNotificationAdapter = { getNotificationPermissionStatus, getScheduledNotifications, scheduleTaskNotification, cancelNotification };
export async function openNotificationSettings() {
  try { await Linking.openSettings(); } catch { throw new NotificationError('System settings could not be opened. Open Settings manually to change notification permissions.'); }
}
export async function sendTestNotification(userId: string) {
  if ((await requestNotificationPermission()).status !== 'enabled') throw new NotificationError(permissionMessage);
  await ensureChannel();
  return Notifications.scheduleNotificationAsync({
    identifier: `daypilot-test:${encodeURIComponent(userId)}`,
    content: { title: 'DayPilot reminder test', body: 'Your local notifications are working.', sound: 'default', data: { app: 'daypilot', type: 'notification-test', userId } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 10_000), channelId },
  });
}

export type ReminderResponse = { key: string; data: Record<string, unknown> };
const handled = new Set<string>();
function responseData(response: Notifications.NotificationResponse | null): ReminderResponse | null {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
  const { notification } = response;
  if (!isTaskReminder(notification.request.content.data)) return null;
  const key = `${notification.request.identifier}:${notification.date}:${response.actionIdentifier}`;
  return handled.has(key) ? null : { key, data: notification.request.content.data };
}
export function getLastReminderResponse(): ReminderResponse | null {
  if (Platform.OS === 'web') return null;
  try { return responseData(Notifications.getLastNotificationResponse()); } catch { return null; }
}
export function subscribeToReminderResponses(listener: (response: ReminderResponse) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  let active = true;
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const value = responseData(response);
    if (value) listener(value);
  });
  // Close the small cold-start gap between reading the last response and attaching
  // the listener. Duplicate events are consumed only once by their response key.
  void Promise.resolve().then(() => {
    const latest = getLastReminderResponse();
    if (active && latest) listener(latest);
  });
  return () => { active = false; subscription.remove(); };
}
export function consumeReminderResponse(key: string): boolean {
  if (handled.has(key)) return false;
  const latest = getLastReminderResponse();
  handled.add(key);
  try { if (latest?.key === key) Notifications.clearLastNotificationResponse(); } catch { /* In-memory deduplication remains active. */ }
  return true;
}
