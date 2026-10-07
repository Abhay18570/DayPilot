import { router } from 'expo-router';
import { View } from 'react-native';
import { DayPilotLogo } from '@/components/DayPilotLogo';
import { Button, Copy, Screen, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
export default function ForgotPassword() {
  const c = useDayPilotTheme();
  return <Screen><View style={{ flex: 1, justifyContent: 'center', gap: 24 }}><DayPilotLogo size={64} /><Copy accessibilityRole="header" style={ui.heading}>A little help{ '\n' }getting back in.</Copy><Copy style={{ color: c.muted }}>Password recovery will be available when cloud accounts are introduced.</Copy><Button title="Back to Login" onPress={() => router.replace('/(auth)/login')} /></View></Screen>;
}
