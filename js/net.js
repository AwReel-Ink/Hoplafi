// Connexions directes entre appareils (WebRTC) et découverte du réseau.
import { Room } from './signal.js';
import { Emitter, devParam, sleep } from './util.js';

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// ---------- Adresse IP publique (via STUN, sans serveur à nous) ----------

function expandV6(ip) {
  ip = ip.split('%')[0];
  if (ip.includes('.')) return null;
  const [head, tail] = ip.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined ? (tail ? tail.split(':') : []) : [];
  const fill = tail !== undefined ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array(Math.max(0, fill)).fill('0'), ...t];
  if (parts.length !== 8) return null;
  return parts.map((p) => p.padStart(4, '0').toLowerCase());
}

export function v6Prefix(ip) {
  const p = expandV6(ip);
  return p ? p.slice(0, 4).join(':') : null;
}

export function isPrivateIP(ip) {
  if (!ip) return false;
  if (ip.endsWith('.local')) return true;
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (m) {
    const a = +m[1], b = +m[2];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 169 && b === 254);
  }
  const p = expandV6(ip);
  if (!p) return false;
  const first = parseInt(p[0], 16);
  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || p.join(':') === '0000:0000:0000:0000:0000:0000:0000:0001';
}

// Renvoie toutes les adresses publiques vues : { v4: [adresses], v6: [préfixes /64] }.
// On attend IPv4 ET IPv6 : selon l'appareil, l'une ou l'autre peut manquer ou
// différer (opérateurs qui partagent les IPv4), et il suffit d'une en commun.
export async function getPublicIPs(timeout = 4500) {
  const dev = devParam('ip');
  if (dev) return { v4: dev.split(',').filter((x) => !x.includes(':')), v6: dev.split(',').filter((x) => x.includes(':')).map(v6Prefix) };
  const v4 = new Set(), v6 = new Set();
  let pc;
  try {
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  } catch (e) {
    return { v4: [], v6: [] };
  }
  pc.createDataChannel('ip');
  const done = new Promise((resolve) => {
    const timer = setTimeout(resolve, timeout);
    let grace = null;
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) { clearTimeout(timer); clearTimeout(grace); resolve(); return; }
      const c = ev.candidate.candidate || '';
      const type = (/ typ (\w+)/.exec(c) || [])[1];
      const ip = ev.candidate.address || c.split(' ')[4];
      if (!ip || ip.endsWith('.local') || isPrivateIP(ip)) return;
      if (ip.includes(':')) {
        // IPv6 publique : pas de traduction d'adresse, l'adresse de l'appareil suffit.
        const p = (type === 'srflx' || type === 'host') && v6Prefix(ip);
        if (p && !p.startsWith('0000')) v6.add(p);
      } else if (type === 'srflx') {
        v4.add(ip);
      }
      // Une fois une adresse trouvée, on laisse encore un peu de temps aux autres.
      if (!grace) grace = setTimeout(resolve, 1500);
    };
  });
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await done;
  } catch (e) { /* rien */ }
  pc.close();
  return { v4: [...v4].slice(0, 4), v6: [...v6].slice(0, 4) };
}

export function lanSecrets(ips) {
  return [...ips.v4.map((a) => 'lan4:' + a), ...ips.v6.map((p) => 'lan6:' + p)];
}

// ---------- Vérification « même réseau » ----------
// Une salle « réseau » se rejoint avec l'IP publique. Pour qu'un inconnu qui
// connaîtrait cette IP ne puisse pas apparaître dans la liste, on vérifie la
// connexion réellement établie : adresse locale, ou même IP publique que nous.

async function selectedRemote(pc) {
  const stats = await pc.getStats();
  const byId = new Map();
  let pairId = null;
  stats.forEach((r) => {
    byId.set(r.id, r);
    if (r.type === 'transport' && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
  });
  let pair = pairId ? byId.get(pairId) : null;
  if (!pair) {
    stats.forEach((r) => {
      if (r.type === 'candidate-pair' && (r.selected || (r.nominated && r.state === 'succeeded'))) pair = r;
    });
  }
  if (!pair) return null;
  const rc = byId.get(pair.remoteCandidateId);
  return rc ? { type: rc.candidateType, address: rc.address || rc.ip || '' } : null;
}

export async function isSameNetwork(pc, myIPs) {
  for (let i = 0; i < 5; i++) {
    const r = await selectedRemote(pc).catch(() => null);
    if (r) {
      if (r.type === 'host' || isPrivateIP(r.address)) return true;
      if (r.type === 'relay') return false;
      if (!r.address) return true; // adresse masquée par le navigateur : on ne bloque pas
      if (myIPs.v4.includes(r.address)) return true;
      const p = v6Prefix(r.address);
      if (p && myIPs.v6.includes(p)) return true;
      return false;
    }
    await sleep(300);
  }
  return true;
}

// ---------- Mesh : salles + connexions ----------

function waitIce(pc, ms = 2500) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); }
    });
  });
}

export function fingerprint(sdp) {
  const m = /a=fingerprint:\S+ ([0-9A-Fa-f:]+)/.exec(sdp || '');
  return m ? m[1].toUpperCase() : '';
}

