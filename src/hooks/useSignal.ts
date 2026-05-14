import { useState, useEffect, useCallback } from 'react';

/**
 * Generic React hook that wraps API calls with loading/error state management
 * @template T The return type of the fetch function
 * @param fetchFn The async function to call for fetching data
 * @returns Object containing data, loading state, and error state
 */
export function useSignal<T>(
  fetchFn: () => Promise<T>
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize fetchFn to prevent infinite re-fetch loops
  const memoizedFetchFn = useCallback(fetchFn, [fetchFn]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    memoizedFetchFn()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'An error occurred');
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [memoizedFetchFn]);

  return { data, loading, error };
}
