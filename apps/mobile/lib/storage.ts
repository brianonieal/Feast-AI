// @version 0.2.0 - Conduit: Clerk token cache using expo-secure-store
import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";

export const tokenCache: TokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Secure store not available (e.g., web)
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Secure store not available
    }
  },
};
