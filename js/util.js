// Petits outils partagés par toute l'application.

export const enc = new TextEncoder();
export const dec = new TextDecoder();

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function randomBytes(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomId(nBytes = 8) {
  return toHex(randomBytes(nBytes));
}

// Entier aléatoire uniforme dans [0, max) sans biais (tirage avec rejet).
export function randomInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export async function sha256(data) {
  const bytes = typeof data === 'string' ? enc.encode(data) : data;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function unb64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Mini émetteur d'événements.
export class Emitter {
  constructor() { this._h = new Map(); }
  on(type, fn) {
    if (!this._h.has(type)) this._h.set(type, new Set());
    this._h.get(type).add(fn);
    return () => this._h.get(type)?.delete(fn);
  }
  emit(type, ...args) {
    const set = this._h.get(type);
    if (!set) return;
    for (const fn of [...set]) {
      try { fn(...args); } catch (e) { console.error('[hoplafi]', type, e); }
    }
  }
}

// Formats français : 1,9 Go, 48 Mo/s, 2 min 05 s.
export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) n = 0;
  const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
  let i = 0;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  const digits = i === 0 || n >= 100 ? 0 : n >= 10 ? 1 : 1;
  return n.toLocaleString('fr-FR', { maximumFractionDigits: digits }) + ' ' + units[i];
}

export function formatSpeed(bytesPerSec) {
  return formatBytes(bytesPerSec) + '/s';
}

export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '';
  sec = Math.round(sec);
  if (sec < 60) return sec + ' s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return m + ' min ' + String(s).padStart(2, '0') + ' s';
  const h = Math.floor(m / 60);
  return h + ' h ' + String(m % 60).padStart(2, '0') + ' min';
}

export function formatClock(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Création d'éléments DOM : el('div', {class: 'x', onclick: fn}, enfant1, 'texte', ...)
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v; // uniquement pour du SVG interne à l'application
      else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const $ = (sel, root = document) => root.querySelector(sel);

// Nettoie un nom de fichier ou de dossier reçu d'un autre appareil.
export function safeName(name, fallback = 'fichier') {
  let n = String(name || '')
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_')
    .replace(/^[.\s]+/, '')
    .replace(/[.\s]+$/, '')
    .slice(0, 200);
  if (!n || n === '.' || n === '..') n = fallback;
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(n)) n = '_' + n;
  return n;
}

export function detectDevice() {
  const ua = navigator.userAgent;
  let kind = 'desktop';
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPad|Tablet/i.test(ua) || touchMac || (/Android/i.test(ua) && !/Mobile/i.test(ua))) kind = 'tablet';
  else if (/Mobi|iPhone|Android/i.test(ua)) kind = 'phone';
  let browser = 'Navigateur';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';
  else if (/Firefox\/|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS/.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  return { kind, browser };
}

export const KIND_LABEL = { phone: 'Téléphone', tablet: 'Tablette', desktop: 'Ordinateur' };

// Paramètres de test, acceptés seulement quand l'application tourne en local.
export function devParam(name) {
  const h = location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1') return null;
  return new URLSearchParams(location.search).get(name);
}
