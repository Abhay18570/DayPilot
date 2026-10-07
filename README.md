# DayPilot

React Native + Expo SDK 57 + TypeScript. Phase 3 adds local reminders; its current behavior is documented below the retained Phase 1/2 reference. Phase 2 adds core task management and local persistence to the working Phase 1 authentication flow. The original splash, welcome, login, registration, session restoration, password recovery placeholder, and logout service are preserved.

## Run on a physical iPhone

```sh
npm install
npx expo start --clear
```

For subsequent runs, `npx expo start` is sufficient. Keep the computer and iPhone on the same Wi-Fi network. Scan the terminal QR code with the iPhone Camera and open it in an SDK 57-compatible Expo Go. The native date/time picker is included in the matching Expo Go runtime; no custom native build is required for this phase.

The user has physically verified Phase 2 task creation and persistence on iPhone. The sections through “Known limitations and Phase 3 boundary” below describe the Phase 2 baseline; the appended Phase 3 section supersedes reminder-related limitations.

## Phase 2 implementation

- Protected Home / Tasks / central Add Task / Calendar / Profile tabs.
- Home greeting and date, today's priority-sorted tasks, dynamic progress, quick add, and the next four upcoming incomplete tasks.
- My Tasks: title/description/category search; All, Today, Upcoming, Completed and Overdue filters; Date, Priority and Recently Added sorting.
- Shared create/edit form with title, optional description, native date and time pickers, seven categories, three priorities, reminder preference, and repeat preference.
- Task Details, edit/reschedule, completion/uncompletion, and native-confirmed deletion.
- Monthly calendar with previous/next controls, today and selected-day highlights, task indicators, a selected-day list, and date-prefilled task creation.
- Profile with account details, system appearance information, task preference information, storage counts, about text, and existing logout.
- Per-account persistence; loading/error/retry states; optimistic completion with rollback; safe areas; scrollable keyboard-aware forms; system light/dark colors.
- Native stack transitions and press feedback. No additional animation dependency.

Upcoming means incomplete tasks whose scheduled local date/time has not passed, including later today. Overdue means an incomplete task whose scheduled local date/time has passed. Home sorts incomplete tasks by high/medium/low priority then time, followed by completed tasks. My Tasks keeps completed items after incomplete items for all sort options.

## Updated project structure

```text
src/
  app/
    _layout.tsx                   existing authentication protection
    index.tsx                     authenticated destination updated
    (auth)/                       existing Phase 1 screens, unchanged
    (app)/
      _layout.tsx                 TaskProvider + authenticated stack
      (tabs)/
        _layout.tsx               five bottom tabs
        home.tsx
        tasks.tsx
        add.tsx                   central modal action / direct-link fallback
        calendar.tsx
        profile.tsx
      add-task.tsx                task creation modal
      task/
        [id].tsx                  details
        edit.tsx                  shared edit form
  components/
    DayPilotUI.tsx                shared Phase 1 UI, extended
    tasks/
      TaskUI.tsx                  chips, progress, empty/loading states, list shell
      TaskCard.tsx
      TaskForm.tsx
      DateTimeField.tsx
      MonthCalendar.tsx
  constants/
    daypilot.ts                   shared light/dark tokens
  context/
    AuthContext.tsx               unchanged
    TaskContext.tsx
  hooks/
    useNow.ts
  services/
    authStorage.ts                unchanged
    taskStorage.ts
  types/
    auth.ts                       unchanged
    task.ts
  utils/
    authValidation.ts             unchanged
    taskDates.ts
    taskSelectors.ts
    taskValidation.ts
tests/
  auth.test.cjs                   original 11 regression tests
  tasks.test.cjs                  13 task/date/isolation tests
```

Phase 2 new files are all `(tabs)` routes, `add-task.tsx`, the two `task/` routes, the five `components/tasks/` files, `TaskContext.tsx`, `useNow.ts`, `taskStorage.ts`, `task.ts`, the three task utility files, and `tasks.test.cjs` shown above. Home was moved from `src/app/(app)/home.tsx` to `(tabs)/home.tsx` and expanded into the dashboard.

Existing files modified in Phase 2: `src/app/(app)/_layout.tsx`, `src/app/index.tsx`, `src/components/DayPilotUI.tsx` (tab-safe-area option and multiline input height), `src/constants/daypilot.ts` (additional theme tokens), `package.json`, `package-lock.json`, `app.json` (picker plugin added by Expo), and this README. Phase 1 authentication files were not rebuilt or redesigned.

