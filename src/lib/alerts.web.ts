// Browser version of alerts.ts. Background checks and notifications need the
// Android app, so on the web these do nothing and alerts stay off.
import type { WishItem } from './wishlist';

export type CheckResult =
  | { status: 'signedOut' }
  | { status: 'waiting'; resetsAt: number }
  | { status: 'expired' }
  | { status: 'checked'; matches: WishItem[]; notified: boolean };

export function markSeen(_raw: any) {}
export function onSignedIn() {}
export function onSignedOut() {}

export async function alertsEnabled() {
  return false;
}

export async function enableAlerts(): Promise<boolean> {
  return false;
}

export async function disableAlerts() {}

export async function checkWishlist(_opts?: { force?: boolean }): Promise<CheckResult> {
  return { status: 'signedOut' };
}
