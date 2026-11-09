// Transferts de fichiers : envoi en continu, écriture directe sur le disque,
// reprise après coupure.
import { Emitter, safeName, sleep } from './util.js';

const HEADER = 8;               // 4 octets transfert, 2 octets fichier, 2 octets « époque »
const HIGH_WATER = 8 * 1024 * 1024;
const LOW_WATER = 2 * 1024 * 1024;
const PAUSE_ABOVE = 48 * 1024 * 1024; // écriture disque en retard : on demande une pause
const RESUME_BELOW = 8 * 1024 * 1024;
const OFFER_BATCH = 400;
const MAX_FILES = 65535;

function chunkSize(pc) {
  const max = pc && pc.sctp && pc.sctp.maxMessageSize;
  const size = Math.min(Number.isFinite(max) && max > 0 ? max : 65536, 256 * 1024);
  return Math.max(16 * 1024, size) - HEADER;
}

function newTid() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] || 1;
}

function waitDrain(ch) {
  if (ch.bufferedAmount <= HIGH_WATER || ch.readyState !== 'open') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      ch.removeEventListener('bufferedamountlow', done);
      ch.removeEventListener('close', done);
      resolve();
    };
    ch.addEventListener('bufferedamountlow', done);
    ch.addEventListener('close', done);
  });
}

class Speed {
  constructor() { this.samples = []; }
  add(bytes) {
    const now = performance.now();
    this.samples.push([now, bytes]);
    while (this.samples.length > 2 && now - this.samples[0][0] > 4000) this.samples.shift();
  }
  get value() {
    const s = this.samples;
    if (s.length < 2) return 0;
    const [t0, b0] = s[0], [t1, b1] = s[s.length - 1];
    return t1 > t0 ? ((b1 - b0) * 1000) / (t1 - t0) : 0;
  }
  reset() { this.samples = []; }
}

// ---------- Destinations d'écriture ----------

async function uniqueFile(dir, name) {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  for (let n = 0; n < 1000; n++) {
    const candidate = n === 0 ? name : `${base} (${n})${ext}`;
    try {
      await dir.getFileHandle(candidate);
    } catch (e) {
      if (e && e.name === 'NotFoundError') return dir.getFileHandle(candidate, { create: true });
      if (e && e.name === 'TypeMismatchError') continue; // un dossier porte ce nom
      throw e;
    }
  }
  throw new Error('Impossible de trouver un nom libre');
}

async function folderSink(root, segments, name) {
  let dir = root;
  const shown = [root.name];
  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(seg, { create: true });
    shown.push(seg);
  }
  const fh = await uniqueFile(dir, name);
  const w = await fh.createWritable({ keepExistingData: false });
  shown.push(fh.name);
  return {
    where: shown.join('/'),
    write: (u8) => w.write(u8),
    close: () => w.close(),
    abort: () => w.abort().catch(() => {}),
  };
}

function memorySink(name, type, onReady) {
  let parts = [];
  let blobs = [];
  let size = 0;
  return {
    where: 'Téléchargements',
    write: (u8) => {
      parts.push(u8);
      size += u8.byteLength;
      if (size > 32 * 1024 * 1024) { // on range régulièrement en Blob (moins de mémoire vive)
        blobs.push(new Blob(parts));
        parts = [];
        size = 0;
      }
    },
    close: () => {
      const blob = new Blob([...blobs, ...parts], { type: type || 'application/octet-stream' });
      parts = []; blobs = [];
      onReady(blob, name);
    },
    abort: () => { parts = []; blobs = []; },
  };
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  return url;
}

// ---------- Gestionnaire ----------

export class Transfers extends Emitter {
  constructor() {
    super();
    this.peers = new Map();     // deviceId -> Peer
    this.out = new Map();       // tid -> envoi
    this.inc = new Map();       // deviceId:tid -> réception
    this.pendingFiles = new Map();
    this.prefs = () => ({ recreateDirs: true, perDevice: true });
  }

  // ----- appareils -----

