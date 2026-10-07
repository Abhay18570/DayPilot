import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Copy, ui } from '@/components/DayPilotUI';
import { MonthCalendar } from '@/components/tasks/MonthCalendar';
import { SectionHeader, TaskBoundary, TaskList } from '@/components/tasks/TaskUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useTasks } from '@/context/TaskContext';
import { parseDateKey, toDateKey } from '@/utils/taskDates';
export default function Calendar() { return <TaskBoundary tab><CalendarContent /></TaskBoundary>; }
function CalendarContent() {
  const c = useDayPilotTheme();
  const { tasks, getTasksForDate, now } = useTasks();
  const [selected, setSelected] = useState(() => toDateKey(now));
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1, 12));
  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next); setSelected(toDateKey(next));
  }
  const add = () => router.push({ pathname: '/(app)/add-task', params: { date: selected } });
  return <TaskList tasks={getTasksForDate(selected)} emptyTitle="No tasks scheduled for this day." emptyDescription="A little space to plan something good." onAdd={add}
    header={<>
      <View style={{ gap: 8 }}><Copy accessibilityRole="header" style={ui.heading}>Calendar</Copy><Copy style={{ color: c.muted }}>See the bigger picture, one day at a time.</Copy></View>
      <MonthCalendar month={month} selected={selected} today={toDateKey(now)} taskDates={new Set(tasks.map(task => task.date))} onSelect={setSelected} onMonth={moveMonth}
        onToday={() => { setSelected(toDateKey(now)); setMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12)); }} />
      <SectionHeader title={`Tasks for ${parseDateKey(selected).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`} />
      <Button title="+ Add Task" onPress={add} />
    </>}
  />;
}
