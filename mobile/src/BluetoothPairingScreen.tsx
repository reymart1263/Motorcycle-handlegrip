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
} from "react-native";
import type { State as BleAdapterState } from "react-native-ble-plx";
import {
  ensureBlePermissions,
  getBleManager,
  getBluetoothState,
  ScannedBleDevice,
  startBleScan,
  stopBleScan,
} from "./ble";

type Props = {
  onBack: () => void;
  onNext: () => void;
};

export function BluetoothPairingScreen({ onBack, onNext }: Props) {
  const [adapterState, setAdapterState] = useState<BleAdapterState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<Map<string, ScannedBleDevice>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    const subscription = mgr.onStateChange((state: BleAdapterState) => {
      setAdapterState(state);
    }, true);
    return () => {
      subscription.remove();
    };
  }, [refreshAdapterState]);

  const sortedDevices = useMemo(() => {
    return Array.from(devices.values()).sort((a, b) => {
      const an = a.name ?? "";
      const bn = b.name ?? "";
      if (an && !bn) return -1;
      if (!an && bn) return 1;
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

  useEffect(() => {
    return () => {
      stopBleScan();
    };
  }, []);

  const btReady = adapterState === "PoweredOn";

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Bluetooth Pairing</Text>
      <Text style={styles.hint}>
        {Platform.OS === "ios"
          ? "Uses Bluetooth LE to discover nearby devices. Use a physical iPhone (simulator has no Bluetooth)."
          : "Uses Bluetooth LE to discover nearby devices. Turn Bluetooth on and grant permissions when asked."}
      </Text>

      {adapterState && (
        <Text style={styles.status}>
          Adapter: <Text style={styles.statusBold}>{adapterState}</Text>
        </Text>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.row}>
        {!scanning ? (
          <Pressable
            style={[styles.primary, !btReady && styles.disabled]}
            onPress={handleStartScan}
            disabled={!btReady}
          >
            <Text style={styles.primaryText}>Search for devices</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primary} onPress={handleStopScan}>
            <Text style={styles.primaryText}>Stop search</Text>
          </Pressable>
        )}
      </View>

      {scanning && (
        <View style={styles.scanningRow}>
          <ActivityIndicator />
          <Text style={styles.scanningText}>Scanning for BLE devices…</Text>
        </View>
      )}

      <Text style={styles.listTitle}>Nearby devices ({sortedDevices.length})</Text>
      <FlatList
        data={sortedDevices}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {scanning ? "Listening… move devices closer or wake them up." : "Tap Search to scan."}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.deviceRow, selectedId === item.id && styles.deviceRowSelected]}
            onPress={() => setSelectedId(item.id)}
          >
            <Text style={styles.deviceName}>{item.name ?? "(No name)"}</Text>
            <Text style={styles.deviceMeta}>
              {item.id} · RSSI {item.rssi ?? "—"}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        style={[styles.primary, (!selectedId || scanning) && styles.disabled]}
        onPress={() => {
          if (selectedId) onNext();
        }}
        disabled={!selectedId || scanning}
      >
        <Text style={styles.primaryText}>Continue with selected device</Text>
      </Pressable>

      <Pressable style={styles.ghost} onPress={onBack}>
        <Text style={styles.ghostText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  title: { fontSize: 22, fontWeight: "700", color: "#000" },
  hint: { fontSize: 13, color: "#666", marginBottom: 4 },
  status: { fontSize: 12, color: "#666" },
  statusBold: { fontWeight: "700", color: "#111" },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: "#b91c1c", fontSize: 13 },
  row: { marginTop: 4 },
  primary: {
    backgroundColor: "#000",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.45 },
  scanningRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scanningText: { fontSize: 13, color: "#444" },
  listTitle: { fontSize: 13, fontWeight: "600", color: "#333", marginTop: 8 },
  list: { maxHeight: 220 },
  empty: { color: "#999", fontSize: 13, paddingVertical: 12 },
  deviceRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fafafa",
  },
  deviceRowSelected: { borderColor: "#000", backgroundColor: "#f4f4f5" },
  deviceName: { fontWeight: "700", fontSize: 15, color: "#111" },
  deviceMeta: { fontSize: 11, color: "#666", marginTop: 4 },
  ghost: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ghostText: { color: "#111", fontWeight: "600", fontSize: 15 },
});
