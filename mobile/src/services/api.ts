import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// URL configurable con fallback adaptativo por plataforma (TICKET-053)
const DEFAULT_DEV_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:3000/api' 
  : 'http://localhost:3000/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_DEV_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // 10 segundos timeout para evitar cuelgues de red (TICKET-055)
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (config.headers) {
    config.headers['Bypass-Tunnel-Reminder'] = 'true';
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
