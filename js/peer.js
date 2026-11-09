// Un appareil connecté : présentation (« hello ») puis messages de contrôle.
import { Emitter } from './util.js';

const KINDS = new Set(['phone', 'tablet', 'desktop']);

export class Peer extends Emitter {
  constructor(conn, me) {
    super();
    this.conn = conn;
    this.via = conn.kind; // 'lan' ou 'code'
    this.trusted = conn.kind === 'lan';
    this.info = null;
    this.me = me;
  }

  // À appeler une fois les écouteurs branchés : les messages déjà arrivés sont alors traités.
  start() {
    this.conn.on('close', () => this.emit('close'));
    this.conn.attach((d) => this._ctl(d), (d) => this.emit('chunk', d));
    this.send({ t: 'hello', v: 1, ...this.me });
    if (this.conn.closed) this.emit('close');
  }

  _ctl(d) {
    let m;
    try { m = JSON.parse(d); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') {
      const first = !this.info;
      this.info = {
        deviceId: String(m.deviceId || '').slice(0, 64),
        name: String(m.name || 'Appareil').slice(0, 40),
        kind: KINDS.has(m.kind) ? m.kind : 'desktop',
        browser: String(m.browser || '').slice(0, 30),
      };
      this.emit(first ? 'ready' : 'update');
      return;
    }
    if (this.info) this.emit('msg', m);
  }

  send(obj) {
    try {
      if (this.conn.ctl && this.conn.ctl.readyState === 'open') {
        this.conn.ctl.send(JSON.stringify(obj));
        return true;
      }
    } catch (e) { /* canal fermé */ }
    return false;
  }

  get data() { return this.conn.data; }
  get id() { return this.info ? this.info.deviceId : null; }
  get name() { return this.info ? this.info.name : 'Appareil'; }
  get open() { return !this.conn.closed; }
  close() { this.conn.close(); }
}