## Dependency installed

```sh
npx expo install @react-native-community/datetimepicker
```

Expo resolved version `9.1.0`. The calendar grid uses React Native components and has no additional dependency. Existing AsyncStorage and Expo vector icons are reused. No Redux, notification package, backend client, or external database was added.

## Storage and TaskContext

AsyncStorage keys:

| Key | Contents |
| --- | --- |
| `daypilot_users` | Existing local accounts |
| `daypilot_session` | Existing persistent login session |
| `daypilot_tasks:<encoded-user-id>` | `{ version: 1, tasks: Task[] }` for that account only |

The task adapter exposes `getUserTasks`, `createTask`, `updateTask`, `deleteTask`, `toggleTaskCompletion`, and `clearUserTasks`. All operations require a user ID. Every loaded record is checked against the owner; updates whitelist editable fields and cannot change IDs or ownership. Serialized writes prevent concurrent read/modify/write operations from losing data. Invalid or unsupported saved data is reported and preserved rather than silently reset. The clear operation is service-only; no bulk-deletion UI was added.

`TaskProvider` sits inside the existing protected app stack and is keyed by the authenticated user ID. Switching accounts unmounts the previous user's state, forms, and routes. The provider loads only that user's collection and exposes tasks, loading/saving/error/feedback state, create/update/delete/toggle actions, and date/today/upcoming/completed selectors through `useTasks()`.

Creation, editing, and deletion publish the persisted snapshot to all screens immediately after the save succeeds. Completion updates optimistically, disables competing mutations while saving, and restores the previous snapshot if storage fails. Failed saves keep the form open with its entered values. A per-minute/foreground clock refreshes greetings, today and overdue labels. Logout removes only the existing session key; account and task data remain.

Task dates are stored as `YYYY-MM-DD` and times as `HH:mm`, interpreted as local wall-clock values rather than UTC strings. Audit timestamps use ISO instants. Date arithmetic, validation, display formatting, calendar generation, filtering and sorting are centralized and independently tested. Device timezone changes keep the task's chosen local clock time; timezone-bound scheduling is not part of Phase 2.

## Automated verification

```sh
npm run typecheck
npm run lint
npm test
TZ=Asia/Kolkata node --test tests/tasks.test.cjs
TZ=America/New_York node --test tests/tasks.test.cjs
npx expo export --platform ios --output-dir /tmp/daypilot-phase2-ios
```

The 24 tests cover the original auth regressions plus task CRUD across recreated adapters, completion timestamps, logout/login account isolation, cross-user mutation rejection, ownership injection, concurrent writes, failed saves, corrupt/foreign data, validation, leap years, local dates, month grids, search, filters, ordering and progress. They run actual service and utility code with injected in-memory storage; they do not claim to exercise the physical native storage bridge.

Route review: the unchanged root `Stack.Protected` guards the entire `(app)` stack, including tab routes, Add Task, Details and Edit. Signed-out deep links cannot mount the task provider. Authenticated redirects enter Home. Detail/edit lookups only use the current user's task collection; unknown, deleted, or another user's task IDs show a not-found state. The provider's user key prevents late async results from crossing accounts.

## Complete physical iPhone acceptance checklist

Use disposable account credentials. Keep Metro available when closing and reopening Expo Go.

