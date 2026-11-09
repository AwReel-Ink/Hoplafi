// Client MQTT 3.1.1 minimal, sur WebSocket (QoS 0 uniquement).
// Sert seulement à échanger les quelques Ko nécessaires pour établir la connexion
// directe entre appareils. Les fichiers ne passent jamais par là.
import { enc, dec, randomId } from './util.js';

function encodeLength(n) {
  const out = [];
  do {
    let b = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    out.push(b);
  } while (n > 0);
  return out;
}

function str(s) {
  const b = enc.encode(s);
  return [b.length >> 8, b.length & 0xff, ...b];
}

function packet(type, body) {
  const head = [type, ...encodeLength(body.length)];
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}

export class MqttClient {
  constructor(url) {
    this.url = url;
    this.subs = new Map(); // topic -> callback
    this.ws = null;
    this.connected = false;
    this.closed = false;
    this.buf = new Uint8Array(0);
    this.pid = 1;
    this.queue = [];
    this.retry = 0;
    this._open();
  }

  _open() {
    if (this.closed) return;
    let ws;
    try {
      ws = new WebSocket(this.url, ['mqtt']);
    } catch (e) {
      this._scheduleReconnect();
      return;
    }
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => {
      const body = [
        ...str('MQTT'), 4, 0x02, 0, 60,
        ...str('hoplafi-' + randomId(6)),
      ];
      ws.send(packet(0x10, body));
    };
    ws.onmessage = (ev) => this._data(new Uint8Array(ev.data));
    ws.onclose = () => {
      this.connected = false;
      clearInterval(this.ping);
      if (!this.closed) this._scheduleReconnect();
    };
    ws.onerror = () => { try { ws.close(); } catch (e) { /* rien */ } };
  }

  _scheduleReconnect() {
    const delay = Math.min(30000, 1000 * 2 ** this.retry++);
    this.reconnectTimer = setTimeout(() => this._open(), delay);
  }

  _data(chunk) {
    const merged = new Uint8Array(this.buf.length + chunk.length);
    merged.set(this.buf);
    merged.set(chunk, this.buf.length);
    this.buf = merged;
    for (;;) {
      if (this.buf.length < 2) return;
      let mult = 1, len = 0, i = 1, b;
      do {
        if (i >= this.buf.length) return;
        b = this.buf[i++];
        len += (b & 0x7f) * mult;
        mult *= 128;
      } while (b & 0x80);
      if (this.buf.length < i + len) return;
      const type = this.buf[0];
      const body = this.buf.subarray(i, i + len);
      this.buf = this.buf.slice(i + len);
      this._packet(type, body);
    }
  }

  _packet(type, body) {
    const kind = type >> 4;
    if (kind === 2) { // CONNACK
      if (body[1] !== 0) { this.ws.close(); return; }
      this.connected = true;
      this.retry = 0;
      this.ping = setInterval(() => this._send(new Uint8Array([0xc0, 0])), 25000);
      for (const topic of this.subs.keys()) this._subscribe(topic);
      const q = this.queue;
      this.queue = [];
      for (const p of q) this._send(p);
    } else if (kind === 3) { // PUBLISH
      const qos = (type >> 1) & 3;
      const tlen = (body[0] << 8) | body[1];
      const topic = dec.decode(body.subarray(2, 2 + tlen));
      const start = 2 + tlen + (qos > 0 ? 2 : 0);
      const cb = this.subs.get(topic);
      if (cb) cb(body.slice(start));
    }
  }

  _send(bytes) {
    if (this.connected && this.ws && this.ws.readyState === 1) {
      this.ws.send(bytes);
      return true;
    }
    return false;
  }

  _subscribe(topic) {
    const id = this.pid++ & 0xffff || 1;
    this._send(packet(0x82, [id >> 8, id & 0xff, ...str(topic), 0]));
  }

  subscribe(topic, cb) {
    this.subs.set(topic, cb);
    if (this.connected) this._subscribe(topic);
  }

  unsubscribe(topic) {
    if (!this.subs.delete(topic)) return;
    const id = this.pid++ & 0xffff || 1;
    this._send(packet(0xa2, [id >> 8, id & 0xff, ...str(topic)]));
  }

  publish(topic, payload) {
    const body = new Uint8Array([...str(topic), ...payload]);
    const p = packet(0x30, body);
    if (!this._send(p)) {
      this.queue.push(p);
      if (this.queue.length > 50) this.queue.shift();
    }
  }

  close() {
    this.closed = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.ping);
    if (this.ws) {
      try {
        if (this.connected) this.ws.send(new Uint8Array([0xe0, 0]));
        this.ws.close();
      } catch (e) { /* rien */ }
    }
  }
}
