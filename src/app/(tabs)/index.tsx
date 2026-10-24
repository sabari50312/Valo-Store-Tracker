import { SignedOutView, StoreSkeleton, StoreView } from '@/components/store';
import { ErrorView } from '@/components/ui';
import { useStore } from '@/lib/store-context';

export default function StoreScreen() {
  const { state, refresh, refreshing, pullToRefresh, openLogin } = useStore();

  switch (state.kind) {
    case 'store':
      return <StoreView store={state.store} refreshing={refreshing} onRefresh={pullToRefresh} />;
    case 'error':
      return <ErrorView error={state.error} onRetry={refresh} onSignIn={openLogin} />;
    case 'loading':
      return <StoreSkeleton label={state.label} />;
    case 'signedOut':
    case 'login':
      return <SignedOutView onSignIn={openLogin} />;
  }
}
