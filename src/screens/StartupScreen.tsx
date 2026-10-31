import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { LibraryKind, SessionState } from "../types/media";
import { useLibraryColor } from "../theme/LibraryTheme";
import { formatMediaDate } from "../utils/mediaActions";

interface StartupScreenProps {
  kind: LibraryKind;
  sessions: SessionState[];
  activeId?: string;
  onNewSession: () => void;
  onResume: (id: string) => void;
  onRename: (session: SessionState, name: string) => Promise<void>;
}

export default function StartupScreen({ kind, sessions, activeId, onNewSession, onResume, onRename }: StartupScreenProps) {
  const color = useLibraryColor();
  const [editing, setEditing] = useState<SessionState | null>(null);
  const [name, setName] = useState("");
  return <View style={styles.container}>
    <View style={styles.header}>
      <Text style={[styles.title, { color }]}>Photinder</Text>
      <Text style={styles.subtitle}>{kind === "photos" ? "Foto e video" : "Documenti"}</Text>
    </View>
    <ScrollView contentContainerStyle={styles.list}>
      {sessions.length === 0 && <Text style={styles.text}>Nessuna sessione salvata</Text>}
      {[...sessions].sort((a, b) => b.updatedAt - a.updatedAt).map((session) => <View key={session.id} style={[styles.session, session.id === activeId && { borderColor: color }]}>
        <Text style={styles.sectionTitle}>{session.name}</Text>
        <Text style={styles.text}>Ultimo elemento: {formatMediaDate(session.lastAnalyzedCreationTime)}</Text>
        <Text style={styles.text}>Progresso: {session.currentIndex}/{session.totalCount || "?"}</Text>
        {kind === "documents" && <Text numberOfLines={2} style={styles.text}>{session.folders.map((folder) => folder.name).join(", ")}</Text>}
        <View style={styles.row}>
          <Pressable accessibilityRole="button" onPress={() => onResume(session.id)} style={[styles.resume, { backgroundColor: color }]}><Text style={styles.white}>Riprendi</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setEditing(session); setName(session.name); }} style={styles.rename}><Text style={{ color }}>Rinomina</Text></Pressable>
        </View>
      </View>)}
    </ScrollView>
    <Pressable accessibilityRole="button" onPress={onNewSession} style={[styles.newSession, { borderColor: color }]}><Text style={[styles.buttonText, { color }]}>Nuova sessione</Text></Pressable>
    <Modal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
      <View style={styles.backdrop}><View style={styles.dialog}>
        <Text style={styles.sectionTitle}>Nome sessione</Text>
        <TextInput accessibilityLabel="Nome sessione" autoFocus maxLength={60} value={name} onChangeText={setName} style={styles.input} />
        <Pressable disabled={!name.trim()} style={[styles.resume, { backgroundColor: color }]} onPress={async () => {
          if (editing && name.trim()) { await onRename(editing, name.trim()); setEditing(null); }
        }}><Text style={styles.white}>Salva</Text></Pressable>
        <Pressable onPress={() => setEditing(null)} style={styles.rename}><Text>Annulla</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  header: { gap: 4 },
  title: { fontSize: 34, fontWeight: "900" },
  subtitle: { fontSize: 16, fontWeight: "700", color: "#4b5563" },
  list: { gap: 12, paddingBottom: 12 },
  session: { gap: 8, borderRadius: 8, borderWidth: 1, borderColor: "#dedfe2", padding: 16, backgroundColor: "white" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  text: { fontSize: 14, color: "#4b5563" },
  row: { flexDirection: "row", gap: 12, marginTop: 8 },
  resume: { minHeight: 46, flexGrow: 1, borderRadius: 8, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
  rename: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  white: { color: "white", fontSize: 15, fontWeight: "800" },
  newSession: { minHeight: 54, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" },
  buttonText: { fontSize: 16, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 24 },
  dialog: { borderRadius: 8, backgroundColor: "white", padding: 20, gap: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, fontSize: 16 }
});
