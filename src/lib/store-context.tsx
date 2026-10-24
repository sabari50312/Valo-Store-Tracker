import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { markSeen, onSignedIn, onSignedOut } from './alerts';
import { loadCatalog } from './catalog';
import { AppError, toAppError } from './errors';
import { clearRiotSession, openSession, silentAuth, Tokens } from './riot';
import { loadStore, Store } from './store';

export type StoreState =
  | { kind: 'loading'; label: string }
  | { kind: 'signedOut' } // no Riot session: show the sign-in prompt
  | { kind: 'login' } // Riot's login page is open
  | { kind: 'store'; store: Store }
  | { kind: 'error'; error: AppError };

type Ctx = {
  state: StoreState;
  riotId: string | null;
  refresh: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  onLogin: (t: Tokens) => void;
  signOut: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({ kind: 'loading', label: 'signing in…' });
  const [riotId, setRiotId] = useState<string | null>(null);

  const load = useCallback(async (tokens: Tokens) => {
    setState({ kind: 'loading', label: 'loading your offers…' });
    try {
      // The catalog only adds names and images; the store still loads without it.
      const [session, catalog] = await Promise.all([openSession(tokens), loadCatalog().catch(() => null)]);
      setRiotId(session.riotId);
      const { store, raw } = await loadStore(session, catalog);
      markSeen(raw);
      setState({ kind: 'store', store });
    } catch (e) {
      setState({ kind: 'error', error: toAppError(e) });
    }
  }, []);

  const afterSilentAuth = useCallback(
    (tokens: Tokens | null) => (tokens ? load(tokens) : setState({ kind: 'signedOut' })),
    [load],
  );
  const onError = useCallback((e: unknown) => setState({ kind: 'error', error: toAppError(e) }), []);

  const refresh = useCallback(() => {
    setState({ kind: 'loading', label: 'signing in…' });
    silentAuth().then(afterSilentAuth, onError);
  }, [afterSilentAuth, onError]);

  // Initial state is already "signing in", so start straight with the request.
  useEffect(() => {
    silentAuth().then(afterSilentAuth, onError);
  }, [afterSilentAuth, onError]);

  const onLogin = useCallback(
    (tokens: Tokens) => {
      onSignedIn();
      load(tokens);
    },
    [load],
  );

  const signOut = useCallback(async () => {
    await clearRiotSession();
    onSignedOut();
    setRiotId(null);
    setState({ kind: 'signedOut' });
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        riotId,
        refresh,
        openLogin: () => setState({ kind: 'login' }),
        closeLogin: () => setState({ kind: 'signedOut' }),
        onLogin,
        signOut,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
