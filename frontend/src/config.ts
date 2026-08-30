import { Capacitor } from '@capacitor/core';

let BASE_URL = import.meta.env.VITE_API_URL || 'https://stock-smart-mz2p.onrender.com/api';

// For local development overrides if necessary
if (import.meta.env.DEV && !Capacitor.isNativePlatform()) {
  BASE_URL = 'http://localhost:3001/api';
}

export const API_BASE_URL = BASE_URL;
