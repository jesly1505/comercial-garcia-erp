import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// En el emulador Android de localhost es 10.0.2.2. En iOS es localhost.
// URL Pública fija a través de tu computadora encendida
const BASE_URL = 'https://comercial-garcia-api.loca.lt/api';

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (config.headers) {
    config.headers['Bypass-Tunnel-Reminder'] = 'true'; // Necesario para Localtunnel
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
