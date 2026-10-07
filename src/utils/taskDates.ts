const pad = (number: number) => String(number).padStart(2, '0');
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const toTimeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return year >= 1000 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
export const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function parseDateKey(value: string): Date {
  if (!isValidDate(value)) throw new Error('Invalid calendar date');
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
export function combineTaskDateTime(date: string, time: string): Date {
  const result = parseDateKey(date);
  if (!isValidTime(time)) throw new Error('Invalid time');
  const [hours, minutes] = time.split(':').map(Number);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
export const isToday = (date: string, now = new Date()) => date === toDateKey(now);
export const isPast = (date: string, time: string, now = new Date()) => combineTaskDateTime(date, time).getTime() < now.getTime();
export function formatDisplayDate(value: string, now = new Date()): string {
  if (isToday(value, now)) return 'Today';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (value === toDateKey(tomorrow)) return 'Tomorrow';
  return parseDateKey(value).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', ...(parseDateKey(value).getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) });
}
export function formatDisplayTime(value: string): string {
  if (!isValidTime(value)) return 'Invalid time';
  const time = new Date();
  const [hours, minutes] = value.split(':').map(Number);
  time.setHours(hours, minutes, 0, 0);
  return time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
export const compareTaskDates = (a: { date: string; time: string }, b: { date: string; time: string }) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
export function monthDays(month: Date): (string | null)[] {
  const year = month.getFullYear();
  const index = month.getMonth();
  const first = new Date(year, index, 1, 12);
  const count = new Date(year, index + 1, 0, 12).getDate();
  const days: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let day = 1; day <= count; day++) days.push(toDateKey(new Date(year, index, day, 12)));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}
