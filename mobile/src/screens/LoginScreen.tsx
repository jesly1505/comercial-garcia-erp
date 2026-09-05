import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { FontAwesome5 } from '@expo/vector-icons';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  // Cargar credencial recordada si existía (TICKET-058)
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedRemember = await AsyncStorage.getItem('remember_me');
        const savedEmail = await AsyncStorage.getItem('saved_email');
        if (savedRemember === 'true' && savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (e) {
        console.warn('Error loading saved credentials:', e);
      }
    };
    loadSavedCredentials();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos requeridos', 'Por favor ingrese usuario/correo y contraseña');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      
      // Guardar o limpiar preferencia de recordar usuario (TICKET-058)
      if (rememberMe) {
        await AsyncStorage.setItem('saved_email', email.trim());
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('remember_me');
      }

      await login(res.data.token, res.data.user);
    } catch (error: any) {
      Alert.alert('Error de acceso', error.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.card}>
          
          {/* LOGO */}
          <View style={styles.logoContainer}>
            <FontAwesome5 name="crown" size={32} color="#c59b6d" style={styles.crownIcon} />
            <View style={styles.logoTextBigContainer}>
              <Text style={styles.letterG}>G</Text>
              <Text style={styles.letterR}>R</Text>
            </View>
            <Text style={styles.comercialText}>COMERCIAL</Text>
            <Text style={styles.garciaText}>GARCÍA REYES S.A.</Text>
            <View style={styles.goldLine} />
          </View>

          <Text style={styles.title}>Iniciar Sesión</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Usuario / Correo</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingrese su usuario o correo"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Ingrese su contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
              <FontAwesome5 name="lock" size={14} color="#9ca3af" style={styles.lockIcon} />
            </View>
          </View>

          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <FontAwesome5 name="check" size={10} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Recordar usuario</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Acceder al Sistema</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  crownIcon: {
    marginBottom: -10,
    zIndex: 2,
  },
  logoTextBigContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterG: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#0b1930',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    zIndex: 1,
  },
  letterR: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#c59b6d',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    marginLeft: -15,
    zIndex: 0,
  },
  comercialText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0b1930',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    letterSpacing: 1,
    marginTop: 5,
  },
  garciaText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0b1930',
    fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif',
    letterSpacing: 1,
  },
  goldLine: {
    width: '80%',
    height: 1,
    backgroundColor: '#c59b6d',
    marginTop: 15,
    opacity: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0b1930',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#0b1930',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    paddingRight: 40,
  },
  lockIcon: {
    position: 'absolute',
    right: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0b1930',
    borderColor: '#0b1930',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#475569',
  },
  button: {
    backgroundColor: '#0b1930',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
