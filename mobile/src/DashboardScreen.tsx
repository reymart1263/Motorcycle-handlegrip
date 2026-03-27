import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, FingerprintData } from './types';

type Props = {
  user: User;
  fingerprints: FingerprintData[];
  onAddFingerprint: () => void;
  onResetApp: () => void;
};

export function DashboardScreen({ user, fingerprints, onAddFingerprint, onResetApp }: Props) {
  return (
    <View style={styles.container}>
      {/* Header Profile Area */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.userName}>{user.name}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-outline" size={20} color="#71717a" />
            <Text style={styles.cardTitle}>Email Address</Text>
          </View>
          <Text style={styles.cardValue}>
            {user.email || 'No email registered'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="finger-print-outline" size={20} color="#71717a" />
            <Text style={styles.cardTitle}>Registered Fingerprints</Text>
          </View>
          <Text style={styles.cardValue}>
            {fingerprints.length} active
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={onAddFingerprint}>
          <Ionicons name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Add Fingerprint</Text>
        </Pressable>
        <Pressable style={styles.ghostButton} onPress={onResetApp}>
          <Text style={styles.ghostButtonText}>Reset App</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // Slightly grey background to make cards pop
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: 15,
    color: '#71717a',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f9fafb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '600',
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 16,
    color: '#111',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    backgroundColor: '#f9fafb',
    gap: 12,
  },
  button: {
    backgroundColor: '#000',
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ghostButtonText: {
    color: '#dc2626', // Red color for reset action
    fontSize: 16,
    fontWeight: '600',
  },
});
