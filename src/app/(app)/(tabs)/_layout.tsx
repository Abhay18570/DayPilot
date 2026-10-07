import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, router } from 'expo-router';
import { View } from 'react-native';
import { useDayPilotTheme } from '@/constants/daypilot';

export default function TabsLayout() {
  const c = useDayPilotTheme();
  return <Tabs initialRouteName="home" screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted,
    tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    sceneStyle: { backgroundColor: c.background },
  }}>
    <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="add" listeners={{ tabPress: event => { event.preventDefault(); router.push('/(app)/add-task'); } }} options={{
      title: 'Add Task', tabBarAccessibilityLabel: 'Add Task',
      tabBarIcon: () => <View style={{ backgroundColor: c.button, width: 46, height: 46, borderRadius: 23, marginTop: -14, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.surface }}><Ionicons name="add" color={c.onPrimary} size={28} /></View>,
    }} />
    <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
  </Tabs>;
}
