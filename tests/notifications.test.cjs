const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const localRequire = name => name in mocks ? mocks[name] : name === '@react-native-async-storage/async-storage' ? {} : load(path.resolve(path.dirname(file), `${name}.ts`));
    new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
    cache.set(file, module.exports);
    return module.exports;
  }
  return relative => load(path.resolve(__dirname, '../src', relative));
}
const load = loader();
const { createTaskStorage, taskStorageKey } = load('services/taskStorage.ts');
const { createTaskReminderManager } = load('services/taskReminders.ts');
const { calculateReminderDate, reminderIdentifier, taskReminderPayload, notificationTaskTarget } = load('utils/reminders.ts');
const draft = { title: 'DSA practice', description: '', date: '2035-10-07', time: '19:00', category: 'dsa', priority: 'high', reminderEnabled: true, reminderOffset: 'at_time', repeat: 'none' };
const now = () => new Date(2035, 9, 7, 12);
function setup() {
  const data = new Map();
  const storage = { getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  const repository = createTaskStorage(storage);
  const pending = new Map();
  let serial = 0;
  const adapter = {
    getNotificationPermissionStatus: async () => ({ status: 'enabled', canAskAgain: true }),
    getScheduledNotifications: async () => [...pending.values()],
    scheduleTaskNotification: async (task, date) => {
      serial++;
      const identifier = reminderIdentifier(task);
      pending.set(identifier, { identifier, data: taskReminderPayload(task, date) });
      return identifier;
    },
    cancelNotification: async id => { pending.delete(id); },
  };
  const manager = createTaskReminderManager(repository, adapter, now);
  return { data, storage, repository, adapter, pending, manager, schedules: () => serial };
}
for (const [offset, minutes] of [['at_time', 0], ['5_minutes', 5], ['15_minutes', 15], ['30_minutes', 30], ['1_hour', 60], ['1_day', 1440]]) {
  test(`reminder calculation: ${offset}`, () => {
    const actual = calculateReminderDate({ ...draft, reminderOffset: offset });
    assert.equal(actual.getTime(), new Date(2035, 9, 7, 19).getTime() - minutes * 60000);
  });
}
test('offsets cross midnight, month, leap-day and year boundaries in local time', () => {
  for (const [date, expected] of [['2035-10-07', new Date(2035, 9, 6, 23, 50)], ['2035-11-01', new Date(2035, 9, 31, 23, 50)], ['2036-03-01', new Date(2036, 1, 29, 23, 50)], ['2036-01-01', new Date(2035, 11, 31, 23, 50)]]) {
    assert.equal(calculateReminderDate({ ...draft, date, time: '00:05', reminderOffset: '15_minutes' }).getTime(), expected.getTime());
  }
});
test('invalid dates/times/offsets cannot become immediate notifications', () => {
  for (const invalid of [{ date: '2035-02-30' }, { time: '25:00' }, { reminderOffset: 'bad' }]) assert.throws(() => calculateReminderDate({ ...draft, ...invalid }));
  if (process.env.TZ === 'America/New_York') assert.throws(() => calculateReminderDate({ ...draft, date: '2027-03-14', time: '02:30' }), /does not exist/);
});
test('Phase 2 records migrate without losing their task fields', async () => {
  const env = setup();
  const { task } = await env.repository.createTask('A', draft);
  const old = { ...task };
  for (const key of ['reminderOffset', 'notificationId', 'notificationScheduledFor', 'notificationError']) delete old[key];
  env.data.set(taskStorageKey('A'), JSON.stringify({ version: 1, tasks: [old] }));
  const migrated = (await env.repository.getUserTasks('A'))[0];
  assert.equal(migrated.reminderOffset, 'at_time');
  assert.equal(migrated.notificationId, null);
  assert.equal(migrated.title, task.title);
  assert.equal(migrated.id, task.id);
});
test('create saves returned identifier, payload and scheduled time; restart never duplicates', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  assert.ok(task.notificationId);
  assert.equal((await env.repository.getUserTasks('A'))[0].notificationId, task.notificationId);
  const data = env.pending.get(task.notificationId).data;
  assert.equal(data.type, 'task-reminder'); assert.equal(data.taskId, task.id); assert.equal(data.userId, 'A');
  assert.equal('email' in data, false); assert.equal('password' in data, false);
  await env.manager.reconcileTaskNotifications('A');
  await createTaskReminderManager(env.repository, env.adapter, now).reconcileTaskNotifications('A');
  assert.equal(env.pending.size, 1); assert.equal(env.schedules(), 1);
});
test('edit cancels old request before scheduling new content/time and disabling cancels it', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  const events = [];
  const cancel = env.adapter.cancelNotification;
  const schedule = env.adapter.scheduleTaskNotification;
  env.adapter.cancelNotification = async id => { events.push('cancel'); await cancel(id); };
  env.adapter.scheduleTaskNotification = async (...args) => { events.push('schedule'); return schedule(...args); };
  const edited = await env.manager.updateTask('A', task.id, { ...draft, title: 'Changed title', time: '20:00', reminderOffset: '15_minutes' });
  assert.deepEqual(events, ['cancel', 'schedule']);
  assert.notEqual(edited.task.notificationId, task.notificationId);
  assert.equal(env.pending.size, 1);
  assert.equal(new Date(edited.task.notificationScheduledFor).getHours(), 19);
  assert.equal(new Date(edited.task.notificationScheduledFor).getMinutes(), 45);
  const disabled = await env.manager.updateTask('A', task.id, { ...draft, reminderEnabled: false });
  assert.equal(env.pending.size, 0); assert.equal(disabled.task.notificationId, null);
  await env.manager.updateTask('A', task.id, draft);
  assert.equal(env.pending.size, 1);
});
test('completion cancels, uncompletion reschedules when future, deletion cancels', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  const completed = await env.manager.toggleTaskCompletion('A', task.id);
  assert.equal(completed.task.notificationId, null); assert.equal(env.pending.size, 0);
  const incomplete = await env.manager.toggleTaskCompletion('A', task.id);
  assert.ok(incomplete.task.notificationId); assert.equal(env.pending.size, 1);
  await env.manager.deleteTask('A', task.id);
  assert.equal(env.pending.size, 0); assert.deepEqual(await env.repository.getUserTasks('A'), []);
});
test('past offset and denied/unavailable permission save tasks without scheduling', async () => {
  for (const status of ['disabled', 'not_determined', 'unavailable']) {
    const env = setup();
    env.adapter.getNotificationPermissionStatus = async () => ({ status, canAskAgain: false });
    const { task } = await env.manager.createTask('A', draft);
    assert.equal(task.notificationId, null); assert.ok(task.notificationError); assert.equal(env.pending.size, 0);
    assert.equal((await env.repository.getUserTasks('A')).length, 1);
  }
  const env = setup();
  const { task } = await env.manager.createTask('A', { ...draft, time: '12:05', reminderOffset: '15_minutes' });
  assert.match(task.notificationError, /already passed/); assert.equal(env.schedules(), 0);
  await env.manager.toggleTaskCompletion('A', task.id);
  await env.manager.toggleTaskCompletion('A', task.id);
  assert.equal(env.schedules(), 0);
});
test('native scheduling failure never loses the saved task', async () => {
  const env = setup();
  env.adapter.scheduleTaskNotification = async () => { throw new Error('native failure'); };
  const { task } = await env.manager.createTask('A', draft);
  assert.equal(task.notificationId, null); assert.match(task.notificationError, /could not be scheduled/);
  assert.equal((await env.repository.getUserTasks('A')).length, 1);
});
test('failed notification-ID persistence compensates by canceling the native request', async () => {
  const env = setup();
  const original = env.storage.setItem;
  env.storage.setItem = async (key, raw) => {
    if (JSON.parse(raw).tasks.some(task => task.notificationId)) throw new Error('disk full');
    await original(key, raw);
  };
  const { task } = await env.manager.createTask('A', draft);
  assert.equal(env.pending.size, 0); assert.equal(task.notificationId, null);
  assert.ok(task.notificationError); assert.equal((await env.repository.getUserTasks('A')).length, 1);
});
test('cancel failure preserves task and prevents edit/delete/complete from creating duplicates', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  env.adapter.cancelNotification = async () => { throw new Error('native failure'); };
  await assert.rejects(env.manager.updateTask('A', task.id, { ...draft, time: '20:00' }), /has not changed/);
  await assert.rejects(env.manager.deleteTask('A', task.id), /has not changed/);
  await assert.rejects(env.manager.toggleTaskCompletion('A', task.id), /has not changed/);
  assert.equal(env.pending.size, 1); assert.equal(env.schedules(), 1);
  assert.equal((await env.repository.getUserTasks('A'))[0].completed, false);
});
test('failed task write after cancellation restores the previous reminder', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  env.storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(env.manager.updateTask('A', task.id, { ...draft, time: '20:00' }));
  assert.equal(env.pending.size, 1);
  assert.equal(env.pending.get(task.notificationId).data.scheduledFor, task.notificationScheduledFor);
  assert.equal((await env.repository.getUserTasks('A'))[0].time, draft.time);
});
test('reconciliation adopts orphaned metadata, repairs missing requests and removes only own stale requests', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  await env.repository.setReminderMetadata('A', task.id, { notificationId: null, notificationScheduledFor: null, notificationError: null });
  await env.manager.reconcileTaskNotifications('A');
  assert.equal(env.schedules(), 1);
  assert.equal((await env.repository.getUserTasks('A'))[0].notificationId, task.notificationId);
  env.pending.clear();
  await env.manager.reconcileTaskNotifications('A');
  assert.equal(env.pending.size, 1);
  env.pending.set('unrelated', { identifier: 'unrelated', data: { type: 'other' } });
  env.pending.set('B', { identifier: 'B', data: { app: 'daypilot', type: 'task-reminder', taskId: 'missing', userId: 'B' } });
  env.pending.set('A-stale', { identifier: 'A-stale', data: { app: 'daypilot', type: 'task-reminder', taskId: 'missing', userId: 'A' } });
  await env.manager.reconcileTaskNotifications('A');
  assert.equal(env.pending.has('A-stale'), false); assert.equal(env.pending.has('B'), true); assert.equal(env.pending.has('unrelated'), true);
});
test('permission revocation cancels; granting and retrying schedules without duplicate requests', async () => {
  const env = setup();
  await env.manager.createTask('A', draft);
  env.adapter.getNotificationPermissionStatus = async () => ({ status: 'disabled', canAskAgain: false });
  await env.manager.reconcileTaskNotifications('A'); assert.equal(env.pending.size, 0);
  env.adapter.getNotificationPermissionStatus = async () => ({ status: 'enabled', canAskAgain: false });
  await Promise.all([env.manager.reconcileTaskNotifications('A'), env.manager.reconcileTaskNotifications('A')]);
  assert.equal(env.pending.size, 1);
});
test('notification targets never expose another user, deleted task or arbitrary payload URL', async () => {
  const env = setup();
  const { task } = await env.manager.createTask('A', draft);
  const data = taskReminderPayload(task, calculateReminderDate(task));
  assert.equal(notificationTaskTarget(data, 'A', [task]), task.id);
  assert.equal(notificationTaskTarget(data, 'B', [task]), null);
  assert.equal(notificationTaskTarget(data, 'A', []), null);
  assert.equal(notificationTaskTarget({ url: '/task/private' }, 'A', [task]), null);
});
test('native adapter requests permission contextually once, handles denial and configures modern handler', async () => {
  let requests = 0;
  let current = { status: 'undetermined', granted: false, canAskAgain: true };
  let handler;
  const mock = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    getPermissionsAsync: async () => current,
    requestPermissionsAsync: async () => { requests++; current = { status: 'denied', granted: false, canAskAgain: false }; return current; },
    setNotificationHandler: value => { handler = value; },
  };
  const service = loader({ 'expo-notifications': mock, 'react-native': { Platform: { OS: 'ios' }, Linking: {} } })('services/notificationService.ts');
  service.initializeNotifications(); assert.equal(requests, 0);
  const behavior = await handler.handleNotification();
  assert.equal(behavior.shouldShowBanner, true); assert.equal(behavior.shouldShowList, true); assert.equal(behavior.shouldPlaySound, true); assert.equal(behavior.shouldSetBadge, false); assert.equal('shouldShowAlert' in behavior, false);
  await Promise.all([service.requestNotificationPermission(), service.requestNotificationPermission()]);
  await service.requestNotificationPermission(); assert.equal(requests, 1);
  current = { status: 'granted', granted: true, canAskAgain: false };
  assert.equal((await service.getNotificationPermissionStatus()).status, 'enabled');
  mock.getPermissionsAsync = async () => { throw new Error('unavailable'); };
  assert.equal((await service.getNotificationPermissionStatus()).status, 'unavailable');
});
test('native schedule uses a DATE trigger, default sound, scoped payload and a 10-second test', async () => {
  const scheduled = [];
  const mock = {
    IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    getPermissionsAsync: async () => ({ status: 'granted', granted: true, canAskAgain: false }),
    scheduleNotificationAsync: async request => { scheduled.push(request); return request.identifier; },
  };
  const service = loader({ 'expo-notifications': mock, 'react-native': { Platform: { OS: 'ios' }, Linking: {} } })('services/notificationService.ts');
  const task = { ...draft, id: 'task', userId: 'A', updatedAt: new Date().toISOString() };
  const future = new Date(Date.now() + 180000);
  assert.equal(await service.scheduleTaskNotification(task, future), reminderIdentifier(task));
  assert.equal(scheduled[0].trigger.type, 'date'); assert.equal(scheduled[0].trigger.date, future);
  assert.equal(scheduled[0].content.sound, 'default'); assert.equal(scheduled[0].content.title, draft.title);
  assert.equal('badge' in scheduled[0].content, false);
  await assert.rejects(service.scheduleTaskNotification(task, new Date(0)), /already passed/);
  const before = Date.now();
  await service.sendTestNotification('A');
  const delta = scheduled[1].trigger.date.getTime() - before;
  assert.ok(delta >= 10000 && delta < 11000);
  assert.equal(scheduled[1].content.data.type, 'notification-test');
});
test('cold/warm tap responses are deduplicated, cleared and listeners cleaned up', async () => {
  let listener;
  let removed = 0;
  let latest = { actionIdentifier: 'default', notification: { date: 100, request: { identifier: 'id', content: { data: { app: 'daypilot', type: 'task-reminder', userId: 'A', taskId: 'task' } } } } };
  const mock = {
    DEFAULT_ACTION_IDENTIFIER: 'default',
    getLastNotificationResponse: () => latest,
    clearLastNotificationResponse: () => { latest = null; },
    addNotificationResponseReceivedListener: value => { listener = value; return { remove: () => { removed++; } }; },
  };
  const service = loader({ 'expo-notifications': mock, 'react-native': { Platform: { OS: 'ios' }, Linking: {} } })('services/notificationService.ts');
  const cold = service.getLastReminderResponse(); assert.equal(cold.data.taskId, 'task');
  const received = [];
  const cleanup = service.subscribeToReminderResponses(value => received.push(value));
  await Promise.resolve();
  assert.equal(received.length, 1);
  const warm = latest;
  listener(warm);
  assert.equal(service.consumeReminderResponse(cold.key), true);
  assert.equal(service.consumeReminderResponse(cold.key), false);
  assert.equal(latest, null);
  listener(warm); assert.equal(received.length, 2, 'consumed taps are filtered');
  cleanup(); assert.equal(removed, 1);
});
test('OS request recovery after both metadata write and cancellation fail does not duplicate', async () => {
  const env = setup();
  const write = env.storage.setItem;
  const cancel = env.adapter.cancelNotification;
  env.storage.setItem = async (key, raw) => {
    if (JSON.parse(raw).tasks.some(task => task.notificationId || task.notificationError)) throw new Error('disk full');
    await write(key, raw);
  };
  env.adapter.cancelNotification = async () => { throw new Error('native cancellation failure'); };
  const { task } = await env.manager.createTask('A', draft);
  assert.match(task.notificationError, /may still arrive/); assert.equal(env.pending.size, 1);
  env.storage.setItem = write; env.adapter.cancelNotification = cancel;
  await env.manager.reconcileTaskNotifications('A');
  assert.equal(env.pending.size, 1); assert.equal(env.schedules(), 1);
  assert.equal((await env.repository.getUserTasks('A'))[0].notificationError, null);
});
test('elapsed scheduled reminders are not recreated or labeled as failed delivery', async () => {
  const env = setup();
  await env.manager.createTask('A', draft);
  env.pending.clear(); // Simulate an OS-delivered request disappearing from the queue.
  const later = createTaskReminderManager(env.repository, env.adapter, () => new Date(2035, 9, 8, 12));
  const result = await later.reconcileTaskNotifications('A');
  assert.equal(env.schedules(), 1); assert.equal(result.tasks[0].notificationId, null);
  assert.equal(result.tasks[0].notificationError, null); assert.ok(result.tasks[0].notificationScheduledFor);
});
