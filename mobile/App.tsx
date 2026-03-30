import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiState, FingerprintData, Screen, User } from "./src/types";
import { fetchRemoteState, pushRemoteState } from "./src/api";
import { BluetoothPairingScreen } from "./src/BluetoothPairingScreen";
import { HotspotScreen } from "./src/HotspotScreen";
import { SetupScreen } from "./src/SetupScreen";
import { VerificationScreen } from "./src/VerificationScreen";
import { PasswordCreationScreen } from "./src/PasswordCreationScreen";
import { EmailRegistrationScreen } from "./src/EmailRegistrationScreen";
import { FingerprintRegistrationScreen } from "./src/FingerprintRegistrationScreen";
import { FingerprintNamingScreen } from "./src/FingerprintNamingScreen";
import { DashboardScreen } from "./src/DashboardScreen";
import { deleteFingerprint, scanAndConnect, resetFingerprintMemory } from "./src/ble";

const STORAGE_KEY = "grip_mobile_app_state";
const DEVICE_KEY = "grip_last_device_id";

const INITIAL_USERS = [
  { id: "user1", name: "John Doe", email: "john@example.com" },
];

const INITIAL_FINGERPRINTS: FingerprintData[] = [];

const DEFAULT_USER: User = { name: INITIAL_USERS[0].name, email: INITIAL_USERS[0].email };

function MainApp() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [usersList, setUsersList] = useState(INITIAL_USERS);
  const [fingerprints, setFingerprints] = useState(INITIAL_FINGERPRINTS);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const local = await AsyncStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local) as ApiState;
          setUser(parsed.user ?? DEFAULT_USER);
          setUsersList(parsed.usersList ?? INITIAL_USERS);
          setFingerprints(parsed.fingerprints ?? INITIAL_FINGERPRINTS);
        }

        const lastId = await AsyncStorage.getItem(DEVICE_KEY);
        if (lastId) {
          setIsAutoConnecting(true);
          scanAndConnect(
            lastId,
            () => {
              setConnectedDeviceId(lastId);
              setIsAutoConnecting(false);
              // If we have a password, go to verification (login)
              // Otherwise go to registration
              setScreen(user.password ? "fingerprintVerification" : "dashboard");
            },
            () => {
              setIsAutoConnecting(false);
              // If auto-connect fails, just stay on the last screen or dashboard
            }
          );
        }
      } catch (error) {
        console.warn("Failed loading local state", error);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, [user.password]);

  useEffect(() => {
    if (loading) return;
    const payload: ApiState = { user, usersList, fingerprints };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
    pushRemoteState(payload);
  }, [loading, user, usersList, fingerprints]);

  const registerFingerprint = () => {
    setScreen("fingerprintNaming");
  };

  const handleFullSystemReset = async () => {
    Alert.alert(
      "SYSTEM RESET",
      "This will wipe ALL fingerprints from the sensor and RESET the entire app. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "RESET EVERYTHING",
          style: "destructive",
          onPress: async () => {
            if (connectedDeviceId) {
              await resetFingerprintMemory(connectedDeviceId);
            }
            await AsyncStorage.multiRemove([STORAGE_KEY, DEVICE_KEY]);
            setUser(DEFAULT_USER);
            setFingerprints([]);
            setConnectedDeviceId(null);
            setScreen("setup");
          }
        }
      ]
    );
  };

  const deleteFingerprintLogic = async (id: string, slot: number) => {
    if (connectedDeviceId) {
      try {
        const success = await deleteFingerprint(connectedDeviceId, slot);
        if (!success) {
          Alert.alert("Hardware error", "Could not remove fingerprint from the sensor. It might already be gone.");
        }
      } catch (e) {
        console.warn("Failed to send delete command", e);
      }
    }
    
    setFingerprints((prev) => prev.filter((fp) => fp.id !== id));
  };

  const handleResetHardware = async () => {
    if (!connectedDeviceId) return;
    Alert.alert(
      "WIPE HARDWARE",
      "This will remove ALL fingerprints from the physical sensor. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "WIPE",
          style: "destructive",
          onPress: async () => {
            const success = await resetFingerprintMemory(connectedDeviceId);
            if (success) {
              setFingerprints([]);
              Alert.alert("Success", "Hardware memory cleared.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {screen === "setup" && (
          <SetupScreen onNext={() => setScreen("bluetooth")} />
        )}

        {screen === "bluetooth" && (
          <BluetoothPairingScreen
            onBack={() => setScreen("setup")}
            onNext={(deviceId) => {
              setConnectedDeviceId(deviceId);
              AsyncStorage.setItem(DEVICE_KEY, deviceId);
              setScreen("hotspot");
            }}
          />
        )}

        {screen === "hotspot" && (
          <HotspotScreen
            deviceId={connectedDeviceId}
            onBack={() => setScreen("bluetooth")}
            onNext={() => setScreen(user.password ? "fingerprintVerification" : "fingerprintRegistration")}
          />
        )}

        {screen === "fingerprintRegistration" && (
          <FingerprintRegistrationScreen
            deviceId={connectedDeviceId}
            onBack={() => setScreen("setup")}
            onSkip={() => setScreen("passwordCreation")}
            onRegister={registerFingerprint}
          />
        )}

        {screen === "fingerprintNaming" && (
          <FingerprintNamingScreen
            onBack={() => setScreen("fingerprintRegistration")}
            onSave={(nameDraft) => {
              if (!nameDraft.trim()) {
                setScreen("passwordCreation");
                return;
              }
              setFingerprints((prev) => {
                const copy = [...prev];
                const target = copy[copy.length - 1];
                copy[copy.length - 1] = { ...target, name: nameDraft.trim() };
                return copy;
              });
              setScreen("passwordCreation");
            }}
          />
        )}

        {screen === "passwordCreation" && (
          <PasswordCreationScreen
            onBack={() => setScreen("setup")}
            onNext={(password) => {
              setUser((prev) => ({ ...prev, password }));
              setScreen("emailRegistration");
            }}
          />
        )}

        {screen === "emailRegistration" && (
          <EmailRegistrationScreen
            onBack={() => setScreen("passwordCreation")}
            onNext={(email) => {
              setUser((prev) => ({ ...prev, email }));
              setScreen("dashboard");
            }}
          />
        )}

        {screen === "fingerprintVerification" && (
          <VerificationScreen
            deviceId={connectedDeviceId}
            onBack={() => setScreen("hotspot")}
            onVerified={() => setScreen("dashboard")}
          />
        )}

        {screen === "dashboard" && (
          <DashboardScreen
            user={user}
            fingerprints={fingerprints}
            deviceId={connectedDeviceId}
            onAddFingerprint={() => setScreen("fingerprintRegistration")}
            onRemoveFingerprint={deleteFingerprintLogic}
            onResetHardware={handleResetHardware}
            onSystemReset={handleFullSystemReset}
            onUpdateFingerprints={setFingerprints}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return <Text style={styles.header}>{title}</Text>;
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.ghostButton} onPress={onPress}>
      <Text style={styles.ghostButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, padding: 20, gap: 14 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 34, fontWeight: "700", color: "#000" },
  header: { fontSize: 28, fontWeight: "700", color: "#000", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  ghostButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  ghostButtonText: { color: "#111", fontWeight: "600", fontSize: 15 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fafafa",
  },
  cardTitle: { fontSize: 12, color: "#666", marginBottom: 4, fontWeight: "600" },
  cardValue: { fontSize: 16, color: "#111", fontWeight: "700" },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
