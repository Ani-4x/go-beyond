import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Storage adapter for the Supabase session, for use on native platforms only.
 *
 * A Supabase session (access token + refresh token) is usually a few hundred bytes to a
 * couple of kilobytes, which can exceed SecureStore's per-item size limit. So the session
 * itself lives in AsyncStorage, encrypted with a small AES key that lives in SecureStore's
 * hardware-backed storage. Losing the key (e.g. app data cleared) just means signing in
 * again, never a crash.
 */
class LargeSecureStore {
  private async encryptionKey(name: string): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(name);
    if (existing) return aesjs.utils.hex.toBytes(existing);
    const key = Crypto.getRandomBytes(32);
    await SecureStore.setItemAsync(name, aesjs.utils.hex.fromBytes(key));
    return key;
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    try {
      const secretKey = await this.encryptionKey(`${key}_key`);
      const cipher = new aesjs.ModeOfOperation.ctr(secretKey, new aesjs.Counter(1));
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(encrypted)));
    } catch {
      // Key and ciphertext are out of sync (e.g. reinstalled keychain). Start fresh.
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const secretKey = await this.encryptionKey(`${key}_key`);
    const cipher = new aesjs.ModeOfOperation.ctr(secretKey, new aesjs.Counter(1));
    const encrypted = aesjs.utils.hex.fromBytes(cipher.encrypt(aesjs.utils.utf8.toBytes(value)));
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(`${key}_key`).catch(() => {});
  }
}

export const largeSecureStore = new LargeSecureStore();
