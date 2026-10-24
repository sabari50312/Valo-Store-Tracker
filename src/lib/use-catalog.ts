import { useCallback, useEffect, useState } from 'react';

import { Catalog, loadCatalog } from './catalog';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    loadCatalog().then(setCatalog, e => setError(String(e instanceof Error ? e.message : e)));
  }, []);

  const retry = useCallback(() => {
    setError(null);
    load();
  }, [load]);

  useEffect(load, [load]);
  return { catalog, error, retry };
}
