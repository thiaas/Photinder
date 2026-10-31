import { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { dateAtEndOfDay, formatMediaDate } from "../utils/mediaActions";
import { useLibraryColor } from "../theme/LibraryTheme";
import { pickDocumentFolder } from "../services/documents";
import type { DocumentFolder, LibraryKind } from "../types/media";

interface DatePickerScreenProps {
  initialDate: number;
  kind: LibraryKind;
  initialFolders: DocumentFolder[];
  foldersOnly?: boolean;
  onCancel: () => void;
  onStart: (startDate: number, folders: DocumentFolder[]) => void;
}

export default function DatePickerScreen({ initialDate, initialFolders, kind, foldersOnly = false, onCancel, onStart }: DatePickerScreenProps) {
  const color = useLibraryColor();
  const [folders, setFolders] = useState(initialFolders);
  const [picking, setPicking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate));
  const [isPickerVisible, setIsPickerVisible] = useState(Platform.OS === "ios");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{foldersOnly ? "Cartelle della sessione" : "Data di partenza"}</Text>
        {!foldersOnly && <Text style={styles.subtitle}>Gli elementi verranno mostrati da questa data verso il passato.</Text>}
      </View>

      {!foldersOnly && <View style={styles.pickerBox}>
        <Text style={styles.label}>Parti da</Text>
        <Text style={styles.date}>{formatMediaDate(dateAtEndOfDay(selectedDate))}</Text>
        {Platform.OS === "android" ? (
          <Pressable accessibilityRole="button" onPress={() => setIsPickerVisible(true)} style={styles.pickButton}>
            <Text style={styles.pickButtonText}>Apri calendario</Text>
          </Pressable>
        ) : null}
        {isPickerVisible ? (
          <DateTimePicker
            accentColor={color}
            maximumDate={new Date()}
            mode="date"
            onChange={(_, date) => {
              if (Platform.OS === "android") {
                setIsPickerVisible(false);
              }

              if (date) {
                setSelectedDate(date);
              }
            }}
            value={selectedDate}
          />
        ) : null}
      </View>}

      {kind === "documents" && <View style={styles.folders}>
        <Text style={styles.label}>Cartelle</Text>
        {folders.length === 0 && <Text style={styles.subtitle}>Nessuna cartella selezionata</Text>}
        {folders.map((folder) => <View key={folder.token} style={styles.folderRow}>
          <Text numberOfLines={2} style={styles.folderName}>{folder.name}</Text>
          <Pressable accessibilityLabel={`Rimuovi ${folder.name}`} accessibilityRole="button" onPress={() => setFolders((current) => current.filter((item) => item.token !== folder.token))} style={styles.removeFolder}><Text style={{ color: "#cf2929", fontSize: 24 }}>×</Text></Pressable>
        </View>)}
        <Pressable disabled={picking} style={styles.pickButton} onPress={async () => {
          setPicking(true);
          try {
            const folder = await pickDocumentFolder();
            if (folder) setFolders((current) => [...current.filter((item) => item.token !== folder.token), folder]);
          } catch (error) {
            Alert.alert("Cartella non disponibile", error instanceof Error ? error.message : "Selezione non riuscita.");
          } finally { setPicking(false); }
        }}><Text style={{ color, fontWeight: "800" }}>{picking ? "Selezione..." : "Aggiungi cartella"}</Text></Pressable>
      </View>}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={picking || (kind === "documents" && folders.length === 0)}
          onPress={() => onStart(dateAtEndOfDay(selectedDate), folders)}
          style={[styles.primaryButton, { backgroundColor: color, opacity: picking || (kind === "documents" && folders.length === 0) ? 0.4 : 1 }]}
        >
          <Text style={styles.primaryText}>{foldersOnly ? "Salva cartelle" : "Inizia"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Indietro</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 24,
    justifyContent: "space-between",
    padding: 24
  },
  folders: { gap: 8 },
  folderRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  folderName: { flex: 1, color: "#374151", fontSize: 15 },
  removeFolder: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  header: {
    gap: 8,
    paddingTop: 32
  },
  title: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 21
  },
  pickerBox: {
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 18
  },
  label: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  date: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900"
  },
  pickButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#e0f2fe"
  },
  pickButtonText: {
    color: "#075985",
    fontSize: 15,
    fontWeight: "800"
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
