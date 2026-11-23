// Hoplàfi ! — interface et orchestration.
import {
  $, el, randomId, formatBytes, formatSpeed, formatDuration, formatClock, detectDevice, KIND_LABEL,
} from './util.js';
import { Mesh, getPublicIPs, lanSecrets } from './net.js';
import { relayStatus } from './signal.js';
import { Peer } from './peer.js';
import { Transfers } from './transfer.js';
import {
  settings, update, canPickFolder, loadFolder, currentFolder, pickFolder, folderPermission,
  ensureFolderPermission,
} from './store.js';
import { randomName, nameCount } from './names.js';
import { ALPHABET, CODE_LENGTH, CODE_LIFETIME, newCode, formatCode, cleanCode, verificationSymbols } from './code.js';
import { symbolHTML } from './symbols.js';
import { qrSVG } from './qr.js';

// Numéro de version : le seul endroit à modifier à chaque mise à jour.
// Il s'affiche en bas de la page et renouvelle le cache de l'application.
export const VERSION = '4';

// ---------- Icônes ----------
const I = {
  power: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/></svg>',
  clock: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  pencil: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  desktop: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/></svg>',
  tablet: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M11 18h2"/></svg>',
  phone: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/></svg>',
  eyeOff: '<svg aria-hidden="true" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.5"/><path d="M6.6 6.6C4.1 8.3 3 12 3 12s4 6 9 6a9 9 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  lock: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  back: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  close: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  erase: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7z"/><path d="M12 9l6 6M18 9l-6 6"/></svg>',
  file: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>',
  folder: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>',
  pause: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>',
  resume: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/></svg>',
};
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstChild; };
const icon = (k) => html(I[k]);

// ---------- État ----------
const device = detectDevice();
const isMobile = device.kind !== 'desktop';
const transfers = new Transfers();
transfers.prefs = () => ({ recreateDirs: settings.recreateDirs, perDevice: settings.perDevice });

const state = {
  on: false,
  session: 0,
  onSince: 0,
  lastActivity: Date.now(),
  autoOffHappened: false,
  noNetwork: false,
  ipsReady: false,
  mesh: null,
  lanRooms: new Map(),        // secret -> { room, misses }
  peers: new Map(),           // deviceId -> Peer (affichés)
  verifying: new Map(),       // Peer -> { symbols, localOk, remoteOk, code }
  code: null,                 // fenêtre du code secret
  installPrompt: null,
  folderPerm: 'none',
  sendTarget: null,
};

const me = () => ({ deviceId: settings.deviceId, name: settings.name, kind: device.kind, browser: device.browser });

// ---------- Messages courts ----------
function toast(text, ms = 3500) {
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const t = el('div', { class: 'toast', role: 'status' }, text);
  box.append(t);
  setTimeout(() => t.remove(), ms);
}

// ---------- ON / OFF ----------
async function setOn(on, auto = false) {
  if (on === state.on) return;
  state.session++;
  const session = state.session;
  state.on = on;
  if (on) {
    state.autoOffHappened = false;
    state.onSince = Date.now();
    state.lastActivity = Date.now();
    state.noNetwork = false;
    state.ipsReady = false;
    const mesh = new Mesh(randomId(8));
    state.mesh = mesh;
    mesh.on('connection', onConnection);
    render();
    await syncNetwork();
    if (session !== state.session) return;
    state.ipsReady = true;
    render();
  } else {
    state.autoOffHappened = auto;
    closeCodeDialog();
    closeOverlay();
    const mesh = state.mesh;
    state.mesh = null;
    state.lanRooms.clear();
    for (const p of [...state.peers.values()]) transfers.detach(p);
    state.peers.clear();
    state.verifying.clear();
    if (mesh) await mesh.leaveAll();
    render();
  }
}

// Détecte le réseau et rejoint les « salles » correspondantes. Relancé
// régulièrement : l'adresse change quand la box redémarre, quand un téléphone
// passe de la 4G au Wi-Fi, ou quand l'ordinateur sort de veille.
let syncing = false;
async function syncNetwork() {
  if (!state.on || syncing) return;
  syncing = true;
  const session = state.session;
  const mesh = state.mesh;
  try {
    const ips = await getPublicIPs();
    if (session !== state.session || !mesh) return;
    const secrets = lanSecrets(ips);
    if (!secrets.length) {
      // Détection ratée (coupure passagère ?) : on garde les salles actuelles.
      if (!state.lanRooms.size) state.noNetwork = true;
      return;
    }
    state.noNetwork = false;
    mesh.myIPs = {
      v4: [...new Set([...ips.v4, ...mesh.myIPs.v4])].slice(0, 8),
      v6: [...new Set([...ips.v6, ...mesh.myIPs.v6])].slice(0, 8),
    };
    for (const s of secrets) {
      const cur = state.lanRooms.get(s);
      if (cur) cur.misses = 0;
      else state.lanRooms.set(s, { room: mesh.join(s, 'lan'), misses: 0 });
    }
    for (const [s, cur] of [...state.lanRooms]) {
      if (secrets.includes(s)) continue;
      if (++cur.misses >= 2) { // adresse disparue deux fois de suite : on quitte cette salle
        state.lanRooms.delete(s);
        mesh.leave(cur.room);
      }
    }
  } finally {
    syncing = false;
  }
}

function diagText() {
  const m = state.mesh ? state.mesh.myIPs : { v4: [], v6: [] };
  const r = relayStatus();
  return `Diagnostic : ${device.browser} · IPv4 ${m.v4.length ? 'détectée' : 'non détectée'} · IPv6 ${m.v6.length ? 'détectée' : 'non détectée'} · relais ${r.up}/${r.total}`;
}

