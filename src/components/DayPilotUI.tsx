import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps, type PropsWithChildren } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { brand, useDayPilotTheme } from '@/constants/daypilot';

export function Copy({ style, ...props }: TextProps) {
  const c = useDayPilotTheme();
  return <Text {...props} style={[{ color: c.text, fontSize: 16, lineHeight: 24 }, style]} />;
}
export function Screen({ children, form = false, tab = false }: PropsWithChildren<{ form?: boolean; tab?: boolean }>) {
  const c = useDayPilotTheme();
  return <SafeAreaView edges={tab ? ['top', 'left', 'right'] : undefined} style={{ flex: 1, backgroundColor: c.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} enabled={form}>
      <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export function Button({ title, onPress, loading = false, secondary = false }: { title: string; onPress: () => void; loading?: boolean; secondary?: boolean }) {
  const c = useDayPilotTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading} onPress={onPress}
    style={({ pressed }) => [ui.button, { backgroundColor: secondary ? c.tint : brand, opacity: pressed || loading ? .7 : 1 }]}>
    {loading ? <ActivityIndicator color={secondary ? c.primary : '#FFFFFF'} /> : <Copy style={{ color: secondary ? c.primary : '#FFFFFF', fontWeight: '700' }}>{title}</Copy>}
  </Pressable>;
}
export function TextAction({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useDayPilotTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? .6 : 1 })}>
    <Copy style={{ color: c.primary, fontWeight: '600', textAlign: 'center', fontSize: 14 }}>{label}</Copy>
  </Pressable>;
}
export function Field({ label, icon, error, password = false, ...props }: TextInputProps & { label: string; icon: ComponentProps<typeof Ionicons>['name']; error?: string; password?: boolean }) {
  const c = useDayPilotTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 7 }}>
    <Copy style={{ fontSize: 14, fontWeight: '600' }}>{label}</Copy>
    <View style={[ui.inputRow, { backgroundColor: c.surface, borderColor: error ? c.error : focused ? c.primary : c.border }]}>
      <Ionicons name={icon} color={c.muted} size={20} accessible={false} />
      <TextInput {...props} accessibilityLabel={label} accessibilityHint={error} placeholderTextColor={c.muted}
        onFocus={() => setFocused(true)} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        secureTextEntry={password && !visible} style={{ flex: 1, minWidth: 0, color: c.text, fontSize: 16, paddingVertical: 16, minHeight: props.multiline ? 116 : undefined }} />
      {password && <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onPress={() => setVisible(!visible)} style={{ minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} color={c.muted} size={21} />
      </Pressable>}
    </View>
    {error && <Copy accessibilityRole="alert" style={{ fontSize: 13, lineHeight: 19, color: c.error }}>{error}</Copy>}
  </View>;
}
export function ErrorNotice({ message }: { message: string | null }) {
  const c = useDayPilotTheme();
  return message ? <Copy accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: c.error, fontSize: 14 }}>{message}</Copy> : null;
}
export const ui = StyleSheet.create({
  screen: { flexGrow: 1, padding: 24, gap: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  heading: { fontSize: 34, lineHeight: 41, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { fontSize: 16, lineHeight: 25 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, lineHeight: 18 },
  button: { minHeight: 56, borderRadius: 17, padding: 16, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 15, paddingLeft: 15, paddingRight: 8, gap: 12 },
  card: { padding: 22, borderRadius: 24, borderWidth: 1, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
