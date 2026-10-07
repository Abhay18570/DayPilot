import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Keyboard, Switch, View } from 'react-native';
import { Button, Copy, ErrorNotice, Field, Screen, TextAction, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import { requestNotificationPermission, permissionMessage } from '@/services/notificationService';
import { REMINDER_OPTIONS } from '@/utils/reminders';
import { taskErrorMessage } from '@/services/taskStorage';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_REPEATS, type Task, type TaskErrors, type TaskInput } from '@/types/task';
import { isValidDate, toDateKey, toTimeKey } from '@/utils/taskDates';
import { taskLabel } from '@/utils/taskSelectors';
import { validateTask } from '@/utils/taskValidation';
import { Chip } from './TaskUI';
import { DateTimeField } from './DateTimeField';

export function TaskForm({ task, initialDate }: { task?: Task; initialDate?: string }) {
  const c = useDayPilotTheme();
  const { createTask, updateTask, isSaving } = useTasks();
  const [values, setValues] = useState<TaskInput>(() => task ? {
    title: task.title, description: task.description, date: task.date, time: task.time,
    category: task.category, priority: task.priority, reminderEnabled: task.reminderEnabled, reminderOffset: task.reminderOffset, repeat: task.repeat,
  } : {
    title: '', description: '', date: initialDate && isValidDate(initialDate) ? initialDate : toDateKey(new Date()),
    time: toTimeKey(new Date()), category: 'personal', priority: 'medium', reminderEnabled: false, reminderOffset: 'at_time', repeat: 'none',
  });
  const [errors, setErrors] = useState<TaskErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const submitting = useRef(false);
  function change<K extends keyof TaskInput>(key: K, value: TaskInput[K]) {
    setValues(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setDirty(true); setError(null);
  }
  async function toggleReminder(enabled: boolean) {
    change('reminderEnabled', enabled);
    setReminderNotice(null);
    if (!enabled) return;
    setPermissionBusy(true);
    const permission = await requestNotificationPermission();
    if (permission.status !== 'enabled') setReminderNotice(permission.status === 'unavailable'
      ? 'Notifications are unavailable right now. You can still save the task.' : permissionMessage);
    setPermissionBusy(false);
  }
  function close() {
    if (isSaving) return;
    const leave = () => router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/home');
    if (dirty) Alert.alert('Discard changes?', 'Your unsaved changes will be lost.', [{ text: 'Keep Editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: leave }]);
    else leave();
  }
  async function save() {
    if (submitting.current || isSaving || permissionBusy) return;
    const validation = validateTask(values);
    setErrors(validation);
    if (Object.keys(validation).length) { setError('Check the highlighted fields above.'); return; }
    submitting.current = true; setError(null); Keyboard.dismiss();
    try {
      const saved = task ? await updateTask(task.id, values) : await createTask(values);
      if (task && router.canGoBack()) router.back();
      else router.replace({ pathname: '/(app)/task/[id]', params: { id: saved.id } });
    } catch (failure) { setError(taskErrorMessage(failure)); }
    finally { submitting.current = false; }
  }
  return <Screen form>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><TextAction label="Cancel" onPress={close} /><Copy style={[ui.eyebrow, { color: c.primary, flex: 1, textAlign: 'right' }]}>MAKE ROOM FOR WHAT MATTERS</Copy></View>
    <View style={{ gap: 10 }}><Copy accessibilityRole="header" style={ui.heading}>{task ? 'Edit Task' : 'Add Task'}</Copy><Copy style={{ color: c.muted }}>A little intention goes a long way.</Copy></View>
    <Field label="Task Title" icon="create-outline" placeholder="What would you like to get done?" value={values.title} onChangeText={value => change('title', value)} error={errors.title} maxLength={150} editable={!isSaving} autoCapitalize="sentences" />
    <Field label="Description · optional" icon="document-text-outline" placeholder="A few details, a small first step…" multiline numberOfLines={4} value={values.description} onChangeText={value => change('description', value)} error={errors.description} maxLength={5000} editable={!isSaving} textAlignVertical="top" />
    <DateTimeField mode="date" date={values.date} time={values.time} onChange={value => change('date', value)} error={errors.date} disabled={isSaving} />
    <DateTimeField mode="time" date={values.date} time={values.time} onChange={value => change('time', value)} error={errors.time} disabled={isSaving} />
    <View style={{ gap: 12 }}><Copy style={{ fontWeight: '700' }}>Category</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{TASK_CATEGORIES.map(category => <Chip key={category} label={taskLabel(category)} selected={values.category === category} onPress={() => change('category', category)} disabled={isSaving} />)}</View><ErrorNotice message={errors.category ?? null} /></View>
    <View style={{ gap: 12 }}><Copy style={{ fontWeight: '700' }}>Priority</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{TASK_PRIORITIES.map(priority => <Chip key={priority} label={`${priority === 'high' ? '↑' : priority === 'medium' ? '—' : '↓'} ${taskLabel(priority)}`} selected={values.priority === priority} onPress={() => change('priority', priority)} disabled={isSaving} />)}</View></View>
    <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Copy style={{ fontWeight: '700' }}>Remind me</Copy><Switch accessibilityLabel="Remind me" value={values.reminderEnabled} onValueChange={value => { void toggleReminder(value); }} disabled={isSaving || permissionBusy} trackColor={{ false: c.border, true: c.button }} /></View>
      <Copy style={{ fontSize: 13, color: c.muted }}>A one-time reminder for this task. No internet is needed after it is scheduled.</Copy>
    </View>
    {values.reminderEnabled && <View style={{ gap: 12 }}>
      <Copy style={{ fontWeight: '700' }}>Reminder timing</Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{REMINDER_OPTIONS.map(option => <Chip key={option.value} label={option.label} selected={values.reminderOffset === option.value} onPress={() => change('reminderOffset', option.value)} disabled={isSaving || permissionBusy} />)}</View>
      {permissionBusy && <Copy style={{ color: c.muted, fontSize: 13 }}>Checking notification permission…</Copy>}
      {reminderNotice && <Copy accessibilityRole="alert" style={{ color: c.warning, fontSize: 13 }}>{reminderNotice}</Copy>}
      <ErrorNotice message={errors.reminderOffset ?? null} />
    </View>}
    <View style={{ gap: 12 }}><Copy style={{ fontWeight: '700' }}>Repeat</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{TASK_REPEATS.map(repeat => <Chip key={repeat} label={taskLabel(repeat)} selected={values.repeat === repeat} onPress={() => change('repeat', repeat)} disabled={isSaving} />)}</View><Copy style={{ color: c.muted, fontSize: 13 }}>Saved as a preference. Repeating tasks aren’t generated yet.</Copy></View>
    <ErrorNotice message={error} />
    <Button title={task ? 'Save Changes' : 'Create Task'} onPress={() => { void save(); }} loading={isSaving || permissionBusy} />
  </Screen>;
}
