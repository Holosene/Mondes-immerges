# Mondes Immergés: National Geographic

Ten National Geographic documentaries about aquatic worlds, linked by what truly connects them: the ocean's currents.

[![An animated globe where yellow ink follows the real ocean currents](https://raw.githubusercontent.com/holosene/Portfolio/main/public/media/mondes-immerges-site/vignette.webp)](https://holosene.fr/portfolio/mondes-immerges/)

**Live:** [holosene.fr/portfolio/mondes-immerges](https://holosene.fr/portfolio/mondes-immerges/) · **Stack:** WebGPU, three.js (TSL), Vite, Python (NumPy, SciPy) · **Year:** 2026

> Unofficial student project. Films, photographs and trademarks belong to National Geographic.

## About

NASA's measured surface velocity fields (OSCAR), the relief (ETOPO1) and the world's rivers are stored in textures. Up to 300,000 particles are advected by a compute shader and leave a yellow ink that the current carries; rivers flow down to the sea, and a hovering hand parts the water.

On the globe, each yellow frame opens a film: its story, its people, its gallery, and how to act. WebGPU with an automatic WebGL 2 fallback.

## Getting started

Requires Node 20.11 or later.

```bash
npm install
npm run dev        # Vite dev server
npm run build      # dist/
npm run lint
```

Each push to `main` is deployed to GitHub Pages by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Credits

Currents: NASA / JPL OSCAR, via NOAA CoastWatch ERDDAP. Relief and bathymetry: NOAA ETOPO1. Rivers: Natural Earth (public domain). Films and photographs: National Geographic Documentary Films.

---

<details>
<summary><strong>Version française</strong></summary>

# Mondes Immergés

Un site d'immersion autour de dix documentaires National Geographic : un globe animé par les vrais courants de surface mesurés par satellite (NASA OSCAR), sur lequel chaque cadre jaune ouvre un film. Direction artistique National Geographic : noir, jaune, blanc.

> Projet étudiant non officiel. Les films, photos et marques appartiennent à National Geographic. Les textes sont des résumés rédigés pour ce projet, à partir des pages officielles de chaque documentaire.

**En ligne :** https://holosene.fr/portfolio/mondes-immerges/

| Page         | URL                                                         |
| ------------ | ----------------------------------------------------------- |
| Accueil      | `/Mondes-immerges/`                                         |
| Globe        | `/Mondes-immerges/globe/` (`?from=<slug>` : face à ce film) |
| Documentaire | `/Mondes-immerges/documentaire/?film=<slug>`                |

Les anciennes adresses (`/interface/`, `/interface/into-the-okavango/`, `/interface/les-ombres-de-la-mer/`, `/accueil/`) redirigent vers les nouvelles.

## Les films

Into the Okavango · Sea of Shadows · The Last Ice · Endurance · Becoming Cousteau · The Rescue · Playing with Sharks · Secrets of the Whales · Secrets of the Octopus · Ocean with David Attenborough. Tous consacrés aux mondes aquatiques : eau douce, mers, glaces, grottes noyées, récifs et haute mer.

Toutes les données (lieu, coordonnées, synopsis, chiffres clés, visages, galerie, presse, liens pour agir, générique) sont dans [`src/data/films.js`](src/data/films.js). Ajouter un film, c'est ajouter une entrée : le globe, l'accueil et la page documentaire suivent.

## Le parcours

0. **Chargement** : le loader « jelly » jaune du site d'origine (recodé sans dépendance), au moins 2 s, dessiné dans un worker (OffscreenCanvas) : il ne dépend pas du fil principal ; pendant ce temps, la page ne réagit ni au clavier, ni à la molette, ni aux clics. Pendant ce temps, seuls les courants se préparent (deux pas par image, scène non dessinée sous le noir, définition figée) : le jelly reste fluide jusqu'au bout. La fin se fait en deux temps, sur toutes les pages : le jelly s'efface en fondu, puis le fond noir se lève sur la page déjà dessinée. À l'accueil, le globe et le ciel apparaissent d'abord, puis la signature, le texte, le bouton, le logo, le crédit, et enfin les cadres des films. Le globe tourne sur lui-même dans le sens horaire (vu du nord), sans pause, avant comme après « Explorer ».
1. **Accueil** : une signature, une phrase, un seul bouton (le logo de l'en-tête porte le nom, pas de grand titre). Le globe tourne déjà, centré dans l'espace libre à droite du texte.
2. **Globe** (même page, l'adresse devient `/globe/`) : on fait tourner la planète en glissant ; la molette ne fait qu'accélérer la rotation de la Terre sur son axe, comme à l'accueil ; Espace ou les flèches font un tour du monde des films, d'ouest en est, un film à la fois. Un trajet s'arrête toujours au film suivant : un nouvel appui en route ne saute pas de film, il presse le pas (jusqu'à ×2,2, vitesse de pointe plafonnée) ; un appui en sens inverse fait demi-tour. Les trajets suivent les règles des vols de cartes (Google Earth, van Wijk et Nuij) : l'arc de grand cercle, le plus court sur la sphère ; un recul de la caméra en route, d'autant plus marqué que le trajet est long, puis le retour à la distance choisie ; une durée qui croît avec la racine de la distance ; une courbe du cinquième degré, départ et arrivée en douceur ; un appui en route repart de la vitesse actuelle, sans arrêt sec ; la caméra reste sous 50° de latitude environ, jamais au-dessus d'un pôle ; la fiche du film visé s'ouvre à l'arrivée. Maj + Espace, flèche gauche ou haut reviennent au film précédent. Depuis une position libre (après un glisser), le premier pas va au film le plus proche dans le sens demandé, par le chemin le plus court, sans demi-tour ni détour par l'autre côté du globe. Le zoom (pincement ou Ctrl + molette) reste celui choisi ; « Explorer » rapproche la caméra : le globe y est plus gros. À l'accueil, le globe tourne à l'horizontale, toujours dans le même sens, et la molette ne fait qu'accélérer cette rotation. Chaque film est un cadre jaune au format de son affiche, rempli de l'affiche légèrement floutée, son titre toujours à droite et immobile : au survol, d'un seul geste suivi par un ressort, le cadre bascule de 90° vers la gauche et grandit vers la gauche seulement, jusqu'à l'affiche nette : son bord droit ne bouge pas, l'écart avec le titre est gardé ; la zone de survol est fixe (celle de l'affiche ouverte), le cadre en mouvement ne peut pas ouvrir et refermer la fenêtre en boucle, et la pulsation du petit cadre attend qu'il soit refermé : un seul cadre visible ; on peut entrer et sortir à toute vitesse, le geste repart toujours de l'état où il est. Le liseré jaune est peint par-dessus l'affiche, découpée au milieu du liseré : aucun bord noir entre les deux.
3. **Documentaire** : le film, ses visages, sa galerie (les photos arrivent en pile puis se rangent, en mosaïque ou en grille), comment agir, le monde suivant. Un bouton « Retour » flottant, à la place du logo en haut à gauche, ramène au globe face au film. À gauche, un point par section, reliés par un rail fin : un anneau jaune glisse vers la section lue.

Les transitions de page sont un fondu au noir court et sobre : la page s'éteint en 0,4 s, la suivante sort du noir en 0,6 s une fois son premier rendu posé, sans flash blanc ([`src/shared/transition.js`](src/shared/transition.js)) ; aucune transition si le mouvement réduit est demandé. Pas de barre de menu : le logo Mondes Immergés seul, en haut à gauche. Il est en code ([`src/shared/logo.js`](src/shared/logo.js)) : les contours exacts du fichier d'origine, vectorisés par [`scripts/trace-logo.py`](scripts/trace-logo.py), assemblés en variantes (complet, cadre seul, nom seul, empilé ; couleurs et rotation du cadre réglables). Tailles et typographie suivent une échelle fluide (`clamp`) : rien ne saute d'un palier à l'autre. Un grain très fin et un tramage dans les shaders effacent les paliers des dégradés sombres. Le cadre qui penche et devient fenêtre est le motif de tout le projet.

## Le globe

- **WebGPU** (three.js r187, `three/webgpu` et TSL), avec repli automatique sur WebGL 2. Sans l'un ni l'autre, la liste des films devient la page.
- **Courants réels** ([`src/globe/Currents.js`](src/globe/Currents.js)) : le champ de vitesse NASA/JPL OSCAR (1/3°) est rangé dans une texture. Jusqu'à 300 000 particules y sont advectées par un compute shader ; la direction visuelle est celle de l'encre filmée au microscope. Au courant réel s'ajoutent une micro-turbulence (rotationnel d'un bruit, deux échelles, pré-calculé dans une texture) et une agitation brownienne. Chaque particule dépose de l'encre dans une texture équirectangulaire ; à chaque image, cette encre est transportée par le courant, diffuse et s'efface (deux textures en alternance) : des panaches qui s'étalent autour de filaments nets. Les particules sont aussi dessinées en micro-éléments posés sur la surface : des grains qui scintillent et quelques cellules en anneau. Tout est en jaune National Geographic, sans halo ni volume. Les terres sont les parois d'un bocal, sur le trait de côte fin de la bathymétrie ETOPO (le champ OSCAR, à 1/3°, laissait passer les splats sur les isthmes et les rivages) : près d'une côte, les particules perdent la part de leur mouvement qui va vers la terre et rebondissent sur le rivage (un pas qui entrerait dans la terre est réfléchi : l'élan renvoyé au large persiste puis s'amortit ; seuls les splats des fleuves entrent dans les terres), et l'encre n'existe qu'en mer et dans le lit des fleuves ; elles y renaissent souvent au large, pour qu'aucun amas lumineux ne se forme. Les cœurs chauds de l'encre ne brillent qu'au large. Les mers sans mesure OSCAR (Méditerranée, mer Noire, mer Rouge, Baltique, baie d'Hudson, marges antarctiques) sont complétées par un courant côtier cyclonique, et le masque océan suit le trait de côte du relief.
- **Nuit et profondeur** : ETOPO1 (NOAA) ombré avec un relief accentué (pentes exagérées, vallées creusées, crêtes soulevées) dans un gris-blanc clinique, à peine froid, sous un clair de lune bas : les courants sont la vraie source de lumière. L'océan est un bleu dégradé : bleu sourd sur les plateaux continentaux, bleu nuit presque noir au-dessus des abysses (bathymétrie ETOPO) ; l'encre s'étouffe légèrement au-dessus des abysses. Les splats de l'océan flottent à des hauteurs différentes (les courants rapides plus haut) ; ceux des fleuves restent collés aux terres.
- **Fleuves** : les fleuves du monde (Natural Earth 1:10 M, du Nil et de l'Amazone jusqu'aux fleuves comme la Dordogne ; les petites rivières sont laissées de côté), dessinés par des micro-éléments en mouvement, épaisseur selon le rang ; sans lit noir : le tracé suit exactement la carte des fleuves, aux bords lisses et fondus comme ceux des lacs, prolongé jusqu'à la mer par un estuaire qui s'évase. Les fleuves sont vivants : sur tous les continents à la fois, leur lumière respire lentement (deux houles d'environ 7 s et 17 s superposées, sans clignoter), tantôt jaune franc, tantôt jaune pâle (la respiration passe par la couleur et non par l'opacité : les tronçons denses et les fins changent ensemble), et chaque splat fluvial y laisse un filet d'encre jaune. Le sens de l'écoulement suit la distance à la mer le long du réseau (parcours en largeur depuis les embouchures, qui franchit les petites coupures du tracé pour garder les affluents reliés ; les bassins fermés s'écoulent vers leur point le plus bas). Environ une particule sur trois naît sur un fleuve et descend lentement (environ un degré par seconde) (départs répartis uniformément sur tout le réseau, affluents et bassins fermés compris) : un splat or qui descend le courant (sens tiré du gradient de cette phase), reste au fond du lit et rejoint l'océan à l'embouchure. Là où le sens se perd (confluences contraires, bassins fermés comme l'Okavango), il disparaît au lieu de s'entasser.
- **Interaction** ([`src/globe/Globe.js`](src/globe/Globe.js)) : rotation libre, zoom, rotation automatique au repos, vols de caméra. Les marqueurs sont en HTML, recalés à chaque image, masqués derrière la planète, étiquettes qui se chevauchent effacées. Le survol ne touche jamais la simulation : il est purement visuel et temporaire, un doigt plongé dans l'eau. Il n'agit que sur la mer, jamais sur les fleuves ; le doigt écarte légèrement l'eau et le geste l'entraîne sur son passage. Quand il quitte le globe, l'empreinte se résorbe lentement dans le dessin d'origine. Les micro-éléments en cellule sont cachés : la touche X les fait apparaître, pleins, puis les cache à nouveau. Le survol fait des ondes concentriques autour du doigt : petites et serrées quand il est immobile, elles portent plus loin et plus fort quand le geste accélère. Fleuves : seuls les splats dorés les dessinent, sans tracé peint. Fond : une nébuleuse froide, Voie lactée bleutée sur un noir à peine bleu. Sur les continents, aucune réaction liquide.
- **Textures** : [`scripts/textures.py`](scripts/textures.py) les refabrique depuis le serveur ERDDAP de la NOAA (numpy, scipy, pillow) ; `--from-png currents.png` repart d'une texture existante si le serveur est indisponible. [`scripts/hydro.py`](scripts/hydro.py) fabrique `rivers.png` (présence de l'eau et phase de l'écoulement), `river-seeds.bin` (départs des splats fluviaux) et `depth.jpg` depuis Natural Earth (rivers + lake centerlines, 1:10 M) et ETOPO.
- **Performances** : le coût GPU d'une image passe d'environ 13,3 ms à 8,1 ms (−39 %, 2880 × 1800, mesuré sur `__globe.frame()`), pour un rendu identique. La Voie lactée est précalculée une fois dans une texture équirectangulaire au lieu d'être recalculée à chaque pixel (scène : 6,3 → 2,0 ms). Côté courants (8,7 → 6,8 ms) : mipmaps générées une seule fois par image, particules du méridien de raccord compactées par le compute shader au lieu d'une seconde passe complète, champ de micro-turbulence rafraîchi par quarts sur quatre images (plus de pic toutes les quatre images), dépôts d'encre calculés par sommet, branches du survol sautées quand aucun doigt ne touche l'eau. Côté page : la galerie s'anime en FLIP (transform seulement, plus d'animation de largeur ni de hauteur), le cadre des marqueurs se place par `translate`, et les marqueurs sont recalés sans allocation ni mise en page forcée.

## Développement

```bash
npm install
npm run dev        # serveur Vite
npm run build      # génère dist/
npm run check      # vérifie qu'aucun fichier référencé ne manque dans dist/
npm run lint       # ESLint
npm run format     # Prettier
npm run preview    # sert dist/ comme sur GitHub Pages
```

Node 20.11 ou plus récent. Chaque push sur `main` est déployé sur GitHub Pages par l'action [`deploy.yml`](.github/workflows/deploy.yml).

## Structure

```
index.html                 accueil (globe en mode intro)
globe/index.html           le globe (même script, mode explore)
documentaire/index.html    la fiche d'un film
src/data/films.js          contenu des dix films
src/globe/                 globe WebGPU et simulation des courants
scripts/                   fabrication des textures, vérification des liens
src/pages/                 un script par page
src/shared/                en-tête, transitions, apparitions au défilement
src/styles/                base commune + une feuille par page
public/                    polices (Abyss, Geograph), textures, logos, favicon, redirections
```

## Accessibilité

Navigation au clavier (marqueurs, liste des films, fiche, Échap pour fermer), focus visible, lightbox en `<dialog>`, textes alternatifs. Avec `prefers-reduced-motion`, les animations sont coupées ou ralenties.

## Crédits

- Films, photos et textes de référence : [National Geographic Documentary Films](https://films.nationalgeographic.com/) et les dossiers de presse National Geographic ([detpress.com/natgeo](https://www.detpress.com/natgeo/)) pour Playing with Sharks, Secrets of the Whales, Secrets of the Octopus et Ocean. Les photos sont chargées depuis leurs CDN, avec leur crédit.
- Courants : NASA/JPL OSCAR (Ocean Surface Current Analysis Real-time), via NOAA CoastWatch ERDDAP.
- Relief et bathymétrie : NOAA ETOPO1, via NOAA CoastWatch ERDDAP.
- Fleuves : Natural Earth, Rivers + lake centerlines 1:10 M (domaine public).
- Polices : Abyss, Geograph.

</details>


## License

Source code: [MIT](LICENSE). Media (images, video, audio, 3D captures, fonts, texts) are not covered and remain the property of Johann Arata or of their respective authors; all rights reserved.
