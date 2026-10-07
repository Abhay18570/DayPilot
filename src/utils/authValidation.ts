import type { FieldErrors, LoginInput, RegisterInput } from '../types/auth';
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export function validateLogin(input: LoginInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Enter a valid email address.';
  if (!input.password) errors.password = 'Enter your password.';
  return errors;
}
export function validateRegistration(input: RegisterInput): FieldErrors {
  const errors = validateLogin(input);
  if (input.fullName.trim().length < 2) errors.fullName = 'Enter your name (at least 2 characters).';
  if (input.password.length < 8 || !/[a-z]/.test(input.password) || !/[A-Z]/.test(input.password)) {
    errors.password = 'Use at least 8 characters, with an uppercase and a lowercase letter.';
  }
  if (!input.confirmPassword || input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords must match.';
  return errors;
}
