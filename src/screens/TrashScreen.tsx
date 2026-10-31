import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Check, FileText, Video } from "lucide-react-native";
import { useLibraryColor } from "../theme/LibraryTheme";

import MediaCard from "../components/MediaCard";
import type { MediaItem, SessionState } from "../types/media";
import { deleteMediaItemsPermanently, formatMediaDate } from "../utils/mediaActions";

interface TrashScreenProps {
  session: SessionState;
  onBack: () => void;
  onReviewTrash: () => void;
  onSessionChange: (session: SessionState) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}

export default function TrashScreen({ session, onBack, onReviewTrash, onSessionChange, onBusyChange }: TrashScreenProps) {
  const color = useLibraryColor();
  const deletingRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedItems = useMemo(
    () => session.trash.filter((item) => selectedIds.includes(item.id)),
    [selectedIds, session.trash]
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  };

  const restoreItems = async (items: MediaItem[]) => {
    if (items.length === 0) {
      return;
    }

    try { await onSessionChange({
      ...session,
      trash: session.trash.filter((item) => !items.some((restored) => restored.id === item.id)),
      updatedAt: Date.now()
    });
    setSelectedIds([]);
    } catch { /* The parent reports storage errors. */ }
  };

  const confirmDelete = (items: MediaItem[]) => {
    if (items.length === 0 || isDeleting) {
      return;
    }

    Alert.alert(
      "Eliminazione definitiva",
      `Eliminare ${items.length} elemento/i originali? L'operazione puo' interessare anche cartelle sincronizzate e non e' annullabile dall'app.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => {
            void deleteItems(items);
          }
        }
      ]
    );
  };

  const deleteItems = async (items: MediaItem[]) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    onBusyChange(true);

    try {
      const result = await deleteMediaItemsPermanently(items);
      if (result.deletedIds.length > 0) {
        try {
          await onSessionChange({
            ...session,
            trash: session.trash.filter((item) => !result.deletedIds.includes(item.id)),
            updatedAt: Date.now()
          });
        } catch {
          Alert.alert("File eliminati", "Gli originali sono stati eliminati, ma il progresso non e' salvato. Usa Riprova nel messaggio in alto prima di chiudere l'app.");
        }
      }
      setSelectedIds([]);
      if (result.failures.length > 0) Alert.alert("Alcuni elementi non sono stati eliminati", `${result.deletedIds.length} eliminati; ${result.failures.length} rimasti nel cestino.\n${result.failures[0].message}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto.";
      Alert.alert("Eliminazione non riuscita", message);
    } finally {
      setIsDeleting(false);
      deletingRef.current = false;
      onBusyChange(false);
    }
  };

  const renderItem = ({ item }: { item: MediaItem }) => {
    const selected = selectedIds.includes(item.id);

    return (
      <View style={[styles.tile, selected && { borderColor: color }]}>
        <Pressable accessibilityRole="button" onPress={() => toggleSelected(item.id)} style={styles.tilePreview}>
          {item.mediaType === "photo" ? (
            <Image contentFit="cover" source={{ uri: item.uri }} style={styles.thumb} />
          ) : (
            <View style={styles.videoThumb}>
              {item.mediaType === "document" ? <FileText color="white" size={42} /> : <Video color="white" size={42} />}
              <Text numberOfLines={1} style={styles.videoLabel}>{item.mediaType === "document" ? (item.filename.includes(".") ? item.filename.split(".").pop()?.toUpperCase() : "FILE") : "Video"}</Text>
            </View>
          )}
          <View style={styles.check}>
            {selected && <Check color="white" size={20} />}
          </View>
        </Pressable>
        <View style={styles.tileMeta}>
          <Text numberOfLines={1} style={styles.filename}>
            {item.filename}
          </Text>
          <Text style={styles.date}>{formatMediaDate(item.creationTime)}</Text>
          <Pressable accessibilityRole="button" onPress={() => setPreviewItem(item)} style={styles.previewButton}>
            <Text style={styles.previewButtonText}>Apri</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>Indietro</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Cestino</Text>
          <Text style={styles.subtitle}>
            {session.trash.length} elemento/i, {selectedItems.length} selezionati
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={selectedItems.length === 0}
          onPress={() => void restoreItems(selectedItems)}
          style={[styles.actionButton, styles.restoreButton, selectedItems.length === 0 && styles.disabled]}
        >
          <Text style={styles.restoreText}>Ripristina</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={selectedItems.length === 0 || isDeleting}
          onPress={() => confirmDelete(selectedItems)}
          style={[styles.actionButton, styles.deleteButton, (selectedItems.length === 0 || isDeleting) && styles.disabled]}
        >
          <Text style={styles.deleteText}>Elimina</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={session.trash.length === 0}
          onPress={onReviewTrash}
          style={[styles.wideButton, { backgroundColor: color }, session.trash.length === 0 && styles.disabled]}
        >
          <Text style={styles.wideButtonText}>Rivedi cestino</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={session.trash.length === 0 || isDeleting}
          onPress={() => confirmDelete(session.trash)}
          style={[styles.wideOutlineButton, (session.trash.length === 0 || isDeleting) && styles.disabled]}
        >
          <Text style={styles.wideOutlineText}>Svuota tutto</Text>
        </Pressable>
      </View>

      {session.trash.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Cestino vuoto</Text>
        </View>
      ) : (
        <FlatList
          columnWrapperStyle={styles.listRow}
          contentContainerStyle={styles.listContent}
          data={session.trash}
          extraData={selectedIds}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderItem}
        />
      )}

      <Modal animationType="slide" visible={Boolean(previewItem)} onRequestClose={() => setPreviewItem(null)}>
        <View style={styles.modal}>
          <View style={styles.modalCard}>
            {previewItem ? <MediaCard item={previewItem} swipeEnabled={false} /> : null}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setPreviewItem(null)} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>Chiudi</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    padding: 16
  },
  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backButton: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
    paddingHorizontal: 12
  },
  backText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800"
  },
  headerText: {
    flex: 1
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "700"
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1
  },
  restoreButton: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderColor: "#dc2626"
  },
  restoreText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  deleteText: {
    color: "#dc2626",
    fontSize: 15,
    fontWeight: "800"
  },
  wideButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#111827"
  },
  wideButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800"
  },
  wideOutlineButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dc2626",
    backgroundColor: "#fff"
  },
  wideOutlineText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "800"
  },
  disabled: {
    opacity: 0.45
  },
  listContent: {
    paddingBottom: 24
  },
  listRow: {
    gap: 10
  },
  tile: {
    flex: 1,
    overflow: "hidden",
    minHeight: 220,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff"
  },
  tileSelected: {
    borderColor: "#0f766e",
    borderWidth: 2
  },
  tilePreview: {
    height: 132,
    backgroundColor: "#111827"
  },
  thumb: {
    height: "100%",
    width: "100%"
  },
  videoThumb: {
    gap: 8,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f2937"
  },
  videoLabel: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "900"
  },
  check: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(17,24,39,0.78)"
  },
  checkText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900"
  },
  tileMeta: {
    flex: 1,
    gap: 5,
    padding: 10
  },
  filename: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800"
  },
  date: {
    color: "#6b7280",
    fontSize: 12
  },
  previewButton: {
    marginTop: "auto",
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#e0f2fe"
  },
  previewButtonText: {
    color: "#075985",
    fontSize: 13,
    fontWeight: "800"
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900"
  },
  modal: {
    flex: 1,
    gap: 14,
    padding: 16,
    backgroundColor: "#f7f7f4"
  },
  modalCard: {
    flex: 1,
    minHeight: 360
  },
  modalButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#111827"
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  }
});
