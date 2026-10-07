import { useLocalSearchParams } from 'expo-router';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskBoundary } from '@/components/tasks/TaskUI';
export default function AddTask() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <TaskBoundary><TaskForm initialDate={typeof date === 'string' ? date : undefined} /></TaskBoundary>;
}
