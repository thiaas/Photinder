import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import ActionButtons from "../components/ActionButtons";
import MediaCard from "../components/MediaCard";
import type { MediaItem, SessionState } from "../types/media";

interface TrashReviewScreenProps {
  session: SessionState;
  onBackToTrash: () => void;
  onSessionChange: (session: SessionState) => Promise<void>;
}

export default function TrashReviewScreen({ session, onBackToTrash, onSessionChange }: TrashReviewScreenProps) {
  const [reviewItems] = useState<MediaItem[]>(session.trash);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restoredCount, setRestoredCount] = useState(0);

  const currentItem = reviewItems[currentIndex] ?? null;

  const keepInTrash = () => {
    setCurrentIndex((value) => value + 1);
  };

  const restore = async () => {
    if (!currentItem) {
      return;
    }

    await onSessionChange({
      ...session,
      trash: session.trash.filter((item) => item.id !== currentItem.id),
      updatedAt: Date.now()
    });
    setRestoredCount((value) => value + 1);
    setCurrentIndex((value) => value + 1);
  };

  if (reviewItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Cestino vuoto</Text>
        <Pressable accessibilityRole="button" onPress={onBackToTrash} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Torna al cestino</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Revisione completata</Text>
        <Text style={styles.doneText}>Rimasti nel cestino: {session.trash.length}</Text>
        <Text style={styles.doneText}>Ripristinati: {restoredCount}</Text>
        <Pressable accessibilityRole="button" onPress={onBackToTrash} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Torna al cestino</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBackToTrash} style={styles.backButton}>
          <Text style={styles.backText}>Indietro</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Rivedi cestino</Text>
          <Text style={styles.subtitle}>
            {currentIndex + 1}/{reviewItems.length}
          </Text>
        </View>
      </View>

      <View style={styles.cardFrame}>
        <MediaCard
          key={currentItem.id}
          item={currentItem}
          leftLabel="Resta"
          onSwipeLeft={keepInTrash}
          onSwipeRight={() => void restore()}
          rightLabel="Ripristina"
        />
      </View>

      <ActionButtons
        keepLabel="Ripristina"
        onKeep={() => void restore()}
        onTrash={keepInTrash}
        trashLabel="Resta"
      />
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
    fontSize: 26,
    fontWeight: "900"
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "800"
  },
  cardFrame: {
    flex: 1,
    minHeight: 320
  },
  center: {
    flex: 1,
    justifyContent: "center",
    gap: 14,
    padding: 24
  },
  doneTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  doneText: {
    color: "#4b5563",
    fontSize: 16,
    fontWeight: "700"
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
  }
});
