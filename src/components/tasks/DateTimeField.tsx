import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy, Field, TextAction, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { combineTaskDateTime, formatDisplayDate, formatDisplayTime, isValidDate, isValidTime, toDateKey, toTimeKey } from '@/utils/taskDates';

export function DateTimeField({ mode, date, time, onChange, error, disabled }: {
  mode: 'date' | 'time'; date: string; time: string; onChange: (value: string) => void; error?: string; disabled: boolean;
}) {
  const c = useDayPilotTheme();
  const dark = useColorScheme() === 'dark';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date());
  const label = mode === 'date' ? 'Date' : 'Time';
  const commit = (value: Date) => onChange(mode === 'date' ? toDateKey(value) : toTimeKey(value));
  function show() {
    Keyboard.dismiss();
    const value = isValidDate(date) && isValidTime(time) ? combineTaskDateTime(date, time) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode, onValueChange: (_event, selected) => commit(selected) });
    } else { setDraft(value); setOpen(true); }
  }
  // Native pickers are the mobile path; text keeps the existing optional web target usable.
  if (Platform.OS === 'web') return <Field label={`${label} (${mode === 'date' ? 'YYYY-MM-DD' : 'HH:mm'})`} icon={mode === 'date' ? 'calendar-outline' : 'time-outline'} value={mode === 'date' ? date : time} onChangeText={onChange} error={error} editable={!disabled} />;
  return <View style={{ gap: 7 }}>
    <Copy style={{ fontSize: 14, fontWeight: '600' }}>{label}</Copy>
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} onPress={show}
      style={[ui.inputRow, { minHeight: 56, borderColor: error ? c.error : c.border, backgroundColor: c.surface }]}>
      <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={21} color={c.primary} />
      <Copy style={{ flex: 1 }}>{mode === 'date' ? formatDisplayDate(date) : formatDisplayTime(time)}</Copy>
      <Ionicons name="chevron-down" size={18} color={c.muted} />
    </Pressable>
    {error && <Copy accessibilityRole="alert" style={{ color: c.error, fontSize: 13 }}>{error}</Copy>}
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ padding: 24, gap: 24 }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <TextAction label="Cancel" onPress={() => setOpen(false)} />
            <Copy style={{ fontWeight: '700' }}>Choose {label.toLowerCase()}</Copy>
            <TextAction label="Done" onPress={() => { commit(draft); setOpen(false); }} />
          </View>
          <DateTimePicker value={draft} mode={mode} display="spinner" themeVariant={dark ? 'dark' : 'light'} textColor={c.text} accentColor={c.primary} onValueChange={(_event, selected) => setDraft(selected)} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}
