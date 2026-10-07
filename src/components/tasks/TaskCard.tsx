import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { Copy } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import { taskErrorMessage } from '@/services/taskStorage';
import type { Task } from '@/types/task';
import { formatDisplayDate, formatDisplayTime } from '@/utils/taskDates';
import { isOverdue, taskLabel } from '@/utils/taskSelectors';

export function TaskCard({ task }: { task: Task }) {
  const c = useDayPilotTheme();
  const { toggleTask, isSaving, now } = useTasks();
  const overdue = isOverdue(task, now);
  const priorityColor = task.priority === 'high' ? c.error : task.priority === 'medium' ? c.warning : c.success;
  return <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 20, backgroundColor: c.surface, padding: 8 }}>
    <Pressable accessibilityRole="checkbox" accessibilityLabel={`Complete ${task.title}`} accessibilityState={{ checked: task.completed, disabled: isSaving }} disabled={isSaving}
      onPress={() => { void toggleTask(task.id).catch(error => Alert.alert('Could not update task', taskErrorMessage(error))); }}
      style={({ pressed }) => ({ width: 48, minHeight: 56, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1 })}>
      <Ionicons name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} size={27} color={task.completed ? c.success : c.muted} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`Task details: ${task.title}`} onPress={() => router.push({ pathname: '/(app)/task/[id]', params: { id: task.id } })}
      style={({ pressed }) => ({ flex: 1, gap: 6, paddingVertical: 12, paddingRight: 8, opacity: pressed ? .6 : 1 })}>
      <Copy numberOfLines={2} style={{ fontWeight: '700', textDecorationLine: task.completed ? 'line-through' : 'none', color: task.completed ? c.muted : c.text }}>{task.title}</Copy>
      <Copy style={{ color: c.muted, fontSize: 12, lineHeight: 19 }}>{formatDisplayDate(task.date, now)} · {formatDisplayTime(task.time)} · {taskLabel(task.category)}</Copy>
      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        <Copy style={{ color: priorityColor, fontSize: 11, lineHeight: 17, fontWeight: '700' }}>● {taskLabel(task.priority)}</Copy>
        {overdue && <Copy style={{ color: c.error, fontSize: 11, lineHeight: 17, fontWeight: '700' }}>OVERDUE</Copy>}
        {task.completed && <Copy style={{ color: c.success, fontSize: 11, lineHeight: 17 }}>Completed</Copy>}
      </View>
    </Pressable>
  </View>;
}
