// Les 64 symboles de vérification, dessinés pour l'application (aucun emoji),
// donc identiques sur tous les appareils, même anciens.
// G = dégradé de la couleur du symbole, W = couleur claire de la tuile.

const PALETTE = [
  ['#E07A10', '#A84E05', '#FFF1DC'], ['#2F6BFF', '#1739B8', '#E6EDFF'], ['#22A35A', '#0B6B39', '#E3F6EA'],
  ['#E5484D', '#A31B22', '#FDE7E8'], ['#F2B300', '#A66F00', '#FFF7D1'], ['#64748B', '#334155', '#EDF0F4'],
  ['#8B5CF6', '#5B21B6', '#F0EAFE'], ['#2B3F8F', '#111C55', '#E3E8F8'], ['#14B8A6', '#0B7065', '#DDF6F2'],
  ['#B4672B', '#7A3D12', '#F7EADF'], ['#EC4899', '#A3165E', '#FDE7F2'], ['#7CB518', '#4A7409', '#EEF8DC'],
  ['#0EA5E9', '#0A5F8A', '#E0F3FD'], ['#F25C2A', '#B23510', '#FFE9E0'], ['#6366F1', '#3730A3', '#E9E9FE'],
  ['#C026D3', '#7E1491', '#FBE8FD'],
];

