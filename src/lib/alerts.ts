// Background wishlist check. Imported from index.ts so the task is defined
// before anything renders (Android may start the JS bundle just to run it).
import { isRunningInExpoGo } from 'expo';
import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import * as TaskManager from 'expo-task-manager';

import { fetchStorefront, openSession, silentAuth } from './riot';
import { offeredLevelIds } from './store';
import { getWishlist, WishItem } from './wishlist';

const TASK = 'wishlist-check';
const CHANNEL = 'wishlist';
// Android can't run code at an exact time, so the task wakes up regularly but
// returns straight away (no network) until the store has reset. Riot is only
// contacted once per store rotation; this just bounds how late after a reset
// the alert can be. Android treats it as a minimum and may stretch it.
const WAKE_MINUTES = 30;
// Expo Go's built-in expo-notifications is older than our JS and crashes when
// creating channels, so there we post on Expo Go's own default channel instead.
const USE_CHANNEL = !isRunningInExpoGo();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

TaskManager.defineTask(TASK, async () => {
  try {
    await checkWishlist();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export type CheckResult =
  | { status: 'waiting'; resetsAt: number }
  | { status: 'expired' }
  | { status: 'checked'; matches: WishItem[]; notified: boolean };

const resetsAt = (raw: any) => Date.now() + raw.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds * 1000;

/** One key per store rotation + set of matches, so each find is announced once. */
function alertKey(raw: any, matches: WishItem[]) {
  return `${Math.round(resetsAt(raw) / 3_600_000)}:${matches.map(m => m.levelId).sort().join(',')}`;
}

function matchesIn(raw: any) {
  const offered = new Set(offeredLevelIds(raw));
  return getWishlist().filter(w => offered.has(w.levelId));
}

/**
 * Called when the app shows the store: you've seen this rotation, so the
 * background check waits for the next reset and won't re-announce matches.
 */
export function markSeen(raw: any) {
  Storage.setItemSync('nextReset', String(resetsAt(raw)));
  const matches = matchesIn(raw);
  if (matches.length) Storage.setItemSync('lastAlert', alertKey(raw, matches));
}

async function notify(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: USE_CHANNEL ? { channelId: CHANNEL } : null,
  });
}

/** force: skip the "store hasn't reset yet" wait and re-announce matches (Check now button). */
export async function checkWishlist({ force = false } = {}): Promise<CheckResult> {
  const nextReset = Number(Storage.getItemSync('nextReset') ?? 0);
  if (!force && Date.now() < nextReset) return { status: 'waiting', resetsAt: nextReset };

  const tokens = await silentAuth();
  if (!tokens) {
    if (Storage.getItemSync('expiredAlert') !== '1') {
      Storage.setItemSync('expiredAlert', '1');
      await notify('Riot session expired', 'Open the app and sign in again to keep wishlist alerts working.');
    }
    return { status: 'expired' };
  }
  Storage.removeItemSync('expiredAlert');

  const raw = await fetchStorefront(await openSession(tokens));
  Storage.setItemSync('nextReset', String(resetsAt(raw)));
  const matches = matchesIn(raw);
  if (!matches.length) return { status: 'checked', matches, notified: false };

  const key = alertKey(raw, matches);
  if (!force && Storage.getItemSync('lastAlert') === key) return { status: 'checked', matches, notified: false };

  await notify(
    matches.length === 1 ? `${matches[0].name} is in your store` : `${matches.length} wishlist skins are in your store`,
    matches.map(m => m.name).join(', '),
  );
  Storage.setItemSync('lastAlert', key);
  return { status: 'checked', matches, notified: true };
}

// --- enabling ---------------------------------------------------------------

export async function alertsEnabled() {
  return TaskManager.isTaskRegisteredAsync(TASK);
}

/** Returns false if notification permission was denied. */
export async function enableAlerts(): Promise<boolean> {
  // Android 13+ only shows the permission prompt once a channel exists.
  if (USE_CHANNEL) {
    await step('notification channel', () =>
      Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Wishlist alerts',
        // eslint-disable-next-line import/namespace -- exported via `export *`; the lint resolver misses it, tsc doesn't
        importance: Notifications.AndroidImportance.HIGH,
      }),
    );
  }
  const granted = await step('notification permission', async () => {
    const current = await Notifications.getPermissionsAsync();
    return current.granted || (await Notifications.requestPermissionsAsync()).granted;
  });
  if (!granted) return false;
  await step('background task', () => BackgroundTask.registerTaskAsync(TASK, { minimumInterval: WAKE_MINUTES }));
  return true;
}

/** Prefixes errors with the step that failed, so the UI can say what broke. */
async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function disableAlerts() {
  if (await alertsEnabled()) await BackgroundTask.unregisterTaskAsync(TASK);
}
