import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Copy, TextAction, ui } from '@/components/DayPilotUI';
import { useDayPilotTheme } from '@/constants/daypilot';
import { monthDays, toDateKey } from '@/utils/taskDates';

export function MonthCalendar({ month, selected, taskDates, today, onSelect, onMonth, onToday }: {
  month: Date; selected: string; taskDates: Set<string>; today: string;
  onSelect: (date: string) => void; onMonth: (offset: number) => void; onToday: () => void;
}) {
  const c = useDayPilotTheme();
  return <View style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: 24, padding: 8, gap: 8 }}>
    <View style={[ui.row, { justifyContent: 'space-between', gap: 2 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => onMonth(-1)} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-back" color={c.primary} size={22} /></Pressable>
      <Copy accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Copy>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => onMonth(1)} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="chevron-forward" color={c.primary} size={22} /></Pressable>
    </View>
    <View style={{ flexDirection: 'row' }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Copy key={index} style={{ width: `${100 / 7}%`, textAlign: 'center', color: c.muted, fontSize: 12 }}>{day}</Copy>)}</View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {monthDays(month).map((date, index) => {
        if (!date) return <View key={`blank-${index}`} style={{ width: `${100 / 7}%`, height: 49 }} />;
        const active = date === selected;
        const isToday = date === today;
        const hasTasks = taskDates.has(date);
        return <Pressable key={date} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${date}${isToday ? ', today' : ''}${hasTasks ? ', has tasks' : ''}`} onPress={() => onSelect(date)} style={{ width: `${100 / 7}%`, height: 49, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ minWidth: 36, height: 43, paddingHorizontal: 3, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isToday ? c.primary : active ? c.button : c.surface, backgroundColor: active ? c.button : c.surface }}>
            <Copy style={{ color: active ? c.onPrimary : isToday ? c.primary : c.text, fontSize: 14, fontWeight: active || isToday ? '700' : '400' }}>{Number(date.slice(-2))}</Copy>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hasTasks ? active ? c.onPrimary : c.primary : active ? c.button : c.surface }} />
          </View>
        </Pressable>;
      })}
    </View>
    <TextAction label={toDateKey(month).slice(0, 7) === today.slice(0, 7) ? 'Select Today' : 'Back to Today'} onPress={onToday} />
  </View>;
}
