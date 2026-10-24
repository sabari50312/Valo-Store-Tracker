import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { markSeen } from './alerts';
import { loadCatalog } from './catalog';
import { openSession, silentAuth, Tokens } from './riot';
import { loadStore, Store } from './store';

export type StoreState =
  | { kind: 'loading'; label: string }
  | { kind: 'login' }
  | { kind: 'store'; store: Store }
  | { kind: 'error'; message: string };

type Ctx = { state: StoreState; refresh: () => void; onLogin: (t: Tokens) => void };

const StoreContext = createContext<Ctx | null>(null);

const message = (e: unknown) => String(e instanceof Error ? e.message : e);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({ kind: 'loading', label: 'signing in…' });

  const load = useCallback(async (tokens: Tokens) => {
    setState({ kind: 'loading', label: 'loading your offers…' });
    try {
      const [session, catalog] = await Promise.all([openSession(tokens), loadCatalog()]);
      const { store, raw } = await loadStore(session, catalog);
      markSeen(raw);
      setState({ kind: 'store', store });
    } catch (e) {
      setState({ kind: 'error', message: message(e) });
    }
  }, []);

  const signIn = useCallback(async () => {
    try {
      const tokens = await silentAuth();
      if (tokens) await load(tokens);
      else setState({ kind: 'login' });
    } catch (e) {
      setState({ kind: 'error', message: message(e) });
    }
  }, [load]);

  const refresh = useCallback(() => {
    setState({ kind: 'loading', label: 'signing in…' });
    signIn();
  }, [signIn]);

  // Initial state is already "signing in", so start straight with the request.
  useEffect(() => {
    silentAuth().then(
      tokens => (tokens ? load(tokens) : setState({ kind: 'login' })),
      e => setState({ kind: 'error', message: message(e) }),
    );
  }, [load]);

  return <StoreContext.Provider value={{ state, refresh, onLogin: load }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
