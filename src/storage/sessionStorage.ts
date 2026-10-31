import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DocumentFolder, LibraryKind, SessionState } from "../types/media";
import { parseCatalog, type SessionCatalog } from "./sessionCatalog";

const LEGACY_KEY = "photinder.session.v1";
const CATALOG_KEY = "photinder.sessions.v2";

export function createSession(startDate: number, kind: LibraryKind = "photos", folders: DocumentFolder[] = []): SessionState {
  const now = Date.now();
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    kind,
    name: `Dal ${new Date(startDate).toLocaleDateString("it-IT")}`,
    folders,
    startDate,
    currentIndex: 0,
    lastAnalyzedId: null,
    lastAnalyzedCreationTime: null,
    trash: [],
    totalCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

export async function loadCatalog(): Promise<SessionCatalog> {
  const entries = await AsyncStorage.multiGet([CATALOG_KEY, LEGACY_KEY]);
  const catalog = parseCatalog(entries[0][1], entries[1][1]);
  if (!entries[0][1]) await AsyncStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
  // Keep the legacy value as a migration backup.
  return catalog;
}

let writeQueue = Promise.resolve();
export function saveCatalog(catalog: SessionCatalog): Promise<void> {
  const snapshot = JSON.stringify(catalog);
  const write = writeQueue.catch(() => undefined).then(() => AsyncStorage.setItem(CATALOG_KEY, snapshot));
  writeQueue = write;
  return write;
}
