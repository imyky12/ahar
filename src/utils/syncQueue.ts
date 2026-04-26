import AsyncStorage from "@react-native-async-storage/async-storage";

import { authClient } from "../services/authService";

const SYNC_QUEUE_KEY = "sync_queue";

export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

const readQueue = async (): Promise<SyncQueueItem[]> => {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as SyncQueueItem[];
  } catch {
    return [];
  }
};

const writeQueue = async (queue: SyncQueueItem[]): Promise<void> => {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
};

export const addToQueue = async (item: SyncQueueItem): Promise<void> => {
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
};

export const processQueue = async (): Promise<void> => {
  const queue = await readQueue();
  const nextQueue: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      await authClient.request({
        url: item.endpoint,
        method: item.method,
        data: item.body,
      });
    } catch {
      const retries = item.retryCount + 1;
      if (retries < 3) {
        nextQueue.push({ ...item, retryCount: retries });
      }
    }
  }

  await writeQueue(nextQueue);
};

export const getQueueLength = async (): Promise<number> => {
  const queue = await readQueue();
  return queue.length;
};
