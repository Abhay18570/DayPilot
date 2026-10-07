import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { consumeReminderResponse, getLastReminderResponse, subscribeToReminderResponses } from '@/services/notificationService';
import { notificationTaskTarget } from '@/utils/reminders';

/** One listener inside the protected app. Native retains the last tap while splash
 * or login is visible; routing waits until this user's task collection is loaded. */
export function NotificationResponseBridge() {
  const [pending, setPending] = useState(getLastReminderResponse);
  const navigation = useRootNavigationState();
  const { currentUser } = useAuth();
  const { tasks, isLoading, loadError } = useTasks();
  useEffect(() => subscribeToReminderResponses(setPending), []);
  useEffect(() => {
    if (!pending || !navigation?.key || !currentUser || isLoading || loadError) return;
    if (!consumeReminderResponse(pending.key)) return;
    const id = notificationTaskTarget(pending.data, currentUser.id, tasks);
    if (id) router.navigate({ pathname: '/(app)/task/[id]', params: { id } });
    else {
      router.navigate('/(app)/(tabs)/home');
      Alert.alert('Reminder unavailable', 'This task is not available in the current account.');
    }
  }, [pending, navigation?.key, currentUser, tasks, isLoading, loadError]);
  return null;
}
