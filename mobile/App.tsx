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
import { getBleManager, SERVICE_UUID } from "./src/ble";
import { BluetoothPairingScreen } from "./src/BluetoothPairingScreen";
import { HotspotScreen } from "./src/HotspotScreen";
import { SetupScreen } from "./src/SetupScreen";
import { VerificationScreen } from "./src/VerificationScreen";
import { PasswordCreationScreen } from "./src/PasswordCreationScreen";
import { EmailRegistrationScreen } from "./src/EmailRegistrationScreen";
import { FingerprintRegistrationScreen } from "./src/FingerprintRegistrationScreen";
import { FingerprintNamingScreen } from "./src/FingerprintNamingScreen";
import { DashboardScreen } from "./src/DashboardScreen";
import { deleteFingerprint, scanAndConnect, resetFingerprintMemory, disconnectDevice } from "./src/ble";

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
  const [isFromDashboard, setIsFromDashboard] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        let loadedUser = user;
        let loadedFingerprints = INITIAL_FINGERPRINTS;
        const local = await AsyncStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local) as ApiState;
          loadedUser = parsed.user ?? DEFAULT_USER;
          setUser(loadedUser);
          setUsersList(parsed.usersList ?? INITIAL_USERS);
          loadedFingerprints = parsed.fingerprints ?? INITIAL_FINGERPRINTS;
          setFingerprints(loadedFingerprints);
        }

        const lastId = await AsyncStorage.getItem(DEVICE_KEY);
        if (lastId) {
          setConnectedDeviceId(lastId);
          setIsAutoConnecting(false);
          if (loadedFingerprints.length > 0) {
            setScreen("fingerprintVerification");
          } else {
            setScreen("hotspot");
          }
        }
      } catch (error) {
        console.warn("Failed loading local state", error);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  // Global Bluetooth Background Manager
  useEffect(() => {
    if (!connectedDeviceId) return;
    const m = getBleManager();
    if (!m) return;
    
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout>;
    
    const connectSilently = async () => {
       if (!isMounted) return;
       try {
          const isConn = await m.isDeviceConnected(connectedDeviceId);
          if (!isConn) {
             const d = await m.connectToDevice(connectedDeviceId, { autoConnect: true });
             await d.discoverAllServicesAndCharacteristics();
             const { Platform } = require('react-native');
             if (Platform.OS === 'android') await d.requestMTU(512);
          } else {
             const devices = await m.connectedDevices([SERVICE_UUID]);
             const me = devices.find(x => x.id === connectedDeviceId);
             if (me) await me.discoverAllServicesAndCharacteristics();
          }
       } catch (error: any) {
          // Expected behavior if ESP32 is powered off or out of range. 
          // We suppress the warning flood and just schedule a manual retry.
          if (isMounted) {
            retryTimeout = setTimeout(connectSilently, 5000);
          }
       }
    };
    
    connectSilently();
    
    // Automatically reconnect if it drops after a successful connection
    const sub = m.onDeviceDisconnected(connectedDeviceId, () => {
      if (isMounted) {
         retryTimeout = setTimeout(connectSilently, 2000);
      }
    });
    
    return () => {
      isMounted = false;
      sub.remove();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [connectedDeviceId]);

  useEffect(() => {
    if (loading) return;
    const payload: ApiState = { user, usersList, fingerprints };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
    pushRemoteState(payload);
  }, [loading, user, usersList, fingerprints]);

  const registerFingerprint = (newFp: FingerprintData) => {
    setFingerprints((prev) => [...prev, newFp]);
    setScreen("fingerprintNaming");
  };

  const getNextSlot = () => {
    let next = 1;
    while (fingerprints.some(f => f.slot === next)) {
      next++;
    }
    return next;
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
              await disconnectDevice(connectedDeviceId);
            }
            await AsyncStorage.multiRemove([STORAGE_KEY, DEVICE_KEY]);
            setUser(DEFAULT_USER);
            setFingerprints([]);
            setConnectedDeviceId(null);
            setIsFromDashboard(false);
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
            onNext={() => {
              setIsFromDashboard(false);
              setScreen("fingerprintRegistration");
            }}
          />
        )}

        {screen === "fingerprintRegistration" && (
          <FingerprintRegistrationScreen
            deviceId={connectedDeviceId}
            nextSlot={getNextSlot()}
            onBack={() => setScreen(isFromDashboard ? "dashboard" : "hotspot")}
            onRegister={registerFingerprint}
          />
        )}

        {screen === "fingerprintNaming" && (
          <FingerprintNamingScreen
            onBack={() => setScreen("fingerprintRegistration")}
            onSave={(nameDraft) => {
              const nextScreen = isFromDashboard ? "dashboard" : "passwordCreation";
              if (!nameDraft.trim()) {
                setScreen(nextScreen);
                return;
              }
              setFingerprints((prev) => {
                const copy = [...prev];
                const target = copy[copy.length - 1];
                copy[copy.length - 1] = { ...target, name: nameDraft.trim() };
                return copy;
              });
              setScreen(nextScreen);
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
            onVerified={() => setScreen("dashboard")}
          />
        )}

        {screen === "dashboard" && (
          <DashboardScreen
            user={user}
            fingerprints={fingerprints}
            deviceId={connectedDeviceId}
            onAddFingerprint={() => {
              setIsFromDashboard(true);
              setScreen("fingerprintRegistration");
            }}
            onRemoveFingerprint={deleteFingerprintLogic}
            onResetHardware={handleResetHardware}
            onSystemReset={handleFullSystemReset}
            onUpdateFingerprints={setFingerprints}
            onUpdateUser={setUser}
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
