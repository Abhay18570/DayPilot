const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = name => name === '@react-native-async-storage/async-storage' ? {} : load(path.resolve(path.dirname(file), `${name}.ts`));
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
const { createTaskStorage, taskStorageKey } = load(path.resolve(__dirname, '../src/services/taskStorage.ts'));
const { createAuthStorage } = load(path.resolve(__dirname, '../src/services/authStorage.ts'));
const dates = load(path.resolve(__dirname, '../src/utils/taskDates.ts'));
const selectors = load(path.resolve(__dirname, '../src/utils/taskSelectors.ts'));
const { validateTask } = load(path.resolve(__dirname, '../src/utils/taskValidation.ts'));
const { TASK_CATEGORIES, TASK_PRIORITIES, TASK_REPEATS } = load(path.resolve(__dirname, '../src/types/task.ts'));
const draft = { title: '  Complete assignment  ', description: '  Read chapter 4  ', date: '2026-10-07', time: '16:00', category: 'college', priority: 'high', reminderEnabled: true, repeat: 'weekly' };
function memory() {
  const data = new Map();
  return { data, getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); }, removeItem: async key => { data.delete(key); } };
}
function task(overrides = {}) {
  return { ...draft, title: 'Task', description: '', id: 'one', userId: 'A', completed: false, completedAt: null, createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', ...overrides };
}
test('create, complete, uncomplete, edit/reschedule and delete survive adapter recreation', async () => {
  const storage = memory();
  const service = () => createTaskStorage(storage);
  assert.deepEqual(await service().getUserTasks('A'), []);
  const { task: created } = await service().createTask('A', draft);
  assert.equal(created.title, 'Complete assignment');
  assert.equal(created.description, 'Read chapter 4');
  assert.equal(created.userId, 'A');
  assert.equal(created.reminderEnabled, true);
  assert.equal(created.repeat, 'weekly');
  assert.deepEqual(await service().getUserTasks('A'), [created]);
  await service().toggleTaskCompletion('A', created.id);
  let saved = (await service().getUserTasks('A'))[0];
  assert.equal(saved.completed, true);
  assert.ok(Number.isFinite(Date.parse(saved.completedAt)));
  await service().toggleTaskCompletion('A', created.id);
  saved = (await service().getUserTasks('A'))[0];
  assert.equal(saved.completed, false);
  assert.equal(saved.completedAt, null);
  const edited = { ...draft, title: 'Updated', date: '2026-11-01', time: '08:30', category: 'work', priority: 'low', reminderEnabled: false, repeat: 'monthly' };
  await service().updateTask('A', created.id, edited);
  saved = (await service().getUserTasks('A'))[0];
  assert.equal(saved.title, edited.title);
  assert.equal(saved.date, edited.date);
  assert.equal(saved.time, edited.time);
  assert.equal(saved.category, edited.category);
  assert.equal(saved.priority, edited.priority);
  assert.equal(saved.reminderEnabled, false);
  assert.equal(saved.repeat, 'monthly');
  assert.equal(saved.createdAt, created.createdAt);
  await service().deleteTask('A', created.id);
  assert.deepEqual(await service().getUserTasks('A'), []);
});
test('account logout/login and restoration retain isolated task collections', async () => {
  const storage = memory();
  const auth = createAuthStorage(storage);
  const tasks = createTaskStorage(storage);
  const credentials = { fullName: 'User A', email: 'a@example.com', password: 'Password123', confirmPassword: 'Password123' };
  const userA = await auth.register(credentials);
  await tasks.createTask(userA.id, { ...draft, title: 'User A Task' });
  await auth.logout();
  const userB = await auth.register({ ...credentials, fullName: 'User B', email: 'b@example.com' });
  assert.deepEqual(await tasks.getUserTasks(userB.id), []);
  await tasks.createTask(userB.id, { ...draft, title: 'User B Task' });
  await auth.logout();
  await auth.login(credentials);
  const restored = await createAuthStorage(storage).checkAuth();
  assert.equal(restored.id, userA.id);
  assert.deepEqual((await createTaskStorage(storage).getUserTasks(restored.id)).map(t => t.title), ['User A Task']);
  assert.deepEqual((await tasks.getUserTasks(userB.id)).map(t => t.title), ['User B Task']);
});
test('cross-user reads/mutations and owner injection cannot expose or change another account', async () => {
  const storage = memory();
  const service = createTaskStorage(storage);
  const { task: created } = await service.createTask('A', { ...draft, userId: 'B', completed: true });
  assert.equal(created.userId, 'A');
  assert.equal(created.completed, false);
  assert.deepEqual(await service.getUserTasks('B'), []);
  await assert.rejects(service.updateTask('B', created.id, draft), /no longer available/);
  await assert.rejects(service.deleteTask('B', created.id), /no longer available/);
  await assert.rejects(service.toggleTaskCompletion('B', created.id), /no longer available/);
  const result = await service.updateTask('A', created.id, { ...draft, userId: 'B', id: 'hijack', completed: true });
  assert.equal(result.task.id, created.id);
  assert.equal(result.task.userId, 'A');
  assert.equal(result.task.completed, false);
  await assert.rejects(service.getUserTasks(''), /log in/);
});
test('serialized concurrent creates and mutations never lose tasks', async () => {
  const service = createTaskStorage(memory());
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => service.createTask('A', { ...draft, title: `Task ${i}` })));
  assert.equal((await service.getUserTasks('A')).length, 20);
  assert.equal(new Set(results.map(result => result.task.id)).size, 20);
  await Promise.all(results.map(result => service.toggleTaskCompletion('A', result.task.id)));
  assert.equal((await service.getUserTasks('A')).filter(task => task.completed).length, 20);
});
test('failed writes leave the previous collection intact and the queue recovers', async () => {
  const storage = memory();
  const service = createTaskStorage(storage);
  const { task: created } = await service.createTask('A', draft);
  const original = storage.setItem;
  storage.setItem = async () => { throw new Error('full'); };
  await assert.rejects(service.updateTask('A', created.id, { ...draft, title: 'Lost' }), /could not be accessed/);
  await assert.rejects(service.toggleTaskCompletion('A', created.id), /could not be accessed/);
  await assert.rejects(service.deleteTask('A', created.id), /could not be accessed/);
  await assert.rejects(service.createTask('A', draft), /could not be accessed/);
  assert.deepEqual(await service.getUserTasks('A'), [created]);
  storage.setItem = original;
  assert.equal((await service.updateTask('A', created.id, { ...draft, title: 'Recovered' })).task.title, 'Recovered');
});
test('malformed, foreign, duplicate and unsupported task data is preserved on error', async () => {
  for (const raw of ['{bad', JSON.stringify({ version: 2, tasks: [] }), JSON.stringify({ version: 1, tasks: [task({ userId: 'B' })] }), JSON.stringify({ version: 1, tasks: [task(), task()] }), JSON.stringify({ version: 1, tasks: [task({ date: '2026-02-30' })] })]) {
    const storage = memory();
    storage.data.set(taskStorageKey('A'), raw);
    const service = createTaskStorage(storage);
    await assert.rejects(service.getUserTasks('A'));
    await assert.rejects(service.createTask('A', draft));
    assert.equal(storage.data.get(taskStorageKey('A')), raw);
  }
});
test('storage read failure is retryable', async () => {
  const storage = memory();
  const original = storage.getItem;
  storage.getItem = async () => { throw new Error('unavailable'); };
  const service = createTaskStorage(storage);
  await assert.rejects(service.getUserTasks('A'), /could not be accessed/);
  storage.getItem = original;
  assert.deepEqual(await service.getUserTasks('A'), []);
});
test('clearing one user never clears another user or auth session', async () => {
  const storage = memory();
  const service = createTaskStorage(storage);
  storage.data.set('daypilot_session', 'keep');
  await service.createTask('A', draft);
  await service.createTask('B', draft);
  await service.clearUserTasks('A');
  assert.deepEqual(await service.getUserTasks('A'), []);
  assert.equal((await service.getUserTasks('B')).length, 1);
  assert.equal(storage.data.get('daypilot_session'), 'keep');
});
test('task validation rejects empty, invalid and oversized values', async () => {
  assert.deepEqual(validateTask(draft), {});
  for (const [key, value] of [['title', '   '], ['title', 'x'.repeat(151)], ['description', 'x'.repeat(5001)], ['date', '2026-02-30'], ['time', '24:01'], ['category', 'bad'], ['priority', 'urgent'], ['repeat', 'yearly'], ['reminderEnabled', 'yes']]) {
    assert.ok(validateTask({ ...draft, [key]: value })[key], key);
    await assert.rejects(createTaskStorage(memory()).createTask('A', { ...draft, [key]: value }), /check the task fields/);
  }
  for (const category of TASK_CATEGORIES) assert.deepEqual(validateTask({ ...draft, category }), {});
  for (const priority of TASK_PRIORITIES) assert.deepEqual(validateTask({ ...draft, priority }), {});
  for (const repeat of TASK_REPEATS) assert.deepEqual(validateTask({ ...draft, repeat }), {});
});
test('date utilities preserve local dates and handle leap years and year boundaries', () => {
  assert.equal(dates.toDateKey(new Date(2026, 9, 7, 0, 5)), '2026-10-07');
  assert.equal(dates.toDateKey(dates.parseDateKey('2026-10-07')), '2026-10-07');
  assert.equal(dates.isValidDate('2024-02-29'), true);
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', 'not-a-date']) assert.equal(dates.isValidDate(invalid), false);
  assert.equal(dates.isValidTime('23:59'), true);
  for (const invalid of ['24:00', '12:60', '1:30', 'noon']) assert.equal(dates.isValidTime(invalid), false);
  const combined = dates.combineTaskDateTime('2026-10-07', '16:30');
  assert.equal(combined.getDate(), 7);
  assert.equal(combined.getHours(), 16);
  assert.equal(combined.getMinutes(), 30);
  assert.equal(dates.formatDisplayDate('2027-01-01', new Date(2026, 11, 31, 23)), 'Tomorrow');
});
test('calendar generates correct offsets, month lengths and complete rows', () => {
  const leap = dates.monthDays(new Date(2024, 1, 1));
  assert.equal(leap.filter(Boolean).length, 29);
  assert.equal(leap[4], '2024-02-01');
  assert.equal(leap.length % 7, 0);
  assert.equal(dates.monthDays(new Date(2026, 1, 1)).filter(Boolean).length, 28);
  assert.equal(dates.monthDays(new Date(2026, 11, 1)).filter(Boolean).at(-1), '2026-12-31');
});
test('search matches title, description and category; filters respect date/time and completion', () => {
  const now = new Date(2026, 9, 7, 12, 0);
  const tasks = [task({ id: 'past', time: '08:00', title: 'Morning reading', category: 'college' }), task({ id: 'future', time: '16:00', description: 'Binary search', category: 'dsa' }), task({ id: 'done', completed: true, completedAt: now.toISOString(), time: '09:00' }), task({ id: 'tomorrow', date: '2026-10-08' })];
  assert.deepEqual(selectors.selectTasks(tasks, 'overdue', '', 'date', now).map(t => t.id), ['past']);
  assert.deepEqual(selectors.selectTasks(tasks, 'upcoming', '', 'date', now).map(t => t.id), ['future', 'tomorrow']);
  assert.equal(selectors.selectTasks(tasks, 'today', '', 'date', now).length, 3);
  assert.equal(selectors.selectTasks(tasks, 'completed', '', 'date', now)[0].id, 'done');
  assert.equal(selectors.selectTasks(tasks, 'all', 'READING')[0].id, 'past');
  assert.equal(selectors.selectTasks(tasks, 'all', 'binary')[0].id, 'future');
  assert.equal(selectors.selectTasks(tasks, 'all', 'dsa')[0].id, 'future');
  assert.equal(selectors.isOverdue(tasks[2], now), false);
  assert.equal(selectors.selectTasks(tasks, 'all', 'not found').length, 0);
});
test('priority, chronological and recent sorting and progress are deterministic', () => {
  const tasks = [task({ id: 'low', priority: 'low', time: '08:00' }), task({ id: 'high-late', time: '17:00' }), task({ id: 'high-early', time: '09:00' }), task({ id: 'done', completed: true, completedAt: '2026-10-07T09:00:00Z', time: '07:00' })];
  assert.deepEqual(selectors.sortTasks(tasks, 'priority').map(t => t.id), ['high-early', 'high-late', 'low', 'done']);
  assert.deepEqual(selectors.sortTasks(tasks, 'date').map(t => t.id), ['low', 'high-early', 'high-late', 'done']);
  assert.equal(selectors.sortTasks([task(), task({ id: 'new', createdAt: '2026-10-07T10:00:00Z' })], 'recent')[0].id, 'new');
  assert.deepEqual(selectors.taskProgress(tasks), { completed: 1, total: 4, percent: 25 });
  assert.deepEqual(selectors.taskProgress([]), { completed: 0, total: 0, percent: 0 });
  assert.equal(tasks[0].id, 'low', 'sorting must not mutate context state');
});
