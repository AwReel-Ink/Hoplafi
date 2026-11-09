// Salles de rendez-vous chiffrées, sur plusieurs relais MQTT publics à la fois.
// Un relais en panne ne bloque rien : chaque message part par tous les relais,
// et les doublons sont ignorés à l'arrivée.
import { MqttClient } from './mqtt.js';
import { Emitter, enc, dec, randomId, randomBytes, sha256, toHex, devParam } from './util.js';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

let clients = [];
let users = 0;

function brokers() {
  const dev = devParam('broker');
  return dev ? [dev] : BROKERS;
}

function acquire() {
  if (users++ === 0) clients = brokers().map((u) => new MqttClient(u));
  return clients;
}

function release() {
  if (--users <= 0) {
    users = 0;
    for (const c of clients) c.close();
    clients = [];
  }
}

export function relayStatus() {
  return { total: clients.length, up: clients.filter((c) => c.connected).length };
}

export class Room extends Emitter {
  // secret : chaîne connue des seuls membres de la salle (code secret, ou réseau).
  constructor(selfId, secret, kind) {
    super();
    this.selfId = selfId;
    this.secret = secret;
    this.kind = kind;
    this.seen = new Map();
    this.ready = this._init();
  }

  async _init() {
    const t = await sha256('hoplafi/topic/v1/' + this.secret);
    this.topic = 'hoplafi/v1/' + toHex(t).slice(0, 40);
    const k = await sha256('hoplafi/key/v1/' + this.secret);
    this.key = await crypto.subtle.importKey('raw', k, 'AES-GCM', false, ['encrypt', 'decrypt']);
    if (this.left) return;
    this.clients = acquire();
    for (const c of this.clients) c.subscribe(this.topic, (p) => this._receive(p));
  }

  async send(msg) {
    await this.ready;
    if (this.left) return;
    const body = enc.encode(JSON.stringify({ ...msg, id: randomId(8), from: this.selfId, ts: Date.now() }));
    const iv = randomBytes(12);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, body));
    const payload = new Uint8Array(12 + ct.length);
    payload.set(iv);
    payload.set(ct, 12);
    for (const c of this.clients) c.publish(this.topic, payload);
  }

  async _receive(payload) {
    if (this.left || payload.length < 29) return;
    let msg;
    try {
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: payload.subarray(0, 12) }, this.key, payload.subarray(12));
      msg = JSON.parse(dec.decode(pt));
    } catch (e) {
      return; // pas pour nous, ou altéré
    }
    if (!msg || msg.from === this.selfId || !msg.id) return;
    if (this.seen.has(msg.id)) return;
    const now = Date.now();
    this.seen.set(msg.id, now);
    if (this.seen.size > 500) {
      for (const [id, t] of this.seen) if (now - t > 120000) this.seen.delete(id);
    }
    if (Math.abs(now - (msg.ts || 0)) > 120000) return; // message trop ancien
    if (msg.to && msg.to !== this.selfId) return;
    this.emit('message', msg);
  }

  async leave() {
    if (this.left) return;
    try { await this.send({ t: 'bye' }); } catch (e) { /* rien */ }
    this.left = true;
    await this.ready.catch(() => {});
    if (this.clients) {
      for (const c of this.clients) c.unsubscribe(this.topic);
      release();
    }
  }
}
