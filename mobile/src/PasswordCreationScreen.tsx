import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onBack: () => void;
  onNext: (password: string) => void;
};

export function PasswordCreationScreen({ onBack, onNext }: Props) {
  const [passwordDraft, setPasswordDraft] = useState("");

  const handleContinue = () => {
    if (passwordDraft.length < 8) {
      Alert.alert("Weak password", "Please use at least 8 characters.");
      return;
    }
    onNext(passwordDraft);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Password Creation</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Create a strong password to secure your Smart Bike Lock profile.
        </Text>

        <TextInput
          placeholder="Enter a strong password"
          placeholderTextColor="#a1a1aa"
          secureTextEntry
          style={styles.input}
          value={passwordDraft}
          onChangeText={setPasswordDraft}
          autoFocus={true}
        />
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
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
