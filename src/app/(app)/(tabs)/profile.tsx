import { NotificationSettings } from '@/components/NotificationSettings';
import { useState, type ComponentProps } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, View, useColorScheme } from 'react-native';
import { Button, Copy, ErrorNotice, Screen, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import { authErrorMessage } from '@/services/authStorage';

export default function Profile() {
  const c = useDayPilotTheme();
  const scheme = useColorScheme();
  const { currentUser, logout } = useAuth();
  const { tasks, isLoading, isSaving, loadError } = useTasks();
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true); setError(null);
    try { await logout(); } catch (failure) { setError(authErrorMessage(failure)); }
    finally { setLeaving(false); }
  }
  const sections: { title: string; icon: ComponentProps<typeof Ionicons>['name']; text: string }[] = [
    { title: 'Account', icon: 'person-outline', text: 'Local account · your plans stay with you on this device.' },
    { title: 'Appearance', icon: 'contrast-outline', text: `Following your device · ${scheme === 'dark' ? 'Dark' : 'Light'} mode. Change appearance in your device settings.` },
    { title: 'Task Preferences', icon: 'options-outline', text: 'Choose category, priority, reminder and repeat preferences when creating or editing each task. Reminders can notify you locally. Repeat remains a preference for later.' },
    { title: 'Data & Storage', icon: 'save-outline', text: isLoading ? 'Loading your saved tasks…' : loadError ? 'Task storage is temporarily unavailable. Retry from the Tasks tab.' : `${tasks.length} saved ${tasks.length === 1 ? 'task' : 'tasks'} · ${tasks.filter(task => task.completed).length} completed. Your tasks stay saved when you log out. No cloud backup yet.` },
    { title: 'About DayPilot', icon: 'paper-plane-outline', text: 'Plan your day. Own your time.\nA little intention, every day.' },
  ];
  const initials = currentUser?.fullName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <Screen tab>
    <Copy accessibilityRole="header" style={ui.heading}>Profile</Copy>
    <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
      <View style={{ width: 78, height: 78, borderRadius: 28, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: c.primary, fontWeight: '800', fontSize: 28, lineHeight: 36 }}>{initials}</Copy></View>
      <Copy style={{ fontSize: 23, lineHeight: 30, fontWeight: '700', textAlign: 'center' }}>{currentUser?.fullName}</Copy>
      <Copy style={{ color: c.muted, textAlign: 'center' }}>{currentUser?.email}</Copy>
    </View>
    {sections.map(section => <View key={section.title} style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={ui.row}><Ionicons name={section.icon} color={c.primary} size={22} /><Copy style={{ fontWeight: '700' }}>{section.title}</Copy></View>
      <Copy style={{ color: c.muted, fontSize: 14 }}>{section.text}</Copy>
    </View>)}
    <NotificationSettings />
    <ErrorNotice message={error} />
    <Button title="Log Out" secondary loading={leaving || isSaving} onPress={() => Alert.alert('Log out of DayPilot?', 'Your tasks will stay saved on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', onPress: () => { void signOut(); } }])} />
  </Screen>;
}
