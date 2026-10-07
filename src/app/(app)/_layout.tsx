import { NotificationResponseBridge } from '@/components/NotificationResponseBridge';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { TaskProvider } from '@/context/TaskContext';
import { useDayPilotTheme } from '@/constants/daypilot';

export const unstable_settings = { initialRouteName: '(tabs)' };
export default function AppLayout() {
  const { currentUser } = useAuth();
  const c = useDayPilotTheme();
  if (!currentUser) return null;
  return <TaskProvider key={currentUser.id} userId={currentUser.id}>
    <NotificationResponseBridge />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-task" options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="task/[id]" />
      <Stack.Screen name="task/edit" options={{ gestureEnabled: false }} />
    </Stack>
  </TaskProvider>;
}