const S = [
  ['Étoile', '<path fill="G" d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.3l-5.8 3 1.1-6.4-4.7-4.6 6.5-.9z"/>'],
  ['Lune', '<path fill="G" d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'],
  ['Sapin', '<path fill="G" d="M12 2l6 8h-3l4 6H5l4-6H6z"/><rect fill="G" x="10.8" y="16" width="2.4" height="6" rx=".6"/>'],
  ['Cœur', '<path fill="G" d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>'],
  ['Éclair', '<path fill="G" d="M13.5 2L4.5 13.5h6.5L10 22l9.5-12h-6.8z"/>'],
  ['Clé', '<g fill="none" stroke="G" stroke-width="2.8" stroke-linecap="round"><circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M18 12v3.5M21 12v3"/></g>'],
  ['Parapluie', '<path fill="G" d="M2.5 12.5a9.5 9.5 0 0 1 19 0z"/><path fill="none" stroke="G" stroke-width="2.2" stroke-linecap="round" d="M12 12.5v6a2 2 0 0 0 4 0"/>'],
  ['Ancre', '<g fill="none" stroke="G" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="5" r="2.2"/><path d="M12 7.2V21M5 13a7 7 0 0 0 14 0M8 10.5h8"/></g>'],
  ['Fusée', '<path fill="G" d="M12 2c3.2 3 4.3 7.2 4.2 11L12 16.2 7.8 13C7.7 9.2 8.8 5 12 2z"/><path fill="G" d="M7.8 12.3L5 17h4.2zM16.2 12.3L19 17h-4.2zM10.4 17.5h3.2L12 22z"/><circle fill="W" cx="12" cy="9" r="1.7"/>'],
  ['Maison', '<path fill="G" d="M3 11.2L12 3l9 8.2V21h-6v-6h-6v6H3z"/>'],
  ['Cloche', '<path fill="G" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l2 2H4z"/><circle fill="G" cx="12" cy="20.6" r="1.9"/>'],
  ['Ampoule', '<path fill="G" d="M9 16.5h6V15c0-1.5 3-3.2 3-6.5a6 6 0 0 0-12 0c0 3.3 3 5 3 6.5z"/><rect fill="G" x="9" y="18" width="6" height="3.5" rx="1.2"/>'],
  ['Bateau', '<path fill="G" d="M11 2.5V14H4.5z"/><path fill="G" d="M13 5.5l5.5 8.5H13z"/><path fill="G" d="M2.5 16h19l-3.2 4.5H5.7z"/>'],
  ['Champignon', '<path fill="G" d="M2.5 12.5a9.5 8 0 0 1 19 0z"/><rect fill="G" x="9" y="13" width="6" height="8.5" rx="2"/><circle fill="W" cx="8" cy="8.8" r="1.5"/><circle fill="W" cx="15" cy="7.2" r="1.2"/>'],
  ['Musique', '<path fill="none" stroke="G" stroke-width="2.2" stroke-linejoin="round" d="M9 18V5l11-2v13"/><circle fill="G" cx="6" cy="18" r="3.2"/><circle fill="G" cx="17" cy="16" r="3.2"/>'],
  ['Diamant', '<path fill="G" d="M6 3h12l4 6-10 12.5L2 9z"/><path fill="none" stroke="W" stroke-width="1" stroke-opacity=".75" d="M2 9h20M8 3l4 18.5L16 3"/>'],
  ['Soleil', '<circle fill="G" cx="12" cy="12" r="4.6"/><path stroke="G" stroke-width="2.4" stroke-linecap="round" d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8"/>'],
  ['Nuage', '<path fill="G" d="M7 19a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 18.8 9.5 4.8 4.8 0 0 1 18 19z"/>'],
  ['Goutte', '<path fill="G" d="M12 2.5c4 5 7 8.6 7 12.3a7 7 0 0 1-14 0c0-3.7 3-7.3 7-12.3z"/>'],
  ['Flamme', '<path fill="G" d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 1.5-4.8 3-6 0 2 1 3.3 2.2 3.6C10.6 8.5 11 5 12 2z"/>'],
  ['Feuille', '<path fill="G" d="M20 3C9 3 4 8.5 4 15c0 2 .6 3.6 1.4 5C7 13 11 9.5 16 8c-4 2.5-7.4 6.5-9 12.3 1 .5 2.2.7 3.5.7C17 21 20 13 20 3z"/>'],
  ['Fleur', '<g fill="G"><circle cx="12" cy="6.5" r="3.5"/><circle cx="17.5" cy="10.5" r="3.5"/><circle cx="15.4" cy="17" r="3.5"/><circle cx="8.6" cy="17" r="3.5"/><circle cx="6.5" cy="10.5" r="3.5"/></g><circle fill="W" cx="12" cy="12.2" r="2.6"/>'],
  ['Cactus', '<path fill="G" d="M10 22V5a2 2 0 0 1 4 0v17zM14 13h2.5a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 1 3 0v3.5a4.5 4.5 0 0 1-4.5 4.5H14zM10 15H7.5A4.5 4.5 0 0 1 3 10.5V9a1.5 1.5 0 0 1 3 0v1.5A1.5 1.5 0 0 0 7.5 12H10z"/>'],
  ['Pomme', '<path fill="G" d="M12 7.5c-2-1.6-6.5-1.7-7.5 2.5-1 4.6 2 11 5 11 1 0 1.7-.6 2.5-.6s1.5.6 2.5.6c3 0 6-6.4 5-11-1-4.2-5.5-4.1-7.5-2.5z"/><path fill="G" d="M12.5 6.5c0-2.5 1.5-4 4-4.2-.2 2.5-1.6 4-4 4.2z"/>'],
  ['Cerises', '<circle fill="G" cx="7" cy="17" r="4"/><circle fill="G" cx="17" cy="17.5" r="4"/><path fill="none" stroke="G" stroke-width="1.8" stroke-linecap="round" d="M7 13c1-5 4-8.5 7.5-10M17 13.5c-.5-4-1.5-7.5-2.5-10.5"/>'],
  ['Carotte', '<path fill="G" d="M15.5 8.5l-12 12.5c4.5-1 12-5 14-8.5a3 3 0 0 0-2-4z"/><path fill="G" d="M15 8c-.5-2.5.3-4.5 2-5.5.3 1.8 0 3.3-1 4.6 1.4-.9 3-1.1 4.8-.5-1 1.6-2.6 2.5-4.6 2.5 1.8 0 3.2.8 4 2.2-2 .5-3.6.2-5-1.1z"/>'],
  ['Citron', '<path fill="G" d="M2.5 12c2-5 6-7.5 9.5-7.5S19.5 7 21.5 12c-2 5-6 7.5-9.5 7.5S4.5 17 2.5 12z"/><path fill="none" stroke="W" stroke-width="1.2" stroke-opacity=".7" stroke-linecap="round" d="M7 10c1.5-2 3.2-2.8 5-2.8"/>'],
  ['Gâteau', '<path fill="G" d="M3.5 13h17v8.5h-17z"/><path fill="G" d="M5 9h14v3H5z"/><rect fill="G" x="11" y="3.5" width="2" height="4.5" rx="1"/><path fill="W" opacity=".8" d="M3.5 15.5c1.4 1.2 2.8 1.2 4.2 0s2.8-1.2 4.3 0 2.8 1.2 4.2 0 2.8-1.2 4.3 0v-1H3.5z"/>'],
  ['Glace', '<path fill="G" d="M7.5 11.5h9L12 22.5z"/><circle fill="G" cx="12" cy="8" r="5"/><path fill="none" stroke="W" stroke-width="1" stroke-opacity=".7" d="M9 13.5l5 3M10.2 16.6l3 1.8"/>'],
  ['Tasse', '<path fill="G" d="M3.5 8h13v6.5a5.5 5.5 0 0 1-5.5 5.5H9a5.5 5.5 0 0 1-5.5-5.5z"/><path fill="none" stroke="G" stroke-width="2.2" d="M16.5 10h1.5a2.5 2.5 0 0 1 0 5h-2"/><path fill="none" stroke="G" stroke-width="1.6" stroke-linecap="round" d="M8 2.5c-.8 1 .8 2 0 3M12 2.5c-.8 1 .8 2 0 3"/>'],
  ['Cadeau', '<rect fill="G" x="3" y="9" width="18" height="4" rx="1"/><rect fill="G" x="4.5" y="13.5" width="15" height="8" rx="1"/><path fill="W" d="M11 9h2v12.5h-2z"/><path fill="none" stroke="G" stroke-width="2" d="M12 9c-1-3-4.5-5-5.5-3S9 9 12 9c3 0 6.5-1 5.5-3S13 6 12 9z"/>'],
  ['Ballon', '<path fill="G" d="M12 2a6.5 7.5 0 0 1 6.5 7.5c0 4.5-3.5 7.5-6.5 8.5-3-1-6.5-4-6.5-8.5A6.5 7.5 0 0 1 12 2z"/><path fill="G" d="M10.8 18h2.4l-1.2 1.6z"/><path fill="none" stroke="G" stroke-width="1.4" stroke-linecap="round" d="M12 19.6c-1.5 1-1 2.4.5 2.9"/>'],
  ['Couronne', '<path fill="G" d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8z"/><rect fill="G" x="4.8" y="19" width="14.4" height="2.5" rx="1"/>'],
  ['Drapeau', '<path fill="G" d="M5 3.5h13l-2.5 4.5 2.5 4.5H5z"/><rect fill="G" x="3.5" y="2.5" width="2.2" height="19.5" rx="1"/>'],
  ['Cadenas', '<rect fill="G" x="4.5" y="10.5" width="15" height="11" rx="2.2"/><path fill="none" stroke="G" stroke-width="2.6" d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle fill="W" cx="12" cy="15.5" r="1.6"/>'],
  ['Loupe', '<circle fill="none" stroke="G" stroke-width="2.8" cx="10" cy="10" r="6.2"/><path stroke="G" stroke-width="3.6" stroke-linecap="round" d="M15 15l5.5 5.5"/>'],
  ['Crayon', '<path fill="G" d="M15.5 3.5l5 5L9 20H4v-5z"/><path fill="W" d="M4 20l1.8-4.2 2.4 2.4z"/>'],
  ['Livre', '<path fill="G" d="M2.5 5c3.5-1.4 6.7-1 9 1v14c-2.3-2-5.5-2.4-9-1z"/><path fill="G" d="M21.5 5c-3.5-1.4-6.7-1-9 1v14c2.3-2 5.5-2.4 9-1z"/>'],
  ['Enveloppe', '<rect fill="G" x="2.5" y="5" width="19" height="14" rx="2"/><path fill="none" stroke="W" stroke-width="1.6" stroke-linejoin="round" d="M3.5 6.5L12 13l8.5-6.5"/>'],
  ['Horloge', '<circle fill="G" cx="12" cy="12" r="9.5"/><path fill="none" stroke="W" stroke-width="2" stroke-linecap="round" d="M12 6.5V12l3.5 2.5"/>'],
  ['Sablier', '<path fill="G" d="M5 2.5h14v2c0 4-4 5.5-4 7.5s4 3.5 4 7.5v2H5v-2c0-4 4-5.5 4-7.5S5 8.5 5 4.5z"/><path fill="W" opacity=".8" d="M8.5 19.5c0-2 3.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5z"/>'],
  ['Photo', '<path fill="G" d="M3 8a2 2 0 0 1 2-2h2.5L9 3.5h6L16.5 6H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle fill="W" cx="12" cy="12.8" r="4"/><circle fill="G" cx="12" cy="12.8" r="2.3"/>'],
  ['Lunettes', '<g fill="none" stroke="G" stroke-width="2.4"><circle cx="6.5" cy="14" r="4"/><circle cx="17.5" cy="14" r="4"/><path d="M10.5 13.5c1-1 2-1 3 0M2.5 13l1-5M21.5 13l-1-5"/></g>'],
  ['Chapeau', '<path fill="G" d="M6.5 15V8a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v7z"/><path fill="G" d="M2 16.5c0-1 1-1.5 2.5-1.5h15c1.5 0 2.5.5 2.5 1.5s-1.5 2-4 2h-12c-2.5 0-4-1-4-2z"/><rect fill="W" x="6.5" y="12" width="11" height="1.8"/>'],
  ['T-shirt', '<path fill="G" d="M8.5 3L2 6.5 4.5 11 7 9.8V21h10V9.8l2.5 1.2L22 6.5 15.5 3c-.5 1.6-1.8 2.5-3.5 2.5S9 4.6 8.5 3z"/>'],
  ['Ciseaux', '<g fill="none" stroke="G" stroke-width="2.4" stroke-linecap="round"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.2 16L17 3M15.8 16L7 3"/></g>'],
  ['Chaussette', '<path fill="G" d="M8 2h7.5v9.2l3.6 3.6a3.6 3.6 0 0 1-5.1 5.1l-5.4-5.4A3.4 3.4 0 0 1 8 12.1z"/><path fill="W" opacity=".85" d="M8 4.6h7.5v2.2H8z"/>'],
  ['Vélo', '<g fill="none" stroke="G" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><circle cx="5.5" cy="16.5" r="4"/><circle cx="18.5" cy="16.5" r="4"/><path d="M5.5 16.5L9.5 8h6l3 8.5M9.5 8l3.5 8.5H5.5M8 5.5h3"/></g>'],
  ['Voiture', '<path fill="G" d="M3 16v-3.5l2-5A2.5 2.5 0 0 1 7.3 6h9.4A2.5 2.5 0 0 1 19 7.5l2 5V16a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16z"/><path fill="W" opacity=".75" d="M6.5 8.5h11l1.2 3.5H5.3z"/><circle fill="G" cx="7" cy="18" r="2.6"/><circle fill="G" cx="17" cy="18" r="2.6"/><circle fill="none" stroke="W" stroke-width="1.2" cx="7" cy="18" r="2.6"/><circle fill="none" stroke="W" stroke-width="1.2" cx="17" cy="18" r="2.6"/>'],
  ['Avion', '<path fill="G" d="M21.5 3.5c-1-1-3-.5-4.5 1L13.5 8 4 5.5 2.5 7l7.5 4.5-3.5 3.5H3.5L2 16.5l4 1.5 1.5 4 1.5-1.5v-3l3.5-3.5L17 21.5l1.5-1.5L16 10.5 19.5 7c1.5-1.5 2-3.5 2-3.5z"/>'],
  ['Trophée', '<path fill="G" d="M7 3h10v6a5 5 0 0 1-10 0z"/><path fill="none" stroke="G" stroke-width="2" d="M7 5H4v1.5a3.5 3.5 0 0 0 3.5 3.5M17 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><rect fill="G" x="10.8" y="13.5" width="2.4" height="4.5"/><rect fill="G" x="7" y="18" width="10" height="3.5" rx="1"/>'],
  ['Dé', '<rect fill="G" x="3" y="3" width="18" height="18" rx="4"/><g fill="W"><circle cx="8" cy="8" r="1.7"/><circle cx="16" cy="8" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="8" cy="16" r="1.7"/><circle cx="16" cy="16" r="1.7"/></g>'],
  ['Cible', '<circle fill="G" cx="12" cy="12" r="10"/><circle fill="W" cx="12" cy="12" r="7"/><circle fill="G" cx="12" cy="12" r="4.3"/><circle fill="W" cx="12" cy="12" r="1.8"/>'],
  ['Aimant', '<path fill="none" stroke="G" stroke-width="5" d="M6.5 3v9a5.5 5.5 0 0 0 11 0V3"/><path stroke="W" stroke-width="5" stroke-opacity=".85" d="M6.5 3v3M17.5 3v3"/>'],
  ['Bouée', '<circle fill="none" stroke="G" stroke-width="5.5" cx="12" cy="12" r="7"/><path stroke="W" stroke-width="5.5" stroke-opacity=".85" d="M7 7l1.8 1.8M17 7l-1.8 1.8M7 17l1.8-1.8M17 17l-1.8-1.8"/>'],
  ['Planète', '<circle fill="G" cx="12" cy="12" r="6.5"/><ellipse fill="none" stroke="G" stroke-width="1.8" cx="12" cy="12" rx="10.5" ry="3.5" transform="rotate(-20 12 12)"/>'],
  ['Flocon', '<path stroke="G" stroke-width="2.2" stroke-linecap="round" fill="none" d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>'],
  ['Arc-en-ciel', '<g fill="none" stroke-linecap="round"><path stroke="G" stroke-width="2.6" d="M2.5 18a9.5 9.5 0 0 1 19 0"/><path stroke="G" stroke-width="2.6" stroke-opacity=".7" d="M6 18a6 6 0 0 1 12 0"/><path stroke="G" stroke-width="2.6" stroke-opacity=".45" d="M9.3 18a2.7 2.7 0 0 1 5.4 0"/></g>'],
  ['Montagne', '<path fill="G" d="M1.5 20.5L9 7l3.5 6 2.5-4 7.5 11.5z"/><path fill="W" opacity=".9" d="M9 7l2.2 4-1.4-.8-1.6 1.3-1.3-1z"/>'],
  ['Tente', '<path fill="G" d="M12 3.5L2 20.5h20z"/><path fill="W" opacity=".85" d="M12 11l-4 9.5h8z"/>'],
  ['Château', '<path fill="G" d="M3 21V6h3v2h2V6h3v2h2V6h3v2h2V6h3v15h-7v-5a2 2 0 0 0-4 0v5z"/>'],
  ['Bougie', '<rect fill="G" x="8" y="10" width="8" height="12" rx="1.5"/><path fill="G" d="M12 2.5c1.8 2 2.6 3.5 2.6 4.7a2.6 2.6 0 0 1-5.2 0c0-1.2.8-2.7 2.6-4.7z"/>'],
  ['Trèfle', '<g fill="G"><circle cx="12" cy="6.8" r="4"/><circle cx="7" cy="12.5" r="4"/><circle cx="17" cy="12.5" r="4"/></g><path fill="none" stroke="G" stroke-width="2.2" stroke-linecap="round" d="M12 12c0 4 .8 7 3 9.5"/>'],
  ['Bonhomme', '<circle fill="G" cx="12" cy="7" r="4"/><circle fill="G" cx="12" cy="16.5" r="5.8"/><g fill="W"><circle cx="10.6" cy="6.3" r=".9"/><circle cx="13.4" cy="6.3" r=".9"/><circle cx="12" cy="14.5" r="1"/><circle cx="12" cy="18" r="1"/></g>'],
];

