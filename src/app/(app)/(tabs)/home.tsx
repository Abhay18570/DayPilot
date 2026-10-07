import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { DayPilotLogo } from '@/components/DayPilotLogo';
import { Button, Copy, ui } from '@/components/DayPilotUI';
import { TaskCard } from '@/components/tasks/TaskCard';
import { EmptyState, ProgressCard, SectionHeader, TaskBoundary, TaskFeedback, TaskList } from '@/components/tasks/TaskUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';

export default function Home() { return <TaskBoundary tab><HomeContent /></TaskBoundary>; }
function HomeContent() {
  const c = useDayPilotTheme();
  const { currentUser, feedback, clearFeedback } = useAuth();
  const { getTodayTasks, getUpcomingTasks, now } = useTasks();
  const today = getTodayTasks();
  const upcoming = getUpcomingTasks().slice(0, 4);
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const add = () => router.push('/(app)/add-task');
  return <TaskList tasks={today} emptyTitle="Your day is clear ✨" emptyDescription="No tasks scheduled for today." onAdd={add}
    header={<>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <View style={ui.row}><DayPilotLogo size={36} /><Copy style={{ fontSize: 20, fontWeight: '800' }}>DayPilot</Copy></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open Profile" onPress={() => router.navigate('/(app)/(tabs)/profile')} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-outline" size={22} color={c.primary} /></Pressable>
      </View>
      <View style={{ gap: 9 }}>
        <Copy style={[ui.eyebrow, { color: c.primary }]}>{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</Copy>
        <Copy accessibilityRole="header" style={ui.heading}>{greeting},{'\n'}{currentUser?.fullName.split(/\s+/)[0]} 👋</Copy>
        <Copy style={{ color: c.muted }}>Let’s make today productive.</Copy>
      </View>
      {feedback && <Pressable accessibilityRole="button" accessibilityLabel={`${feedback} Dismiss`} onPress={clearFeedback}><Copy style={{ color: c.primary, fontSize: 14 }}>{feedback} ×</Copy></Pressable>}
      <TaskFeedback /><ProgressCard tasks={today} />
      <Button title="+ Add Task" onPress={add} />
      <SectionHeader title="Today’s Tasks" />
    </>}
    footer={<>
      <SectionHeader title="Upcoming" action="See All" onPress={() => router.navigate({ pathname: '/(app)/(tabs)/tasks', params: { filter: 'upcoming' } })} />
      {upcoming.length ? upcoming.map(task => <TaskCard key={task.id} task={task} />) : <EmptyState title="Nothing coming up" description="Give your future self a little head start." onAdd={add} />}
    </>}
  />;
}
