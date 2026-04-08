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
import { deleteFingerprint, scanAndConnect, resetFingerprintMemory, disconnectDevice, sendBleCommand, stopBleScan, listFingerprints, monitorFingerprintEvents, fetchIdentity, saveIdentity, setMasterPass, enrollFingerprint } from "./src/ble";

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
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
          // Always default to verification if we have a paired device
          // This forces a hardware check for existing fingerprints
          setScreen("fingerprintVerification");
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
        if (isConn) {
          // Already connected — just discover services
          const devices = await m.connectedDevices([SERVICE_UUID]);
          const me = devices.find(x => x.id === connectedDeviceId);
          if (me) await me.discoverAllServicesAndCharacteristics();
          return;
        }

        // Not connected — scan by name (MAC-randomization-safe)
        scanAndConnect(
          'Motorcycle',
          (freshId) => {
            if (!isMounted) return;
            // Update stored ID if Android assigned a new MAC
            if (freshId !== connectedDeviceId) {
              setConnectedDeviceId(freshId);
              AsyncStorage.setItem(DEVICE_KEY, freshId);
            }
          },
          () => {
            // Timeout — retry after 10s
            if (isMounted) {
              retryTimeout = setTimeout(connectSilently, 10000);
            }
          }
        );
      } catch (error: any) {
        if (isMounted) {
          retryTimeout = setTimeout(connectSilently, 5000);
        }
      }
    };

    connectSilently();

    // Reconnect if it drops
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

  // Global Hardware Identity Sync Listener
  useEffect(() => {
    if (!connectedDeviceId) return;
    
    const sub = monitorFingerprintEvents(connectedDeviceId, (event) => {
      if (event.event === "identity") {
        console.log("[SYNC] Received Identity Bundle from Lock:", event);
        
        // Sync User Info if empty locally
        if (event.name && user.name === DEFAULT_USER.name) {
          setUser(prev => ({ ...prev, name: event.name, email: event.email }));
        }

        // Sync Fingerprint Labels if empty locally
        if (event.fp_names && fingerprints.length === 0) {
           try {
             const mapping = JSON.parse(event.fp_names);
             if (Array.isArray(mapping)) {
               const transformed: FingerprintData[] = mapping.map((m: any) => ({
                 id: m.s.toString(),
                 name: m.n,
                 slot: m.s,
                 userId: '1'
               }));
               setFingerprints(transformed);
             }
           } catch(e) {
             console.error("[SYNC] Identity Parse Error", e);
           }
        }
      }
    });

    return () => sub.remove();
  }, [connectedDeviceId, fingerprints.length, user.name]);


  useEffect(() => {
    if (loading) return;
    const payload: ApiState = { user, usersList, fingerprints };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch(() => {});
    pushRemoteState(payload);
  }, [loading, user, usersList, fingerprints]);

  const registerFingerprint = async (newFp: FingerprintData) => {
    if (connectedDeviceId) {
      const success = await enrollFingerprint(connectedDeviceId, newFp.slot, tempPassword || undefined);
      if (success) {
        setFingerprints((prev) => [...prev, newFp]);
        setScreen("fingerprintNaming");
      } else {
        Alert.alert("Hardware Error", "Enrollment failed. Ensure your finger is on the sensor.");
      }
    }
    setTempPassword(null);
  };

  const deleteWithPass = async (id: string, slot: number, pass: string) => {
    if (connectedDeviceId) {
      const success = await deleteFingerprint(connectedDeviceId, slot, pass);
      if (success) {
        setFingerprints(prev => prev.filter(f => f.id !== id));
      } else {
        Alert.alert("Error", "Incorrect Password or Hardware Error");
      }
    }
  };

  const resetWithPass = async (pass: string) => {
    if (connectedDeviceId) {
      const success = await resetFingerprintMemory(connectedDeviceId, pass);
      if (success) {
        setFingerprints([]);
        Alert.alert("Success", "Hardware fingerprints cleared.");
      } else {
        Alert.alert("Error", "Incorrect Password or Hardware Error");
      }
    }
  };

  const fullResetWithPass = async (pass: string) => {
    if (connectedDeviceId) {
      const success = await sendBleCommand(connectedDeviceId, { cmd: 'full_reset', pass });
      if (success) {
        await AsyncStorage.multiRemove([STORAGE_KEY, DEVICE_KEY]);
        setUser(DEFAULT_USER);
        setFingerprints([]);
        setConnectedDeviceId(null);
        setIsFromDashboard(false);
        setScreen("setup");
      } else {
        Alert.alert("Error", "Incorrect Password or Hardware Error");
      }
    }
  };
  const getNextSlot = () => {
    let next = 1;
    while (fingerprints.some(f => f.slot === next)) {
      next++;
    }
    return next;
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
            onNext={async (deviceId) => {
              setConnectedDeviceId(deviceId);
              await AsyncStorage.setItem(DEVICE_KEY, deviceId);
              
              setLoading(true);
              try {
                // Monitor for the 'count' event from ESP32
                const sub = monitorFingerprintEvents(deviceId, (event) => {
                  if (event.event === "count") {
                    sub.remove();
                    setLoading(false);
                    if (event.total > 0) {
                      // Hardware has fingerprints! 
                      // Force verification even if this phone is "new"
                      setScreen("fingerprintVerification");
                    } else {
                      // No fingerprints, proceed to setup
                      setScreen("hotspot");
                    }
                  }
                });

                // Request the count and the Identity bundle
                await listFingerprints(deviceId);
                await fetchIdentity(deviceId);

                // Timeout safety: if ESP32 doesn't respond in 4s, proceed anyway
                setTimeout(() => {
                  sub.remove();
                  setLoading(false);
                  // Check if we are still on loading/bluetooth state
                  // If we didn't transition yet, default to hotspot
                  setScreen((current) => current === "bluetooth" ? "hotspot" : current);
                }, 4000);
              } catch (e) {
                setLoading(false);
                setScreen("hotspot");
              }
            }}
          />
        )}

        {screen === "hotspot" && (
          <HotspotScreen
            deviceId={connectedDeviceId}
            userEmail={user.email}
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
                const updated = { ...target, name: nameDraft.trim() };
                copy[copy.length - 1] = updated;
                
                // Push update to hardware (Single Source of Truth)
                if (connectedDeviceId) {
                  saveIdentity(connectedDeviceId, user.name, copy);
                }
                
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
              if (connectedDeviceId) {
                setMasterPass(connectedDeviceId, password);
              }
              setScreen("emailRegistration");
            }}
          />
        )}

        {screen === "emailRegistration" && (
          <EmailRegistrationScreen
            onBack={() => setScreen("passwordCreation")}
            onNext={(email) => {
              const updatedUser = { ...user, email };
              setUser(updatedUser);
              if (connectedDeviceId) {
                saveIdentity(connectedDeviceId, user.name, fingerprints);
              }
              setScreen("dashboard");
            }}
          />
        )}

        {screen === "fingerprintVerification" && (
          <VerificationScreen
            deviceId={connectedDeviceId}
            userEmail={user.email}
            onVerified={() => setScreen("dashboard")}
            onReset={async () => {
              // Disconnect from ESP32 FIRST so it stops advertising block
              // and immediately starts re-advertising for pairing
              if (connectedDeviceId) {
                stopBleScan();
                await disconnectDevice(connectedDeviceId);
              }
              await AsyncStorage.multiRemove([STORAGE_KEY, DEVICE_KEY]);
              setUser(DEFAULT_USER);
              setFingerprints([]);
              setConnectedDeviceId(null);
              setIsFromDashboard(false);
              setScreen("setup");
            }}
          />
        )}

        {screen === "dashboard" && (
          <DashboardScreen
            user={user}
            fingerprints={fingerprints}
            deviceId={connectedDeviceId}
            onAddFingerprint={() => {}} // Now handled by Modal in Dashboard
            onRemoveFingerprint={() => {}}
            onResetHardware={() => {}}
            onSystemReset={() => {}}
            onEnrollWithPassword={(pass) => {
              setTempPassword(pass);
              setIsFromDashboard(true);
              setScreen("fingerprintRegistration");
            }}
            onDeleteWithPassword={deleteWithPass}
            onResetWithPassword={resetWithPass}
            onFullResetWithPassword={fullResetWithPass}
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
