// Réglages (localStorage) et dossier de réception (IndexedDB).
import { randomId, devParam } from './util.js';
import { randomName } from './names.js';

const KEY = 'hoplafi.settings.v1';

const DEFAULTS = {
  autoOffMinutes: 15,
  recreateDirs: true,
  perDevice: true,
  askEachTime: false,
};

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
}

export const settings = { ...DEFAULTS, ...load() };
if (!settings.deviceId) settings.deviceId = randomId(12);
if (!settings.name) settings.name = randomName();
save();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* navigation privée */ }
}

export function update(patch) {
  Object.assign(settings, patch);
  save();
}

// ---------- Dossier de réception ----------

export const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window && !devParam('nofs');

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('hoplafi', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function kv(mode, fn) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', mode);
    const req = fn(tx.objectStore('kv'));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

let folder = null;

export async function loadFolder() {
  if (!canPickFolder) return null;
  try { folder = (await kv('readonly', (s) => s.get('folder'))) || null; } catch (e) { folder = null; }
  return folder;
}

export function currentFolder() { return folder; }

export async function pickFolder() {
  const h = await window.showDirectoryPicker({ id: 'hoplafi-reception', mode: 'readwrite', startIn: 'downloads' });
  folder = h;
  try { await kv('readwrite', (s) => s.put(h, 'folder')); } catch (e) { /* rien */ }
  return h;
}

export async function forgetFolder() {
  folder = null;
  try { await kv('readwrite', (s) => s.delete('folder')); } catch (e) { /* rien */ }
}

// 'granted' | 'prompt' | 'denied' | 'none'
export async function folderPermission() {
  if (!folder) return 'none';
  try { return await folder.queryPermission({ mode: 'readwrite' }); } catch (e) { return 'denied'; }
}

// À appeler pendant un clic de l'utilisateur.
export async function ensureFolderPermission() {
  if (!folder) return false;
  try {
    if ((await folder.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return (await folder.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch (e) {
    return false;
  }
}
