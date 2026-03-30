import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onBack: () => void;
  onNext: (password: string) => void;
};

export function PasswordCreationScreen({ onBack, onNext }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleContinue = () => {
    if (password.length < 8) {
      Alert.alert("Weak password", "Please use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Passwords don't match", "Please make sure both passwords are the same.");
      return;
    }
    onNext(password);
  };

  const getRequirementStyle = (met: boolean) => ({
    color: met ? '#10b981' : '#a1a1aa', // Green if met, gray if not
  });

  const requirements = {
    length: password.length >= 8,
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    mixed: /[a-z]/.test(password) && /[A-Z]/.test(password),
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </Pressable>
          <Text style={styles.headerTitle}>Password Creation</Text>
        </View>

        <View style={styles.iconContainer}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="lock-outline" size={32} color="#000" />
          </View>
        </View>

        <Text style={styles.centerSubtitle}>Create a secure password for your account</Text>

        <View style={styles.form}>
          <Text style={styles.label}>NEW PASSWORD</Text>
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Enter password"
              placeholderTextColor="#a1a1aa"
              secureTextEntry={!isPasswordVisible}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
              <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#a1a1aa" />
            </Pressable>
          </View>

          <View style={styles.requirementsGrid}>
            <View style={styles.requirementItem}>
              <View style={[styles.dot, requirements.length && styles.dotMet]} />
              <Text style={[styles.requirementText, getRequirementStyle(requirements.length)]}>8+ characters</Text>
            </View>
            <View style={styles.requirementItem}>
              <View style={[styles.dot, requirements.numbers && styles.dotMet]} />
              <Text style={[styles.requirementText, getRequirementStyle(requirements.numbers)]}>Numbers</Text>
            </View>
            <View style={styles.requirementItem}>
              <View style={[styles.dot, requirements.symbols && styles.dotMet]} />
              <Text style={[styles.requirementText, getRequirementStyle(requirements.symbols)]}>Symbols (* or !)</Text>
            </View>
            <View style={styles.requirementItem}>
              <View style={[styles.dot, requirements.mixed && styles.dotMet]} />
              <Text style={[styles.requirementText, getRequirementStyle(requirements.mixed)]}>Upper & Lowercase</Text>
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 24 }]}>CONFIRM NEW PASSWORD</Text>
          <TextInput
            placeholder="Confirm password"
            placeholderTextColor="#a1a1aa"
            secureTextEntry={!isPasswordVisible}
            style={styles.inputField}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          style={[styles.button, (!password || password !== confirmPassword) && styles.buttonDisabled]} 
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  iconContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSubtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a1a1aa',
    marginBottom: 10,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: "#f4f4f5",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    paddingRight: 50,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  inputField: {
    backgroundColor: "#f4f4f5",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 16,
    color: "#111",
    fontWeight: "500",
  },
  eyeIcon: {
    position: 'absolute',
    right: 18,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a1a1aa',
    marginRight: 8,
  },
  dotMet: {
    backgroundColor: '#10b981',
  },
  requirementText: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '500',
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
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
