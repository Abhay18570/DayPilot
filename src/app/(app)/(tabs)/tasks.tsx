import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Copy, Field, ui } from '@/components/DayPilotUI';
import { Chip, TaskBoundary, TaskFeedback, TaskList } from '@/components/tasks/TaskUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import type { TaskFilter, TaskSort } from '@/types/task';
import { selectTasks, taskLabel } from '@/utils/taskSelectors';

const filters: TaskFilter[] = ['all', 'today', 'upcoming', 'completed', 'overdue'];
const sorts: { value: TaskSort; label: string }[] = [{ value: 'date', label: 'Date' }, { value: 'priority', label: 'Priority' }, { value: 'recent', label: 'Recently Added' }];
export default function Tasks() { return <TaskBoundary tab><TasksContent /></TaskBoundary>; }
function TasksContent() {
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const filter: TaskFilter = filters.includes(filterParam as TaskFilter) ? filterParam as TaskFilter : 'all';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<TaskSort>('date');
  const { tasks, now } = useTasks();
  const c = useDayPilotTheme();
  const filtered = selectTasks(tasks, filter, query, sort, now);
  return <TaskList tasks={filtered}
    emptyTitle={query ? 'No matching tasks' : filter === 'completed' ? 'Nothing completed yet.' : filter === 'overdue' ? 'All caught up.' : 'No tasks here yet.'}
    emptyDescription={query ? 'Try another title, description or category.' : filter === 'overdue' ? 'You have no overdue tasks.' : 'Create a task and start planning your day.'}
    onAdd={() => router.push('/(app)/add-task')}
    header={<>
      <View style={{ gap: 8 }}><Copy accessibilityRole="header" style={ui.heading}>My Tasks</Copy><Copy style={{ color: c.muted }}>A little structure. A clearer mind.</Copy></View>
      <TaskFeedback />
      <Field label="Search tasks" icon="search-outline" placeholder="Title, description or category" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{filters.map(value => <Chip key={value} label={taskLabel(value)} selected={filter === value} onPress={() => router.setParams({ filter: value })} />)}</View>
      <View style={{ gap: 8 }}><Copy style={[ui.eyebrow, { color: c.muted }]}>SORT BY</Copy><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{sorts.map(option => <Chip key={option.value} label={option.label} selected={sort === option.value} onPress={() => setSort(option.value)} />)}</View></View>
      <Copy style={{ fontSize: 13, color: c.muted }}>{filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}</Copy>
    </>}
  />;
}
