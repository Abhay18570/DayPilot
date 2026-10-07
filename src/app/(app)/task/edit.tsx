import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/DayPilotUI';
import { TaskForm } from '@/components/tasks/TaskForm';
import { BackAction, EmptyState, TaskBoundary } from '@/components/tasks/TaskUI';
import { useTasks } from '@/context/TaskContext';
export default function EditTask() {
  return <TaskBoundary><EditContent /></TaskBoundary>;
}
function EditContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks } = useTasks();
  const task = tasks.find(task => task.id === id);
  if (!task) return <Screen><BackAction /><EmptyState title="Task not found" description="This task is no longer available in your account." /></Screen>;
  return <TaskForm key={task.id} task={task} />;
}
