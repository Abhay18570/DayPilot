import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { Copy, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import type { Task } from '@/types/task';
import { reminderLabel } from '@/utils/reminders';
export function ReminderDetails({ task }: { task: Task }) {
  const c = useDayPilotTheme();
  const { now } = useTasks();
  const future = task.notificationScheduledFor && Date.parse(task.notificationScheduledFor) > now.getTime();
  const scheduled = task.notificationId && future && !task.notificationError;
  const status = !task.reminderEnabled ? 'Off' : task.completed ? 'Canceled · task completed' : task.notificationError ? 'Not scheduled' : scheduled ? reminderLabel(task.reminderOffset) : task.notificationScheduledFor ? 'Reminder time passed' : 'Not scheduled';
  return <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
    <View style={ui.row}><Ionicons name={scheduled ? 'notifications-outline' : 'notifications-off-outline'} size={22} color={c.primary} /><Copy style={{ fontWeight: '700' }}>Reminder</Copy></View>
    <Copy style={{ color: task.notificationError ? c.warning : c.text }}>{status}</Copy>
    {scheduled && <Copy style={{ color: c.muted, fontSize: 14 }}>Scheduled for {new Date(task.notificationScheduledFor!).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Copy>}
    {task.reminderEnabled && !task.completed && task.notificationError && <Copy style={{ color: c.muted, fontSize: 13 }}>{task.notificationError}</Copy>}
  </View>;
}
