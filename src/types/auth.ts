export type User = { id: string; fullName: string; email: string; createdAt: string };
export type LocalUser = User & { password: string };
export type Session = { userId: string; email: string; loginAt: string };
export type RegisterInput = { fullName: string; email: string; password: string; confirmPassword: string };
export type LoginInput = { email: string; password: string };
export type FieldErrors = Partial<Record<keyof RegisterInput, string>>;
