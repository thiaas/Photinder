import { Pressable, StyleSheet, Text, View } from "react-native";

interface UndoBarProps {
  visible: boolean;
  onUndo: () => void;
}

export default function UndoBar({ visible, onUndo }: UndoBarProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Spostato nel cestino</Text>
      <Pressable accessibilityRole="button" onPress={onUndo} style={styles.button}>
        <Text style={styles.buttonText}>Annulla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#111827"
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  button: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  buttonText: {
    color: "#7dd3fc",
    fontSize: 15,
    fontWeight: "800"
  }
});