let lastSync = Date.now();
function resync(force) {
  if (!state.on || !state.ipsReady) return;
  if (Date.now() - lastSync < (force ? 8000 : 60000)) return;
  lastSync = Date.now();
  syncNetwork().then(render);
}
setInterval(() => resync(false), 5000);
window.addEventListener('online', () => resync(true));
if (navigator.connection && navigator.connection.addEventListener) {
  navigator.connection.addEventListener('change', () => resync(true));
}

// ---------- Connexions ----------
function onConnection(conn) {
  const peer = new Peer(conn, me());
  peer.on('ready', async () => {
    if (peer.id === settings.deviceId) { peer.close(); return; } // un autre onglet de cet appareil
    if (peer.via === 'code') {
      const code = conn.secret.replace(/^code:/, '');
      const symbols = await verificationSymbols(conn.localFingerprint, conn.remoteFingerprint, code);
      state.verifying.set(peer, { symbols, localOk: false, remoteOk: false });
      openVerify(peer);
    } else {
      addPeer(peer);
    }
  });
  peer.on('update', () => { render(); });
  peer.on('msg', (m) => {
    if (m.t !== 'verify') return;
    const v = state.verifying.get(peer);
    if (!v) return;
    if (!m.ok) {
      state.verifying.delete(peer);
      toast(peer.name + ' a refusé la connexion.');
      closeVerify(peer);
      peer.close();
      return;
    }
    v.remoteOk = true;
    checkVerified(peer);
  });
  peer.on('close', () => {
    if (state.verifying.has(peer)) { state.verifying.delete(peer); closeVerify(peer); }
    removePeer(peer);
  });
  peer.start();
}

function addPeer(peer) {
  const old = state.peers.get(peer.id);
  if (old && old !== peer) {
    transfers.detach(old);
    state.peers.delete(peer.id);
    old.close();
  }
  state.peers.set(peer.id, peer);
  transfers.attach(peer);
  render();
}

function removePeer(peer) {
  if (state.peers.get(peer.id) !== peer) return;
  state.peers.delete(peer.id);
  transfers.detach(peer);
  render();
}

function checkVerified(peer) {
  const v = state.verifying.get(peer);
  if (!v || !v.localOk || !v.remoteOk) return;
  state.verifying.delete(peer);
  peer.trusted = true;
  closeCodeDialog();
  closeVerify(peer);
  addPeer(peer);
  toast(peer.name + ' est connecté. Vous pouvez échanger des fichiers.');
}

// ---------- Rendu principal ----------
function render() {
  document.body.classList.toggle('is-off', !state.on);
  const tg = $('#toggle');
  tg.setAttribute('aria-pressed', String(state.on));
  tg.setAttribute('aria-label', state.on ? 'Visibilité : ON, toucher pour passer sur OFF' : 'Visibilité : OFF, toucher pour passer sur ON');
  tg.replaceChildren(document.createTextNode(state.on ? 'ON' : 'OFF'), el('span', { class: 'knob' }, icon('power')));

  $('#me').replaceChildren(
    el('span', { class: 'lbl' }, 'Vous apparaissez comme'),
    el('span', { class: 'nm' }, settings.name, el('button', { type: 'button', onclick: openRename }, 'Renommer')),
  );

  const main = $('#main');
  if (!state.on) {
    main.replaceChildren(renderOff());
    $('#side').replaceChildren(renderSettings());
    renderTimer();
    updateTab();
    return;
  }
  main.replaceChildren(...[
    renderStatus(),
    renderIdentity(),
    renderBanner(),
    renderDevices(),
    renderTransfers(),
  ].filter(Boolean));
  $('#side').replaceChildren(renderSettings());
  renderTimer();
  updateTab();
}

function renderOff() {
  return el('div', { class: 'off' },
    el('div', { class: 'eye' }, icon('eyeOff')),
    el('h1', null, 'Vous êtes invisible'),
    el('p', null, "Aucun appareil ne vous voit et personne ne peut vous envoyer de fichiers. L'application n'échange plus rien avec le réseau."),
    el('button', { type: 'button', class: 'btn go big', onclick: () => setOn(true) }, icon('power'), 'Passer sur ON'),
    state.autoOffHappened ? el('div', { class: 'card stack' },
      el('b', null, 'Passé sur OFF automatiquement'),
      el('span', { class: 'small-note' }, `Aucun transfert depuis ${settings.autoOffMinutes} minutes. Au prochain lancement, Hoplàfi démarrera sur ON.`),
    ) : el('p', { class: 'small-note' }, 'Au prochain lancement, Hoplàfi démarrera sur ON.'),
  );
}

function renderStatus() {
  const found = state.peers.size > 0;
  const relays = relayStatus();
  const relayProblem = state.ipsReady && Date.now() - state.onSince > 10000 && relays.total > 0 && relays.up === 0;
  return el('section', { class: 'status' },
    el('div', { class: 'status-head' },
      el('span', { class: 'dot' + (found ? '' : ' busy'), 'aria-hidden': 'true' }),
      found ? 'Visible sur ce réseau' : (state.ipsReady ? 'Visible, recherche en cours…' : 'Connexion au réseau…')),
    settings.autoOffMinutes > 0 ? el('div', { class: 'timer-row' },
      el('span', { class: 't' }, icon('clock'), el('span', null, 'OFF automatique dans ', el('span', { class: 'num', id: 'timer-left' }, '--:--'))),
      el('button', { type: 'button', class: 'btn small outline-green', onclick: extend }, 'Prolonger'),
    ) : el('div', { class: 'timer-row' }, el('span', { class: 't' }, icon('clock'), 'Extinction automatique désactivée')),
    settings.autoOffMinutes > 0 ? el('div', { class: 'bar', 'aria-hidden': 'true' }, el('i', { id: 'timer-bar', style: { width: '100%' } })) : null,
    relayProblem ? el('span', { class: 'relay-note' }, 'Relais de connexion injoignables. Vérifiez votre accès à Internet.') : null,
  );
}