1. Launch signed out: confirm Splash → Welcome. Exercise login, registration validation, password visibility and the existing recovery explanation.
2. Sign in: confirm Home with the correct first name, current date, and Home / Tasks / Add Task / Calendar / Profile tabs. Switch between all four content tabs. Central Add opens the creation form.
3. With no tasks, verify the Home progress is 0%, all major lists show their appropriate empty states, and no empty state flashes while storage is loading.
4. Try to create a blank or whitespace-only title. Confirm a field error and no task created. Enter a title and optional multiline description; scroll with the iPhone keyboard open and confirm every field and Create Task remain reachable.
5. Open Date: select today, cancel once, reopen and confirm a selection with Done. Repeat for Time. Check both pickers in light and dark modes. Confirm canceled changes do not change the form.
6. Create three tasks for today with different times and Low, Medium, High priorities. Exercise College, DSA, Project, Personal, Fitness, Work and Other across create/edit flows. Confirm the title, date/time, category and priority are displayed correctly.
7. Enable Remind me and choose a Repeat value. Save and inspect Details. Confirm the values persist and the UI says these are preferences only. No notification permission prompt or scheduled notification should occur.
8. Confirm successful creation opens Details with feedback. Return Home and Tasks; the saved task must appear without restarting. Today's tasks should put incomplete high priority first, then medium/low, then completed.
9. Complete one of three tasks from Home. Confirm immediate checkbox/strikethrough and 33% progress. Uncomplete it and confirm 0%. Complete from Tasks and Details too; all screens must agree.
10. Create an incomplete task in the past. Confirm OVERDUE and the Overdue filter. Complete it; confirm it is no longer overdue. Create a future task and confirm Home Upcoming and Tasks Upcoming show it in chronological order.
11. Tap Home Upcoming → See All and confirm My Tasks opens with Upcoming selected. Exercise All, Today, Upcoming, Completed and Overdue in place.
12. Search by part of the title, description, and category with mixed case. Check no-match messaging. Clear the search and switch Date, Priority and Recently Added sorting.
13. Open Details and check all fields, status and completion timestamp. Edit title, description, date/time, category, priority, reminder and repeat. Save; verify Details, Home, Tasks and Calendar reflect the changes.
14. Reschedule a today's task to tomorrow. Confirm today's progress denominator and task list update; the task appears under the new calendar date and Upcoming if incomplete.
15. In Calendar, move to previous/next months, including December/January. Confirm today highlighting, selected-day highlighting and task dots. Select days with and without tasks and inspect their lists.
16. Select a future calendar date and tap Add Task. Confirm the date is prefilled. Save and return to that date; verify its dot and task list. Tap the task to open Details.
17. Start editing a task, change a field, tap Cancel, choose Keep Editing, then Cancel → Discard. Confirm persisted values did not change.
18. Delete a task: first cancel the native confirmation and confirm the task remains. Then confirm Delete; verify it disappears from all lists/calendar dots and returns to Tasks without revisiting deleted Details on Back.
19. Create a task and reload from Expo's developer menu, then fully close/reopen Expo Go. Confirm the login session and task are restored.
20. Complete that task, reload/reopen, and confirm completion persists. Edit it, reload/reopen, and confirm all edits persist. Delete it, reload/reopen, and confirm it stays deleted.
21. User A: create “User A Task”, then Profile → Log Out. Confirm Welcome and no authenticated routes remain accessible.
22. Register/login User B. Confirm User A's task is absent from Home, Tasks, search and Calendar. Create “User B Task”, log out, log back into A, and confirm only A's task appears. Recheck after a reload.
23. Signed out, open a task route/deep link: it must resolve through authentication. Signed in as B, attempt A's task ID in Details/Edit: it must show task not found. Signed in, login/register links must not expose the auth forms.
24. Inspect Profile's name/email, system appearance label and accurate task counts. Cancel logout once, then log out and back in; tasks must remain.
25. Switch iPhone appearance while viewing forms, cards, calendar, pickers and tabs. Confirm contrast and readable controls. Try larger text and a smaller iPhone size if available. Check Dynamic Island and home-indicator spacing, scrolling, tap targets and keyboard dismissal.
26. Leave the app in the background across a time/date change and return. Verify greeting/today/overdue labels refresh. Storage failure and rollback cases are automated; if simulating storage errors in development, verify Retry, preserved form values and checkbox rollback.

## Known limitations and Phase 3 boundary

- Physical iPhone interaction was not automated from this workspace. Native picker behavior, keyboard/notch layout, tab transitions and real force-close/reopen persistence require the checklist above. An iOS bundle is a build check, not a device test.
- Data is local and unencrypted. Existing prototype authentication still stores plaintext passwords; use disposable passwords. A secure backend must replace it before production. Data does not sync or back up and can disappear if app data is cleared/uninstalled.
- Reminder and repeat values are stored only. They do not schedule notifications or create recurring copies.
- Dates represent local wall-clock intent; no timezone binding or daylight-saving scheduling engine is implemented.
- Profile follows the existing system appearance; no separate appearance preference or global task defaults UI is added.
- iPhone/native mobile is the acceptance target. The optional web form uses text date/time entry; native confirmation dialogs are designed for mobile.
- Expo Go may show its own native launch screen before the existing in-app splash. Final launcher assets remain a later branding task.

