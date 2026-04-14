import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FingerprintData } from './types';
import { sendBleCommand, monitorFingerprintEvents } from './ble';

type Props = {
  deviceId: string | null;
  fingerprints: FingerprintData[];
  onBack: () => void;
};

type LogEntry = {
  id: string;
  timestamp: number;
  slot: number;
  status: number; // 1 = OK, 0 = FAILED, 2 = ARCHIVED
  name: string;
  dateStr: string;
  timeStr: string;
};

export function AccessLogScreen({ deviceId, fingerprints, onBack }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLog = () => {
    if (!deviceId) return;
    setLoading(true);
    sendBleCommand(deviceId, { cmd: 'get_log' });
  };

  const clearLog = () => {
    Alert.alert(
      "Clear Access Log",
      "Are you sure you want to completely erase the hardware access history?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear", 
          style: "destructive", 
          onPress: () => {
            if (deviceId) {
              setLoading(true);
              sendBleCommand(deviceId, { cmd: 'clear_log' });
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (!deviceId) return;

    const sub = monitorFingerprintEvents(deviceId, (event) => {
      if (event.event === 'access_log') {
        try {
          const rawData = event.data || "";
          
          if (!rawData) {
            setLogs([]);
            setLoading(false);
            return;
          }

          const entriesStr = rawData.split(';').filter((e: string) => e.trim().length > 0);
          const parsedLogs: LogEntry[] = entriesStr.map((entryStr: string, index: number) => {
            const parts = entryStr.split(',');
            if (parts.length === 3) {
              const epoch = parseInt(parts[0], 10);
              const slot = parseInt(parts[1], 10);
              const status = parseInt(parts[2], 10);
              
              const date = new Date(epoch * 1000);
              const isInvalidTime = epoch < 10000; // E.g., time not synced yet on ESP32

              // Find associated name
              let name = "Unknown Fingerprint (Deleted/Unregistered)";
              if (slot === -1) {
                name = "Unrecognized Attempt";
              } else {
                const fp = fingerprints.find(f => f.slot === slot);
                if (fp) name = fp.name;
              }

              return {
                id: `${epoch}-${index}`,
                timestamp: epoch,
                slot,
                status,
                name,
                dateStr: isInvalidTime ? "Date Unknown" : date.toLocaleDateString(),
                timeStr: isInvalidTime ? "Time Unknown (Connect Phone to Sync)" : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              };
            }
            return null;
          }).filter(Boolean);

          setLogs(parsedLogs);
        } catch (e) {
          console.error("Error parsing logs", e);
        }
        setLoading(false);
      } else if (event.event === 'log_cleared') {
        setLogs([]);
        setLoading(false);
        Alert.alert("Success", "Access log cleared.");
      }
    });

    fetchLog();

    return () => sub.remove();
  }, [deviceId, fingerprints]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#18181b" />
        </Pressable>
        <Text style={styles.headerTitle}>Access Log</Text>
        <Pressable onPress={fetchLog} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#18181b" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111" />
          <Text style={styles.loadingText}>Downloading history from motorcycle...</Text>
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="document-text-outline" size={48} color="#d4d4d8" />
          </View>
          <Text style={styles.emptyTitle}>No Access History</Text>
          <Text style={styles.emptySub}>Recent unlocks and rejected attempts will appear here automatically.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {logs.map((log) => {
              const isOk = log.status === 1;
              const isArchived = log.status === 2; // Archived Rejection
              const isFail = log.status === 0;

              return (
                <View key={log.id} style={styles.logCard}>
                  <View style={[styles.iconBox, 
                    isOk ? styles.iconOk : 
                    isFail ? styles.iconFail : 
                    styles.iconArchived
                  ]}>
                    <Ionicons 
                      name={isOk ? "checkmark-circle" : isFail ? "warning" : "archive"} 
                      size={20} 
                      color={isOk ? "#10b981" : isFail ? "#ef4444" : "#f59e0b"} 
                    />
                  </View>
                  <View style={styles.logBody}>
                    <Text style={styles.logName} numberOfLines={1}>{log.name}</Text>
                    <Text style={styles.logAction}>
                      {isOk ? "Successfully Unlocked" : isFail ? "Access Denied (Mismatch)" : "Access Denied (Archived/Disabled)"}
                    </Text>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color="#a1a1aa" />
                      <Text style={styles.timeText}>{log.dateStr} at {log.timeStr}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable style={styles.clearButton} onPress={clearLog}>
               <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
               <Text style={styles.clearText}>Clear History Log</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5'
  },
  backButton: { marginRight: 16, padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#18181b' },
  refreshButton: { padding: 4 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, marginTop: -40 },
  loadingText: { marginTop: 16, fontSize: 14, color: '#71717a' },
  emptyIconBox: { width: 90, height: 90, borderRadius: 30, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#18181b', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', lineHeight: 20 },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 12 },
  logCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9fb', padding: 16, borderRadius: 20 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  iconOk: { backgroundColor: '#ecfdf5' },
  iconFail: { backgroundColor: '#fef2f2' },
  iconArchived: { backgroundColor: '#fffbeb' },
  logBody: { flex: 1 },
  logName: { fontSize: 16, fontWeight: '700', color: '#18181b', marginBottom: 2 },
  logAction: { fontSize: 13, fontWeight: '600', color: '#71717a', marginBottom: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: '#a1a1aa', fontWeight: '500' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f4f4f5', alignItems: 'center' },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#fef2f2' },
  clearText: { fontSize: 13, fontWeight: '700', color: '#ef4444' }
});
