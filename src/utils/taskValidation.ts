import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_REPEATS, type TaskInput, type TaskErrors } from '../types/task';
import { REMINDER_OPTIONS } from './reminders';
import { isValidDate, isValidTime } from './taskDates';
export function validateTask(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  if (typeof input.title !== 'string' || !input.title.trim()) errors.title = 'Give your task a title.';
  else if (input.title.trim().length > 150) errors.title = 'Keep the title to 150 characters or fewer.';
  if (typeof input.description !== 'string' || input.description.length > 5000) errors.description = 'Keep the description to 5,000 characters or fewer.';
  if (typeof input.date !== 'string' || !isValidDate(input.date)) errors.date = 'Choose a valid date.';
  if (typeof input.time !== 'string' || !isValidTime(input.time)) errors.time = 'Choose a valid time.';
  if (!TASK_CATEGORIES.includes(input.category)) errors.category = 'Choose a category.';
  if (!TASK_PRIORITIES.includes(input.priority)) errors.priority = 'Choose a priority.';
  if (!TASK_REPEATS.includes(input.repeat)) errors.repeat = 'Choose a repeat preference.';
  if (typeof input.reminderEnabled !== 'boolean') errors.reminderEnabled = 'Choose a reminder preference.';
  if (input.reminderOffset !== undefined && !REMINDER_OPTIONS.some(option => option.value === input.reminderOffset)) errors.reminderOffset = 'Choose a reminder time.';
  return errors;
}
