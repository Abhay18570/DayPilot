const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Load the actual TypeScript adapter in Node; inject storage instead of a native bridge.
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = name => name === '@react-native-async-storage/async-storage' ? {} : load(path.resolve(path.dirname(file), `${name}.ts`));
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { createAuthStorage, AUTH_KEYS } = load(path.resolve(__dirname, '../src/services/authStorage.ts'));
const { validateRegistration, validateLogin } = load(path.resolve(__dirname, '../src/utils/authValidation.ts'));
function memory() {
  const data = new Map();
  return { data, getItem: async k => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); }, removeItem: async k => { data.delete(k); } };
}
const account = { fullName: '  Abhay Sonone  ', email: ' Abhay@Example.com ', password: 'DayPilot123', confirmPassword: 'DayPilot123' };

test('fresh launch, registration, cold restoration, logout and login', async () => {
  const storage = memory();
  const auth = createAuthStorage(storage);
  assert.equal(await auth.checkAuth(), null);
  const user = await auth.register(account);
  assert.equal(user.fullName, 'Abhay Sonone');
  assert.equal(user.email, 'abhay@example.com');
  assert.equal('password' in user, false);
  assert.deepEqual(await createAuthStorage(storage).checkAuth(), user);
  await auth.logout();
  assert.equal(storage.data.has(AUTH_KEYS.session), false);
  assert.equal(JSON.parse(storage.data.get(AUTH_KEYS.users)).length, 1);
  assert.equal(await createAuthStorage(storage).checkAuth(), null);
  assert.deepEqual(await auth.login({ email: 'ABHAY@example.com', password: account.password }), user);
});
test('duplicate email and incorrect credentials', async () => {
  const auth = createAuthStorage(memory());
  await auth.register(account);
  await assert.rejects(auth.register({ ...account, email: 'abhay@example.com' }), /An account with this email already exists\./);
  await assert.rejects(auth.login({ email: account.email, password: 'wrong' }), /Incorrect email or password\./);
  await assert.rejects(auth.login({ email: 'unknown@example.com', password: 'wrong' }), /Incorrect email or password\./);
});
test('multiple accounts remain independent', async () => {
  const auth = createAuthStorage(memory());
  const first = await auth.register(account);
  const second = await auth.register({ ...account, fullName: 'Second User', email: 'second@example.com' });
  assert.notEqual(first.id, second.id);
  assert.equal((await auth.checkAuth()).id, second.id);
  await auth.logout();
  assert.equal((await auth.login(account)).id, first.id);
});
test('concurrent duplicate submissions cannot create duplicate accounts', async () => {
  const storage = memory();
  const auth = createAuthStorage(storage);
  const results = await Promise.allSettled([auth.register(account), auth.register(account)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(JSON.parse(storage.data.get(AUTH_KEYS.users)).length, 1);
});
test('validation handles empty, invalid, short, weak and mismatched inputs', () => {
  assert.equal(Object.keys(validateRegistration({ fullName: '', email: '', password: '', confirmPassword: '' })).length, 4);
  assert.ok(validateLogin({ email: 'invalid', password: '' }).email);
  for (const password of ['Ab1', 'lowercaseonly', 'UPPERCASEONLY']) assert.ok(validateRegistration({ ...account, password }).password);
  assert.ok(validateRegistration({ ...account, confirmPassword: 'different' }).confirmPassword);
  assert.deepEqual(validateRegistration(account), {});
});
test('malformed and orphan sessions are removed', async () => {
  for (const raw of ['{', '{}', JSON.stringify({ userId: 'missing', email: 'x@y.com', loginAt: new Date().toISOString() })]) {
    const storage = memory();
    storage.data.set(AUTH_KEYS.session, raw);
    assert.equal(await createAuthStorage(storage).checkAuth(), null);
    assert.equal(storage.data.has(AUTH_KEYS.session), false);
  }
});
test('damaged accounts are reported without overwriting data', async () => {
  const storage = memory();
  storage.data.set(AUTH_KEYS.users, '{damaged');
  await assert.rejects(createAuthStorage(storage).register(account), /saved accounts could not be accessed/);
  assert.equal(storage.data.get(AUTH_KEYS.users), '{damaged');
});
test('read failures are recoverable', async () => {
  const storage = memory();
  const original = storage.getItem;
  storage.getItem = async () => { throw new Error('disk unavailable'); };
  const auth = createAuthStorage(storage);
  await assert.rejects(auth.checkAuth(), /saved accounts could not be accessed/);
  storage.getItem = original;
  assert.equal(await auth.checkAuth(), null);
});
test('failed account write never signs in', async () => {
  const storage = memory();
  storage.setItem = async () => { throw new Error('disk full'); };
  await assert.rejects(createAuthStorage(storage).register(account), /saved accounts could not be accessed/);
  assert.equal(storage.data.has(AUTH_KEYS.session), false);
});
test('partial registration tells user to log in, and account remains usable', async () => {
  const storage = memory();
  const original = storage.setItem;
  storage.setItem = async (k, v) => { if (k === AUTH_KEYS.session) throw new Error('disk full'); await original(k, v); };
  const auth = createAuthStorage(storage);
  await assert.rejects(auth.register(account), /account was created.*Please log in/);
  storage.setItem = original;
  assert.equal((await auth.login(account)).email, 'abhay@example.com');
});
test('failed logout preserves the session and reports failure', async () => {
  const storage = memory();
  const auth = createAuthStorage(storage);
  const user = await auth.register(account);
  storage.removeItem = async () => { throw new Error('disk unavailable'); };
  await assert.rejects(auth.logout(), /saved accounts could not be accessed/);
  assert.deepEqual(await auth.checkAuth(), user);
});
