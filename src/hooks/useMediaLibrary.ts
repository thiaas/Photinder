import { useCallback, useEffect, useRef, useState } from "react";
import * as MediaLibrary from "expo-media-library/legacy";

import type { MediaItem } from "../types/media";

const PAGE_SIZE = 250;
const GRANULAR_PERMISSIONS: MediaLibrary.GranularPermission[] = ["photo", "video"];

function toMediaItem(asset: MediaLibrary.Asset): MediaItem {
  return {
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename || "media",
    mediaType: asset.mediaType === MediaLibrary.MediaType.video ? "video" : "photo",
    creationTime: asset.creationTime || asset.modificationTime || Date.now(),
    albumId: asset.albumId
  };
}

export function useMediaLibrary(startDate: number | null) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(startDate !== null);
  const generation = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasLimitedAccess, setHasLimitedAccess] = useState(false);

  const loadMedia = useCallback(async () => {
    const request = ++generation.current;
    if (!startDate) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isAvailable = await MediaLibrary.isAvailableAsync();
      if (request !== generation.current) return;
      if (!isAvailable) {
        setHasPermission(false);
        setError("La Media Library non e' disponibile su questo dispositivo.");
        return;
      }

      let permission = await MediaLibrary.getPermissionsAsync(false, GRANULAR_PERMISSIONS);
      if (request !== generation.current) return;

      if (!permission.granted) {
        permission = await MediaLibrary.requestPermissionsAsync(false, GRANULAR_PERMISSIONS);
      }
      if (request !== generation.current) return;

      setHasPermission(permission.granted);
      setHasLimitedAccess((permission as { accessPrivileges?: string }).accessPrivileges === "limited");

      if (!permission.granted) {
        setItems([]);
        setError("Permesso negato. Abilita l'accesso a foto e video per usare Photinder.");
        return;
      }

      const collected: MediaItem[] = [];
      let after: string | undefined;
      let hasNextPage = true;

      while (hasNextPage) {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after,
          createdBefore: startDate,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [[MediaLibrary.SortBy.creationTime, false]]
        });

        collected.push(
          ...page.assets
            .map(toMediaItem)
            .filter((item) => item.creationTime <= startDate)
        );

        after = page.endCursor;
        hasNextPage = page.hasNextPage;
        if (request !== generation.current) return;
      }

      if (request === generation.current) setItems(collected);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Errore sconosciuto.";
      if (request === generation.current) setError(`Impossibile caricare la galleria: ${message}`);
    } finally {
      if (request === generation.current) setIsLoading(false);
    }
  }, [startDate]);

  useEffect(() => {
    void loadMedia();
    return () => { generation.current++; };
  }, [loadMedia]);

  return {
    error,
    hasLimitedAccess,
    hasPermission,
    isLoading,
    items,
    reload: loadMedia
  };
}
