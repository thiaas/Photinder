import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SessionState } from "../types/media";
import { formatMediaDate } from "../utils/mediaActions";

interface StartupScreenProps {
  session: SessionState | null;
  onNewSession: () => void;
  onResume: () => void;
}

export default function StartupScreen({ session, onNewSession, onResume }: StartupScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photinder</Text>
        <Text style={styles.subtitle}>Pulizia galleria</Text>
      </View>

      {session ? (
        <View style={styles.sessionBox}>
          <Text style={styles.sectionTitle}>Sessione salvata</Text>
          <Text style={styles.text}>Ultimo elemento: {formatMediaDate(session.lastAnalyzedCreationTime)}</Text>
          <Text style={styles.text}>
            Progresso: {session.currentIndex}/{session.totalCount || "?"}
          </Text>
          <Text style={styles.text}>Cestino: {session.trash.length}</Text>
        </View>
      ) : (
        <View style={styles.sessionBox}>
          <Text style={styles.sectionTitle}>Nessuna sessione salvata</Text>
          <Text style={styles.text}>Scegli una data di partenza per iniziare.</Text>
        </View>
      )}

      <View style={styles.actions}>
        {session ? (
          <Pressable accessibilityRole="button" onPress={onResume} style={styles.primaryButton}>
            <Text style={styles.primaryText}>Riprendi</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onNewSession} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Riparti da zero</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24
  },
  header: {
    paddingTop: 32
  },
  title: {
    color: "#111827",
    fontSize: 40,
    fontWeight: "900"
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4
  },
  sessionBox: {
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 18
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800"
  },
  text: {
    color: "#374151",
    fontSize: 15
  },
  actions: {
    gap: 12,
    paddingBottom: 18
  },
  primaryButton: {
    minHeight: 54,
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
    minHeight: 54,
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
  }
});