Intentionally deferred to Phase 3 or later: notification permissions/tokens, local/push reminders, background scheduling, recurrence generation, backend/API/database, secure cloud accounts, cloud sync/backup, Google Calendar integration, AI, habits, goals, focus/Pomodoro, and analytics. None is implemented or automatically started by this phase.

## Phase 3 — local iPhone notifications

Phase 3 integrates `expo-notifications ~57.0.22`, installed with `npx expo install expo-notifications`, and adds its config plugin without removing the existing plugins. Existing authentication, TaskContext, per-user AsyncStorage persistence, navigation, and visual design remain in place. There are no push tokens, remote push requests, servers, background JS jobs, or notification-related internet requests.

### Architecture and file changes

New files:

- `src/services/notificationService.ts`: the sole Expo Notifications adapter; permission/status, handler, native date scheduling, targeted cancellation, settings link, development test, and response subscriptions.
- `src/services/taskReminders.ts`: serialized lifecycle coordination and reconciliation around the existing task storage service.
- `src/types/notification.ts`: permission, request and adapter contracts.
- `src/utils/reminders.ts`: six reminder offsets, local-time calculation, task-specific identifiers/payloads and safe tap-target resolution.
- `src/components/NotificationResponseBridge.tsx`: one cleaned-up response listener and deferred cold-start navigation inside protected routes.
- `src/components/NotificationSettings.tsx`: Profile notification status, contextual enable/settings actions, retry and development-only test.
- `src/components/tasks/ReminderDetails.tsx`: user-facing reminder status and scheduled time.
- `tests/notifications.test.cjs`: calculation, lifecycle, adapter, failure compensation and response tests.

Modified files: `src/types/task.ts`, `src/utils/taskValidation.ts`, `src/services/taskStorage.ts`, `src/context/TaskContext.tsx`, `src/components/tasks/TaskForm.tsx`, `src/app/(app)/task/[id].tsx`, `src/app/(app)/(tabs)/profile.tsx`, `src/app/(app)/_layout.tsx`, `src/app/_layout.tsx`, `package.json`, `package-lock.json`, `app.json`, and this README. AuthContext and authentication storage were not changed.

### Task model and backward compatibility

Tasks now contain:

- `reminderOffset`: `at_time`, `5_minutes`, `15_minutes`, `30_minutes`, `1_hour`, or `1_day`.
- `notificationId`: persisted native request identifier, or null.
- `notificationScheduledFor`: ISO instant used for queue reconciliation/status, or null.
- `notificationError`: user-readable scheduling status, or null.

Old Phase 2 records default to `at_time` and null metadata on read. Their IDs, ownership, content, completion and preferences are preserved. Existing storage keys and the version-1 envelope remain compatible. Metadata updates do not alter the task's edit timestamp. Real edits advance the timestamp monotonically so replacement reminders have distinct request identifiers, even with rapid edits.

### Permissions and presentation

No permission dialog appears at launch. Turning Remind me ON or pressing Profile → Notifications → Enable Notifications requests alert/sound permission only when status is Not Determined and `canAskAgain` is true. Concurrent permission requests are coalesced. Denied permissions are not repeatedly requested; Profile offers the system settings link. Returning from Settings refreshes permission and reconciles reminders.

Denied/unavailable permission does not prevent saving a task. Details shows Not scheduled and explains why. Provisional iOS permission is recognized as quiet delivery, with explanatory settings guidance. The centralized foreground handler uses SDK 57's `shouldShowBanner`, `shouldShowList`, `shouldPlaySound`, and `shouldSetBadge: false`. Requests use the default sound and no badge value or custom audio.

### Scheduling and lifecycle

The task's `YYYY-MM-DD` plus `HH:mm` is parsed in the device's local timezone using the existing date utilities. The chosen elapsed-minute offset is subtracted to produce a one-time DATE trigger. One day means 24 elapsed hours. Nonexistent local times at daylight-saving transitions are rejected for reminders rather than silently shifted. Invalid, past, or too-close reminder times never intentionally trigger an immediate notification. The task remains saved with feedback.

Notification content is the task title plus “It’s time to start your task.” (or “Your task is coming up soon.” for advance reminders). Payload:

