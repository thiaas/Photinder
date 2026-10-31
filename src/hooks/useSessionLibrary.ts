import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaLibrary } from "./useMediaLibrary";
import { listDocuments } from "../services/documents";
import type { MediaItem, SessionState } from "../types/media";

export function useSessionLibrary(session: SessionState) {
  const isDocuments = session.kind === "documents";
  const media = useMediaLibrary(isDocuments ? null : session.startDate);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(isDocuments);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    if (!isDocuments) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const documents = await listDocuments(session.folders);
      if (request === generation.current) setItems(documents.filter((item) => item.creationTime <= session.startDate));
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : "Impossibile leggere le cartelle.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [isDocuments, session.id, session.startDate, session.folders]);
  useEffect(() => {
    void reload();
    return () => { generation.current++; };
  }, [reload]);
  return isDocuments ? { items, error, isLoading, hasLimitedAccess: false, reload } : media;
}
