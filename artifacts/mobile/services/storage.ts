/**
 * services/storage.ts
 * Typed AsyncStorage wrapper — single source of truth for all local persistence.
 * All app data lives under one key to reduce read/write operations.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = '@unsnwooze_data';

export const storageService = {
  async load<T>(defaultValue: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...defaultValue, ...parsed };
    } catch {
      return defaultValue;
    }
  },

  async save(data: unknown): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[storage] save failed:', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[storage] clear failed:', e);
    }
  },
};
