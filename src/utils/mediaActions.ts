import * as MediaLibrary from "expo-media-library/legacy";

import type { MediaItem } from "../types/media";

export function dateAtEndOfDay(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized.getTime();
}

export function formatMediaDate(value: number | null | undefined): string {
  if (!value) {
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

export async function deleteMediaItemsPermanently(items: MediaItem[]): Promise<boolean> {
  if (items.length === 0) {
    return true;
  }

  const ids = items.map((item) => item.id);
  return MediaLibrary.deleteAssetsAsync(ids);
}

export async function requestLimitedLibraryChange(): Promise<void> {
  await MediaLibrary.presentPermissionsPickerAsync([
    MediaLibrary.MediaType.photo,
    MediaLibrary.MediaType.video
  ]);
}
