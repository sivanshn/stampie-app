import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

/**
 * Token storage that works on native AND web.
 * - Native: expo-secure-store (verschlüsselt im Gerät).
 * - Web (Vorschau): localStorage — SecureStore hat keine Web-Implementierung.
 */
export const tokenStore = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
      } catch {
        return null
      }
    }
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      /* ignore */
    }
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
      return
    }
    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      /* ignore */
    }
  },
}
