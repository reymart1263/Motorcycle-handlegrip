import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { monitorFingerprintVerification } from './ble';

type Props = {
  deviceId: string | null;
  onBack: () => void;
  onVerified: () => void;
};

export function VerificationScreen({ deviceId, onBack, onVerified }: Props) {
  useEffect(() => {
    if (!deviceId) return;

    // Start listening to the ESP32 fingerprint characteristic
    const subscription = monitorFingerprintVerification(deviceId, () => {
      onVerified();
    });

    return () => {
      subscription.remove();
    };
  }, [deviceId, onVerified]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Verification</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="finger-print" size={56} color="#d4d4d8" />
        </View>
        <Text style={styles.title}>Verify Identity</Text>
        <Text style={styles.subtitle}>
          Place your registered finger on the sensor to access the homepage.
        </Text>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#111" />
        <Text style={styles.footerText}>Waiting for ZW101 sensor...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 8,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: -80,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
    gap: 12,
  },
  footerText: {
    fontSize: 15,
    color: '#71717a',
    fontWeight: '500',
  },
});