function renderIdentity() {
  return el('div', { class: 'card identity mobile' },
    el('div', { class: 'stack', style: { gap: '2px' } },
      el('span', { class: 'lbl' }, 'Vous apparaissez comme'),
      el('span', { class: 'nm' }, settings.name)),
    el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Renommer cet appareil', onclick: openRename }, icon('pencil')),
  );
}

function renderBanner() {
  const show = state.peers.size === 0 && (state.noNetwork || Date.now() - state.onSince > 8000);
  if (!show) return null;
  return el('section', { class: 'banner' },
    el('div', { class: 'row' },
      el('span', { class: 'ico' }, icon('lock')),
      el('div', null,
        el('b', null, state.noNetwork ? 'Détection automatique impossible ici' : "Vous ne trouvez pas d'autres appareils ?"),
        el('span', null, state.noNetwork
          ? "Ce réseau empêche de reconnaître les appareils voisins. Connectez-vous avec un code secret."
          : "Connectez-vous avec un code secret, même si vous n'êtes pas sur le même réseau."))),
    el('button', { type: 'button', class: 'btn', onclick: () => openCodeDialog() }, 'Essayer avec un code secret'),
  );
}

function renderDevices() {
  const peers = [...state.peers.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const wrap = el('div', { class: 'stack', style: { gap: '12px' } },
    el('h2', { class: 'section-title' }, 'Appareils à proximité', el('span', { class: 'count' }, String(peers.length))));
  if (!peers.length) {
    wrap.append(el('div', { class: 'searching' },
      html('<svg class="radar" viewBox="0 0 180 180" aria-hidden="true"><circle cx="90" cy="90" r="86" fill="none" stroke="#D7DCE5" stroke-width="2"/><circle cx="90" cy="90" r="60" fill="none" stroke="#C9D0DC" stroke-width="2"/><circle cx="90" cy="90" r="34" fill="none" stroke="#B7C0CF" stroke-width="2"/><path class="sweep" d="M90 90 L90 4 A86 86 0 0 1 164 47 Z" fill="#0F7A4F" fill-opacity=".12"/><circle cx="90" cy="90" r="15" fill="#0F7A4F"/><circle cx="90" cy="90" r="6" fill="#fff"/></svg>'),
      el('span', { class: 'h' }, 'Recherche sur ce réseau…'),
      el('p', null, "Ouvrez Hoplàfi sur l'autre appareil et vérifiez qu'il est bien sur ON.")));
    return wrap;
  }
  const list = el('div', { class: 'devices' });
  for (const p of peers) {
    const card = el('button', {
      type: 'button', class: 'device',
      onclick: () => chooseFiles(p.id),
      'aria-label': `Envoyer des fichiers à ${p.name}`,
    },
      el('span', { class: 'av' }, icon(p.info.kind)),
      el('span', { class: 'txt' },
        el('span', { class: 'nm' }, p.name),
        el('span', { class: 'sub' }, `${KIND_LABEL[p.info.kind]} · ${p.info.browser || 'Navigateur'}`,
          p.via === 'code' ? el('span', { class: 'badge-code' }, 'via code') : null)),
      el('span', { class: 'send', 'aria-hidden': 'true' },
        isMobile ? null : el('span', { class: 'send-long' }, 'Déposer ou cliquer'),
        el('span', { class: 'send-short' }, 'Envoyer')),
    );
    if (!isMobile) setupDrop(card, p.id);
    list.append(card);
  }
  wrap.append(list, el('p', { class: 'hint' }, isMobile
    ? 'Touchez un appareil pour choisir les fichiers à lui envoyer.'
    : 'Glissez des fichiers ou un dossier entier sur un appareil, ou cliquez dessus.'));
  return wrap;
}

// ---------- Transferts ----------
let transfersBox = null;

function renderTransfers() {
  transfersBox = el('div', { class: 'stack', id: 'transfers' });
  fillTransfers();
  return transfersBox;
}

function fillTransfers() {
  if (!transfersBox) return;
  const items = transfers.list();
  transfersBox.replaceChildren();
  if (!items.length) return;
  transfersBox.append(el('h2', { class: 'section-title' }, 'Transferts'));
  const box = el('div', { class: 'transfers' });
  for (const t of items) box.append(t.dir === 'in' ? cardIn(t) : cardOut(t));
  transfersBox.append(box);
}

const progressEls = new Map(); // transfert -> { bar, a, b }

function progressTexts(t) {
  const p = transfers.progress(t);
  const pct = Math.floor(p.ratio * 100);
  const left = p.speed > 0 ? (p.total - p.done) / p.speed : NaN;
  return {
    pct,
    a: `${pct} % · ${formatBytes(p.done)} sur ${formatBytes(p.total)}`,
    b: p.speed > 0 ? `${formatSpeed(p.speed)} · ${formatDuration(left)} restantes` : '',
  };
}

function progressBlock(t, color = 'blue') {
  const x = progressTexts(t);
  const bar = el('i', { style: { width: x.pct + '%' } });
  const a = el('span', null, x.a);
  const b = el('span', null, x.b);
  progressEls.set(t, { bar, a, b });
  return [
    el('div', { class: 'bar thick ' + (color === 'blue' ? 'blue' : ''), 'aria-hidden': 'true' }, bar),
    el('div', { class: 'meta' }, a, b),
  ];
}

// Mise à jour en place (sans reconstruire les boutons pendant qu'on clique).
function updateProgress() {
  for (const [t, e] of progressEls) {
    if (!e.bar.isConnected) { progressEls.delete(t); continue; }
    const x = progressTexts(t);
    e.bar.style.width = x.pct + '%';
    e.a.textContent = x.a;
    e.b.textContent = x.b;
  }
}

function fileSummary(t) {
  const n = t.files.length;
  if (n === 1) return t.files[0].name;
  const tops = new Set(t.files.map((f) => (f.path.includes('/') ? f.path.split('/')[0] : '')));
  if (tops.size === 1 && !tops.has('')) return `${[...tops][0]}/ (${n} fichiers)`;
  return `${n} fichiers`;
}

function removeBtn(t) {
  return el('button', { type: 'button', class: 'btn small ghost', onclick: () => transfers.remove(t) }, 'Retirer');
}

function cardOut(t) {
  const who = t.peerName;
  const sub = `${fileSummary(t)} · ${formatBytes(t.total)}`;
  const head = (title, acts = []) => el('div', { class: 'head' },
    el('span', { class: 'titles' }, el('span', { class: 'ttl' }, title), el('span', { class: 'sub' }, sub)),
    el('span', { class: 'acts' }, ...acts));
  const cancel = el('button', { type: 'button', class: 'btn small', onclick: () => transfers.cancel(t) }, 'Annuler');
  switch (t.state) {
    case 'waiting':
      return el('div', { class: 'card xfer' }, head(`En attente de ${who}`, [cancel]),
        el('span', { class: 'note' }, `${who} doit accepter la réception.`));
    case 'resuming':
      return el('div', { class: 'card xfer' }, head(`Reprise vers ${who}…`, [cancel]), ...progressBlock(t));
    case 'sending':
      return el('div', { class: 'card xfer' }, head(`Envoi vers ${who}`, [
        el('button', { type: 'button', class: 'icon-btn boxed', 'aria-label': 'Mettre en pause', onclick: () => transfers.pause(t) }, icon('pause')), cancel]),
      ...progressBlock(t));
    case 'paused':
      return el('div', { class: 'card xfer' }, head(`En pause · ${who}`, [
        el('button', { type: 'button', class: 'btn small primary', onclick: () => transfers.resume(t) }, icon('resume'), 'Reprendre'), cancel]),
      ...progressBlock(t));
    case 'interrupted': {
      const online = transfers.peers.has(t.deviceId);
      const p = transfers.progress(t);
      return el('div', { class: 'card xfer cut' }, head(`Connexion coupée avec ${who}`, [
        online ? el('button', { type: 'button', class: 'btn small warn', onclick: () => transfers.resume(t) }, icon('resume'), 'Reprendre') : null, cancel]),
      el('span', { class: 'note' }, `Arrêté à ${formatBytes(p.done)} sur ${formatBytes(p.total)}. ` +
        (online ? 'Le transfert reprendra là où il s\'est arrêté.' : `Reprise automatique dès que ${who} revient.`)));
    }
    case 'done':
      return el('div', { class: 'card xfer ok' }, head(`Envoyé à ${who}`, [removeBtn(t)]));
    case 'rejected':
      return el('div', { class: 'card xfer bad' }, head(`Refusé par ${who}`, [removeBtn(t)]));
    case 'cancelled':
      return el('div', { class: 'card xfer bad' }, head('Envoi annulé', [removeBtn(t)]));
    default:
      return el('div', { class: 'card xfer bad' }, head('Envoi interrompu', [removeBtn(t)]), el('span', { class: 'note' }, t.error || ''));
  }
}

function cardIn(t) {
  const who = t.peerName;
  const sub = `${fileSummary(t)} · ${formatBytes(t.total)}`;
  const head = (title, acts = []) => el('div', { class: 'head' },
    el('span', { class: 'titles' }, el('span', { class: 'ttl' }, title), el('span', { class: 'sub' }, sub)),
    el('span', { class: 'acts' }, ...acts));
  const cancel = el('button', { type: 'button', class: 'btn small', onclick: () => transfers.cancel(t) }, 'Annuler');
  switch (t.state) {
    case 'asking': {
      const shown = t.files.slice(0, 5);
      return el('section', { class: 'card xfer ask', 'aria-label': 'Demande de réception' },
        el('div', { class: 'titles' },
          el('span', { class: 'ttl', style: { fontSize: '17px' } }, `${who} veut vous envoyer ${t.files.length > 1 ? t.files.length + ' fichiers' : 'un fichier'}`),
          el('span', { class: 'sub' }, `${formatBytes(t.total)} au total`)),
        el('ul', { class: 'files' }, ...shown.map((f) => el('li', null, icon('file'), el('span', { class: 'n' }, f.path || f.name), el('span', { class: 's' }, formatBytes(f.size)))),
          t.files.length > 5 ? el('li', null, el('span', { class: 'n', style: { color: '#4B5563' } }, `… et ${t.files.length - 5} autres`)) : null),
        el('span', { class: 'note' }, destinationText()),
        el('div', { class: 'grid2' },
          el('button', { type: 'button', class: 'btn', onclick: () => transfers.reject(t) }, 'Refuser'),
          el('button', { type: 'button', class: 'btn primary', onclick: () => acceptTransfer(t) }, 'Accepter')));
    }
    case 'gone':
      return el('div', { class: 'card xfer bad' }, head(`Demande annulée`, [removeBtn(t)]), el('span', { class: 'note' }, `${who} s'est déconnecté.`));
    case 'receiving':
      return el('div', { class: 'card xfer' }, head(`Réception depuis ${who}`, [cancel]), ...progressBlock(t, 'green'),
        el('span', { class: 'note' }, 'Enregistrement : ' + whereText(t)));
    case 'paused':
      return el('div', { class: 'card xfer' }, head(`Mis en pause par ${who}`, [cancel]), ...progressBlock(t, 'green'));
    case 'interrupted': {
      const p = transfers.progress(t);
      return el('div', { class: 'card xfer cut' }, head(`Connexion coupée avec ${who}`, [cancel]),
        el('span', { class: 'note' }, `Arrêté à ${formatBytes(p.done)} sur ${formatBytes(p.total)}. Reprise automatique là où ça s'est arrêté dès que ${who} revient.`));
    }
    case 'done': {
      const dl = t.files.filter((f) => f.blob);
      return el('div', { class: 'card xfer ok' }, head(`Reçu de ${who}`, [removeBtn(t)]),
        el('span', { class: 'note' }, 'Enregistré : ' + whereText(t)),
        dl.length ? el('div', { class: 'dl-list' }, ...dl.slice(0, 20).map((f) =>
          el('a', { class: 'btn small', href: f.url, download: f.name }, 'Enregistrer ' + (dl.length > 1 ? f.name : 'le fichier')))) : null);
    }
    case 'rejected':
      return el('div', { class: 'card xfer bad' }, head('Réception refusée', [removeBtn(t)]));
    case 'cancelled':
      return el('div', { class: 'card xfer bad' }, head('Réception annulée', [removeBtn(t)]));
    default:
      return el('div', { class: 'card xfer bad' }, head('Réception interrompue', [removeBtn(t)]), el('span', { class: 'note' }, t.error || ''));
  }
}

function whereText(t) {
  if (!t.root) return 'Téléchargements';
  const segs = [t.root.name];
  if (settings.perDevice) segs.push(t.peerName);
  return segs.join(' › ');
}

function destinationText() {
  if (!canPickFolder) return 'Les fichiers iront dans Téléchargements.';
  if (settings.askEachTime) return 'Vous choisirez le dossier en acceptant.';
  const f = currentFolder();
  if (!f) return 'Vous choisirez le dossier de réception en acceptant.';
  return `Enregistrement dans « ${f.name}${settings.perDevice ? ' › ' + 'nom de l\'appareil' : ''} ».`;
}

async function acceptTransfer(t) {
  let root = null;
  if (canPickFolder) {
    if (settings.askEachTime) {
      try { root = await window.showDirectoryPicker({ id: 'hoplafi-demande', mode: 'readwrite' }); } catch (e) { return; }
    } else if (currentFolder()) {
      if (await ensureFolderPermission()) root = currentFolder();
      else toast("Accès au dossier refusé : les fichiers iront dans Téléchargements.");
    } else {
      try { root = await pickFolder(); } catch (e) { root = null; }
    }
  }
  if (t.state !== 'asking') return;
  transfers.accept(t, root);
  refreshFolderPerm();
}

// ---------- Choix des fichiers à envoyer ----------
function chooseFiles(deviceId) {
  state.sendTarget = deviceId;
  const folderOk = !isMobile && 'webkitdirectory' in document.createElement('input');
  if (!folderOk) { $('#pick-files').click(); return; }
  const peer = state.peers.get(deviceId);
  openSheet(el('div', { class: 'sheet white' },
    el('div', { class: 'sheet-head' }, el('h2', null, `Envoyer à ${peer ? peer.name : 'cet appareil'}`),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fermer', onclick: closeOverlay }, icon('close'))),
    el('button', { type: 'button', class: 'btn primary big', onclick: () => { closeOverlay(); $('#pick-files').click(); } }, icon('file'), 'Choisir des fichiers'),
    el('button', { type: 'button', class: 'btn big', onclick: () => { closeOverlay(); $('#pick-dir').click(); } }, icon('folder'), 'Choisir un dossier entier'),
    el('p', { class: 'small-note' }, 'Astuce : vous pouvez aussi glisser des fichiers directement sur l\'appareil.'),
  ));
}

function sendEntries(deviceId, entries) {
  if (!entries.length) return;
  if (!state.peers.has(deviceId)) { toast("Cet appareil n'est plus connecté."); return; }
  transfers.send(deviceId, entries);
  state.lastActivity = Date.now();
}

for (const id of ['#pick-files', '#pick-dir']) {
  $(id).addEventListener('change', (ev) => {
    const files = [...ev.target.files];
    ev.target.value = '';
    sendEntries(state.sendTarget, files.map((f) => ({ file: f, path: f.webkitRelativePath || f.name })));
  });
}

async function readEntry(entry, prefix, out) {
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej));
    out.push({ file, path: prefix + file.name });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    for (;;) {
      const batch = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await readEntry(e, prefix + entry.name + '/', out);
    }
  }
}

