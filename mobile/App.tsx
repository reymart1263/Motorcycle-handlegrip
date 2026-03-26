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

const STORAGE_KEY = "grip_mobile_app_state";

const INITIAL_USERS = [
  { id: "user1", name: "John Doe", email: "john@example.com" },
  { id: "user2", name: "Jane Smith", email: "jane@example.com" },
  { id: "user3", name: "Mike Johnson", email: "mike@example.com" },
];

const INITIAL_FINGERPRINTS: FingerprintData[] = [
  { id: "fp1", name: "Thumb", userId: "user1", slot: 1 },
  { id: "fp2", name: "Index", userId: "user1", slot: 2 },
  { id: "fp3", name: "Thumb", userId: "user2", slot: 1 },
];

const DEFAULT_USER: User = { name: INITIAL_USERS[0].name, email: INITIAL_USERS[0].email };

function MainApp() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [usersList, setUsersList] = useState(INITIAL_USERS);
  const [fingerprints, setFingerprints] = useState(INITIAL_FINGERPRINTS);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");

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
      } catch (error) {
        console.warn("Failed loading local state", error);
      }

      try {
        const remote = await fetchRemoteState();
        if (remote) {
          setUser(remote.user ?? DEFAULT_USER);
          setUsersList(remote.usersList ?? INITIAL_USERS);
          setFingerprints(remote.fingerprints ?? INITIAL_FINGERPRINTS);
        }
      } catch (error) {
        console.warn("Failed loading backend state", error);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  useEffect(() => {
    if (loading) return;
    const payload: ApiState = { user, usersList, fingerprints };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch((error) =>
      console.warn("Failed writing local state", error),
    );
    pushRemoteState(payload).catch((error) => console.warn("Failed syncing backend", error));
  }, [loading, user, usersList, fingerprints]);

  const currentUserFingerprints = useMemo(
    () => fingerprints.filter((fp) => fp.userId === usersList[0]?.id),
    [fingerprints, usersList],
  );

  const registerFingerprint = () => {
    if (currentUserFingerprints.length >= 5) {
      Alert.alert("Limit reached", "Each user can only register up to 5 fingerprints.");
      return;
    }
    const nextSlot = currentUserFingerprints.length + 1;
    const newFp: FingerprintData = {
      id: Math.random().toString(36).slice(2, 10),
      name: `Fingerprint ${fingerprints.length + 1}`,
      userId: usersList[0].id,
      slot: nextSlot,
    };
    setFingerprints((prev) => [...prev, newFp]);
    setScreen("fingerprintNaming");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" />
        <Text style={styles.subtitle}>Preparing app data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {screen === "setup" && (
          <>
            <Text style={styles.title}>Connect</Text>
            <Text style={styles.subtitle}>Secure your ride, your way.</Text>
            <PrimaryButton label="Start Setup" onPress={() => setScreen("bluetooth")} />
          </>
        )}

        {screen === "bluetooth" && (
          <BluetoothPairingScreen
            onBack={() => setScreen("setup")}
            onNext={() => setScreen("hotspot")}
          />
        )}

        {screen === "hotspot" && (
          <HotspotScreen
            onBack={() => setScreen("bluetooth")}
            onNext={() => setScreen(user.password ? "fingerprintVerification" : "fingerprintRegistration")}
          />
        )}

        {screen === "fingerprintRegistration" && (
          <>
            <Header title="Fingerprint Registration" />
            <Text style={styles.subtitle}>Register a fingerprint using the handlegrip sensor.</Text>
            <PrimaryButton label="Simulate Registration" onPress={registerFingerprint} />
            <GhostButton label="Skip" onPress={() => setScreen("passwordCreation")} />
          </>
        )}

        {screen === "fingerprintNaming" && (
          <>
            <Header title="Name Fingerprint" />
            <TextInput
              placeholder="e.g. Right Thumb"
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
            />
            <PrimaryButton
              label="Save Name"
              onPress={() => {
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
                setNameDraft("");
                setScreen("passwordCreation");
              }}
            />
          </>
        )}

        {screen === "passwordCreation" && (
          <>
            <Header title="Password Creation" />
            <TextInput
              placeholder="Create strong password"
              secureTextEntry
              style={styles.input}
              value={passwordDraft}
              onChangeText={setPasswordDraft}
            />
            <PrimaryButton
              label="Continue"
              onPress={() => {
                if (passwordDraft.length < 8) {
                  Alert.alert("Weak password", "Use at least 8 characters.");
                  return;
                }
                setUser((prev) => ({ ...prev, password: passwordDraft }));
                setPasswordDraft("");
                setScreen("emailRegistration");
              }}
            />
          </>
        )}

        {screen === "emailRegistration" && (
          <>
            <Header title="Email Registration" />
            <TextInput
              placeholder="Email address"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailDraft}
              onChangeText={setEmailDraft}
            />
            <PrimaryButton
              label="Finish Setup"
              onPress={() => {
                if (!emailDraft.includes("@")) {
                  Alert.alert("Invalid email", "Enter a valid email address.");
                  return;
                }
                setUser((prev) => ({ ...prev, email: emailDraft.trim() }));
                setEmailDraft("");
                setScreen("dashboard");
              }}
            />
          </>
        )}

        {screen === "fingerprintVerification" && (
          <>
            <Header title="Fingerprint Verification" />
            <Text style={styles.subtitle}>Place your finger on the sensor to unlock dashboard.</Text>
            <PrimaryButton label="Simulate Verify" onPress={() => setScreen("dashboard")} />
          </>
        )}

        {screen === "dashboard" && (
          <>
            <Header title="Dashboard" />
            <Card title="User" value={`${user.name} (${user.email || "No email"})`} />
            <Card title="Fingerprints" value={`${fingerprints.length} registered`} />
            <PrimaryButton label="Add Fingerprint" onPress={() => setScreen("fingerprintRegistration")} />
            <GhostButton
              label="Reset App"
              onPress={() => {
                setUser(DEFAULT_USER);
                setUsersList(INITIAL_USERS);
                setFingerprints([]);
                setScreen("setup");
              }}
            />
          </>
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
