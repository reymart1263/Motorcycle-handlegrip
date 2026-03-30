import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { enrollFingerprint, monitorFingerprintEvents } from './ble';

type Props = {
  deviceId: string | null;
  onBack: () => void;
  onSkip: () => void;
  onRegister: () => void;
};

type EnrollmentStep = 'idle' | 'starting' | 'place_finger' | 'remove_finger' | 'step2' | 'success' | 'error';

export function FingerprintRegistrationScreen({ deviceId, onBack, onSkip, onRegister }: Props) {
  const [step, setStep] = useState<EnrollmentStep>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to begin');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (!deviceId || !isRegistering) return;

    const subscription = monitorFingerprintEvents(deviceId, (event) => {
      console.log('Fingerprint Event:', event);

      if (event.event === 'enroll_start') {
        setStep('place_finger');
        setStatusMessage('Place your finger on the sensor');
      } else if (event.event === 'place_finger') {
        setStep(event.step === 2 ? 'step2' : 'place_finger');
        setStatusMessage(event.step === 2 ? 'Place the same finger again' : 'Place your finger on the sensor');
      } else if (event.event === 'remove_finger') {
        setStep('remove_finger');
        setStatusMessage('Lift your finger');
      } else if (event.event === 'enroll_ok') {
        setStep('success');
        setStatusMessage('Registration successful!');
        setTimeout(() => {
          setIsRegistering(false);
          onRegister();
        }, 1500);
      } else if (event.event === 'enroll_fail') {
        setStep('error');
        setStatusMessage(`Failed: ${event.reason || 'Unknown error'}`);
        setIsRegistering(false);
        Alert.alert('Registration Failed', event.reason || 'Please try again.');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [deviceId, isRegistering]);

  const handleStart = async () => {
    if (!deviceId) {
      Alert.alert('Not Connected', 'Please connect to your device first.');
      return;
    }

    setIsRegistering(true);
    setStep('starting');
    setStatusMessage('Initializing enrollment...');

    // We'll use a dummy ID for now, or the app can manage this.
    // Based on App.tsx, the slot is fingerprints.length + 1
    const success = await enrollFingerprint(deviceId, 1); // For now using slot 1 as default for test
    if (!success) {
      setStep('error');
      setStatusMessage('Failed to send start command');
      setIsRegistering(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton} disabled={isRegistering}>
          <Ionicons name="arrow-back" size={24} color={isRegistering ? "#ccc" : "#111"} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Fingerprint</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, step === 'success' && styles.successCircle]}>
          {isRegistering && step !== 'success' && step !== 'error' ? (
            <ActivityIndicator size="large" color="#000" />
          ) : step === 'success' ? (
            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          ) : (
            <MaterialCommunityIcons name="fingerprint" size={64} color="#000" />
          )}
        </View>
        <Text style={styles.title}>
          {step === 'idle' ? 'Register Fingerprint' : 
           step === 'success' ? 'Perfect!' : 'Registration'}
        </Text>
        <Text style={[styles.subtitle, step === 'error' && { color: '#ef4444' }]}>
          {statusMessage}
        </Text>
        
        {step === 'idle' && (
          <Text style={styles.hint}>
            Place your finger firmly on the handlegrip sensor. Lift and repeat when instructed.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        {!isRegistering && step !== 'success' && (
          <Pressable style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>{step === 'idle' ? 'Start Registration' : 'Try Again'}</Text>
          </Pressable>
        )}
        
        {!isRegistering && (
          <Pressable style={styles.ghostButton} onPress={onSkip}>
            <Text style={styles.ghostButtonText}>Skip for now</Text>
          </Pressable>
        )}
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
  successCircle: {
    backgroundColor: '#ecfdf5',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3f3f46',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
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
