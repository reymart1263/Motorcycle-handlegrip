import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onNext: () => void;
};

export function SetupScreen({ onNext }: Props) {
  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.title}>Connect</Text>
        <Text style={styles.subtitle}>Secure your ride, your way.</Text>
      </View>

      {/* Center Graphic */}
      <View style={styles.graphicContainer}>
        <View style={styles.outerRing}>
          <View style={styles.innerCircle}>
            <MaterialCommunityIcons name="shield-outline" size={64} color="#000" />
          </View>
        </View>

        {/* Top Left Badge */}
        <View style={[styles.badge, styles.badgeTopLeft]}>
          <Ionicons name="wifi" size={24} color="#000" />
        </View>

        {/* Bottom Right Badge */}
        <View style={[styles.badge, styles.badgeBottomRight]}>
          <MaterialCommunityIcons name="motorbike" size={28} color="#000" />
        </View>
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomSection}>
        <Text style={styles.bottomText}>Connect your device and complete the set up</Text>
        <Pressable style={styles.button} onPress={onNext}>
          <Text style={styles.buttonText}>Connect</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  graphicContainer: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  badgeTopLeft: {
    top: 25,
    left: 20,
  },
  badgeBottomRight: {
    bottom: 25,
    right: 20,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
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
});
