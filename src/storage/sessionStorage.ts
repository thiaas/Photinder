import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SessionState } from "../types/media";

const SESSION_KEY = "photinder.session.v1";

export function createSession(startDate: number): SessionState {
  const now = Date.now();

  return {
    id: `${now}`,
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

export async function loadSession(): Promise<SessionState | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (!parsed.id || typeof parsed.startDate !== "number") {
      return null;
    }

    return {
      id: parsed.id,
      startDate: parsed.startDate,
      currentIndex: parsed.currentIndex ?? 0,
      lastAnalyzedId: parsed.lastAnalyzedId ?? null,
      lastAnalyzedCreationTime: parsed.lastAnalyzedCreationTime ?? null,
      trash: parsed.trash ?? [],
      totalCount: parsed.totalCount ?? 0,
      createdAt: parsed.createdAt ?? Date.now(),
      updatedAt: parsed.updatedAt ?? Date.now()
    };
  } catch {
    return null;
  }
}

export async function saveSession(session: SessionState): Promise<void> {
  await AsyncStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      ...session,
      updatedAt: Date.now()
    })
  );
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
