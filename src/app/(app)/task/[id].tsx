import { ReminderDetails } from '@/components/tasks/ReminderDetails';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Copy, ErrorNotice, Screen, TextAction, ui } from '@/components/DayPilotUI';
import { BackAction, EmptyState, PriorityBadge, TaskBoundary, TaskFeedback } from '@/components/tasks/TaskUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import { taskErrorMessage } from '@/services/taskStorage';
import { formatDisplayDate, formatDisplayTime } from '@/utils/taskDates';
import { isOverdue, taskLabel } from '@/utils/taskSelectors';
export default function Details() { return <TaskBoundary><DetailsContent /></TaskBoundary>; }
function DetailsContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, toggleTask, deleteTask, isSaving, now } = useTasks();
  const c = useDayPilotTheme();
  const [error, setError] = useState<string | null>(null);
  const task = tasks.find(task => task.id === id);
  if (!task) return <Screen><BackAction /><EmptyState title="Task not found" description="This task is no longer available in your account." /></Screen>;
  async function complete() {
    setError(null);
    try { await toggleTask(id); } catch (failure) { setError(taskErrorMessage(failure)); }
  }
  function remove() {
    if (isSaving) return;
    Alert.alert('Delete Task?', 'This task will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        void deleteTask(id).then(() => { router.dismissAll(); router.navigate('/(app)/(tabs)/tasks'); }).catch(failure => setError(taskErrorMessage(failure)));
      } },
    ]);
  }
  return <Screen>
    <BackAction /><TaskFeedback />
    <View style={{ gap: 14 }}>
      <Copy style={[ui.eyebrow, { color: task.completed ? c.success : isOverdue(task, now) ? c.error : c.primary }]}>{task.completed ? 'COMPLETED' : isOverdue(task, now) ? 'OVERDUE' : 'TO DO'}</Copy>
      <Copy accessibilityRole="header" style={ui.heading}>{task.title}</Copy>
      <PriorityBadge priority={task.priority} />
      <Copy style={{ color: c.muted }}>{task.description || 'No description added.'}</Copy>
    </View>
    <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={ui.row}><Ionicons name="calendar-outline" size={22} color={c.primary} /><Copy style={{ flex: 1 }}>{formatDisplayDate(task.date, now)} · {formatDisplayTime(task.time)}</Copy></View>
      {[
        ['Category', taskLabel(task.category)], ['Priority', taskLabel(task.priority)],
        ['Repeat', `${taskLabel(task.repeat)}${task.repeat !== 'none' ? ' · preference only' : ''}`],
        ['Status', task.completed ? 'Completed' : 'Incomplete'],
      ].map(([label, value]) => <View key={label} style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Copy style={{ color: c.muted, fontSize: 14 }}>{label}</Copy><Copy style={{ fontSize: 14, fontWeight: '600' }}>{value}</Copy></View>)}
      {task.completedAt && <Copy style={{ color: c.muted, fontSize: 12 }}>Completed {new Date(task.completedAt).toLocaleString()}</Copy>}
    </View>
    <ReminderDetails task={task} />
    <ErrorNotice message={error} />
    <Button title={task.completed ? 'Mark Incomplete' : 'Mark Complete'} loading={isSaving} onPress={() => { void complete(); }} />
    <Button title="Edit Task" secondary loading={isSaving} onPress={() => router.push({ pathname: '/(app)/task/edit', params: { id } })} />
    <TextAction label="Delete Task" onPress={remove} />
  </Screen>;
}
