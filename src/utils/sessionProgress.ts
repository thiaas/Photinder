import type { MediaItem, SessionState } from "../types/media";

export interface UndoSnapshot {
  index: number;
  previousId: string | null;
  previousDate: number | null;
  wasInTrash: boolean;
}

export function undoProgress(session: SessionState, item: MediaItem, snapshot: UndoSnapshot): SessionState {
  return {
    ...session,
    currentIndex: snapshot.index,
    lastAnalyzedId: snapshot.previousId,
    lastAnalyzedCreationTime: snapshot.previousDate,
    trash: snapshot.wasInTrash ? session.trash : session.trash.filter((entry) => entry.id !== item.id),
    updatedAt: Date.now()
  };
}

export function resumePosition(items: MediaItem[], session: SessionState): { index: number; missing: boolean } {
  if (!session.lastAnalyzedId) return { index: 0, missing: false };
  const savedIndex = items.findIndex((item) => item.id === session.lastAnalyzedId);
  if (savedIndex !== -1) return { index: savedIndex + 1, missing: false };
  const fallback = items.findIndex((item) => item.creationTime <= (session.lastAnalyzedCreationTime ?? session.startDate));
  return { index: fallback === -1 ? items.length : fallback, missing: true };
}
