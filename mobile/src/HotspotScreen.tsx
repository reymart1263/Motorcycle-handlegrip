import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  onBack: () => void;
  onNext: () => void;
};

export function HotspotScreen({ onBack, onNext }: Props) {
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.title}>Hotspot Connection</Text>
      </View>

      {/* Main WiFi Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <Ionicons name="wifi" size={20} color="#10b981" />
          <Text style={styles.toggleText}>WiFi Hotspot</Text>
        </View>
        <Switch
          value={wifiEnabled}
          onValueChange={setWifiEnabled}
          trackColor={{ false: "#e4e4e7", true: "#000" }}
          thumbColor="#fff"
          ios_backgroundColor="#e4e4e7"
        />
      </View>

      {/* Decorative Center */}
      <View style={styles.centerGraphic}>
        <Ionicons name="phone-portrait-outline" size={56} color="#d4d4d8" />
        
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <MaterialCommunityIcons name="bike" size={56} color="#d4d4d8" />
      </View>

      <Text style={styles.statusText}>Searching for available hotspots...</Text>

      {/* Inputs */}
      <TextInput
        style={styles.input}
        placeholder="Hotspot Name"
        placeholderTextColor="#a1a1aa"
        value={ssid}
        onChangeText={setSsid}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#a1a1aa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {/* Connect Button */}
      <Pressable 
        style={styles.connectButton} 
        onPress={() => {
          // If you need to map this data, you can save it locally here,
          // For now, we just pass to the next screen.
          onNext();
        }}
      >
        <Text style={styles.connectButtonText}>Connect to Hotspot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    marginRight: 16,
  },
  title: { 
    fontSize: 22, 
    fontWeight: "700", 
    color: "#111" 
  },
  toggleCard: {
    backgroundColor: "#f4f4f5",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  centerGraphic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    marginBottom: 40,
    gap: 16,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d4d4d8",
  },
  statusText: {
    fontSize: 14,
    color: "#71717a",
    marginBottom: 16,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#f4f4f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111",
    marginBottom: 12,
  },
  connectButton: {
    backgroundColor: "#71717a", // Muted grey like the screenshot
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  connectButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
