import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Button, Copy, ErrorNotice, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TaskContext';
import type { NotificationPermission } from '@/types/notification';
import { getNotificationPermissionStatus, notificationErrorMessage, openNotificationSettings, permissionMessage, requestNotificationPermission, sendTestNotification } from '@/services/notificationService';

export function NotificationSettings() {
  const c = useDayPilotTheme();
  const { currentUser } = useAuth();
  const { reconcileReminders, isSaving, feedback, clearFeedback } = useTasks();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useCallback(() => { void getNotificationPermissionStatus().then(setPermission); }, []);
  useEffect(() => {
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);
  async function enable() {
    setBusy(true); setError(null);
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result.status === 'enabled') await reconcileReminders();
    else setError(result.status === 'unavailable' ? 'Notifications are unavailable on this device.' : permissionMessage);
    setBusy(false);
  }
  async function test() {
    if (!currentUser || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try { await sendTestNotification(currentUser.id); setMessage('Test notification scheduled. Lock your phone and wait about 10 seconds.'); }
    catch (failure) { setError(notificationErrorMessage(failure)); }
    finally { refresh(); setBusy(false); }
  }
  const label = permission?.status === 'enabled' ? 'Enabled' : permission?.status === 'disabled' ? 'Disabled' : permission?.status === 'not_determined' ? 'Not Determined' : permission ? 'Unavailable' : 'Checking…';
  return <View style={[ui.card, { backgroundColor: c.surface, borderColor: c.border }]}>
    <Copy style={{ fontWeight: '700', fontSize: 18 }}>Notifications</Copy>
    <Copy>Permission: {label}</Copy>
    <Copy style={{ color: c.muted, fontSize: 14 }}>DayPilot uses notifications for task reminders.</Copy>
    {permission?.quiet && <Copy style={{ color: c.warning, fontSize: 13 }}>Quiet delivery is enabled. Allow alerts and sound in Settings for banners and sound.</Copy>}
    {permission?.status === 'not_determined' && permission.canAskAgain && <Button title="Enable Notifications" loading={busy || isSaving} onPress={() => { void enable(); }} />}
    {(permission?.status === 'disabled' || permission?.quiet || (permission?.status === 'not_determined' && !permission.canAskAgain)) && <Button title={Platform.OS === 'ios' ? 'Open iPhone Settings' : 'Open System Settings'} secondary onPress={() => { void openNotificationSettings().catch(failure => setError(notificationErrorMessage(failure))); }} />}
    {permission?.status === 'enabled' && <Button title="Check / Retry Reminders" secondary loading={busy || isSaving} onPress={() => { clearFeedback(); void reconcileReminders(); }} />}
    {feedback && <Copy accessibilityLiveRegion="polite" style={{ color: c.muted, fontSize: 13 }}>{feedback}</Copy>}
    {__DEV__ && <><Copy style={[ui.eyebrow, { color: c.muted }]}>DEVELOPMENT TEST TOOL</Copy><Button title="Send Test Notification" secondary loading={busy || isSaving} onPress={() => { void test(); }} /></>}
    {message && <Copy accessibilityLiveRegion="polite" style={{ color: c.success, fontSize: 13 }}>{message}</Copy>}
    <ErrorNotice message={error} />
  </View>;
}
