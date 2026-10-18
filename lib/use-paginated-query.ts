'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PageMetadata>({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const queryKey = JSON.stringify(params);
  const currentKey = useRef(queryKey);
  currentKey.current = queryKey;
  const pageCallback = useRef(onPageChange);
  pageCallback.current = onPageChange;
  const [resolvedKey, setResolvedKey] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const query = JSON.parse(queryKey);
        const result = await loader(query, { signal: controller.signal });
        if (controller.signal.aborted || currentKey.current !== queryKey) return;
        if (!result.success || !result.data || !result.pagination) {
          throw new Error(result.error || result.message || 'Unable to load results. Please retry.');
        }
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (query.page > lastPage) {
          pageCallback.current(lastPage);
          return;
        }
        setData(result.data);
        setPagination(result.pagination);
        setResolvedKey(queryKey);
      } catch (failure) {
        if (controller.signal.aborted || currentKey.current !== queryKey) return;
        setData([]);
        setPagination({ total: 0, page: Number(params.page) || 1, limit: Number(params.limit) || 20, totalPages: 0 });
        setResolvedKey(queryKey);
        setError(failure instanceof Error ? failure.message : 'Unable to load results.');
      } finally {
        if (!controller.signal.aborted && currentKey.current === queryKey) setIsLoading(false);
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
  const isCurrent = resolvedKey === queryKey;
  return { data: isCurrent ? data : [], pagination: isCurrent ? pagination : { total: 0, page: Number(params.page) || 1, limit: Number(params.limit) || 20, totalPages: 0 }, isLoading: isLoading || !isCurrent, error: isCurrent ? error : null, refresh };
}
