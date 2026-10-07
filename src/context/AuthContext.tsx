import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { authErrorMessage, authStorage } from '@/services/authStorage';
import type { LoginInput, RegisterInput, User } from '@/types/auth';

type AuthState = {
  currentUser: User | null; isAuthenticated: boolean; isLoading: boolean; startupError: string | null;
  feedback: string | null; clearFeedback: () => void;
  checkAuth: () => Promise<void>; login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>; logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const busy = useRef(false);
  const restoreSession = useCallback(() => authStorage.checkAuth()
    .then(user => { setCurrentUser(user); })
    .catch(error => { setStartupError(authErrorMessage(error)); })
    .finally(() => { setIsLoading(false); }), []);
  useEffect(() => { void restoreSession(); }, [restoreSession]);
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setStartupError(null);
    await restoreSession();
  }, [restoreSession]);
  async function authenticate(input: LoginInput | RegisterInput, registering: boolean) {
    if (busy.current) return;
    busy.current = true;
    try {
      const user = registering ? await authStorage.register(input as RegisterInput) : await authStorage.login(input);
      setFeedback(registering ? 'Account created. Welcome to DayPilot!' : 'You’re signed in. Welcome back!');
      setCurrentUser(user);
    } finally { busy.current = false; }
  }
  return <AuthContext.Provider value={{
    currentUser, isAuthenticated: currentUser !== null, isLoading, startupError, feedback,
    clearFeedback: () => setFeedback(null), checkAuth,
    register: input => authenticate(input, true), login: input => authenticate(input, false),
    logout: async () => { await authStorage.logout(); setCurrentUser(null); setFeedback(null); },
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
