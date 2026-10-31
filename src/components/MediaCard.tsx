import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { FileText, FolderOpen } from "lucide-react-native";
import { useLibraryColor } from "../theme/LibraryTheme";
import { openDocument } from "../services/documents";

import type { MediaItem } from "../types/media";
import { formatMediaDate } from "../utils/mediaActions";

interface MediaCardProps {
  item: MediaItem;
  leftLabel?: string;
  rightLabel?: string;
  swipeEnabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

function VideoPane({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = true;
  });

  return (
    <VideoView
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      nativeControls
      player={player}
      style={styles.media}
      surfaceType="textureView"
    />
  );
}

export default function MediaCard({
  item,
  leftLabel = "Cestina",
  rightLabel = "Tieni",
  swipeEnabled = true,
  onSwipeLeft,
  onSwipeRight
}: MediaCardProps) {
  const color = useLibraryColor();
  const translateX = useRef(new Animated.Value(0)).current;
  const animatingRef = useRef(false);
  const { width } = useWindowDimensions();
  const threshold = Math.min(120, width * 0.25);

  useEffect(() => {
    translateX.setValue(0);
    animatingRef.current = false;
    return () => translateX.stopAnimation();
  }, [item.id, translateX]);

  const rotate = translateX.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-8deg", "0deg", "8deg"]
  });

  const leftOpacity = translateX.interpolate({
    inputRange: [-threshold, 0],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

  const rightOpacity = translateX.interpolate({
    inputRange: [0, threshold],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });

  const finishSwipe = (direction: "left" | "right") => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    const toValue = direction === "right" ? width * 1.25 : -width * 1.25;
    Animated.timing(translateX, {
      duration: 160,
      toValue,
      useNativeDriver: true
    }).start(({ finished }) => {
      animatingRef.current = false;
      if (!finished) return;
      if (direction === "right") {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
      translateX.setValue(0);
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          swipeEnabled && !animatingRef.current && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: Animated.event([null, { dx: translateX }], {
          useNativeDriver: false
        }),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > threshold) {
            finishSwipe("right");
            return;
          }

          if (gesture.dx < -threshold) {
            finishSwipe("left");
            return;
          }

          Animated.spring(translateX, {
            friction: 7,
            tension: 60,
            toValue: 0,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      }),
    [swipeEnabled, threshold, translateX, width, onSwipeLeft, onSwipeRight]
  );

  return (
    <Animated.View
      {...(swipeEnabled ? panResponder.panHandlers : {})}
      style={[
        styles.card,
        {
          transform: [{ translateX }, { rotate }]
        }
      ]}
    >
      {item.mediaType === "document" ? (
        <ScrollView style={{ flex: 1, backgroundColor: "white" }} contentContainerStyle={styles.documentPane}>
          <FileText color={color} size={76} strokeWidth={1.3} />
          <Text style={[styles.extension, { color }]}>{item.filename.includes(".") ? item.filename.split(".").pop()?.toUpperCase() : "FILE"}</Text>
          <Text style={styles.documentName} numberOfLines={4}>{item.filename}</Text>
          <Text style={styles.documentDetail}>{item.size === undefined ? "" : `${(item.size / 1024).toLocaleString("it-IT", { maximumFractionDigits: 0 })} KB`}</Text>
          <Pressable accessibilityRole="button" onPress={async () => {
            try { await openDocument(item); }
            catch (error) { Alert.alert("Apertura non riuscita", error instanceof Error ? error.message : "Documento non disponibile."); }
          }} style={[styles.openDocument, { backgroundColor: color }]}>
            <FolderOpen color="white" size={20} /><Text style={styles.openLabel}>Apri documento</Text>
          </Pressable>
        </ScrollView>
      ) : item.mediaType === "video" ? (
        <VideoPane uri={item.uri} />
      ) : (
        <Image contentFit="contain" source={{ uri: item.uri }} style={styles.media} />
      )}
      <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeLeft, { opacity: leftOpacity }]}>
        <Text style={[styles.badgeText, styles.leftText]}>{leftLabel}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.badge, styles.badgeRight, { opacity: rightOpacity }]}>
        <Text style={[styles.badgeText, styles.rightText]}>{rightLabel}</Text>
      </Animated.View>
      <View style={styles.meta}>
        <Text numberOfLines={1} style={styles.filename}>
          {item.filename}
        </Text>
        <Text style={styles.date}>{item.mediaType === "document" ? "Modificato: " : ""}{formatMediaDate(item.creationTime)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  documentPane: { flexGrow: 1, padding: 20, gap: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  documentName: { fontSize: 19, fontWeight: "700", textAlign: "center", color: "#202329" },
  documentDetail: { fontSize: 14, color: "#646a73" },
  extension: { fontSize: 17, fontWeight: "900" },
  openDocument: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 8, paddingHorizontal: 16 },
  openLabel: { color: "white", fontWeight: "800", fontSize: 15 },
  card: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#0a0a0a",
    shadowColor: "#000",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4
  },
  media: {
    flex: 1,
    width: "100%"
  },
  badge: {
    position: "absolute",
    top: 24,
    borderRadius: 8,
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  badgeLeft: {
    left: 18,
    borderColor: "#dc2626",
    transform: [{ rotate: "-9deg" }]
  },
  badgeRight: {
    right: 18,
    borderColor: "#0f766e",
    transform: [{ rotate: "9deg" }]
  },
  badgeText: {
    fontSize: 22,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  leftText: {
    color: "#dc2626"
  },
  rightText: {
    color: "#0f766e"
  },
  meta: {
    minHeight: 64,
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 14,
    backgroundColor: "rgba(10,10,10,0.82)"
  },
  filename: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700"
  },
  date: {
    color: "#d1d5db",
    fontSize: 13
  }
});