```ts
{
  app: 'daypilot',
  type: 'task-reminder',
  taskId,
  userId,
  signature,     // task title/date/time/offset, for comparing queued content
  scheduledFor   // expected trigger instant
}
```

No email, password, session credential or arbitrary route URL is included.

| Action | Behavior |
| --- | --- |
| Create | Save task first, check permission/time, schedule, persist returned ID. Scheduling failure keeps the task. |
| Edit/reschedule | Cancel the previous scoped request, save changes, schedule the replacement, persist its new ID. This also refreshes an edited notification title. |
| Reminder OFF | Cancel the old request and clear reminder metadata. |
| Reminder ON | Schedule if permission exists and the calculated time is in the future. |
| Complete | Cancel before saving completion and clear the ID. |
| Uncomplete | Recalculate and schedule only if still eligible; never reuse a past request blindly. |
| Delete | Cancel before removing the task. |
| Cancellation failure | Stop the edit/delete/completion, retain the existing task, and show a retryable error rather than claiming the reminder was canceled. |
| Task write fails after cancellation | Attempt to restore the previous task's reminder; task data remains unchanged. |
| Saving the notification ID fails | Attempt to cancel the newly scheduled request. Keep the task and show a warning. If both systems fail, scoped request data permits later recovery without duplicates. |

OS scheduling and AsyncStorage cannot form one atomic transaction. Compensation handles normal partial failures; simultaneous OS/storage failures are reported explicitly, including the possibility that a previous reminder may still arrive. The task itself is never discarded because a new reminder failed.

### Reconciliation and tap navigation

Reconciliation runs on authenticated task loading, application foregrounding, and explicit Profile retry—not on every render. A manager queue prevents reconciliation and task mutations from interleaving. It:

- Retains matching scheduled requests without recreating them.
- Recovers a notification ID when native scheduling succeeded before the app closed or a metadata write failed.
- Repairs missing eligible future reminders.
- Cancels stale/duplicate requests and deleted-task references belonging only to the current user and identifiable as DayPilot task reminders.
- Leaves another account's and unrelated notifications alone.
- Records passed reminder times without claiming proof of delivery or rescheduling them immediately.

Notification taps are handled both from a running app and the native last-response API on cold launch. Navigation waits for authentication, the root navigator, and the current user's tasks. Only a matching current-user task ID opens Details. Deleted/foreign tasks go safely to Home with generic feedback; the app never switches accounts or follows a payload URL. Responses are deduplicated, consumed, and listeners are removed on unmount. If signed out, the existing sign-in flow remains required before resolving the notification.

Logout preserves tasks and already-scheduled OS reminders. Notifications are device-level: their task titles can still appear on the shared phone while signed out or using another account. In-app Details access remains account-isolated. This phase does not implement a separate lock-screen privacy policy.

### Expo Go versus a development build

