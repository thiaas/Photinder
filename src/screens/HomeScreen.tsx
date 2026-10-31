import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ActionButtons from "../components/ActionButtons";
import MediaCard from "../components/MediaCard";
import UndoBar from "../components/UndoBar";
import { useSessionLibrary } from "../hooks/useSessionLibrary";
import { useLibraryColor } from "../theme/LibraryTheme";
import { resumePosition, undoProgress, type UndoSnapshot } from "../utils/sessionProgress";
import type { MediaItem, SessionState } from "../types/media";
import { formatMediaDate, requestLimitedLibraryChange, uniqueTrashItems } from "../utils/mediaActions";

interface HomeScreenProps {
  isResumeMode: boolean;
  session: SessionState;
  onChooseNewDate: () => void;
  onGoToTrash: () => void;
  onMissingResumeItem: () => void;
  onSessionChange: (session: SessionState) => Promise<void>;
}

export default function HomeScreen({
  isResumeMode,
  session,
  onChooseNewDate,
  onGoToTrash,
  onMissingResumeItem,
  onSessionChange
}: HomeScreenProps) {
  const { error, hasLimitedAccess, isLoading, items, reload } = useSessionLibrary(session);
  const color = useLibraryColor();
  const [currentIndex, setCurrentIndex] = useState(session.currentIndex);
  const [lastDiscarded, setLastDiscarded] = useState<MediaItem | null>(null);
  const resumeCheckedRef = useRef(!isResumeMode);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoSnapshotRef = useRef<UndoSnapshot | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading || error || resumeCheckedRef.current) {
      return;
    }

    resumeCheckedRef.current = true;

    const position = resumePosition(items, session);
    setCurrentIndex(position.index);
    if (position.missing) {
      onMissingResumeItem();
      return;
    }
  }, [isLoading, error, items, onMissingResumeItem, session]);

  const currentItem = items[currentIndex] ?? null;
  const activeItemRef = useRef<string | null>(null);
  activeItemRef.current = currentItem?.id ?? null;

  const progressLabel = useMemo(() => {
    if (items.length === 0) {
      return "0/0";
    }

    return `${Math.min(currentIndex + 1, items.length)}/${items.length}`;
  }, [currentIndex, items.length]);

  const persistProgress = async (nextIndex: number, item: MediaItem, trash: MediaItem[]) => {
    await onSessionChange({
      ...session,
      currentIndex: nextIndex,
      lastAnalyzedId: item.id,
      lastAnalyzedCreationTime: item.creationTime,
      totalCount: items.length,
      trash: uniqueTrashItems(trash),
      updatedAt: Date.now()
    });
  };

  const advance = async (action: "keep" | "trash") => {
    if (!currentItem || busyRef.current || activeItemRef.current !== currentItem.id) {
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const nextIndex = currentIndex + 1;
      const nextTrash = action === "trash" ? uniqueTrashItems([...session.trash, currentItem]) : session.trash.filter((item) => item.id !== currentItem.id);
      await persistProgress(nextIndex, currentItem, nextTrash);
      setCurrentIndex(nextIndex);
      if (action === "trash") {
        undoSnapshotRef.current = { index: currentIndex, previousId: session.lastAnalyzedId, previousDate: session.lastAnalyzedCreationTime, wasInTrash: session.trash.some((item) => item.id === currentItem.id) };
        setLastDiscarded(currentItem);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => { setLastDiscarded(null); undoSnapshotRef.current = null; }, 5000);
      }
    } catch { /* The parent reports storage errors; the current card remains available. */ }
    finally { busyRef.current = false; setBusy(false); }
  };

  const undoLastTrash = async () => {
    const snapshot = undoSnapshotRef.current;
    if (!lastDiscarded || !snapshot || busyRef.current) {
      return;
    }

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    const nextIndex = snapshot.index;

    busyRef.current = true;
    setBusy(true);
    try {
      await onSessionChange(undoProgress(session, lastDiscarded, snapshot));
      setLastDiscarded(null);
      undoSnapshotRef.current = null;
      setCurrentIndex(nextIndex);
    } catch { /* Keep the undo action available after a failed save. */ }
    finally { busyRef.current = false; setBusy(false); }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={color} size="large" />
        <Text style={styles.loadingText}>{session.kind === "documents" ? "Carico documenti..." : "Carico foto e video..."}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <ScrollView contentContainerStyle={styles.centerPadded}>
        <Text style={styles.errorTitle}>Accesso non disponibile</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={reload} style={[styles.primaryButton, { backgroundColor: color }]}>
          <Text style={styles.primaryText}>Riprova</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Apri impostazioni</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onChooseNewDate} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Scegli nuova data</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!currentItem) {
    return (
      <ScrollView contentContainerStyle={styles.centerPadded}>
        <Text style={styles.doneTitle}>Fine sessione</Text>
        <Text style={styles.doneText}>Non ci sono altri elementi da analizzare per questa data.</Text>
        <Text style={styles.doneText}>Cestino: {session.trash.length}</Text>
        <Text style={styles.doneText}>Ultimo analizzato: {formatMediaDate(session.lastAnalyzedCreationTime)}</Text>
        <UndoBar visible={Boolean(lastDiscarded)} onUndo={() => void undoLastTrash()} />
        <Pressable accessibilityRole="button" onPress={onGoToTrash} style={[styles.primaryButton, { backgroundColor: color }]}>
          <Text style={styles.primaryText}>Apri cestino</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onChooseNewDate} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Nuova data</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>Ultimo analizzato</Text>
          <Text numberOfLines={1} style={styles.lastDate}>{formatMediaDate(session.lastAnalyzedCreationTime)}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onGoToTrash} style={[styles.trashButton, { backgroundColor: color }]}>
          <Text style={styles.trashButtonText}>Cestino {session.trash.length}</Text>
        </Pressable>
      </View>

      {hasLimitedAccess ? (
        <Pressable
          accessibilityRole="button"
          onPress={async () => {
            await requestLimitedLibraryChange();
            await reload();
          }}
          style={styles.limitedBanner}
        >
          <Text style={styles.limitedText}>Accesso limitato: tocca per modificare la selezione.</Text>
        </Pressable>
      ) : null}

      <View style={styles.progressRow}>
        <Text style={styles.progress}>{progressLabel}</Text>
        <Text style={styles.currentDate}>{session.kind === "documents" ? "Modificato: " : ""}{formatMediaDate(currentItem.creationTime)}</Text>
      </View>

      <View style={styles.cardFrame}>
        <MediaCard
          key={currentItem.id}
          item={currentItem}
          swipeEnabled={!busy}
          onSwipeLeft={() => void advance("trash")}
          onSwipeRight={() => void advance("keep")}
        />
      </View>

      <ActionButtons disabled={busy} onKeep={() => void advance("keep")} onTrash={() => void advance("trash")} />
      <UndoBar visible={Boolean(lastDiscarded)} onUndo={() => void undoLastTrash()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  centerPadded: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 14,
    padding: 24
  },
  loadingText: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "600"
  },
  topBar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  smallLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  lastDate: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800"
  },
  trashButton: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#111827",
    paddingHorizontal: 14
  },
  trashButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  limitedBanner: {
    minHeight: 42,
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12
  },
  limitedText: {
    color: "#92400e",
    fontSize: 13,
    fontWeight: "700"
  },
  progressRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  progress: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900"
  },
  currentDate: {
    flexShrink: 1,
    textAlign: "right",
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "700"
  },
  cardFrame: {
    flex: 1,
    minHeight: 0
  },
  errorTitle: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "900"
  },
  errorText: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 21
  },
  doneTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  doneText: {
    color: "#4b5563",
    fontSize: 16,
    lineHeight: 22
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#111827"
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
    backgroundColor: "#fff"
  },
  secondaryText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800"
  },
  textButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  textButtonLabel: {
    color: "#0f766e",
    fontSize: 15,
    fontWeight: "800"
  }
});
