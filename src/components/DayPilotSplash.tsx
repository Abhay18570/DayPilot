import { useEffect } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, useAnimatedValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hideAsync } from 'expo-splash-screen';
import { DayPilotLogo } from './DayPilotLogo';
import { Button, Copy, ErrorNotice } from './DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';

export function DayPilotSplash({ onComplete, error, retry }: { onComplete: () => void; error: string | null; retry: () => void }) {
  const c = useDayPilotTheme();
  const logo = useAnimatedValue(0);
  const title = useAnimatedValue(0);
  const tagline = useAnimatedValue(0);
  const pulse = useAnimatedValue(1);
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(onComplete, 2350);
    const fade = (value: Animated.Value, delay: number) => Animated.timing(value, { toValue: 1, duration: 450, delay, useNativeDriver: true });
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => false).then(reduce => {
      if (!active) return;
      if (reduce) { logo.setValue(1); title.setValue(1); tagline.setValue(1); return; }
      animation = Animated.parallel([
        fade(logo, 200), fade(title, 600), fade(tagline, 1000),
        Animated.sequence([Animated.delay(1500), Animated.timing(pulse, { toValue: 1.045, duration: 350, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 350, useNativeDriver: true })]),
      ]);
      animation.start();
    });
    return () => { active = false; clearTimeout(timer); animation?.stop(); };
  }, [logo, title, tagline, pulse, onComplete]);
  return <SafeAreaView onLayout={() => { void hideAsync().catch(() => undefined); }} style={[styles.screen, { backgroundColor: c.background }]}>
    <View style={{ alignItems: 'center', gap: 24 }}>
      <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [.7, 1] }) }] }}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}><DayPilotLogo size={100} /></Animated.View>
      </Animated.View>
      <Animated.View style={{ opacity: title, transform: [{ translateY: title.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Copy style={{ fontSize: 40, lineHeight: 48, fontWeight: '800', letterSpacing: -1.5 }}>DayPilot</Copy>
      </Animated.View>
      <Animated.View style={{ opacity: tagline }}><Copy style={{ color: c.muted, textAlign: 'center' }}>Plan your day. Own your time.</Copy></Animated.View>
    </View>
    {error && <View style={{ gap: 16, marginTop: 40, maxWidth: 360 }}><ErrorNotice message={error} /><Button title="Try Again" onPress={retry} /></View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, padding: 28, alignItems: 'center', justifyContent: 'center' } });
