import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FolderCog } from "lucide-react-native";
import DatePickerScreen from "./src/screens/DatePickerScreen";
import HomeScreen from "./src/screens/HomeScreen";
import StartupScreen from "./src/screens/StartupScreen";
import TrashReviewScreen from "./src/screens/TrashReviewScreen";
import TrashScreen from "./src/screens/TrashScreen";
import { createSession, loadCatalog, saveCatalog } from "./src/storage/sessionStorage";
import { emptyCatalog, upsertSession, type SessionCatalog } from "./src/storage/sessionCatalog";
import { LibraryTheme, libraryColors } from "./src/theme/LibraryTheme";
import type { DocumentFolder, LibraryKind, SessionState } from "./src/types/media";

type Screen = "startup" | "datePicker" | "home" | "trash" | "trashReview";

export default function App() {
  const [screen, setScreen] = useState<Screen>("startup");
  const [kind, setKind] = useState<LibraryKind>("photos");
  const [catalog, setCatalog] = useState<SessionCatalog>(emptyCatalog);
  const catalogRef = useRef(catalog);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [resumeMode, setResumeMode] = useState(false);
  const [editingFolders, setEditingFolders] = useState(false);
  const pendingWrites = useRef(0);
  const color = libraryColors[kind];
  const session = catalog.sessions.find((item) => item.id === catalog.activeIds[kind]) ?? null;

  const bootstrap = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const saved = await loadCatalog();
      catalogRef.current = saved;
      setCatalog(saved);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void bootstrap(); }, []);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (saving || working) return true;
      if (screen === "startup") return false;
      if (screen === "trashReview") setScreen("trash");
      else if (screen === "trash") { setResumeMode(true); setScreen("home"); }
      else setScreen("startup");
      return true;
    });
    return () => subscription.remove();
  }, [screen, saving, working]);

  const commit = async (next: SessionCatalog) => {
    catalogRef.current = next;
    setCatalog(next);
    pendingWrites.current++;
    setSaving(true);
    try {
      await saveCatalog(next);
      setSaveError(false);
    } catch {
      setSaveError(true);
      Alert.alert("Salvataggio non riuscito", "Il progresso e' ancora in memoria. Riprova prima di chiudere l'app.");
      throw new Error("Salvataggio non riuscito.");
    } finally {
      pendingWrites.current--;
      setSaving(pendingWrites.current > 0);
    }
  };

  const persistSession = async (next: SessionState) => {
    await commit(upsertSession(catalogRef.current, { ...next, updatedAt: Date.now() }));
  };

  const startNewSession = async (date: number, folders: DocumentFolder[]) => {
    if (editingFolders && session) {
      try {
        await persistSession({ ...session, folders });
        setEditingFolders(false);
        setResumeMode(true);
        setScreen("home");
      } catch { /* Leave the folder selection available after a failed save. */ }
      return;
    }
    const next = createSession(date, kind, folders);
    next.trash = catalogRef.current.sessions.find((item) => item.kind === kind)?.trash ?? [];
    try {
      await persistSession(next);
      setResumeMode(false);
      setScreen("home");
    } catch { /* The save alert keeps the date selection available. */ }
  };

  const resumeSession = async (id: string) => {
    try {
      await commit({ ...catalogRef.current, activeIds: { ...catalogRef.current.activeIds, [kind]: id } });
      setResumeMode(true);
      setScreen("home");
    } catch { /* Stay on the session list if persistence fails. */ }
  };

  const missingItem = () => {
    Alert.alert("Elemento non disponibile", "L'ultimo elemento non e' piu' presente. Puoi continuare dalla data salvata o creare un'altra sessione.", [
      { text: "Sessioni", onPress: () => setScreen("startup") },
      { text: "Continua dalla data", onPress: () => setResumeMode(false) }
    ]);
  };

  const renderScreen = () => {
    if (loading) return <View style={styles.center}><ActivityIndicator color={color} size="large" /></View>;
    if (loadError) return <View style={styles.center}>
      <Text>Impossibile leggere le sessioni salvate.</Text>
      <Pressable onPress={() => void bootstrap()}><Text style={{ color }}>Riprova</Text></Pressable>
    </View>;
    if (screen === "datePicker") return <DatePickerScreen
      kind={kind}
      initialDate={editingFolders && session ? session.startDate : Date.now()}
      initialFolders={session?.folders ?? []}
      foldersOnly={editingFolders}
      onCancel={() => setScreen("startup")}
      onStart={startNewSession}
    />;
    if (screen === "home" && session) return <HomeScreen
      key={session.id}
      isResumeMode={resumeMode}
      session={session}
      onChooseNewDate={() => { setEditingFolders(false); setScreen("datePicker"); }}
      onGoToTrash={() => setScreen("trash")}
      onMissingResumeItem={missingItem}
      onSessionChange={persistSession}
    />;
    if (screen === "trash" && session) return <TrashScreen
      key={session.id}
      session={session}
      onBusyChange={setWorking}
      onBack={() => { setResumeMode(true); setScreen("home"); }}
      onReviewTrash={() => setScreen("trashReview")}
      onSessionChange={persistSession}
    />;
    if (screen === "trashReview" && session) return <TrashReviewScreen
      key={session.id}
      session={session}
      onBackToTrash={() => setScreen("trash")}
      onSessionChange={persistSession}
    />;
    return <StartupScreen
      kind={kind}
      sessions={catalog.sessions.filter((item) => item.kind === kind)}
      activeId={catalog.activeIds[kind]}
      onNewSession={() => { setEditingFolders(false); setScreen("datePicker"); }}
      onResume={(id) => void resumeSession(id)}
      onRename={async (item, name) => { try { await persistSession({ ...item, name }); } catch {} }}
    />;
  };

  return <SafeAreaProvider><LibraryTheme.Provider value={color}>
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["photos", "documents"] as const).map((section) => <Pressable
          key={section}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === kind }}
          disabled={saving || working || loading || loadError}
          onPress={() => { setKind(section); setScreen("startup"); }}
          style={[styles.tab, { borderBottomColor: section === kind ? libraryColors[section] : "transparent" }]}
        ><Text style={[styles.tabText, section === kind && { color: libraryColors[section] }]}>{section === "photos" ? "Foto" : "Documenti"}</Text></Pressable>)}
      </View>
      {saveError && <Pressable disabled={saving || working} onPress={async () => { try { await commit(catalogRef.current); } catch {} }} style={styles.saveError}>
        <Text style={{ color: "#b42318", fontWeight: "700" }}>Progresso non salvato. Tocca per riprovare.</Text>
      </Pressable>}
      {screen !== "startup" && !loading && <View style={styles.sessionBar}>
        <Pressable disabled={saving || working} onPress={() => setScreen("startup")} style={styles.sessionsLink}>
          <Text numberOfLines={1} style={{ color, fontWeight: "700" }}>Sessioni{session && screen !== "datePicker" ? ` / ${session.name}` : ""}</Text>
        </Pressable>
        {screen === "home" && kind === "documents" && <Pressable accessibilityRole="button" accessibilityLabel="Gestisci cartelle della sessione" disabled={saving || working} onPress={() => { setEditingFolders(true); setScreen("datePicker"); }} style={styles.folderButton}><FolderCog size={22} color={color} /></Pressable>}
      </View>}
      <View style={styles.content} pointerEvents={saving || working ? "none" : "auto"}>
        {renderScreen()}
      </View>
      {saving && <View style={styles.saving}><ActivityIndicator color={color} /><Text>Salvataggio...</Text></View>}
    </SafeAreaView>
  </LibraryTheme.Provider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f7f7f4" },
  content: { flex: 1 },
  center: { flex: 1, gap: 20, padding: 24, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dedfe2" },
  tab: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderBottomWidth: 3 },
  tabText: { fontSize: 17, fontWeight: "800", color: "#626872" },
  sessionBar: { flexDirection: "row", alignItems: "center" },
  sessionsLink: { flex: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 16 },
  folderButton: { width: 48, height: 44, justifyContent: "center", alignItems: "center" },
  saving: { position: "absolute", bottom: 12, alignSelf: "center", flexDirection: "row", gap: 10, backgroundColor: "white", padding: 12, borderRadius: 8 },
  saveError: { padding: 12, backgroundColor: "#fff0ed" }
});
