'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRefreshOnResume } from './use-refresh-on-resume';

export interface PageMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PageResponse<T> {
  success: boolean;
  data?: T[];
  pagination?: PageMetadata;
  error?: string;
  message?: string;
}

/** Each query owns its request; superseded responses never replace current results. */
export function usePaginatedQuery<T>(
  loader: (params: Record<string, string | number>, options?: RequestInit) => Promise<PageResponse<T>>,
  params: Record<string, string | number>,
  onPageChange: (page: number) => void,
) {
  const [result, setResult] = useState<{ queryKey: string; data: T[]; pagination: PageMetadata } | null>(null);
  const [settled, setSettled] = useState<{ queryKey: string; requestKey: string | null; error: string | null } | null>(null);
  const [revision, setRevision] = useState(0);
  const queryKey = JSON.stringify(params);
  const requestKey = JSON.stringify([queryKey, revision]);
  const currentKey = useRef(requestKey);
  currentKey.current = requestKey;
  const pageCallback = useRef(onPageChange);
  pageCallback.current = onPageChange;

  useEffect(() => {
    const controller = new AbortController();
    setSettled((previous) => previous?.queryKey === queryKey ? { ...previous, requestKey: null } : null);
    const timer = setTimeout(async () => {
      try {
        const query = JSON.parse(queryKey);
        const result = await loader(query, { signal: controller.signal });
        if (controller.signal.aborted || currentKey.current !== requestKey) return;
        if (!result.success || !result.data || !result.pagination) {
          throw new Error(result.error || result.message || 'Unable to load results. Please retry.');
        }
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (query.page > lastPage) {
          pageCallback.current(lastPage);
          return;
        }
        setResult({ queryKey, data: result.data, pagination: result.pagination });
        setSettled({ queryKey, requestKey, error: null });
      } catch (failure) {
        if (controller.signal.aborted || currentKey.current !== requestKey) return;
        setSettled({ queryKey, requestKey, error: failure instanceof Error ? failure.message : 'Unable to load results.' });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [loader, queryKey, revision]);

  useEffect(() => {
    const updated = () => setRevision((value) => value + 1);
    window.addEventListener('booran:data-changed', updated);
    return () => window.removeEventListener('booran:data-changed', updated);
  }, []);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useRefreshOnResume(refresh);
  const current = result?.queryKey === queryKey ? result : null;
  const pending = settled?.requestKey !== requestKey;
  return {
    data: current?.data ?? [],
    pagination: current?.pagination ?? { total: 0, page: Number(params.page) || 1, limit: Number(params.limit) || 20, totalPages: 0 },
    isLoading: pending && !current,
    isRefreshing: pending && Boolean(current),
    error: settled?.queryKey === queryKey ? settled.error : null,
    refresh,
  };
}
