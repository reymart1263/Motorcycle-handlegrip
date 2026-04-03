import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { User, FingerprintData } from './types';
import { listFingerprints, monitorFingerprintEvents } from './ble';

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
  const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleTrackLocation = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to track your motorcycle.');
        setIsLocating(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ 
        lat: loc.coords.latitude, 
        lon: loc.coords.longitude 
      });
    } catch (error) {
      console.warn(error);
      Alert.alert('Error', 'Could not fetch current location.');
    } finally {
      setIsLocating(false);
    }
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
      }
    });

    // Request the count from the hardware
    listFingerprints(deviceId);

    return () => {
      subscription.remove();
    };
  }, [deviceId]);

  useEffect(() => {
    handleTrackLocation();
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
      {/* Map Section */}
      <View style={styles.mapCard}>
        <MapView
          key={location ? `${location.lat}-${location.lon}` : 'initial'}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location ? location.lat : 14.5995,
            longitude: location ? location.lon : 120.9842,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          {location && (
            <Marker
              coordinate={{ latitude: location.lat, longitude: location.lon }}
              title="My Motorcycle"
              description="Last detected location"
            >
              <View style={styles.markerContainer}>
                <Ionicons name="location" size={32} color="#000" />
              </View>
            </Marker>
          )}
        </MapView>
        
        <View style={styles.mapOverlay}>
          <Pressable 
            style={[styles.smallTrackButton, isLocating && { opacity: 0.7 }]} 
            onPress={handleTrackLocation}
            disabled={isLocating}
          >
            <Ionicons 
              name={isLocating ? "refresh" : "locate"} 
              size={20} 
              color="#000" 
            />
            <Text style={styles.smallTrackText}>
              {isLocating ? 'Scanning...' : 'Track'}
            </Text>
          </Pressable>
        </View>
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
          <Text style={styles.userEmailText}>{user.email || 'almorfe.paulo@gmail.com'}</Text>
        </View>
      </View>

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
  mapCard: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: '#f4f4f5',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  markerContainer: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 6,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#000',
  },
  smallTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    gap: 8,
  },
  smallTrackText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
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
    marginTop: 4,
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
