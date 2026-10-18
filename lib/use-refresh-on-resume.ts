'use client';

import { useEffect, useRef } from 'react';

export function useRefreshOnResume(refresh: () => void) {
  const callback = useRef(refresh);
  callback.current = refresh;
  useEffect(() => {
    const online = () => callback.current();
    const visible = () => { if (document.visibilityState === 'visible') callback.current(); };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    return () => { window.removeEventListener('online', online); document.removeEventListener('visibilitychange', visible); };
  }, []);
}
