import { useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { router } from 'expo-router';
import { DayPilotLogo } from './DayPilotLogo';
import { Button, Copy, ErrorNotice, Field, Screen, TextAction, ui } from './DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/services/authStorage';
import { validateLogin, validateRegistration } from '@/utils/authValidation';
import type { FieldErrors, RegisterInput } from '@/types/auth';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const registering = mode === 'register';
  const c = useDayPilotTheme();
  const { login, register } = useAuth();
  const [values, setValues] = useState<RegisterInput>({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);
  function change(field: keyof RegisterInput, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
    setError(null);
  }
  async function submit() {
    if (busy.current) return;
    const validation = registering ? validateRegistration(values) : validateLogin(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    busy.current = true;
    setSubmitting(true);
    setError(null);
    Keyboard.dismiss();
    try { await (registering ? register(values) : login(values)); }
    catch (failure) { setError(authErrorMessage(failure)); }
    finally { busy.current = false; setSubmitting(false); }
  }
  return <Screen form>
    <View style={{ alignSelf: 'flex-start' }}><TextAction label="←  Back to welcome" onPress={() => router.replace('/(auth)/welcome')} /></View>
    <DayPilotLogo size={52} />
    <View style={{ gap: 10 }}><Copy accessibilityRole="header" style={ui.heading}>{registering ? 'Create Account' : 'Welcome Back'}</Copy><Copy style={{ color: c.muted }}>{registering ? 'Start planning better days with DayPilot.' : 'Log in to continue planning your day.'}</Copy></View>
    <View style={{ gap: 18 }}>
      {registering && <Field label="Full Name" icon="person-outline" placeholder="Your full name" value={values.fullName} onChangeText={v => change('fullName', v)} error={errors.fullName} autoComplete="name" textContentType="name" autoCapitalize="words" editable={!submitting} />}
      <Field label="Email Address" icon="mail-outline" placeholder="you@example.com" value={values.email} onChangeText={v => change('email', v)} error={errors.email} autoComplete="email" textContentType="emailAddress" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!submitting} />
      <Field label="Password" icon="lock-closed-outline" placeholder={registering ? 'Create a password' : 'Enter your password'} password value={values.password} onChangeText={v => change('password', v)} error={errors.password} autoCapitalize="none" autoCorrect={false} autoComplete={registering ? 'new-password' : 'current-password'} textContentType={registering ? 'newPassword' : 'password'} editable={!submitting} returnKeyType={registering ? 'next' : 'go'} onSubmitEditing={registering ? undefined : submit} />
      {registering && <>
        <Copy style={{ fontSize: 12, lineHeight: 18, color: c.muted, marginTop: -10 }}>At least 8 characters, with uppercase and lowercase letters.</Copy>
        <Field label="Confirm Password" icon="shield-checkmark-outline" placeholder="Re-enter your password" password value={values.confirmPassword} onChangeText={v => change('confirmPassword', v)} error={errors.confirmPassword} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password" editable={!submitting} returnKeyType="go" onSubmitEditing={submit} />
      </>}
      {!registering && <View style={{ alignSelf: 'flex-end', marginTop: -10 }}><TextAction label="Forgot Password?" onPress={() => router.push('/(auth)/forgot-password')} /></View>}
      <ErrorNotice message={error} />
      <Button title={registering ? 'Create Account' : 'Log In'} loading={submitting} onPress={submit} />
    </View>
    <TextAction label={registering ? 'Already have an account? Log In' : "Don't have an account? Create Account"} onPress={() => router.replace(registering ? '/(auth)/login' : '/(auth)/register')} />
    <Copy style={{ color: c.muted, textAlign: 'center', fontSize: 12, lineHeight: 18 }}>Your account stays on this device for now.{ '\n' }Use a password you don’t use elsewhere.</Copy>
  </Screen>;
}
