import type { Task, TaskFilter, TaskSort } from '../types/task';
import { compareTaskDates, isPast, isToday } from './taskDates';
export const taskLabel = (value: string) => value === 'dsa' ? 'DSA' : value.charAt(0).toUpperCase() + value.slice(1);
const rank = { high: 0, medium: 1, low: 2 };
export const isOverdue = (task: Task, now = new Date()) => !task.completed && isPast(task.date, task.time, now);
export const isUpcoming = (task: Task, now = new Date()) => !task.completed && !isPast(task.date, task.time, now);
export function sortTasks(tasks: Task[], sort: TaskSort = 'date'): Task[] {
  return [...tasks].sort((a, b) => {
    const incompleteFirst = Number(a.completed) - Number(b.completed);
    if (incompleteFirst) return incompleteFirst;
    if (sort === 'priority') return rank[a.priority] - rank[b.priority] || compareTaskDates(a, b) || a.id.localeCompare(b.id);
    if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
    return compareTaskDates(a, b) || rank[a.priority] - rank[b.priority] || a.id.localeCompare(b.id);
  });
}
export function selectTasks(tasks: Task[], filter: TaskFilter, query = '', sort: TaskSort = 'date', now = new Date()): Task[] {
  const search = query.trim().toLowerCase();
  return sortTasks(tasks.filter(task => {
    const matches = !search || `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(search);
    if (!matches) return false;
    switch (filter) {
      case 'today': return isToday(task.date, now);
      case 'upcoming': return isUpcoming(task, now);
      case 'completed': return task.completed;
      case 'overdue': return isOverdue(task, now);
      default: return true;
    }
  }), sort);
}
export function taskProgress(tasks: Task[]) {
  const completed = tasks.filter(task => task.completed).length;
  return { total: tasks.length, completed, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}