function setupDrop(card, deviceId) {
  card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop'); });
  card.addEventListener('dragleave', () => card.classList.remove('drop'));
  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    card.classList.remove('drop');
    const items = [...(e.dataTransfer.items || [])];
    const entries = [];
    if (items.length && items[0].webkitGetAsEntry) {
      const roots = items.map((it) => it.webkitGetAsEntry()).filter(Boolean);
      try { for (const r of roots) await readEntry(r, '', entries); } catch (err) { console.warn(err); }
    } else {
      for (const f of e.dataTransfer.files) entries.push({ file: f, path: f.name });
    }
    sendEntries(deviceId, entries);
  });
}

// ---------- Réglages ----------
async function refreshFolderPerm() {
  const p = await folderPermission();
  if (p !== state.folderPerm) { state.folderPerm = p; render(); }
}

function renderSettings() {
  const box = el('section', { class: 'card settings', 'aria-label': 'Réglages de réception' }, el('h2', null, 'Réception'));
  if (canPickFolder) {
    const f = currentFolder();
    box.append(el('div', { class: 'stack' },
      el('span', { class: 'lbl' }, 'Dossier de réception'),
      el('div', { class: 'folder-box' + (f ? '' : ' none') }, icon('folder'),
        el('span', null, f ? f.name : 'Aucun dossier choisi pour l\'instant')),
      el('button', {
        type: 'button', class: 'btn primary',
        onclick: async () => { try { await pickFolder(); toast('Dossier enregistré.'); } catch (e) { /* annulé */ } refreshFolderPerm(); render(); },
      }, f ? 'Changer de dossier' : 'Choisir un dossier'),
      f && state.folderPerm === 'prompt' ? el('button', {
        type: 'button', class: 'btn',
        onclick: async () => { await ensureFolderPermission(); refreshFolderPerm(); },
      }, "Réautoriser l'accès au dossier") : null,
      el('span', { class: 'small-note' }, f ? 'Mémorisé : Hoplàfi le retrouvera au prochain lancement.' : 'Sinon, il vous sera demandé à la première réception.')));
    const check = (key, title, help) => el('label', { class: 'check' },
      el('input', { type: 'checkbox', checked: settings[key], onchange: (e) => { update({ [key]: e.target.checked }); render(); } }),
      el('span', null, el('b', null, title), help ? el('small', null, help) : null));
    box.append(el('div', { class: 'sep' },
      check('recreateDirs', 'Recréer les sous-dossiers', 'Un dossier envoyé garde son arborescence.'),
      check('perDevice', 'Un dossier par appareil', "Chaque appareil a son propre sous-dossier, à son nom."),
      check('askEachTime', 'Demander le dossier à chaque réception', null)));
  } else {
    box.append(el('p', { class: 'small-note' },
      'Sur ce navigateur, les fichiers reçus vont dans Téléchargements. Pour choisir un dossier, utilisez Chrome, Edge, Opera ou Brave sur ordinateur.'));
  }
  const sel = el('select', { class: 'sel', id: 'auto-off', onchange: (e) => { update({ autoOffMinutes: Number(e.target.value) }); state.lastActivity = Date.now(); render(); } },
    ...[[5, 'Après 5 minutes sans transfert'], [15, 'Après 15 minutes sans transfert'], [30, 'Après 30 minutes sans transfert'], [60, 'Après 1 heure sans transfert'], [0, 'Jamais']]
      .map(([v, l]) => el('option', { value: String(v), selected: settings.autoOffMinutes === v }, l)));
  box.append(el('div', { class: 'sep' },
    el('label', { class: 'lbl', for: 'auto-off' }, 'Passage en OFF automatique'), sel,
    el('span', { class: 'small-note' }, 'Au lancement, Hoplàfi démarre toujours sur ON.')));
  const extra = el('div', { class: 'sep' },
    el('p', { class: 'small-note' }, 'Les fichiers vont directement d\'un appareil à l\'autre, chiffrés. Ils ne passent par aucun serveur.'),
    state.on && state.ipsReady ? el('p', { class: 'small-note', id: 'diag' }, diagText()) : null);
  if (state.installPrompt) {
    extra.prepend(el('button', { type: 'button', class: 'btn', onclick: async () => {
      const p = state.installPrompt; state.installPrompt = null;
      p.prompt(); await p.userChoice.catch(() => {}); render();
    } }, "Installer l'application"));
  }
  if (state.on) {
    extra.append(el('button', { type: 'button', class: 'btn', onclick: () => openCodeDialog() }, 'Connexion par code secret'));
  }
  box.append(extra);
  return box;
}

