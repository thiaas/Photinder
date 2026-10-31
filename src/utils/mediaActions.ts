import * as MediaLibrary from "expo-media-library/legacy";

import type { MediaItem } from "../types/media";
import { deleteDocuments, type DeleteResult } from "../services/documents";

export function dateAtEndOfDay(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized.getTime();
}

export function formatMediaDate(value: number | null | undefined): string {
  if (value === 0) return "Data non disponibile";
  if (value === null || value === undefined) {
    return "Nessun elemento analizzato";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function uniqueTrashItems(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export async function deleteMediaItemsPermanently(items: MediaItem[]): Promise<DeleteResult> {
  if (items.length === 0) {
    return { deletedIds: [], failures: [] };
  }

  if (items.every((item) => item.mediaType === "document")) return deleteDocuments(items);
  if (items.some((item) => item.mediaType === "document")) throw new Error("Selezione mista non consentita.");
  const ids = items.map((item) => item.id);
  const confirmed = await MediaLibrary.deleteAssetsAsync(ids);
  return confirmed
    ? { deletedIds: ids, failures: [] }
    : { deletedIds: [], failures: ids.map((id) => ({ id, message: "Eliminazione annullata dal sistema." })) };
}

export async function requestLimitedLibraryChange(): Promise<void> {
  await MediaLibrary.presentPermissionsPickerAsync([
    MediaLibrary.MediaType.photo,
    MediaLibrary.MediaType.video
  ]);
}
