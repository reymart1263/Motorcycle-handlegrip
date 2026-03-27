import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onBack: () => void;
  onSave: (name: string) => void;
};

export function FingerprintNamingScreen({ onBack, onSave }: Props) {
  const [nameDraft, setNameDraft] = useState("");

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Name Fingerprint</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Give this fingerprint a memorable name so you can manage it later.
        </Text>

        <TextInput
          placeholder="e.g. Right Thumb"
          placeholderTextColor="#a1a1aa"
          style={styles.input}
          value={nameDraft}
          onChangeText={setNameDraft}
          autoFocus={true}
        />
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={() => onSave(nameDraft)}>
          <Text style={styles.buttonText}>Save Fingerprint</Text>
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
    marginBottom: 32,
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
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    color: '#71717a',
    marginBottom: 24,
    lineHeight: 22,
  },
  input: {
    backgroundColor: "#f4f4f5",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