// ---------- Minuteur ----------
function extend() {
  state.lastActivity = Date.now();
  renderTimer();
}

function renderTimer() {
  const top = $('#timer-top');
  if (!state.on || settings.autoOffMinutes <= 0) {
    top.replaceChildren();
    return;
  }
  const total = settings.autoOffMinutes * 60;
  const left = Math.max(0, total - (Date.now() - state.lastActivity) / 1000);
  const txt = formatClock(left);
  const l = $('#timer-left');
  if (l) l.textContent = txt;
  const b = $('#timer-bar');
  if (b) b.style.width = (left / total) * 100 + '%';
  if (!top.firstChild) {
    top.append(icon('clock'), el('span', null, 'OFF automatique dans ', el('span', { class: 'num', id: 'timer-top-left' }, txt)),
      el('button', { type: 'button', class: 'btn small', onclick: extend }, 'Prolonger'));
  } else {
    const t = $('#timer-top-left');
    if (t) t.textContent = txt;
  }
}

setInterval(() => {
  if (!state.on) return;
  if (transfers.active() || state.code || state.verifying.size) state.lastActivity = Date.now();
  if (settings.autoOffMinutes > 0 && Date.now() - state.lastActivity > settings.autoOffMinutes * 60000) {
    setOn(false, true);
    return;
  }
  renderTimer();
  // Le bandeau « vous ne trouvez pas » apparaît après quelques secondes.
  const shouldBanner = state.peers.size === 0 && Date.now() - state.onSince > 8000;
  if (shouldBanner !== state._banner) { state._banner = shouldBanner; render(); }
}, 1000);

