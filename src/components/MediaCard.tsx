import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";

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
  const translateX = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const threshold = Math.min(120, width * 0.25);

  useEffect(() => {
    translateX.setValue(0);
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
    const toValue = direction === "right" ? width * 1.25 : -width * 1.25;
    Animated.timing(translateX, {
      duration: 160,
      toValue,
      useNativeDriver: true
    }).start(() => {
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
          swipeEnabled && Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
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
        }
      }),
    [swipeEnabled, threshold, translateX]
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
      {item.mediaType === "video" ? (
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
        <Text style={styles.date}>{formatMediaDate(item.creationTime)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