  attach(peer) {
    const id = peer.id;
    this.peers.set(id, peer);
    peer.on('msg', (m) => this._msg(peer, m));
    peer.on('chunk', (d) => this._chunk(peer, d));
    peer.data.bufferedAmountLowThreshold = LOW_WATER;
    // Reprise automatique de ce qui avait été coupé
    for (const t of this.out.values()) {
      if (t.deviceId === id && t.state === 'interrupted') this._offer(t, true);
    }
  }

  detach(peer) {
    const id = peer.id;
    if (this.peers.get(id) !== peer) return;
    this.peers.delete(id);
    for (const t of this.out.values()) {
      if (t.deviceId === id && (t.state === 'sending' || t.state === 'waiting' || t.state === 'resuming')) {
        t.state = 'interrupted';
        t.gen++;
        t.speed.reset();
      }
    }
    for (const t of this.inc.values()) {
      if (t.deviceId === id) {
        if (t.state === 'receiving') { t.state = 'interrupted'; t.speed.reset(); }
        else if (t.state === 'asking') t.state = 'gone';
      }
    }
    this._changed();
  }

  // ----- envoi -----

  send(deviceId, entries) {
    const peer = this.peers.get(deviceId);
    if (!peer || !entries.length) return null;
    entries = entries.slice(0, MAX_FILES);
    const t = {
      dir: 'out',
      tid: newTid(),
      key: 'o' + Date.now() + Math.random(),
      deviceId,
      peerName: peer.name,
      files: entries.map((e) => ({
        file: e.file,
        name: e.file.name,
        path: e.path || e.file.name,
        size: e.file.size,
        type: e.file.type,
        lm: e.file.lastModified,
      })),
      total: entries.reduce((s, e) => s + e.file.size, 0),
      acked: entries.map(() => 0),
      state: 'waiting',
      gen: 0,
      epoch: 0,
      speed: new Speed(),
      created: Date.now(),
    };
    this.out.set(t.tid, t);
    this._offer(t, false);
    this._changed();
    return t;
  }

  _offer(t, resume) {
    const peer = this.peers.get(t.deviceId);
    if (!peer) { t.state = 'interrupted'; this._changed(); return; }
    t.epoch = (t.epoch + 1) & 0xffff;
    t.state = resume ? 'resuming' : 'waiting';
    for (let i = 0; i < t.files.length; i += OFFER_BATCH) {
      peer.send({
        t: 'offer-files', tid: t.tid,
        files: t.files.slice(i, i + OFFER_BATCH).map((f) => ({ name: f.name, path: f.path, size: f.size, type: f.type, lm: f.lm })),
      });
    }
    peer.send({ t: 'offer', tid: t.tid, count: t.files.length, total: t.total, epoch: t.epoch, resume });
    this._changed();
  }

  pause(t) {
    if (t.dir !== 'out' || t.state !== 'sending') return;
    t.state = 'paused';
    t.gen++;
    t.speed.reset();
    this.peers.get(t.deviceId)?.send({ t: 'paused', tid: t.tid });
    this._changed();
  }

  resume(t) {
    if (t.dir === 'out' && (t.state === 'paused' || t.state === 'interrupted')) {
      if (this.peers.has(t.deviceId)) this._offer(t, true);
      else { t.state = 'interrupted'; t.waitingFor = true; this._changed(); }
    }
  }

