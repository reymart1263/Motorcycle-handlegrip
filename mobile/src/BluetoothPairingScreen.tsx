import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Switch,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { State as BleAdapterState } from "react-native-ble-plx";
import {
  ensureBlePermissions,
  getBleManager,
  getBluetoothState,
  ScannedBleDevice,
  startBleScan,
  stopBleScan,
  connectToDevice,
} from "./ble";

type Props = {
  onBack: () => void;
  onNext: (deviceId: string) => void;
};

export function BluetoothPairingScreen({ onBack, onNext }: Props) {
  const [adapterState, setAdapterState] = useState<BleAdapterState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, ScannedBleDevice>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const refreshAdapterState = useCallback(async () => {
    try {
      const s = await getBluetoothState();
      setAdapterState(s);
    } catch {
      setAdapterState(null);
    }
  }, []);

  useEffect(() => {
    refreshAdapterState();
    const mgr = getBleManager();
    if (!mgr) return;
    const subscription = mgr.onStateChange((state: BleAdapterState) => {
      setAdapterState(state);
    }, true);
    return () => {
      subscription.remove();
    };
  }, [refreshAdapterState]);

  const sortedDevices = useMemo(() => {
    return Array.from(devices.values())
      .filter((device) => device.name && device.name.trim().length > 0)
      .sort((a, b) => {
        return (b.rssi ?? -999) - (a.rssi ?? -999);
      });
  }, [devices]);

  const handleStartScan = async () => {
    setError(null);
    const ok = await ensureBlePermissions();
    if (!ok) {
      Alert.alert("Permissions", "Bluetooth and location permissions are required to scan for devices.");
      return;
    }

    const state = await getBluetoothState();
    if (state !== "PoweredOn") {
      Alert.alert(
        "Bluetooth off",
        "Turn on Bluetooth in system settings, then try again.",
      );
      return;
    }

    setDevices(new Map());
    setScanning(true);
    startBleScan(
      (d) => {
        setDevices((prev) => {
          const next = new Map(prev);
          next.set(d.id, d);
          return next;
        });
      },
      (msg) => setError(msg),
    );
  };

  const handleStopScan = () => {
    stopBleScan();
    setScanning(false);
  };

  const toggleScanning = (val: boolean) => {
    if (val) {
      handleStartScan();
    } else {
      handleStopScan();
    }
  };

  const handleConnect = async (deviceId: string) => {
    handleStopScan();
    const success = await connectToDevice(deviceId);
    if (success) {
      onNext(deviceId);
    } else {
      Alert.alert("Connection Failed", "Could not connect to the device. Please try again.");
    }
  };

  useEffect(() => {
    return () => {
      stopBleScan();
    };
  }, []);

  return (
    <View style={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.title}>Bluetooth Pairing</Text>
      </View>

      {/* Main Bluetooth Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <Ionicons name="bluetooth" size={20} color="#3b82f6" />
          <Text style={styles.toggleText}>Bluetooth</Text>
        </View>
        <View style={styles.toggleRight}>
          {scanning && <ActivityIndicator size="small" color="#000" style={styles.loader} />}
          <Switch
            value={scanning}
            onValueChange={toggleScanning}
            trackColor={{ false: "#e4e4e7", true: "#000" }}
            thumbColor="#fff"
            ios_backgroundColor="#e4e4e7"
          />
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Decorative Center */}
      <View style={styles.centerGraphic}>
        <Ionicons name="phone-portrait-outline" size={64} color="#d4d4d8" />
        <Text style={styles.centerGraphicText}>Devices found</Text>
      </View>

      {/* Device List */}
      <FlatList
        data={sortedDevices}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !scanning ? (
            <Text style={styles.emptyText}>Toggle Bluetooth on to start scanning.</Text>
          ) : (
            <Text style={styles.emptyText}>Scanning for nearby devices...</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.deviceRow}>
            <View style={styles.deviceRowLeft}>
              <View style={styles.deviceIconWrap}>
                <MaterialCommunityIcons name="bike" size={20} color="#111" />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{item.name}</Text>
                <Text style={styles.deviceSubtitle}>Smart Bike Lock</Text>
              </View>
            </View>
            <Pressable style={styles.connectButton} onPress={() => handleConnect(item.id)}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { 
    flex: 1,
    backgroundColor: "#ffffff"
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
  toggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loader: {
    marginRight: 4,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 16,
  },
  errorText: { 
    color: "#b91c1c", 
    fontSize: 13 
  },
  centerGraphic: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    marginBottom: 40,
  },
  centerGraphicText: {
    marginTop: 12,
    fontSize: 14,
    color: "#71717a",
    fontWeight: "400",
  },
  list: { 
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#a1a1aa",
    fontSize: 14,
    marginTop: 20,
  },
  deviceRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f4f4f5",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  deviceRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  deviceIconWrap: {
    backgroundColor: "#f4f4f5",
    borderRadius: 40,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceInfo: {
    justifyContent: "center",
  },
  deviceName: { 
    fontWeight: "700", 
    fontSize: 15, 
    color: "#111",
    marginBottom: 2,
  },
  deviceSubtitle: { 
    fontSize: 12, 
    color: "#a1a1aa",
    fontWeight: "500",
  },
  connectButton: {
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});

