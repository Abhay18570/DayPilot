import { initializeNotifications } from '@/services/notificationService';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DayPilotSplash } from '@/components/DayPilotSplash';
import { useDayPilotTheme } from '@/constants/daypilot';

initializeNotifications();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
function Navigation() {
  const { isAuthenticated, isLoading, startupError, checkAuth } = useAuth();
  const [splashComplete, setSplashComplete] = useState(false);
  const complete = useCallback(() => setSplashComplete(true), []);
  const c = useDayPilotTheme();
  if (!splashComplete || isLoading || startupError) return <DayPilotSplash onComplete={complete} error={startupError} retry={() => { void checkAuth(); }} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
    <Stack.Screen name="index" />
    <Stack.Protected guard={!isAuthenticated}><Stack.Screen name="(auth)" /></Stack.Protected>
    <Stack.Protected guard={isAuthenticated}><Stack.Screen name="(app)" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  return <ThemeProvider value={dark ? DarkTheme : DefaultTheme}><AuthProvider><StatusBar style={dark ? 'light' : 'dark'} /><Navigation /></AuthProvider></ThemeProvider>;
}
