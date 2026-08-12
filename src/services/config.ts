import { load, type Store } from "@tauri-apps/plugin-store";

/**
 * Config persistence backed by tauri-plugin-store (config.json in the app
 * config dir). Hot-reloading the raw file from disk is a documented Phase-1
 * follow-up; for now all writes go through here so settings apply live.
 */

const STORE_FILE = "config.json";

let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { autoSave: true });
  }
  return storePromise;
}

export async function getConfig<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await (await getStore()).get<T>(key);
    return value === undefined || value === null ? fallback : value;
  } catch (err) {
    console.error(`[config] failed to read "${key}":`, err);
    return fallback;
  }
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  try {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
  } catch (err) {
    console.error(`[config] failed to persist "${key}":`, err);
  }
}
