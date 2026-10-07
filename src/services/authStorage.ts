import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalUser, LoginInput, RegisterInput, Session, User } from '../types/auth';
import { normalizeEmail, validateLogin, validateRegistration } from '../utils/authValidation';

export const AUTH_KEYS = { users: 'daypilot_users', session: 'daypilot_session' } as const;
export class AuthError extends Error {}
const storageMessage = 'Your saved accounts could not be accessed. Please try again.';
type Storage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isUser = (value: unknown): value is LocalUser => isRecord(value) &&
  ['id', 'fullName', 'email', 'password', 'createdAt'].every(key => typeof value[key] === 'string' && value[key].length > 0);
const publicUser = ({ id, fullName, email, createdAt }: LocalUser): User => ({ id, fullName, email, createdAt });

// PROTOTYPE ONLY: passwords are stored in plaintext in unencrypted local storage.
// Replace this entire adapter with secure backend authentication before production.
// Never use real passwords here. Passwords never enter the public user/context object.
export function createAuthStorage(storage: Storage) {
  // Serialize account/session writes, including rapid repeated submissions.
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const next = pending.then(operation).catch(error => {
      throw error instanceof AuthError ? error : new AuthError(storageMessage);
    });
    pending = next.catch(() => undefined);
    return next;
  }
  async function readUsers(): Promise<LocalUser[]> {
    const raw = await storage.getItem(AUTH_KEYS.users);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    // Do not silently erase accounts if data is damaged.
    if (!Array.isArray(parsed) || !parsed.every(isUser)) throw new AuthError(storageMessage);
    return parsed;
  }
  async function saveSession(user: User) {
    const session: Session = { userId: user.id, email: user.email, loginAt: new Date().toISOString() };
    await storage.setItem(AUTH_KEYS.session, JSON.stringify(session));
  }
  return {
    checkAuth: () => serial(async () => {
      const raw = await storage.getItem(AUTH_KEYS.session);
      if (!raw) return null;
      let session: unknown;
      try { session = JSON.parse(raw); } catch { session = null; }
      if (!isRecord(session) || typeof session.userId !== 'string' || typeof session.email !== 'string' ||
          typeof session.loginAt !== 'string' || !Number.isFinite(Date.parse(session.loginAt))) {
        await storage.removeItem(AUTH_KEYS.session);
        return null;
      }
      const users = await readUsers();
      const user = users.find(user => user.id === session.userId && user.email === session.email);
      if (!user) { await storage.removeItem(AUTH_KEYS.session); return null; }
      return publicUser(user);
    }),
    register: (input: RegisterInput) => serial(async () => {
      if (Object.keys(validateRegistration(input)).length) throw new AuthError('Please check the highlighted fields.');
      const users = await readUsers();
      const email = normalizeEmail(input.email);
      if (users.some(user => user.email === email)) throw new AuthError('An account with this email already exists.');
      const user: LocalUser = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
        fullName: input.fullName.trim(), email, password: input.password, createdAt: new Date().toISOString(),
      };
      await storage.setItem(AUTH_KEYS.users, JSON.stringify([...users, user]));
      try { await saveSession(user); } catch {
        // Account creation succeeded; do not ask the user to register again.
        throw new AuthError('Your account was created, but sign-in could not be saved. Please log in.');
      }
      return publicUser(user);
    }),
    login: (input: LoginInput) => serial(async () => {
      if (Object.keys(validateLogin(input)).length) throw new AuthError('Please check the highlighted fields.');
      const users = await readUsers();
      const user = users.find(user => user.email === normalizeEmail(input.email) && user.password === input.password);
      if (!user) throw new AuthError('Incorrect email or password.');
      await saveSession(user);
      return publicUser(user);
    }),
    logout: () => serial(() => storage.removeItem(AUTH_KEYS.session)),
  };
}
export const authStorage = createAuthStorage(AsyncStorage);
export const authErrorMessage = (error: unknown) => error instanceof AuthError ? error.message : 'Something went wrong. Please try again.';