function mix(hex, white) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * white));
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

// Couleurs « naturelles » pour quelques objets, les autres suivent la palette.
const NATURAL = { Pomme: 3, Citron: 4, Carotte: 13, Flamme: 13, Feuille: 2, Goutte: 12, Nuage: 12, Soleil: 4 };

export const SYMBOLS = S.map(([name, svg], i) => {
  const [base, dark, light] = PALETTE[NATURAL[name] ?? (i + 5 * Math.floor(i / 16)) % 16];
  return { name, svg, base, dark, light, top: mix(base, 0.25) };
});

let uid = 0;

// Renvoie le code HTML d'une tuile en relief.
export function symbolHTML(index, size = 88) {
  const s = SYMBOLS[index];
  const id = 'sg' + uid++;
  const inner = s.svg.replace(/"G"/g, `"url(#${id})"`).replace(/"W"/g, `"${s.light}"`);
  return `<span class="sym" style="--sym-light:${s.light};--sym-base:${s.base};--sym-size:${size}px">` +
    `<span class="sym-tile"><svg viewBox="0 0 24 24" aria-hidden="true"><defs>` +
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="2" x2="0" y2="22">` +
    `<stop offset="0" stop-color="${s.top}"/><stop offset=".55" stop-color="${s.base}"/><stop offset="1" stop-color="${s.dark}"/>` +
    `</linearGradient></defs>${inner}</svg></span><span class="sym-name">${s.name}</span></span>`;
}
