import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { User, FingerprintData } from './types';
import { listFingerprints, monitorFingerprintEvents, sendBleCommand } from './ble';

type Props = {
  user: User;
  fingerprints: FingerprintData[];
  deviceId: string | null;
  onAddFingerprint: () => void;
  onRemoveFingerprint: (id: string, slot: number) => void;
  onResetHardware: () => void;
  onSystemReset: () => void;
  onUpdateFingerprints?: (fingerprints: FingerprintData[]) => void;
  onUpdateUser?: (user: User) => void;
};

export function DashboardScreen({ user, fingerprints, deviceId, onAddFingerprint, onRemoveFingerprint, onResetHardware, onSystemReset, onUpdateFingerprints, onUpdateUser }: Props) {
  const [hwCount, setHwCount] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.name);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(user.email);
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleTrackLocation = async () => {
    setIsLocating(true);
    if (!deviceId) {
      Alert.alert('Not Connected', 'Motorcycle is not currently connected.');
      setIsLocating(false);
      return;
    }

    const success = await sendBleCommand(deviceId, { cmd: 'get_location' });
    if (!success) {
      Alert.alert('Error', 'Could not send command to motorcycle.');
      setIsLocating(false);
    }

    // Timeout if no response after 8 seconds
    setTimeout(() => {
      setIsLocating((prev) => {
        if (prev) {
          Alert.alert('Timeout', 'No response from GPS module. Check wiring or wait for satellite fix.');
          return false;
        }
        return prev;
      });
    }, 8000);
  };

  const handleEditSave = () => {
    if (isEditingName) {
      if (nameDraft.trim() && nameDraft !== user.name && onUpdateUser) {
        onUpdateUser({ ...user, name: nameDraft.trim() });
      }
      setIsEditingName(false);
    } else {
      setNameDraft(user.name);
      setIsEditingName(true);
    }
  };

  const handleEmailSave = () => {
    if (isEditingEmail) {
      if (emailDraft.trim() && emailDraft !== user.email && onUpdateUser) {
        onUpdateUser({ ...user, email: emailDraft.trim() });
      }
      setIsEditingEmail(false);
    } else {
      setEmailDraft(user.email);
      setIsEditingEmail(true);
    }
  };

  const handleSyncToHardware = async () => {
    if (!deviceId) {
      Alert.alert('Not Connected', 'Connect to your motorcycle via Bluetooth first.');
      return;
    }
    setIsSyncing(true);
    try {
      const nowEpoch = Math.floor(Date.now() / 1000);
      // We send a special command to sync time and email
      const success = await sendBleCommand(deviceId, { 
        cmd: 'sync_settings', 
        email: user.email,
        time: nowEpoch
      });
      
      if (success) {
        Alert.alert('Success', 'Settings & Time synced to motorcycle lock.');
      } else {
        Alert.alert('Error', 'Sync failed. Try moving closer to the bike.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!deviceId) return;

    // Listen for events from ZW101
    const subscription = monitorFingerprintEvents(deviceId, (event) => {
      if (event.event === 'count') {
        console.log('ZW101 Hardware Fingerprint Count:', event.total);
        setHwCount(event.total);
      } else if (event.event === 'clear_ok') {
        setHwCount(0);
        if (onUpdateFingerprints) onUpdateFingerprints([]);
      } else if (event.event === 'delete_ok') {
        setHwCount(prev => (prev && prev > 0) ? prev - 1 : 0);
      } else if (event.event === 'location') {
        setLocation({ lat: event.lat, lon: event.lon });
        setIsLocating(false);
      } else if (event.event === 'location_fail') {
        Alert.alert('GPS Status', event.reason || 'No GPS fix yet.');
        setIsLocating(false);
      }
    });

    // Request the count from the hardware
    listFingerprints(deviceId);

    return () => {
      subscription.remove();
    };
  }, [deviceId]);

  useEffect(() => {
    // Location will be checked manually through user interaction instead of automatically on load.
  }, []);

  const confirmDelete = (fp: FingerprintData) => {
    Alert.alert(
      "Remove Fingerprint",
      `Are you sure you want to remove "${fp.name}" from your device and the sensor?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: () => onRemoveFingerprint(fp.id, fp.slot) 
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Location Card */}
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locIconCircle}>
            <Ionicons name="compass" size={20} color="#71717a" />
          </View>
          <View>
            <Text style={styles.locLabel}>Current Location</Text>
            <Text style={styles.locCoords}>
              {isLocating ? 'Locating...' : 
               location ? `${location.lat.toFixed(4)}° N, ${location.lon.toFixed(4)}° W` : 
               'Unknown'}
            </Text>
          </View>
        </View>
        <Pressable 
          style={[styles.trackButton, isLocating && { opacity: 0.7 }]} 
          onPress={handleTrackLocation}
          disabled={isLocating}
        >
          <Text style={styles.trackButtonText}>
            {isLocating ? 'Updating...' : 'Track Location'}
          </Text>
        </Pressable>
      </View>

      {/* User Information */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>User Information</Text>
      </View>
      <View style={styles.userCard}>
        <View style={styles.userAvatarBox}>
          <Ionicons name="person-outline" size={28} color="#a1a1aa" />
        </View>
        <View style={styles.userInfoText}>
          <View style={styles.nameRow}>
            {isEditingName ? (
              <TextInput
                style={styles.nameInput}
                value={nameDraft}
                onChangeText={setNameDraft}
                autoFocus
                onSubmitEditing={handleEditSave}
                returnKeyType="done"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.userNameText}>{user.name}</Text>
            )}
            <Pressable style={styles.editIcon} onPress={handleEditSave} hitSlop={10}>
              <MaterialCommunityIcons name={isEditingName ? "check" : "pencil"} size={16} color={isEditingName ? "#10b981" : "#d4d4d8"} />
            </Pressable>
          </View>
          <View style={styles.nameRow}>
            {isEditingEmail ? (
              <TextInput
                style={styles.emailInput}
                value={emailDraft}
                onChangeText={setEmailDraft}
                autoFocus
                onSubmitEditing={handleEmailSave}
                returnKeyType="done"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.userEmailText}>{user.email || 'almorfe.paulo@gmail.com'}</Text>
            )}
            <Pressable style={styles.editIcon} onPress={handleEmailSave} hitSlop={10}>
              <MaterialCommunityIcons name={isEditingEmail ? "check" : "pencil"} size={14} color={isEditingEmail ? "#10b981" : "#d4d4d8"} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Hardware Sync Action */}
      <Pressable 
        style={[styles.syncButton, isSyncing && { opacity: 0.7 }]} 
        onPress={handleSyncToHardware}
        disabled={isSyncing}
      >
        <Ionicons name="sync" size={18} color="#71717a" />
        <Text style={styles.syncButtonText}>{isSyncing ? 'Syncing...' : 'Sync Time & Email to Bike'}</Text>
      </Pressable>

      {/* Fingerprint Access */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>Fingerprint Access</Text>
      </View>
      
      {fingerprints.map((fp, index) => (
        <View key={fp.id || index} style={styles.fpCard}>
          <View style={styles.fpAvatarBox}>
            <Ionicons name="person-outline" size={20} color="#a1a1aa" />
          </View>
          <View style={styles.userInfoText}>
            <Text style={styles.userNameText}>{fp.name}</Text>
            <Text style={styles.tapText}>TAP TO MANAGE ACCESS</Text>
          </View>
          <Pressable style={styles.fpEditIcon} onPress={() => confirmDelete(fp)}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
          </Pressable>
        </View>
      ))}

      {/* Add Fingerprint Button */}
      <Pressable style={styles.addFpButton} onPress={onAddFingerprint}>
        <MaterialCommunityIcons name="plus" size={20} color="#a1a1aa" />
        <Text style={styles.addFpText}>Add Fingerprint</Text>
      </Pressable>

      <View style={styles.divider} />

      {/* Reset Options */}
      <View style={styles.resetContainer}>
        <Pressable onPress={onResetHardware}>
          <Text style={styles.resetLink}>RESET FINGERPRINT MEMORY</Text>
        </Pressable>
        <Pressable onPress={onSystemReset}>
          <Text style={styles.systemResetLink}>SYSTEM RESET (TESTING ONLY)</Text>
        </Pressable>
      </View>

      {hwCount !== null && (
        <View style={styles.hwStatus}>
          <Text style={styles.hwStatusText}>Hardware Status: {hwCount} fingerprint(s) in ZW101</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  locationCard: {
    backgroundColor: '#f9f9fb',
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  locLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '600',
    marginBottom: 2,
  },
  locCoords: {
    fontSize: 14,
    color: '#18181b',
    fontWeight: '700',
  },
  trackButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#f4f4f5',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3f3f46',
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#18181b',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  userAvatarBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181b',
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#18181b',
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
    minWidth: 100,
  },
  editIcon: {
    marginLeft: 8,
  },
  userEmailText: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  emailInput: {
    fontSize: 13,
    color: '#18181b',
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d8',
    minWidth: 150,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 8,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717a',
  },
  fpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  fpAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tapText: {
    fontSize: 10,
    color: '#a1a1aa',
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  fpEditIcon: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoText: {
    flex: 1,
  },
  addFpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 18,
    paddingVertical: 18,
    marginTop: 12,
    gap: 8,
  },
  addFpText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#71717a',
  },
  divider: {
    height: 1,
    backgroundColor: '#f4f4f5',
    marginVertical: 40,
  },
  resetContainer: {
    alignItems: 'center',
    gap: 20,
  },
  resetLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a1a1aa',
    letterSpacing: 0.5,
  },
  systemResetLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e5e7eb',
    letterSpacing: 0.5,
  },
  hwStatus: {
    marginTop: 30,
    alignItems: 'center',
  },
  hwStatusText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontStyle: 'italic',
  }
});