[Expo's SDK 57 notification documentation](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) explicitly states that local notifications remain available in Expo Go. The Android remote-push restriction is unrelated to this local-only implementation. Local iPhone scheduling, foreground presentation, response handling, and the test button can be exercised in a matching Expo Go runtime; this work does not migrate the project to a development build.

Expo Go owns the host app identity and system permission settings. Notifications may show Expo Go's app name/icon; use Expo Go's notification settings while testing. DayPilot's independent installed name/icon and app-specific settings require its own development/release build. A cold launch in development can require Metro to load the project; the OS can deliver an already-scheduled local notification without a network or running JS process. Keep Metro available for tap-navigation acceptance testing.

### Phase 3 verification commands

```sh
npm run typecheck
npm run lint
npm test
TZ=Asia/Kolkata node --test tests/notifications.test.cjs
TZ=America/New_York node --test tests/notifications.test.cjs
npx expo install --check
npx expo export --platform ios --output-dir /tmp/daypilot-phase3-ios
```

Tests cover all offsets, midnight/month/year/leap-day boundaries, local timezone behavior, daylight-saving gaps, old-task defaults, create/edit/toggle/delete, permissions, persisted IDs, no-duplicate restart reconciliation, unrelated-user preservation, native/AsyncStorage failures, actual adapter trigger/content construction, and cold/warm response consumption. Native notification APIs are mocked in unit tests. Phase 3 physical delivery has not been tested from this workspace.

### Exact physical iPhone acceptance procedure

1. Restart Metro with `npx expo start --clear`; open DayPilot in the matching Expo Go on the iPhone. Confirm existing login, task data and task editing still work. No permission prompt should appear just from launching.
2. Open Profile → Notifications → Enable Notifications and allow iOS alerts/sound. Alternatively, turn Remind me ON in a new task. Confirm permission reads Enabled. For an earlier denial, use Open iPhone Settings and enable notifications for Expo Go (or DayPilot in its own build), then return.
3. Press the clearly labeled development tool **Send Test Notification**. Confirm “Test notification scheduled,” lock the phone, and wait approximately 10 seconds. Check banner/Notification Center/default sound. Repeat while foregrounded to check the handler. This test does not open a task.
4. Note the current time. Create “Solve 5 DSA Questions” **2–3 minutes ahead**, Reminder ON, **At task time**. Save. Details should show the scheduled time and no raw ID.
5. Lock the iPhone and wait. At the selected time, expect the task notification. Tap it: DayPilot should open that task's Details. Repeat with DayPilot backgrounded and then with it fully closed before delivery. Keep Metro reachable for Expo Go cold launch.
6. **Edit test:** create a reminder 5 minutes ahead, then edit it to 8 minutes ahead. Confirm no notification at the original time and one at the new time. Also edit the title and confirm the delivered title is updated.
7. **Offsets:** select each of At task time, 5/15/30 minutes, 1 hour, and 1 day before. To test quickly, set task time to the offset plus 2–3 minutes from now. Confirm the displayed scheduled time is correct; test a cross-midnight date as well.
8. **Past offset:** make a task 5 minutes ahead with 15 minutes before. Confirm the task saves, Details says Not scheduled with the passed-time explanation, and no surprise immediate notification appears.
9. **OFF/ON:** create a future reminder, disable it in Edit, and verify no old notification arrives. Enable it again with a future time and confirm a reminder is scheduled.
10. **Delete test:** create a future reminder, cancel the deletion dialog once, then confirm deletion. Verify no notification arrives after the scheduled time.
11. **Complete test:** create a future reminder and complete the task before its time. Verify no reminder arrives. Uncomplete while still future and confirm a new reminder; uncomplete after its time and confirm no immediate reminder.
12. **Persistence/duplicates:** create a future reminder, reload/reopen several times and visit different screens. Expect only one notification. Check that existing task content and completion still persist.
13. **Permission denial:** disable host-app notifications in iOS Settings. Return to DayPilot; Profile must show Disabled. Create/edit a reminder task: it must save with a clear Not scheduled explanation, without repeated permission dialogs. Re-enable permission, return and use Check / Retry Reminders for future tasks.
14. **Account isolation:** schedule User A's reminder, log out and log into B. Tap A's notification when it arrives. Expect generic unavailable feedback/Home and no A Details or automatic account switch. A's title may be visible in the device-level notification as documented above. Log into A and verify A's tasks remain.
15. **Missing task:** if an already-delivered notification remains in Notification Center after deleting its task, tap it. Expect safe unavailable feedback, not a crash.
16. Verify light/dark readability, keyboard scrolling, picker behavior, safe areas, all tabs, search/filters/calendar, persistent sessions and logout. Run the retained Phase 1/2 acceptance checklist as a regression check, substituting real reminders for the old preference-only assertions.

For timed checks, enable Lock Screen/Banners/Sounds in the host app's settings and account for Focus, Silent Mode, or Scheduled Summary settings. iOS controls actual delivery/presentation; the app does not bypass system policy or guarantee audible alarms.

### Phase 3 limitations and deferred work

- One-time reminders only. Repeat preference is retained; no recurring notification/task-generation engine is implemented.
- OS queue capacity, device settings and delivery policy apply. This is not a critical-alarm application.
- A timezone change is reconciled when the app next becomes active; without reopening, an existing one-time OS request retains its scheduled instant.
- The Profile test tool is hidden when `__DEV__` is false. Badge counts and custom sounds are intentionally absent.
- Existing local plaintext authentication and unencrypted task storage remain prototype limitations.
- Remote push, tokens, APNs/FCM server communication, backend/database scheduling, cloud sync, recurrence generation, AI and other productivity modules remain deferred. No Phase 4 work was started.
