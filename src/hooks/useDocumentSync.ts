import { useCallback, useEffect, useRef } from 'react';
import type { Document } from '../contexts/file';
import { updateDocument } from '../lib/api/api-documents';

interface RetryEntry { data: Partial<Document>; attempts: number }

/**
 * Synchronisation côté client des modifications de documents:
 * - Debounce 600ms pour regrouper les updates rapides.
 * - Retry exponentiel (max ~30s) avec fusion des payloads.
 * - Flush avant navigation/onglet caché (best-effort).
 */
export function useDocumentSync(isAuthenticated: boolean) {
  const pendingSyncRef = useRef<Map<string, Partial<Document>>>(new Map());
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryQueueRef = useRef<Map<string, RetryEntry>>(new Map());
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushDocumentSync = useCallback(() => {
    if (!isAuthenticated) return;
    const entries = Array.from(pendingSyncRef.current.entries());
    pendingSyncRef.current.clear();
    syncTimerRef.current = null;
    (async () => {
      for (const [id, data] of entries) {
        try {
          const payload: Partial<Document> = {};
          if (data.name !== undefined) payload.name = data.name;
          if (data.type !== undefined) payload.type = data.type;
          if (data.description !== undefined) payload.description = data.description;
          if (data.tags !== undefined) payload.tags = data.tags;
          if ((data as any).isFavorite !== undefined) (payload as any).isFavorite = (data as any).isFavorite; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (Object.keys(payload).length === 0) continue;
          await updateDocument(id, payload as any); // eslint-disable-line @typescript-eslint/no-explicit-any
          if (retryQueueRef.current.has(id)) retryQueueRef.current.delete(id);
        } catch (e) {
          const existing = retryQueueRef.current.get(id);
          retryQueueRef.current.set(id, { data: { ...data, ...(existing?.data || {}) }, attempts: (existing?.attempts || 0) + 1 });
        }
      }
      if (retryQueueRef.current.size > 0 && !retryTimerRef.current) {
        const maxAttempts = Math.max(...Array.from(retryQueueRef.current.values()).map(v => v.attempts));
        const delay = Math.min(30_000, 1000 * Math.pow(2, maxAttempts - 1));
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          for (const [id, entry] of retryQueueRef.current.entries()) {
            if (entry.attempts > 6) { // abandon
              retryQueueRef.current.delete(id);
              continue;
            }
            const prev = pendingSyncRef.current.get(id) || {};
            pendingSyncRef.current.set(id, { ...prev, ...entry.data });
          }
          if (pendingSyncRef.current.size > 0) flushDocumentSync();
        }, delay);
      }
    })();
  }, [isAuthenticated]);

  const queueDocumentSync = useCallback((id: string, partial: Partial<Document>) => {
    if (!isAuthenticated) return;
    const prev = pendingSyncRef.current.get(id) || {};
    pendingSyncRef.current.set(id, { ...prev, ...partial });
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushDocumentSync, 600);
  }, [flushDocumentSync, isAuthenticated]);

  // Flush avant fermeture / perte de visibilité
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && pendingSyncRef.current.size > 0) {
        try { flushDocumentSync(); } catch {/* ignore */}
      }
    };
    const handleBeforeUnload = () => {
      if (pendingSyncRef.current.size === 0) return;
      const payload = Array.from(pendingSyncRef.current.entries()).map(([id, data]) => ({ id, data }));
      try { navigator.sendBeacon?.('/api/bulk-sync-docs', JSON.stringify(payload)); } catch {/* ignore */}
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, flushDocumentSync]);

  return { queueDocumentSync };
}

