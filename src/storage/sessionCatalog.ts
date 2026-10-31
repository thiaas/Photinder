import type { LibraryKind, SessionState } from "../types/media";

export interface SessionCatalog {
  version: 2;
  sessions: SessionState[];
  activeIds: Partial<Record<LibraryKind, string>>;
}

export const emptyCatalog = (): SessionCatalog => ({ version: 2, sessions: [], activeIds: {} });

export function normalizeSession(value: unknown): SessionState | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SessionState>;
  if (typeof item.id !== "string" || typeof item.startDate !== "number" || !Number.isFinite(item.startDate)) return null;
  if (item.kind !== undefined && item.kind !== "photos" && item.kind !== "documents") return null;
  if (item.trash !== undefined && (!Array.isArray(item.trash) || item.trash.some((file) =>
    !file || typeof file.id !== "string" || typeof file.uri !== "string" || typeof file.filename !== "string" ||
    !["photo", "video", "document"].includes(file.mediaType) || !Number.isFinite(file.creationTime)
  ))) return null;
  if (item.folders !== undefined && (!Array.isArray(item.folders) || item.folders.some((folder) =>
    !folder || typeof folder.token !== "string" || typeof folder.name !== "string"
  ))) return null;
  return {
    id: item.id,
    kind: item.kind === "documents" ? "documents" : "photos",
    name: typeof item.name === "string" ? item.name : "Sessione salvata",
    folders: Array.isArray(item.folders) ? item.folders : [],
    startDate: item.startDate,
    currentIndex: item.currentIndex ?? 0,
    lastAnalyzedId: item.lastAnalyzedId ?? null,
    lastAnalyzedCreationTime: item.lastAnalyzedCreationTime ?? null,
    trash: Array.isArray(item.trash) ? item.trash : [],
    totalCount: item.totalCount ?? 0,
    createdAt: item.createdAt ?? Date.now(),
    updatedAt: item.updatedAt ?? Date.now()
  };
}

export function parseCatalog(raw: string | null, legacy: string | null): SessionCatalog {
  if (raw) {
    const parsed = JSON.parse(raw) as SessionCatalog;
    if (parsed.version !== 2 || !Array.isArray(parsed.sessions)) throw new Error("Archivio sessioni non valido.");
    const sessions = parsed.sessions.map((value) => {
      const session = normalizeSession(value);
      if (!session) throw new Error("Una sessione salvata non e' valida. Il salvataggio non e' stato modificato.");
      return session;
    });
    return { version: 2, sessions, activeIds: parsed.activeIds ?? {} };
  }
  const saved = legacy ? normalizeSession(JSON.parse(legacy)) : null;
  if (legacy && !saved) throw new Error("La sessione precedente non e' valida. Il salvataggio non e' stato modificato.");
  return saved
    ? { version: 2, sessions: [saved], activeIds: { photos: saved.id } }
    : emptyCatalog();
}

// A section shares its trash across overlapping sessions; their cursors stay independent.
export function upsertSession(catalog: SessionCatalog, next: SessionState): SessionCatalog {
  const sessions = catalog.sessions.filter((session) => session.id !== next.id).map((session) =>
    session.kind === next.kind ? { ...session, trash: next.trash } : session
  );
  return { version: 2, sessions: [...sessions, next], activeIds: { ...catalog.activeIds, [next.kind]: next.id } };
}
