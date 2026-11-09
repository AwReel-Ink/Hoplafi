// Noms d'appareils aléatoires : un animal + une couleur, accordée en genre.
import { randomInt } from './util.js';

// m = masculin, f = féminin
const ANIMALS = {
  m: [
    'Renard', 'Lion', 'Tigre', 'Loup', 'Ours', 'Lynx', 'Castor', 'Blaireau', 'Hérisson', 'Écureuil',
    'Lapin', 'Lièvre', 'Cerf', 'Chamois', 'Bison', 'Yak', 'Zèbre', 'Koala', 'Panda', 'Kangourou',
    'Lémurien', 'Okapi', 'Tapir', 'Gorille', 'Ouistiti', 'Jaguar', 'Guépard', 'Puma', 'Ocelot', 'Fennec',
    'Dauphin', 'Cachalot', 'Phoque', 'Morse', 'Requin', 'Calamar', 'Homard', 'Crabe', 'Narval', 'Manchot',
    'Pingouin', 'Pélican', 'Flamant', 'Toucan', 'Perroquet', 'Hibou', 'Corbeau', 'Moineau', 'Pigeon', 'Colibri',
    'Faucon', 'Aigle', 'Héron', 'Cygne', 'Paon', 'Kiwi', 'Bourdon', 'Scarabée', 'Grillon', 'Papillon',
    'Criquet', 'Lézard', 'Gecko', 'Caméléon', 'Triton', 'Iguane', 'Hamster', 'Furet', 'Lama', 'Alpaga',
    'Chameau', 'Mouflon', 'Wapiti', 'Élan', 'Tatou', 'Martinet', 'Macareux',
  ],
  f: [
    'Loutre', 'Baleine', 'Orque', 'Pieuvre', 'Méduse', 'Raie', 'Baudroie', 'Lamproie', 'Tortue', 'Grenouille',
    'Salamandre', 'Abeille', 'Coccinelle', 'Sauterelle', 'Libellule', 'Fourmi', 'Luciole', 'Mante', 'Chouette', 'Mouette',
    'Cigogne', 'Grue', 'Colombe', 'Hirondelle', 'Mésange', 'Fauvette', 'Perruche', 'Autruche', 'Gazelle', 'Girafe',
    'Panthère', 'Marmotte', 'Belette', 'Hermine', 'Gerboise', 'Souris', 'Antilope', 'Mangouste', 'Otarie', 'Truite',
    'Murène', 'Crevette', 'Chenille', 'Cigale', 'Fouine', 'Genette', 'Biche', 'Hulotte', 'Rainette', 'Sittelle',
  ],
};

// [masculin, féminin]
const COLORS = [
  ['Bleu', 'Bleue'], ['Rouge', 'Rouge'], ['Vert', 'Verte'], ['Gris', 'Grise'], ['Noir', 'Noire'],
  ['Blanc', 'Blanche'], ['Rose', 'Rose'], ['Jaune', 'Jaune'], ['Mauve', 'Mauve'], ['Brun', 'Brune'],
  ['Doré', 'Dorée'], ['Argenté', 'Argentée'], ['Ocre', 'Ocre'], ['Corail', 'Corail'], ['Cuivré', 'Cuivrée'],
  ['Violet', 'Violette'], ['Orange', 'Orange'], ['Pourpre', 'Pourpre'], ['Indigo', 'Indigo'], ['Azur', 'Azur'],
];

const MAX_LEN = 18;

export function randomName() {
  const all = [...ANIMALS.m.map((a) => [a, 0]), ...ANIMALS.f.map((a) => [a, 1])];
  for (;;) {
    const [animal, g] = all[randomInt(all.length)];
    const color = COLORS[randomInt(COLORS.length)][g];
    const name = animal + ' ' + color;
    if (name.length <= MAX_LEN) return name;
  }
}

export function nameCount() {
  return (ANIMALS.m.length + ANIMALS.f.length) * COLORS.length;
}
