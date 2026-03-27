import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { monitorFingerprintVerification } from './ble';

type Props = {
  deviceId: string | null;
  onBack: () => void;
  onSkip: () => void;
  onRegister: () => void;
};

export function FingerprintRegistrationScreen({ deviceId, onBack, onSkip, onRegister }: Props) {

  // For real registration, we would send a 'start registration' command to the ESP32 here,
  // then listen for the success notification. For now, since "Simulate Registration"
  // was the default behavior, we provide a clean button for it.
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Fingerprint</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="fingerprint" size={64} color="#000" />
        </View>
        <Text style={styles.title}>Register Fingerprint</Text>
        <Text style={styles.subtitle}>
          Place your finger firmly on the handlegrip sensor. Lift and repeat when instructed.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={onRegister}>
          <Text style={styles.buttonText}>Simulate Registration</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={onSkip}>
          <Text style={styles.ghostButtonText}>Skip for now</Text>
        </Pressable>
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
    paddingHorizontal: 20,
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
    marginTop: -40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  button: {
    backgroundColor: '#000',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ghostButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  ghostButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
});
