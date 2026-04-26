import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

class OfflineManager {
  public isOnline = true;

  private listeners = new Set<(isOnline: boolean) => void>();
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;

    NetInfo.addEventListener((state: NetInfoState) => {
      const next = Boolean(
        state.isConnected && state.isInternetReachable !== false,
      );
      this.isOnline = next;
      this.listeners.forEach((listener) => listener(next));
    });
  }

  subscribe(cb: (isOnline: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.isOnline);

    return () => {
      this.listeners.delete(cb);
    };
  }

  async withFallback<T>(
    onlineAction: () => Promise<T>,
    offlineAction: () => T | Promise<T>,
  ): Promise<T> {
    if (!this.isOnline) {
      return offlineAction();
    }

    try {
      return await onlineAction();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const networkError =
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("internet");

      if (networkError) {
        return offlineAction();
      }

      throw error;
    }
  }
}

export const offlineManager = new OfflineManager();
