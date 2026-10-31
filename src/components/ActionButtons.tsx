import { Pressable, StyleSheet, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useLibraryColor } from "../theme/LibraryTheme";

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
  const color = useLibraryColor();
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
        <X color="#dc2626" size={22} />
        <Text style={styles.trashText}>{trashLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onKeep}
        style={({ pressed }) => [
          styles.button,
          styles.keep,
          { backgroundColor: color, borderColor: color },
          (pressed || disabled) && styles.buttonMuted
        ]}
      >
        <Check color="white" size={22} />
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
    flexDirection: "row",
    gap: 8,
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
