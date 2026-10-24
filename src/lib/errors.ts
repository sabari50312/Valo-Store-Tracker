// Every failure the app can hit, mapped to something a user can act on.

export type ErrorKind =
  | 'offline' // no connection / DNS / TLS
  | 'timeout' // server didn't answer in time
  | 'session' // Riot rejected our tokens: sign in again
  | 'rateLimited' // too many requests
  | 'riotDown' // Riot 5xx or maintenance
  | 'catalogDown' // valorant-api.com (names/images) unavailable
  | 'changed' // response no longer has the shape we expect
  | 'unknown';

export class AppError extends Error {
  constructor(
    readonly kind: ErrorKind,
    /** Technical detail for the small print, e.g. "503 from pd.ap.a.pvp.net". */
    readonly detail?: string,
  ) {
    super(detail ?? kind);
    this.name = 'AppError';
  }
}

const CATALOG_HOSTS = ['valorant-api.com', 'media.valorant-api.com'];

export function httpError(status: number, host: string): AppError {
  const detail = `${status} from ${host}`;
  if (CATALOG_HOSTS.includes(host)) return new AppError('catalogDown', detail);
  if (status === 400 || status === 401 || status === 403) return new AppError('session', detail);
  if (status === 429) return new AppError('rateLimited', detail);
  if (status >= 500) return new AppError('riotDown', detail);
  if (status === 404) return new AppError('changed', detail);
  return new AppError('unknown', detail);
}

/** Normalises anything thrown into an AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const message = e instanceof Error ? e.message : String(e);
  // expo/fetch wraps every transport failure (no network, DNS, TLS) in FetchError.
  if (e instanceof Error && e.name === 'FetchError') return new AppError('offline', message);
  // Reading a field Riot stopped sending: "Cannot read property 'X' of undefined".
  if (e instanceof TypeError) return new AppError('changed', message);
  return new AppError('unknown', message);
}

export type ErrorCopy = { title: string; message: string; action: 'retry' | 'signIn' };

export function describe(e: AppError): ErrorCopy {
  switch (e.kind) {
    case 'offline':
      return { title: "You're offline", message: 'Check your connection and try again.', action: 'retry' };
    case 'timeout':
      return { title: 'Riot is taking too long', message: 'The request timed out. Try again in a moment.', action: 'retry' };
    case 'session':
      return { title: 'Sign in again', message: 'Riot ended your session. Sign in to load your store.', action: 'signIn' };
    case 'rateLimited':
      return { title: 'Slow down a little', message: 'Riot is limiting requests. Wait a minute, then try again.', action: 'retry' };
    case 'riotDown':
      return {
        title: "Riot's servers are having trouble",
        message: 'This is usually maintenance or an outage. Try again later.',
        action: 'retry',
      };
    case 'catalogDown':
      return {
        title: "Couldn't load skin details",
        message: 'The skin database is unavailable right now. Try again later.',
        action: 'retry',
      };
    case 'changed':
      return {
        title: 'Riot changed something',
        message: 'Your store came back in a format this version of Val Store doesn\'t understand. Check for an app update.',
        action: 'retry',
      };
    default:
      return { title: 'Something went wrong', message: 'Try again. If it keeps happening, check for an app update.', action: 'retry' };
  }
}
