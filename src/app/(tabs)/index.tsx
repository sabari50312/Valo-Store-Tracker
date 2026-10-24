import { StoreSkeleton, StoreView } from '@/components/store';
import { ErrorView } from '@/components/ui';
import { useStore } from '@/lib/store-context';

export default function StoreScreen() {
  const { state, refresh } = useStore();

  switch (state.kind) {
    case 'store':
      return <StoreView store={state.store} onRefresh={refresh} />;
    case 'error':
      return <ErrorView title="Couldn't load your store" message={state.message} onRetry={refresh} />;
    case 'loading':
      return <StoreSkeleton label={state.label} />;
    case 'login':
      return <StoreSkeleton label="waiting for Riot sign-in…" />;
  }
}
