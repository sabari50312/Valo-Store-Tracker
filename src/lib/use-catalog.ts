import { useCallback, useEffect, useState } from 'react';

import { Catalog, loadCatalog } from './catalog';
import { AppError, toAppError } from './errors';

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(() => {
    loadCatalog().then(setCatalog, e => setError(toAppError(e)));
  }, []);

  const retry = useCallback(() => {
    setError(null);
    load();
  }, [load]);

  useEffect(load, [load]);
  return { catalog, error, retry };
}
