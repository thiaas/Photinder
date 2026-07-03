import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { dateAtEndOfDay, formatMediaDate } from "../utils/mediaActions";

interface DatePickerScreenProps {
  initialDate: number;
  onCancel: () => void;
  onStart: (startDate: number) => void;
}

export default function DatePickerScreen({ initialDate, onCancel, onStart }: DatePickerScreenProps) {
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate));
  const [isPickerVisible, setIsPickerVisible] = useState(Platform.OS === "ios");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data di partenza</Text>
        <Text style={styles.subtitle}>Gli elementi verranno mostrati da questa data verso il passato.</Text>
      </View>

      <View style={styles.pickerBox}>
        <Text style={styles.label}>Parti da</Text>
        <Text style={styles.date}>{formatMediaDate(dateAtEndOfDay(selectedDate))}</Text>
        {Platform.OS === "android" ? (
          <Pressable accessibilityRole="button" onPress={() => setIsPickerVisible(true)} style={styles.pickButton}>
            <Text style={styles.pickButtonText}>Apri calendario</Text>
          </Pressable>
        ) : null}
        {isPickerVisible ? (
          <DateTimePicker
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
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onStart(dateAtEndOfDay(selectedDate))}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>Inizia</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Indietro</Text>
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