  async _run(t, offsets, gen) {
    const peer = this.peers.get(t.deviceId);
    if (!peer) return;
    const ch = peer.data;
    const size = chunkSize(peer.conn.pc);
    t.state = 'sending';
    t.everAccepted = true;
    this._changed();
    const head = new DataView(new ArrayBuffer(HEADER));
    for (let i = 0; i < t.files.length; i++) {
      const f = t.files[i];
      let off = Math.min(Math.max(0, offsets[i] || 0), f.size);
      let next = off < f.size ? f.file.slice(off, Math.min(f.size, off + size)).arrayBuffer() : null;
      while (off < f.size) {
        if (t.gen !== gen || ch.readyState !== 'open') return;
        while (t.remotePaused && t.gen === gen && ch.readyState === 'open') await sleep(100);
        await waitDrain(ch);
        if (t.gen !== gen || ch.readyState !== 'open') return;
        let buf;
        try {
          buf = await next;
        } catch (e) {
          t.state = 'error';
          t.error = 'Impossible de lire « ' + f.name + ' ». Le fichier a peut-être été déplacé.';
          peer.send({ t: 'cancel', tid: t.tid });
          this._changed();
          return;
        }
        const end = off + buf.byteLength;
        next = end < f.size ? f.file.slice(end, Math.min(f.size, end + size)).arrayBuffer() : null;
        const frame = new Uint8Array(HEADER + buf.byteLength);
        head.setUint32(0, t.tid);
        head.setUint16(4, i);
        head.setUint16(6, t.epoch);
        frame.set(new Uint8Array(head.buffer), 0);
        frame.set(new Uint8Array(buf), HEADER);
        try {
          ch.send(frame);
        } catch (e) {
          return; // canal fermé : la coupure sera traitée par detach()
        }
        off = end;
      }
    }
  }

  // ----- réception -----

  accept(t, root) {
    if (t.dir !== 'in' || t.state !== 'asking') return;
    t.root = root || null;
    this._startReceiving(t, t.files.map(() => 0));
  }

  reject(t) {
    if (t.dir !== 'in' || t.state !== 'asking') return;
    t.state = 'rejected';
    this.peers.get(t.deviceId)?.send({ t: 'reject', tid: t.tid });
    this._changed();
  }

  _startReceiving(t, offsets) {
    const peer = this.peers.get(t.deviceId);
    if (!peer) { t.state = 'gone'; this._changed(); return; }
    t.state = 'receiving';
    t.received = offsets.slice();
    t.written = offsets.slice();
    t.speed.reset();
    peer.send({ t: 'accept', tid: t.tid, offsets, epoch: t.epoch });
    // Fichiers vides : rien ne sera envoyé, on les crée tout de suite.
    t.files.forEach((f, i) => {
      if (f.size === 0 && !t.finished[i]) this._queue(t, async () => { await this._sink(t, i); await this._finish(t, i); });
    });
    clearInterval(t.ackTimer);
    t.ackTimer = setInterval(() => this._ack(t), 250);
    this._changed();
  }

  _ack(t) {
    if (t.state !== 'receiving') { clearInterval(t.ackTimer); return; }
    const peer = this.peers.get(t.deviceId);
    const done = t.written.reduce((a, b) => a + b, 0);
    if (peer && t.lastAck !== done) {
      t.lastAck = done;
      peer.send({ t: 'ack', tid: t.tid, bytes: t.written });
    }
  }

  _queue(t, fn) {
    t.chain = (t.chain || Promise.resolve()).then(fn).catch((e) => this._fail(t, e));
    return t.chain;
  }

  async _sink(t, i) {
    if (t.sinks[i]) return t.sinks[i];
    const f = t.files[i];
    const prefs = this.prefs();
    if (t.root) {
      const segs = [];
      if (prefs.perDevice) segs.push(safeName(t.peerName, 'Appareil'));
      const parts = String(f.path || f.name).split('/').map((p) => safeName(p));
      const name = parts.pop() || safeName(f.name);
      if (prefs.recreateDirs) segs.push(...parts);
      t.sinks[i] = await folderSink(t.root, segs, name);
    } else {
      const name = safeName(f.name);
      t.sinks[i] = memorySink(name, f.type, (blob) => {
        f.blob = blob;
        f.url = downloadBlob(blob, name);
        this._changed();
      });
    }
    f.where = t.sinks[i].where;
    return t.sinks[i];
  }

  async _finish(t, i) {
    if (t.finished[i]) return;
    t.finished[i] = true;
    await t.sinks[i].close();
    t.sinks[i] = null;
    if (t.finished.every(Boolean)) {
      t.state = 'done';
      clearInterval(t.ackTimer);
      const peer = this.peers.get(t.deviceId);
      peer?.send({ t: 'ack', tid: t.tid, bytes: t.written });
      peer?.send({ t: 'done', tid: t.tid });
      this.emit('received', t);
    }
    this._changed();
  }

