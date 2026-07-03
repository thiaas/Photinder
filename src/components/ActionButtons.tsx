import { Pressable, StyleSheet, Text, View } from "react-native";

interface ActionButtonsProps {
  disabled?: boolean;
  keepLabel?: string;
  trashLabel?: string;
  onKeep: () => void;
  onTrash: () => void;
}

export default function ActionButtons({
  disabled,
  keepLabel = "Tieni",
  trashLabel = "Cestina",
  onKeep,
  onTrash
}: ActionButtonsProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onTrash}
        style={({ pressed }) => [
          styles.button,
          styles.trash,
          (pressed || disabled) && styles.buttonMuted
        ]}
      >
        <Text style={styles.trashText}>{trashLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onKeep}
        style={({ pressed }) => [
          styles.button,
          styles.keep,
          (pressed || disabled) && styles.buttonMuted
        ]}
      >
        <Text style={styles.keepText}>{keepLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12
  },
  button: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1
  },
  keep: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e"
  },
  trash: {
    backgroundColor: "#fff",
    borderColor: "#dc2626"
  },
  keepText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  trashText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonMuted: {
    opacity: 0.55
  }
});
