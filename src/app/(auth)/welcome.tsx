import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { DayPilotLogo } from '@/components/DayPilotLogo';
import { Button, Copy, Screen, TextAction, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';

export default function Welcome() {
  const c = useDayPilotTheme();
  return <Screen>
    <View style={ui.row}><DayPilotLogo size={40} /><Copy style={{ fontSize: 22, fontWeight: '800', letterSpacing: -.7 }}>DayPilot</Copy></View>
    <View style={{ backgroundColor: c.tint, borderRadius: 30, padding: 24, gap: 14, marginTop: 8 }} accessibilityLabel="Preview of a planned day">
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Copy style={[ui.eyebrow, { color: c.primary, flex: 1 }]}>A LITTLE PLAN. A BIG DIFFERENCE.</Copy><Ionicons name="sunny-outline" size={22} color={c.primary} /></View>
      <View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 18, gap: 16, transform: [{ rotate: '-2deg' }], boxShadow: '0px 8px 24px rgba(30, 27, 75, 0.08)' }}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><Copy style={{ fontWeight: '700' }}>Your day, with intention</Copy><View style={{ height: 8, width: 8, borderRadius: 4, backgroundColor: '#22C55E' }} /></View>
        {[['checkmark-circle', 'Make space for what matters'], ['ellipse-outline', 'One small step at a time']].map(([icon, label], i) => <View key={label} style={ui.row}><Ionicons name={icon as 'checkmark-circle' | 'ellipse-outline'} size={22} color={i === 0 ? c.success : c.primary} /><Copy style={{ fontSize: 13, color: c.muted, flex: 1 }}>{label}</Copy></View>)}
        <View style={{ height: 5, borderRadius: 5, backgroundColor: c.border }}><View style={{ width: '62%', height: 5, borderRadius: 5, backgroundColor: c.primary }} /></View>
      </View>
      <Copy style={{ color: c.primary, textAlign: 'center', fontSize: 12, fontWeight: '600' }}>Less overwhelm. More room to live.</Copy>
    </View>
    <View style={{ gap: 12 }}>
      <Copy accessibilityRole="header" style={ui.heading}>Take Control{ '\n' }of Your Day</Copy>
      <Copy style={{ color: c.muted }}>Plan tasks, build better routines, stay focused and make every day count.</Copy>
    </View>
    <View style={{ gap: 12 }}>{['Plan your day', 'Never miss important tasks', 'Build productive habits'].map(text => <View key={text} style={ui.row}><Ionicons name="checkmark-circle-outline" color={c.primary} size={21} /><Copy style={{ fontSize: 14 }}>{text}</Copy></View>)}</View>
    <View style={{ marginTop: 'auto', gap: 8 }}><Button title="Get Started  →" onPress={() => router.push('/(auth)/register')} /><TextAction label="Already have an account? Log In" onPress={() => router.push('/(auth)/login')} /></View>
  </Screen>;
}
