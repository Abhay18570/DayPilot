import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
/** Refresh date, greeting and overdue labels on foreground and every minute. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = setInterval(refresh, 60_000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return now;
}