  _fail(t, e) {
    console.error('[hoplafi] réception', e);
    if (t.state === 'cancelled' || t.state === 'error') return;
    t.state = 'error';
    t.error = e && e.name === 'NotAllowedError'
      ? "Accès au dossier refusé. Choisissez de nouveau le dossier de réception."
      : "Erreur d'écriture : " + (e && e.message ? e.message : 'inconnue');
    clearInterval(t.ackTimer);
    for (const s of t.sinks) s && s.abort();
    this.peers.get(t.deviceId)?.send({ t: 'cancel', tid: t.tid });
    this._changed();
  }

  _chunk(peer, buf) {
    if (!(buf instanceof ArrayBuffer) || buf.byteLength <= HEADER) return;
    const dv = new DataView(buf, 0, HEADER);
    const t = this.inc.get(peer.id + ':' + dv.getUint32(0));
    if (!t || t.state !== 'receiving' || dv.getUint16(6) !== t.epoch) return;
    const i = dv.getUint16(4);
    const f = t.files[i];
    if (!f || t.finished[i]) return;
    const data = new Uint8Array(buf, HEADER);
    const len = data.byteLength;
    if (t.received[i] + len > f.size) {
      this._fail(t, new Error('données en trop pour ' + f.name));
      return;
    }
    t.received[i] += len;
    t.pending += len;
    t.speed.add(t.received.reduce((a, b) => a + b, 0));
    if (t.pending > PAUSE_ABOVE && !t.flowPaused) {
      t.flowPaused = true;
      peer.send({ t: 'flow', tid: t.tid, pause: true });
    }
    this._queue(t, async () => {
      if (t.state !== 'receiving' && t.state !== 'interrupted') return;
      const sink = await this._sink(t, i);
      await sink.write(data);
      t.written[i] += len;
      t.pending -= len;
      if (t.flowPaused && t.pending < RESUME_BELOW) {
        t.flowPaused = false;
        this.peers.get(t.deviceId)?.send({ t: 'flow', tid: t.tid, pause: false });
      }
      if (t.written[i] === f.size) await this._finish(t, i);
    });
    this._tick();
  }

  // ----- messages -----