export class Conn extends Emitter {
  constructor(mesh, remoteId, room, initiator) {
    super();
    this.mesh = mesh;
    this.remoteId = remoteId;
    this.room = room;
    this.kind = room.kind;
    this.secret = room.secret;
    this.initiator = initiator;
    this.open = false;
    this.closed = false;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === 'failed' || s === 'closed') this.close();
      if (s === 'disconnected') {
        clearTimeout(this.dcTimer);
        this.dcTimer = setTimeout(() => {
          if (this.pc.connectionState === 'disconnected') this.close();
        }, 6000);
      }
    };
    if (initiator) {
      this._bind(this.pc.createDataChannel('ctl', { ordered: true }));
      this._bind(this.pc.createDataChannel('data', { ordered: true }));
    } else {
      this.pc.ondatachannel = (ev) => this._bind(ev.channel);
    }
    this.timeout = setTimeout(() => { if (!this.open) this.close(); }, 25000);
  }

  _bind(ch) {
    ch.binaryType = 'arraybuffer';
    if (ch.label === 'ctl') this.ctl = ch;
    else if (ch.label === 'data') this.data = ch;
    else return;
    // Les messages arrivés avant que l'application écoute sont gardés de côté.
    const q = [];
    ch.onmessage = (ev) => q.push(ev.data);
    ch._queue = q;
    ch.onopen = () => this._checkOpen();
    ch.onclose = () => this.close();
    if (ch.readyState === 'open') this._checkOpen();
  }

  attach(onCtl, onData) {
    for (const [ch, fn] of [[this.ctl, onCtl], [this.data, onData]]) {
      ch.onmessage = (ev) => fn(ev.data);
      for (const d of ch._queue.splice(0)) fn(d);
    }
  }

  async _checkOpen() {
    if (this.open || this.closed) return;
    if (!this.ctl || !this.data || this.ctl.readyState !== 'open' || this.data.readyState !== 'open') return;
    this.open = true;
    clearTimeout(this.timeout);
    if (this.kind === 'lan') {
      const ok = await isSameNetwork(this.pc, this.mesh.myIPs);
      if (!ok) {
        console.warn('[hoplafi] connexion refusée : pas sur le même réseau');
        this.close();
        return;
      }
    }
    if (this.closed) return;
    this.mesh.emit('connection', this);
  }

  get localFingerprint() { return fingerprint(this.pc.localDescription?.sdp); }
  get remoteFingerprint() { return fingerprint(this.pc.remoteDescription?.sdp); }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timeout);
    clearTimeout(this.dcTimer);
    try { this.pc.close(); } catch (e) { /* rien */ }
    this.mesh._forget(this);
    this.emit('close');
  }
}

export class Mesh extends Emitter {
  constructor(selfId) {
    super();
    this.selfId = selfId;
    this.rooms = new Set();
    this.conns = new Map(); // remoteId -> Conn
    this.myIPs = { v4: [], v6: [] };
    this.lastHi = new Map();
  }

  join(secret, kind) {
    const room = new Room(this.selfId, secret, kind);
    this.rooms.add(room);
    room.on('message', (m) => this._signal(room, m).catch((e) => console.warn('[hoplafi] signal', e)));
    room.send({ t: 'hi' });
    room.hiTimer = setInterval(() => room.send({ t: 'hi' }), 12000);
    return room;
  }

  async leave(room) {
    if (!this.rooms.delete(room)) return;
    clearInterval(room.hiTimer);
    await room.leave();
  }

  async leaveAll() {
    await Promise.all([...this.rooms].map((r) => this.leave(r)));
    for (const c of [...this.conns.values()]) c.close();
  }

  _forget(conn) {
    if (this.conns.get(conn.remoteId) === conn) this.conns.delete(conn.remoteId);
  }

  async _signal(room, m) {
    const existing = this.conns.get(m.from);
    if (m.t === 'hi') {
      if (existing && !existing.closed) return;
      if (this.selfId > m.from) {
        await this._call(room, m.from);
      } else {
        const last = this.lastHi.get(room) || 0;
        if (Date.now() - last > 1500) {
          this.lastHi.set(room, Date.now());
          room.send({ t: 'hi' });
        }
      }
    } else if (m.t === 'offer' && m.sdp) {
      // L'autre appareil ne rappelle que s'il a perdu la connexion : on repart de zéro
      // au lieu d'attendre que la coupure soit détectée de notre côté.
      if (existing && !existing.closed) existing.close();
      const conn = new Conn(this, m.from, room, false);
      this.conns.set(m.from, conn);
      await conn.pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
      await conn.pc.setLocalDescription(await conn.pc.createAnswer());
      await waitIce(conn.pc);
      if (conn.closed) return;
      room.send({ t: 'answer', to: m.from, sdp: conn.pc.localDescription.sdp });
    } else if (m.t === 'answer' && m.sdp) {
      if (existing && existing.initiator && existing.pc.signalingState === 'have-local-offer') {
        await existing.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp });
      }
    } else if (m.t === 'bye') {
      if (existing && !existing.open) existing.close();
    }
  }

  async _call(room, remoteId) {
    const conn = new Conn(this, remoteId, room, true);
    this.conns.set(remoteId, conn);
    await conn.pc.setLocalDescription(await conn.pc.createOffer());
    await waitIce(conn.pc);
    if (conn.closed) return;
    room.send({ t: 'offer', to: remoteId, sdp: conn.pc.localDescription.sdp });
  }
}
