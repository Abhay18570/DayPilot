import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Copy, ErrorNotice, Screen, TextAction, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import type { Task, TaskPriority } from '@/types/task';
import { taskProgress, taskLabel } from '@/utils/taskSelectors';
import { TaskCard } from './TaskCard';

export function EmptyState({ title, description, onAdd }: { title: string; description?: string; onAdd?: () => void }) {
  const c = useDayPilotTheme();
  return <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border, alignItems: 'center', paddingVertical: 28 }]}>
    <View style={{ padding: 15, borderRadius: 20, backgroundColor: c.tint }}><Ionicons name="checkbox-outline" color={c.primary} size={30} /></View>
    <Copy style={{ fontWeight: '700', textAlign: 'center' }}>{title}</Copy>
    {description && <Copy style={{ color: c.muted, textAlign: 'center', fontSize: 14 }}>{description}</Copy>}
    {onAdd && <TextAction label="+ Add Task" onPress={onAdd} />}
  </View>;
}
export function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
    <Copy accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700' }}>{title}</Copy>
    {action && onPress && <TextAction label={action} onPress={onPress} />}
  </View>;
}
export function Chip({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const c = useDayPilotTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ paddingHorizontal: 15, paddingVertical: 10, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.tint : c.surface, opacity: pressed || disabled ? .6 : 1 })}>
    <Copy style={{ color: selected ? c.primary : c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Copy>
  </Pressable>;
}
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const c = useDayPilotTheme();
  const color = priority === 'high' ? c.error : priority === 'medium' ? c.warning : c.success;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    <Copy style={{ color, fontSize: 11, lineHeight: 18, fontWeight: '700' }}>{taskLabel(priority)}</Copy>
  </View>;
}
export function ProgressCard({ tasks }: { tasks: Task[] }) {
  const c = useDayPilotTheme();
  const { completed, total, percent } = taskProgress(tasks);
  return <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
    <View style={[ui.row, { justifyContent: 'space-between' }]}><Copy style={{ fontWeight: '700' }}>Today’s Progress</Copy><Ionicons name="pie-chart-outline" color={c.primary} size={23} /></View>
    <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
      <Copy style={{ color: c.muted, fontSize: 14 }}>{total ? `${completed} of ${total} completed` : '0 tasks scheduled today'}</Copy>
      <Copy style={{ fontSize: 34, lineHeight: 40, fontWeight: '800', color: c.primary }}>{percent}%</Copy>
    </View>
    <View accessibilityRole="progressbar" accessibilityLabel="Today's progress" accessibilityValue={{ min: 0, max: 100, now: percent }} style={{ height: 8, borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' }}>
      <View style={{ width: `${percent}%`, height: '100%', backgroundColor: c.primary, borderRadius: 4 }} />
    </View>
  </View>;
}
export function TaskFeedback() {
  const { feedback, clearFeedback } = useTasks();
  const c = useDayPilotTheme();
  return feedback ? <Pressable accessibilityRole="button" accessibilityLabel={`${feedback} Dismiss`} onPress={clearFeedback} style={{ padding: 14, borderRadius: 14, backgroundColor: c.tint }}>
    <Copy accessibilityLiveRegion="polite" style={{ color: c.primary, fontSize: 14 }}>{feedback}  ×</Copy>
  </Pressable> : null;
}
export function TaskBoundary({ children, tab = false }: PropsWithChildren<{ tab?: boolean }>) {
  const { isLoading, loadError, reload } = useTasks();
  const c = useDayPilotTheme();
  if (isLoading || loadError) return <Screen tab={tab}>{!tab && <BackAction />}<View style={{ flex: 1, justifyContent: 'center', gap: 20 }}>
    {isLoading ? <><ActivityIndicator color={c.primary} /><Copy style={{ textAlign: 'center', color: c.muted }}>Loading your tasks…</Copy></> : <><ErrorNotice message={loadError} /><Button title="Try Again" onPress={() => { void reload(); }} /></>}
  </View></Screen>;
  return children;
}
export function TaskList({ tasks, header, footer, emptyTitle, emptyDescription, onAdd }: {
  tasks: Task[]; header: ReactNode; footer?: ReactNode; emptyTitle: string; emptyDescription?: string; onAdd?: () => void;
}) {
  const c = useDayPilotTheme();
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.background }}>
    <FlatList data={tasks} keyExtractor={task => task.id} renderItem={({ item }) => <TaskCard task={item} />}
      contentContainerStyle={{ padding: 24, gap: 12, flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListHeaderComponent={<View style={{ gap: 24, paddingBottom: 8 }}>{header}</View>}
      ListFooterComponent={footer ? <View style={{ gap: 16, paddingTop: 16 }}>{footer}</View> : null}
      ListEmptyComponent={<EmptyState title={emptyTitle} description={emptyDescription} onAdd={onAdd} />}
    />
  </SafeAreaView>;
}
export function BackAction() {
  return <View style={{ alignSelf: 'flex-start' }}><TextAction label="←  Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)/home')} /></View>;
}
