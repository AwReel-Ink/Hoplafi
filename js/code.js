// Codes secrets et symboles de vérification.
import { randomInt, sha256, enc } from './util.js';

// 24 caractères impossibles à confondre : pas de 0/O, 1/I/L, B/8, S/5, Z/2, G/6, Q, U/V.
export const ALPHABET = '23456789ACDEFHJKMNPRTWXY';
export const CODE_LENGTH = 8;
export const CODE_LIFETIME = 180; // secondes

export function newCode() {
  let c = '';
  for (let i = 0; i < CODE_LENGTH; i++) c += ALPHABET[randomInt(ALPHABET.length)];
  return c;
}

export function formatCode(c) {
  return c.slice(0, 4) + '-' + c.slice(4);
}

// Nettoie une saisie : minuscules acceptées, caractères interdits ignorés.
export function cleanCode(input) {
  return String(input || '').toUpperCase().split('').filter((ch) => ALPHABET.includes(ch)).join('').slice(0, CODE_LENGTH);
}

// Trois symboles calculés à partir des empreintes des deux connexions chiffrées
// et du code. Un intermédiaire aurait forcément d'autres empreintes, donc
// d'autres symboles sur l'un des deux écrans.
export async function verificationSymbols(fpA, fpB, code) {
  const [a, b] = [fpA, fpB].sort();
  const h = await sha256(enc.encode('hoplafi/sas/v1|' + a + '|' + b + '|' + code));
  const bits = (h[0] << 16) | (h[1] << 8) | h[2];
  return [(bits >> 18) & 63, (bits >> 12) & 63, (bits >> 6) & 63];
}
