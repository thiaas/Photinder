import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import DatePickerScreen from "./src/screens/DatePickerScreen";
import HomeScreen from "./src/screens/HomeScreen";
import StartupScreen from "./src/screens/StartupScreen";
import TrashReviewScreen from "./src/screens/TrashReviewScreen";
import TrashScreen from "./src/screens/TrashScreen";
import { clearSession, createSession, loadSession, saveSession } from "./src/storage/sessionStorage";
import type { SessionState } from "./src/types/media";

type Screen = "startup" | "datePicker" | "home" | "trash" | "trashReview";

export default function App() {
  const [screen, setScreen] = useState<Screen>("startup");
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [resumeMode, setResumeMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const savedSession = await loadSession();
      if (!isMounted) {
        return;
      }

      setSession(savedSession);
      setIsLoadingSession(false);
      setScreen("startup");
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistSession = async (nextSession: SessionState) => {
    setSession(nextSession);
    await saveSession(nextSession);
  };

  const startNewSession = async (startDate: number) => {
    const nextSession = createSession(startDate);
    await persistSession(nextSession);
    setResumeMode(false);
    setScreen("home");
  };

  const resetToDatePicker = () => {
    setResumeMode(false);
    setScreen("datePicker");
  };

  const handleMissingResumeItem = () => {
    Alert.alert(
      "Sessione da ricalibrare",
      "L'ultimo elemento analizzato non e' piu' disponibile nella galleria.",
      [
        {
          text: "Scegli nuova data",
          onPress: () => {
            setResumeMode(false);
            setScreen("datePicker");
          }
        },
        {
          text: "Riparti da zero",
          style: "destructive",
          onPress: async () => {
            await clearSession();
            setSession(null);
            setResumeMode(false);
            setScreen("datePicker");
          }
        }
      ]
    );
  };

  const renderScreen = () => {
    if (isLoadingSession) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#111827" size="large" />
        </View>
      );
    }

    if (screen === "datePicker") {
      return (
        <DatePickerScreen
          initialDate={session?.startDate ?? Date.now()}
          onCancel={() => setScreen("startup")}
          onStart={startNewSession}
        />
      );
    }

    if (screen === "home" && session) {
      return (
        <HomeScreen
          isResumeMode={resumeMode}
          session={session}
          onChooseNewDate={resetToDatePicker}
          onGoToTrash={() => setScreen("trash")}
          onMissingResumeItem={handleMissingResumeItem}
          onSessionChange={persistSession}
        />
      );
    }

    if (screen === "trash" && session) {
      return (
        <TrashScreen
          session={session}
          onBack={() => setScreen("home")}
          onReviewTrash={() => setScreen("trashReview")}
          onSessionChange={persistSession}
        />
      );
    }

    if (screen === "trashReview" && session) {
      return (
        <TrashReviewScreen
          session={session}
          onBackToTrash={() => setScreen("trash")}
          onSessionChange={persistSession}
        />
      );
    }

    return (
      <StartupScreen
        session={session}
        onNewSession={resetToDatePicker}
        onResume={() => {
          if (session) {
            setResumeMode(true);
            setScreen("home");
          }
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f7f7f4"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