// ---------- Onglet du navigateur ----------
let wakeLock = null;
function updateTab() {
  const active = transfers.list().filter((t) => t.state === 'sending' || t.state === 'receiving');
  let title;
  if (active.length) {
    const done = active.reduce((s, t) => s + transfers.progress(t).done, 0);
    const total = active.reduce((s, t) => s + t.total, 0) || 1;
    title = `${Math.floor((done / total) * 100)} % · Hoplàfi !`;
  } else {
    title = (state.on ? 'ON' : 'OFF') + ' · Hoplàfi !';
  }
  if (document.title !== title) document.title = title;
  const fav = $('#favicon');
  const href = state.on ? 'icons/fav-on.svg' : 'icons/fav-off.svg';
  if (fav.getAttribute('href') !== href) fav.setAttribute('href', href);
  // Garder l'écran allumé pendant un transfert (téléphones).
  if (active.length && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
    navigator.wakeLock.request('screen').then((w) => { wakeLock = w; w.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
  } else if (!active.length && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

transfers.on('change', () => { state.lastActivity = Date.now(); fillTransfers(); updateTab(); });
transfers.on('progress', () => { state.lastActivity = Date.now(); updateProgress(); updateTab(); });
transfers.on('request', (t) => {
  if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
  toast(`${t.peerName} veut vous envoyer des fichiers.`);
});
transfers.on('received', (t) => toast(`Réception terminée : ${fileSummary(t)}.`));

// ---------- Fenêtres ----------
function openSheet(node) {
  const ov = $('#overlay');
  ov.replaceChildren(node);
  ov.hidden = false;
  ov.onclick = (e) => { if (e.target === ov && !state.code && !state.verifying.size) closeOverlay(); };
  const f = node.querySelector('button, input');
  if (f) setTimeout(() => f.focus(), 30);
}

function closeOverlay() {
  const ov = $('#overlay');
  ov.hidden = true;
  ov.replaceChildren();
}

function openRename() {
  const input = el('input', { class: 'field', value: settings.name, maxlength: '30', 'aria-label': 'Nom de cet appareil' });
  const save = () => {
    const v = input.value.trim().slice(0, 30);
    if (!v) return;
    update({ name: v });
    for (const p of state.peers.values()) p.send({ t: 'hello', v: 1, ...me() });
    closeOverlay();
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  openSheet(el('div', { class: 'sheet white' },
    el('div', { class: 'sheet-head' }, el('h2', null, 'Nom de cet appareil'),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fermer', onclick: closeOverlay }, icon('close'))),
    input,
    el('button', { type: 'button', class: 'btn', onclick: () => { input.value = randomName(); } }, 'Tirer un nom au hasard'),
    el('p', { class: 'small-note' }, `Les autres appareils verront ce nom. ${nameCount().toLocaleString('fr-FR')} noms aléatoires possibles.`),
    el('button', { type: 'button', class: 'btn primary big', onclick: save }, 'Enregistrer'),
  ));
  setTimeout(() => input.select(), 40);
}

// ---------- Code secret ----------
function shareURL(code) {
  return location.origin + location.pathname + '#c=' + code;
}

function openCodeDialog(prefill = '') {
  if (!state.on) return;
  if (state.code) { closeCodeDialog(); }
  const c = {
    my: newCode(), expires: 0, myRoom: null, entered: '', enteredRoom: null, status: '', bad: false, searchTimer: null,
  };
  state.code = c;
  const joinMine = () => {
    if (c.myRoom) state.mesh.leave(c.myRoom);
    c.my = newCode();
    c.expires = Date.now() + CODE_LIFETIME * 1000;
    c.myRoom = state.mesh.join('code:' + c.my, 'code');
  };
  joinMine();

  const codeEl = el('span', { class: 'code-big', 'aria-live': 'polite' });
  const left = el('span', { class: 'num' });
  const bar = el('i', { style: { width: '100%' } });
  const qr = el('div', { class: 'qr' });
  const slots = el('div', { class: 'slots', role: 'group', 'aria-label': 'Code saisi' });
  const status = el('div', { class: 'code-status', role: 'status' });

  const paintMine = () => {
    codeEl.textContent = formatCode(c.my);
    qr.innerHTML = qrSVG(shareURL(c.my), 104);
  };
  const paintEntry = () => {
    slots.replaceChildren();
    for (let i = 0; i < CODE_LENGTH; i++) {
      if (i === 4) slots.append(el('span', { class: 'dash', 'aria-hidden': 'true' }));
      const ch = c.entered[i] || '';
      slots.append(el('span', { class: 'slot' + (ch ? ' filled' : '') + (i === c.entered.length ? ' active' : '') }, ch));
    }
    status.textContent = c.status;
    status.classList.toggle('bad', c.bad);
  };
  const tick = () => {
    const s = (c.expires - Date.now()) / 1000;
    if (s <= 0) { joinMine(); paintMine(); }
    const r = Math.max(0, (c.expires - Date.now()) / 1000);
    left.textContent = formatClock(r);
    bar.style.width = (r / CODE_LIFETIME) * 100 + '%';
    bar.style.background = r <= 30 ? '#B45309' : '';
  };
  const submit = () => {
    if (c.entered.length !== CODE_LENGTH) return;
    if (c.entered === c.my) { c.status = "C'est votre propre code : saisissez celui de l'autre appareil."; c.bad = true; paintEntry(); return; }
    if (c.enteredRoom) state.mesh.leave(c.enteredRoom);
    c.enteredRoom = state.mesh.join('code:' + c.entered, 'code');
    c.status = "Recherche de l'appareil…";
    c.bad = false;
    clearTimeout(c.searchTimer);
    c.searchTimer = setTimeout(() => {
      if (state.code !== c) return;
      c.status = "Aucun appareil trouvé avec ce code. Vérifiez-le, ou demandez un nouveau code.";
      c.bad = true;
      paintEntry();
    }, 30000);
    paintEntry();
  };
  const type = (s) => {
    const add = cleanCode(s);
    if (!add) return false;
    c.entered = (c.entered + add).slice(0, CODE_LENGTH);
    c.status = ''; c.bad = false;
    paintEntry();
    if (c.entered.length === CODE_LENGTH) submit();
    return true;
  };
  const erase = () => {
    c.entered = c.entered.slice(0, -1);
    c.status = ''; c.bad = false;
    clearTimeout(c.searchTimer);
    paintEntry();
  };
  c.type = type;
  c.erase = erase;

  const keypad = el('div', { class: 'keypad' }, ...ALPHABET.split('').map((k) =>
    el('button', { type: 'button', class: 'key', onclick: () => type(k) }, k)));
  const keys2 = el('div', { class: 'keys2' },
    el('button', { type: 'button', class: 'key', onclick: async () => {
      try { const txt = await navigator.clipboard.readText(); c.entered = ''; if (!type(txt)) toast('Aucun code dans le presse-papiers.'); }
      catch (e) { toast("Le navigateur n'autorise pas la lecture du presse-papiers."); }
    } }, 'Coller'),
    el('button', { type: 'button', class: 'key', 'aria-label': 'Effacer le dernier caractère', onclick: erase }, icon('erase')));

  openSheet(el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Connexion par code secret' },
    el('div', { class: 'sheet-head' },
      el('h2', null, 'Connexion par code secret'),
      el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fermer', onclick: closeCodeDialog }, icon('close'))),
    el('section', { class: 'card code-card' },
      el('div', { class: 'l' },
        el('span', { class: 'cap' }, 'Votre code'),
        codeEl,
        el('div', { class: 'timer-row', style: { justifyContent: 'flex-start' } }, icon('clock'), el('span', null, 'Nouveau code dans ', left)),
        el('div', { class: 'bar blue', 'aria-hidden': 'true' }, bar)),
      qr),
    el('div', { class: 'or' }, 'ou'),
    el('span', { style: { fontSize: '15px', fontWeight: '600' } }, "Saisissez le code de l'autre appareil"),
    slots,
    keypad,
    keys2,
    status,
    el('p', { class: 'small-note', style: { textAlign: 'center' } },
      "Un seul des deux appareils doit saisir le code. Avec un téléphone, vous pouvez aussi scanner le QR code avec l'appareil photo."),
  ));
  paintMine();
  paintEntry();
  tick();
  c.timer = setInterval(tick, 250);
  if (prefill) type(prefill);
}

function closeCodeDialog() {
  const c = state.code;
  if (!c) return;
  state.code = null;
  clearInterval(c.timer);
  clearTimeout(c.searchTimer);
  if (state.mesh) {
    if (c.myRoom) state.mesh.leave(c.myRoom);
    if (c.enteredRoom) state.mesh.leave(c.enteredRoom);
  }
  if (!state.verifying.size) closeOverlay();
}

document.addEventListener('keydown', (e) => {
  const c = state.code;
  if (!c || state.verifying.size || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') { closeCodeDialog(); return; }
  if (e.key === 'Backspace') { e.preventDefault(); c.erase(); return; }
  if (e.key.length === 1 && c.type(e.key)) e.preventDefault();
});
document.addEventListener('paste', (e) => {
  const c = state.code;
  if (!c) return;
  const txt = e.clipboardData && e.clipboardData.getData('text');
  if (txt) { c.entered = ''; c.type(txt); e.preventDefault(); }
});

// ---------- Vérification par symboles ----------
const verifyNodes = new Map();

function openVerify(peer) {
  const v = state.verifying.get(peer);
  if (!v) return;
  const actions = el('div', { class: 'stack' },
    el('button', { type: 'button', class: 'btn go big', onclick: () => {
      v.localOk = true;
      peer.send({ t: 'verify', ok: true });
      actions.replaceChildren(el('p', { class: 'code-status', role: 'status' }, `En attente de la confirmation sur ${peer.name}…`));
      checkVerified(peer);
    } }, 'Identiques, accepter'),
    el('button', { type: 'button', class: 'btn danger big', style: { height: '52px' }, onclick: () => {
      peer.send({ t: 'verify', ok: false });
      state.verifying.delete(peer);
      closeVerify(peer);
      setTimeout(() => peer.close(), 300);
    } }, 'Différents, refuser'));
  const node = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vérification des symboles' },
    el('div', { class: 'sheet-head' }, el('h2', null, 'Vérification')),
    el('span', { class: 'small-note' }, 'Connexion demandée par'),
    el('div', { class: 'peer-line' }, el('span', { class: 'av' }, icon(peer.info.kind)),
      el('span', { class: 'stack', style: { gap: '0' } }, el('b', { style: { fontSize: '18px' } }, peer.name),
        el('span', { class: 'small-note' }, `${KIND_LABEL[peer.info.kind]} · ${peer.info.browser}`))),
    el('section', { class: 'card stack', style: { alignItems: 'center', gap: '18px', padding: '24px 16px' } },
      el('b', { style: { textAlign: 'center' } }, 'Ces symboles doivent être identiques sur les deux écrans'),
      html(`<div class="syms" style="width:100%">${v.symbols.map((i) => symbolHTML(i, 88)).join('')}</div>`),
      el('span', { class: 'small-note', style: { textAlign: 'center' } },
        `Regardez l'écran de ${peer.name}. Si un seul symbole est différent, refusez : quelqu'un d'autre essaie de se connecter.`)),
    actions);
  verifyNodes.set(peer, node);
  openSheet(node);
}

function closeVerify(peer) {
  const node = verifyNodes.get(peer);
  verifyNodes.delete(peer);
  const ov = $('#overlay');
  if (node && ov.contains(node)) {
    // Une autre vérification en attente ? Sinon on revient au code ou on ferme.
    const next = [...state.verifying.keys()][0];
    if (next) openVerify(next);
    else if (!state.code) closeOverlay();
    else { const c = state.code; state.code = null; clearInterval(c.timer); openCodeDialogKeep(c); }
  }
}

// Rouvre la fenêtre du code sans changer de code (après un refus).
function openCodeDialogKeep(old) {
  if (state.mesh) {
    if (old.myRoom) state.mesh.leave(old.myRoom);
    if (old.enteredRoom) state.mesh.leave(old.enteredRoom);
  }
  openCodeDialog();
}

// ---------- Démarrage ----------
$('#toggle').addEventListener('click', () => setOn(!state.on));

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  state.installPrompt = e;
  render();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { resync(true); updateTab(); refreshFolderPerm(); }
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js?v=' + VERSION).catch(() => {});
}

$('#version').textContent = 'Version ' + VERSION;

async function start() {
  await loadFolder();
  await refreshFolderPerm();
  render();
  await setOn(true); // toujours ON au lancement
  const m = /^#c=([A-Za-z0-9-]+)/.exec(location.hash);
  if (m) {
    history.replaceState(null, '', location.pathname + location.search);
    openCodeDialog(m[1]);
  }
}
start();

// Accès pour les tests automatisés (en local uniquement).
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  window.__hoplafi = { state, transfers, settings, openCodeDialog, setOn };
}
