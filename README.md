# Hoplàfi !

Envoyez des fichiers entre vos appareils, directement, sans serveur.

Adresse : https://awreel-ink.github.io/Hoplafi/

## Ce que fait l'application

- **Détection automatique** des appareils derrière la même box, comme PairDrop.
- **Bouton ON / OFF** : sur OFF, l'appareil est invisible et n'échange plus rien. L'application démarre toujours sur ON.
- **Passage en OFF automatique** après 5, 15, 30 ou 60 minutes sans transfert (ou jamais).
- **Indicateur dans l'onglet** : icône verte et « ON » dans le titre, icône grise et « OFF », ou le pourcentage pendant un transfert.
- **Transferts rapides** : envoi en continu par gros blocs, sans attendre de confirmation à chaque morceau.
- **Reprise après coupure** : le transfert repart là où il s'est arrêté dès que l'appareil revient.
- **Choix du dossier de réception** (Chrome, Edge, Opera, Brave sur ordinateur) : dossier mémorisé, sous-dossiers recréés, un dossier par appareil, ou choix à chaque réception. Ailleurs, les fichiers vont dans Téléchargements.
- **Connexion par code secret** quand les appareils ne se trouvent pas : code de 8 caractères valable 180 secondes, clavier dédié de 24 touches sans caractères ambigus, QR code, puis vérification par 3 symboles identiques sur les deux écrans.

## Mettre en ligne sur GitHub Pages

1. Sur GitHub, connecté au compte **awreel-ink**, créez un dépôt public nommé **Hoplafi** (bouton « New »).
2. Dans le dépôt, cliquez sur **Add file › Upload files** et glissez **tout le contenu** du dossier `hoplafi` : `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll` et les dossiers `css`, `js`, `icons`. Validez avec **Commit changes**.
   Le fichier `.nojekyll` est caché sur certains systèmes : s'il manque, créez-le dans GitHub (Add file › Create new file, nom `.nojekyll`, contenu vide).
3. Allez dans **Settings › Pages**. Dans « Build and deployment », choisissez **Deploy from a branch**, branche **main**, dossier **/ (root)**, puis **Save**.
4. Après une à deux minutes, l'application est en ligne sur https://awreel-ink.github.io/Hoplafi/

Pour publier une mise à jour, renvoyez les fichiers modifiés et changez le numéro dans `sw.js` (`hoplafi-v1` → `hoplafi-v2`) pour que les appareils récupèrent la nouvelle version.

## Comment ça marche, sans serveur

- **Rencontre** : pour se trouver, les appareils échangent quelques Ko d'informations de connexion via des relais publics gratuits (MQTT : EMQX, HiveMQ, Mosquitto). Ces messages sont chiffrés. Les trois relais sont utilisés en même temps, donc un relais en panne ne bloque rien.
- **Même réseau** : chaque appareil découvre son adresse IP publique (STUN) et rejoint la « salle » de cette adresse. La connexion obtenue est ensuite vérifiée : un inconnu qui connaîtrait votre adresse IP ne peut pas apparaître dans la liste.
- **Transfert** : les fichiers vont directement d'un appareil à l'autre en WebRTC, chiffrés (DTLS). Ils ne passent jamais par les relais.

## Limites connues

- Entre deux réseaux très verrouillés (réseau d'entreprise strict, certaines connexions 4G), la connexion directe peut échouer : il n'y a pas de serveur relais pour les fichiers.
- Sur téléphone, surtout sur iPhone, le système met l'application en pause quand on quitte l'écran. Gardez-la ouverte pendant un transfert (l'écran reste allumé automatiquement pendant le transfert, si le navigateur le permet).
- En 4G, plusieurs abonnés peuvent partager la même adresse IP publique : des inconnus sur ON pourraient alors se voir. Chaque réception doit de toute façon être acceptée, et le bouton OFF vous rend invisible.
- Sans choix de dossier (Firefox, Safari, téléphones), un très gros fichier est gardé en mémoire avant d'être enregistré.

## Tests en local

Les paramètres `?broker=ws://localhost:8090&ip=1.2.3.4&nofs=1` ne sont acceptés que sur `localhost` : ils servent à tester sans relais publics.