  async _msg(peer, m) {
    const tid = m.tid >>> 0;
    if (m.t === 'offer-files') {
      if (!peer.trusted || !Array.isArray(m.files)) return;
      const key = peer.id + ':' + tid;
      const list = this.pendingFiles.get(key) || [];
      for (const f of m.files) {
        if (list.length >= MAX_FILES) break;
        list.push({
          name: String(f.name || 'fichier').slice(0, 255),
          path: String(f.path || f.name || 'fichier').slice(0, 1024),
          size: Math.max(0, Math.floor(Number(f.size) || 0)),
          type: String(f.type || '').slice(0, 100),
          lm: Number(f.lm) || 0,
        });
      }
      this.pendingFiles.set(key, list);
      return;
    }
    if (m.t === 'offer') {
      if (!peer.trusted) return;
      const key = peer.id + ':' + tid;
      const files = this.pendingFiles.get(key) || [];
      this.pendingFiles.delete(key);
      const epoch = (m.epoch >>> 0) & 0xffff;
      const existing = this.inc.get(key);
      if (m.resume && existing && ['interrupted', 'receiving', 'paused'].includes(existing.state) &&
          existing.files.length === files.length) {
        // Reprise : on attend la fin des écritures en cours, puis on donne où on en est.
        existing.state = 'interrupted';
        existing.epoch = epoch;
        await existing.chain;
        if (existing.state === 'error' || existing.state === 'cancelled') return;
        this._startReceiving(existing, existing.written.slice());
        return;
      }
      if (existing && existing.state === 'asking') return;
      const t = {
        dir: 'in',
        tid,
        key,
        deviceId: peer.id,
        peerName: peer.name,
        files,
        total: files.reduce((s, f) => s + f.size, 0),
        received: files.map(() => 0),
        written: files.map(() => 0),
        finished: files.map(() => false),
        sinks: files.map(() => null),
        pending: 0,
        epoch,
        state: 'asking',
        speed: new Speed(),
        created: Date.now(),
      };
      this.inc.set(key, t);
      this._changed();
      this.emit('request', t);
      return;
    }
    const out = this.out.get(tid);
    if (out && out.deviceId === peer.id) {
      if (m.t === 'accept' && (out.state === 'waiting' || out.state === 'resuming')) {
        if ((m.epoch & 0xffff) !== out.epoch) return;
        const offsets = Array.isArray(m.offsets) ? m.offsets.map((x) => Math.max(0, Number(x) || 0)) : [];
        out.acked = out.files.map((f, i) => Math.min(f.size, offsets[i] || 0));
        out.remotePaused = false;
        out.speed.reset();
        out.gen++;
        this._run(out, offsets, out.gen);
      } else if (m.t === 'reject') {
        out.state = 'rejected';
        out.gen++;
      } else if (m.t === 'ack' && Array.isArray(m.bytes)) {
        out.acked = out.files.map((f, i) => Math.min(f.size, Math.max(0, Number(m.bytes[i]) || 0)));
        out.speed.add(out.acked.reduce((a, b) => a + b, 0));
        this._tick();
        return;
      } else if (m.t === 'done') {
        out.state = 'done';
        out.acked = out.files.map((f) => f.size);
        out.gen++;
        for (const f of out.files) f.file = null; // libère la mémoire
      } else if (m.t === 'flow') {
        out.remotePaused = !!m.pause;
        return;
      } else if (m.t === 'cancel') {
        out.state = 'cancelled';
        out.gen++;
      }
      this._changed();
      return;
    }
    const inc = this.inc.get(peer.id + ':' + tid);
    if (inc) {
      if (m.t === 'cancel') {
        this._cancelIn(inc, false);
      } else if (m.t === 'paused' && inc.state === 'receiving') {
        inc.state = 'paused';
        inc.speed.reset();
        this._changed();
      }
    }
  }

  cancel(t) {
    if (t.dir === 'out') {
      if (['done', 'cancelled', 'rejected'].includes(t.state)) return;
      t.state = 'cancelled';
      t.gen++;
      this.peers.get(t.deviceId)?.send({ t: 'cancel', tid: t.tid });
      for (const f of t.files) f.file = null;
      this._changed();
    } else {
      this._cancelIn(t, true);
    }
  }

  _cancelIn(t, notify) {
    if (['done', 'cancelled', 'rejected'].includes(t.state)) return;
    t.state = 'cancelled';
    clearInterval(t.ackTimer);
    for (const s of t.sinks) s && s.abort();
    if (notify) this.peers.get(t.deviceId)?.send({ t: 'cancel', tid: t.tid });
    this._changed();
  }

  remove(t) {
    if (t.dir === 'out') this.out.delete(t.tid);
    else this.inc.delete(t.key);
    if (t.files) for (const f of t.files) if (f.url) setTimeout(() => URL.revokeObjectURL(f.url), 1000);
    this._changed();
  }

  // ----- état pour l'interface -----

  list() {
    return [...this.inc.values(), ...this.out.values()].sort((a, b) => b.created - a.created);
  }

  progress(t) {
    const done = t.dir === 'out' ? t.acked.reduce((a, b) => a + b, 0) : t.written.reduce((a, b) => a + b, 0);
    return { done, total: t.total, ratio: t.total ? done / t.total : 1, speed: t.speed.value };
  }

  active() {
    return this.list().some((t) => ['sending', 'receiving', 'waiting', 'resuming', 'asking'].includes(t.state));
  }

  _tick() {
    if (this._tickPending) return;
    this._tickPending = true;
    setTimeout(() => {
      this._tickPending = false;
      this.emit('progress');
    }, 150);
  }

  _changed() { this.emit('change'); }
}
