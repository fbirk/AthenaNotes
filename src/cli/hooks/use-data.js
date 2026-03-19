/**
 * useData Hook
 * Manages data loading with caching, refresh, and loading state tracking.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * @param {Function} fetchFn - Async function that returns { success, data, error }
 * @param {Object} options
 * @param {boolean} options.autoLoad - Whether to load on mount (default: true)
 * @param {Array} options.deps - Dependencies that trigger reload when changed
 */
export function useData(fetchFn, { autoLoad = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (!mountedRef.current) return;
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  const refresh = useCallback(() => load(), [load]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoLoad) {
      load();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [autoLoad, ...deps]);

  return { data, loading, error, refresh, setData };
}
