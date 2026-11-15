import * as THREE from 'three/webgpu';
import {
    Fn,
    If,
    cameraPosition,
    cos,
    dot,
    float,
    fract,
    max,
    mix,
    normalWorld,
    normalize,
    positionWorld,
    pow,
    smoothstep,
    texture,
    uniform,
    uv,
    vec2,
    vec3,
    vec4,
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Currents } from './Currents.js';
import { createSky } from './Sky.js';
import { dither } from './dither.js';
import { toVector } from './geo.js';

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const YELLOW = new THREE.Color('#ffcc00');

const load = (url, colorSpace) =>
    new THREE.TextureLoader().loadAsync(url).then((t) => {
        t.colorSpace = colorSpace;
        t.anisotropy = 8;
        return t;
    });

/**
 * Le globe : WebGPU (repli automatique sur WebGL 2), relief ETOPO, courants NASA OSCAR simulés sur le GPU,
 * micro-splats dorés, marqueurs HTML recalés à chaque image.
 */
export class Globe {
    static async create(options) {
        const globe = new Globe(options);
        await globe.ready;
        return globe;
    }

    constructor({ canvas, markers, base, mobile }) {
        this.canvas = canvas;
        this.markers = markers;
        this.mobile = mobile;
        this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.renderer = new THREE.WebGPURenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.75 : 2));
        this.renderer.setClearColor(0x000000, 1);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
        this.camera.position.copy(toVector(20, 10, 4.2));

        this.controls = new OrbitControls(this.camera, canvas);
        Object.assign(this.controls, {
            enableDamping: true,
            dampingFactor: 0.07,
            enablePan: false,
            minDistance: 2.15, // au-delà, le relief (4096 px) devient flou
            maxDistance: 7,
            rotateSpeed: 0.4,
            zoomSpeed: 0.6,
            autoRotate: !this.reducedMotion,
            autoRotateSpeed: -0.6, // négatif : le globe tourne sur lui-même dans le sens horaire (vu du nord)
        });
        this.controls.addEventListener('start', () => {
            this.hold();
            this.endTour();
        });

        // La molette fait parcourir les films un à un (voir tourStep) ; le pincement et Ctrl + molette zooment
        this.stops = [...markers].sort((a, b) => a.lng - b.lng); // un tour du monde d'ouest en est
        this.tour = null;
        this.onTour = null; // (marqueur | null) : le film mis en avant par le parcours
        this.spin = 0;
        this.boost = 0; // accueil : élan donné à la rotation par la molette, qui retombe doucement
        addEventListener(
            'wheel',
            (e) => {
                if (e.ctrlKey || e.target.closest?.('dialog')) return;
                e.preventDefault();
                e.stopPropagation();
                const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                // Accueil : la molette ne fait qu'accélérer la rotation horizontale, toujours dans le même sens
                if (document.body.dataset.mode !== 'explore') {
                    this.boost = Math.min(14, this.boost + Math.abs(d) * (e.deltaMode === 1 ? 16 : 1) * 0.02);
                    return;
                }
                const t = this.tour;
                // la caméra a bougé depuis (glisser, rotation automatique) : le parcours repart d'ici, sans saut
                if (!t || this.camera.position.distanceToSquared(t.last) > 1e-4) this.startTour();
                this.tour.live = true;
                // même vitesse et même inertie qu'une rotation libre : ~0,09 rad par cran de molette
                this.impulse = (this.impulse ?? 0) + d * (e.deltaMode === 1 ? 16 : 1) * 0.0009;
                this.wheelAt = performance.now();
                if (d) this.heading = Math.sign(d); // sens du parcours : l'aimant ne tire que vers l'avant
                this.hold(6);
            },
            { capture: true, passive: false },
        );

        this.shift = { target: 0, current: 0 };
        this.flight = null;
        this.idleTimer = 0;
        this.clock = new THREE.Timer();

        // Survol : le curseur remue l'encre (voir Currents) ; intersection rayon-sphère analytique, sans maillage
        this.pointer = { on: false, ndc: new THREE.Vector2(), last: null };
        canvas.addEventListener('pointermove', (e) => {
            const r = canvas.getBoundingClientRect();
            this.pointer.ndc.set(
                ((e.clientX - r.left) / r.width) * 2 - 1,
                -((e.clientY - r.top) / r.height) * 2 + 1,
            );
            this.pointer.on = true;
        });
        canvas.addEventListener('pointerleave', () => (this.pointer.on = false));
        // Espace : les micro-éléments en anneau deviennent pleins, puis creux à nouveau
        addEventListener('keydown', (e) => {
            if (e.code !== 'Space' || e.repeat) return;
            if (e.target.closest?.('input, textarea, select, button, a, [contenteditable]')) return;
            e.preventDefault();
            this.fill = !this.fill;
        });

        this.ready = this.build(base);
    }

    async build(base) {
        await this.renderer.init();
        const [relief, depthMap, rivers, seeds, field] = await Promise.all([
            load(`${base}textures/relief.jpg`, THREE.SRGBColorSpace),
            load(`${base}textures/depth.jpg`, THREE.NoColorSpace),
            load(`${base}textures/rivers.png`, THREE.NoColorSpace),
            // départs des splats fluviaux (uint16 x, y en uv), voir scripts/hydro.py
            fetch(`${base}textures/river-seeds.bin`)
                .then((r) => r.arrayBuffer())
                .then((b) => Float32Array.from(new Uint16Array(b), (v) => v / 65535)),
            load(`${base}textures/currents.png`, THREE.NoColorSpace).then((t) => {
                t.generateMipmaps = false;
                t.minFilter = THREE.LinearFilter;
                t.wrapS = THREE.RepeatWrapping;
                return t;
            }),
        ]);
        for (const t of [depthMap, rivers]) t.wrapS = THREE.RepeatWrapping;

        this.currents = new Currents({
            field,
            rivers,
            depth: depthMap,
            seeds,
            count: this.mobile ? 110_000 : 300_000,
            resolution: this.mobile ? 2048 : 4096,
            webgpu: this.renderer.backend.isWebGPUBackend === true,
        });

        // Surface : relief + traînées des courants, lumière douce venue de la caméra, liseré atmosphérique
        this.uSun = uniform(new THREE.Vector3(0, 0, 1));
        this.uCurrents = uniform(1);
        const c = this.currents;
        // tourbillon du survol : centre (uv) et torsion, pilotés par eddy() ; l'encre et les splats le suivent
        this.uEddy = c.uEddy;
        this.uTwist = c.uTwist;
        // Survol, purement visuel (la simulation n'est jamais touchée) : un doigt dans l’eau. Sous le curseur,
        // l'encre s'enroule dans le sens horaire (une torsion qui décroît avec la distance, comme dans les
        // tourbillons océaniques) et se laisse entraîner dans le sens du geste ; le tourbillon suit la main avec
        // l’inertie d’un liquide, puis se fond dans le dessin d'origine quand elle quitte le globe.
        const k = cos(uv().y.sub(0.5).mul(Math.PI)).mul(2); // écart isotrope malgré la projection
        const ox = fract(uv().x.sub(this.uEddy.x).add(0.5)).sub(0.5).mul(k);
        const oy = uv().y.sub(this.uEddy.y);
        const { shift, core } = c.finger(ox, oy, 1);
        // les continents sont une paroi : l'encre n'est jamais lue de l'autre côté d'un rivage
        const reach = vec2(shift.x.div(max(k, 0.05)), shift.y);
        const lens = uv().add(reach.mul(c.wall(uv(), reach)));
        const surface = new THREE.MeshBasicNodeMaterial();
        surface.colorNode = Fn(() => {
            // Profondeur (bathymétrie) : une seule lecture, qui sert au trait de côte et au fond des mers
            const depth = texture(depthMap, uv()).r;
            // trait de côte fin (bathymétrie), le même que celui de la simulation
            const water = smoothstep(0.012, 0.045, depth);
            // L'encre, déformée sous le doigt seulement en mer (l'encre des fleuves n'est jamais déformée). Hors
            // survol, la branche (uniforme) évite le doigt et ses six sondes du rivage pour chaque pixel
            const trail = c.trailNode.toVar();
            If(c.uEddyOn.greaterThan(0), () => {
                trail.assign(mix(trail, c.reader(lens), c.uEddyOn.mul(water)));
            });
            const n = normalize(normalWorld);
            const view = normalize(cameraPosition.sub(positionWorld));
            const ground = texture(relief, uv()).rgb;
            const facing = max(dot(n, view), 0);
            // Nuit (pas totale) : un clair de lune bas qui modèle la sphère, assez sombre pour que les courants
            // soient la vraie source de lumière
            const diffuse = smoothstep(-0.3, 1, dot(n, this.uSun));
            const light = float(0.12).add(diffuse.mul(0.5));
            // assombrissement du bord : la sphère s'arrondit, le centre semble avancer vers nous
            const limb = mix(float(0.5), float(1), pow(facing, 0.45));
            // Fleuves : aucun tracé fixe, ce sont les micro-éléments qui y coulent qui les dessinent
            // le lit n'est que la trace de l'eau laissée par les splats des fleuves (canal B de l'encre) : il
            // apparaît, s'étale en fondu et s'efface avec leur passage, comme les rivages
            // la forme exacte vient de la carte des fleuves (adoucie entre deux niveaux de détail : pas de pixels
            // en escalier), le noir n'y apparaît que là où passent les splats
            // épaisseur adaptée au zoom : le niveau de détail choisi par la carte graphique selon la taille à
            // l'écran, renforcé, garde chaque grand fleuve lisible de loin ; de près, le tracé fin domine
            const fine = texture(rivers, uv()).level(0).r;
            const course = max(fine, texture(rivers, uv()).r.mul(1.15).min(1));
            // le lit n'est noir que là où passent les splats : pas de noir sans jaune
            const bed = smoothstep(0.62, 0.93, course)
                .mul(smoothstep(0.004, 0.06, trail.b))
                .mul(float(1).sub(water));
            const sea = water.add(bed.mul(0.9)).mul(this.uCurrents); // l'encre brille aussi dans le lit des fleuves
            // Profondeur : plus l'eau est profonde, plus elle est sombre et dense ; les plateaux restent clairs
            // encre : un voile translucide là où elle est diluée, dense et lumineuse dans les filaments ;
            // un peu étouffée au-dessus des abysses, comme vue à travers une eau épaisse
            // sous le doigt, l'eau est écartée : un léger creux dans l'encre
            const ink = smoothstep(0.03, 0.95, trail.r).mul(float(1).sub(core.mul(0.2).mul(water)));
            const glow = pow(ink, 0.8)
                .mul(1.15)
                .mul(sea)
                .mul(mix(float(1.1), float(0.78), depth));
            // cœurs chauds : seulement au large (contre les côtes, ils faisaient des points blancs)
            const hot = smoothstep(0.15, 1.2, trail.g)
                .min(0.6)
                .mul(water)
                .mul(this.uCurrents)
                .mul(smoothstep(0.03, 0.18, depth));
            // mers d'autant plus noires et froides qu'elles sont profondes
            const abyss = mix(vec3(1.25, 1.22, 1.15), vec3(0.32, 0.36, 0.46), pow(depth, 0.8));
            const deep = ground.mul(0.55).mul(abyss).mul(light).mul(limb).mul(0.62);
            // Terres : un blanc clinique, à peine froid, comme une planche d'anatomie ; le relief n'y est
            // qu'un modelé doux, éclairé à part (les terres ne plongent pas dans la nuit des océans)
            const shade = dot(ground, vec3(0.3, 0.59, 0.11));
            const white = vec3(0.86, 0.885, 0.91).mul(smoothstep(0.05, 0.75, shade).mul(0.38).add(0.58));
            const land = white.mul(limb).mul(mix(float(0.74), float(1), diffuse));
            // fleuves : seul le jaune des micro-éléments et de leur encre, sans lit noir
            let color = land;
            color = mix(color, deep, water);
            const Y = vec3(YELLOW.r, YELLOW.g, YELLOW.b);
            // Fleuves vivants : sur les continents, une même respiration lumineuse partout à la fois, lente et sans
            // clignoter. Deux houles de périodes différentes (≈ 7 s et ≈ 17 s) se superposent : les fleuves sont
            // tantôt intensément jaunes, tantôt plus sourds, jamais au même rythme deux fois de suite.
            const swell = c.uRiverBeat; // calculée une fois par image (voir frame) : la même valeur partout
            const lit = smoothstep(0.35, 0.9, course)
                .mul(float(1).sub(water))
                .mul(this.uCurrents)
                .mul(mix(float(0.38), float(1), swell));
            // même gamme que les océans : doré orangé quand ils sont sourds, jaune clair et éclatant au plus fort
            const river = mix(vec3(1, 0.62, 0.02), vec3(1, 0.9, 0.38), swell);
            color = mix(color, river, lit.mul(0.9)).add(
                vec3(1, 0.85, 0.3).mul(lit).mul(swell.mul(swell)).mul(0.35),
            );
            // jaune National Geographic posé tel quel (lumière propre : l'encre ne passe pas dans l'ombre),
            // cœur des courants rapides jaune clair
            color = mix(color, Y, glow.mul(1.25).min(1)).add(vec3(1, 0.9, 0.35).mul(hot).mul(0.9));
            return vec4(dither(color), 1);
        })();
        this.surface = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 160), surface);

        const sky = createSky({ count: this.mobile ? 2500 : 5000 });
        sky.userData.bake(this.renderer);
        this.scene.add(this.surface, this.currents.splats, sky);

        await this.currents.start(this.renderer);
        // pipelines compilés en tâche de fond avant la première image : pas de gel du fil principal (ni du loader)
        await this.renderer.compileAsync(this.scene, this.camera);
        // les courants se dessinent pendant le chargement (premières images en pas multiples) : quand le loader se
        // lève, le globe est déjà complet et tourne à sa cadence normale
        this.warm = new Promise((resolve) => (this.currents.onWarm = resolve));
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.renderer.setAnimationLoop(() => this.frame());
    }

    /**
     * Parcours à la molette : chaque cran avance le long d'un tour du monde des films (d'ouest en est). Le
     * premier arrêt est le point de vue actuel (aucun saut), puis le film le plus proche, puis les suivants.
     * Entre deux films, la caméra prend un détour en arc (de sens alterné) et recule un peu avant de revenir au
     * zoom choisi : on ne repasse jamais exactement au même endroit. Arrivée sur un film, elle s'y attarde
     * (palier), le film est mis en avant (onTour), et à l'arrêt de la molette elle se pose sur l'arrêt le plus proche.
     */
    startTour() {
        const dir = this.camera.position.clone().normalize();
        let base = 0;
        let best = -2;
        this.stops.forEach((m, i) => {
            const d = toVector(m.lat, m.lng, 1).dot(dir);
            if (d > best) [best, base] = [d, i];
        });
        this.flight = null;
        this.tour = {
            s: 0,
            dir,
            r: this.camera.position.length(),
            base,
            near: best > Math.cos(0.2), // déjà sur un film : il compte comme l'arrêt de départ
            last: this.camera.position.clone(),
            view: dir.clone(), // direction réellement montrée : suit le tracé avec un léger lissage
            live: false,
            focus: undefined,
        };
    }

    endTour() {
        if (!this.tour) return;
        this.tour = null;
        this.spin = 0;
        this.impulse = 0;
        this.onTour?.(null);
    }

    /** Le film de l'arrêt k (0 : point de départ, film seulement si l'on y était déjà). */
    stopAt(k) {
        const t = this.tour;
        if (k === 0 && !t.near) return null;
        const n = this.stops.length;
        const i = t.near ? t.base + k : t.base + k - Math.sign(k);
        return this.stops[((i % n) + n) % n];
    }

    tourStep(delta) {
        const t = this.tour;
        if (!t?.live) return;
        // la vitesse d'avant : un élan qui s'amortit doucement. Autour de chaque film, une zone aimantée : la
        // caméra y ralentit un peu, et si l'élan s'éteint dans la zone, elle se pose en douceur sur le film
        // (rapprochement amorti, sans dépassement). Un nouveau cran de molette l'en fait ressortir.
        const ZONE = 0.3; // demi-largeur de la zone, en fraction du trajet entre deux films
        const frames = delta * 60;
        // chaque cran de molette n'est pas un à-coup : son élan est versé en ≈ 0,25 s, la vitesse monte en douceur
        const feed = (this.impulse ?? 0) * (1 - Math.exp(-delta * 11));
        this.impulse -= feed;
        this.spin += feed;
        const goal = Math.round(t.s);
        const gap = goal - t.s;
        // on n'est attiré que par le film vers lequel on va : en quitter un ne ramène jamais en arrière
        const ahead = Math.abs(gap) < 0.02 || Math.sign(gap) === this.heading;
        const pull = this.stopAt(goal) && ahead && Math.abs(gap) < ZONE ? 1 - Math.abs(gap) / ZONE : 0;
        const turn = this.spin * 0.12 * frames; // angle parcouru cette image (rad)
        this.spin *= 0.88 ** frames * Math.exp(-delta * 2.2 * pull); // freinage léger près d'un film
        const dir = (m) => (m ? toVector(m.lat, m.lng, 1) : t.dir.clone());
        // l'avancement entre deux films suit l'angle réel qui les sépare : vitesse constante à l'écran
        const k0 = Math.floor(t.s);
        const span = Math.max(0.05, dir(this.stopAt(k0)).angleTo(dir(this.stopAt(k0 + 1))));
        t.s += turn / span;
        // seulement une fois la molette lâchée : un pavé tactile qui défile lentement n'est jamais retenu
        const released = performance.now() - (this.wheelAt ?? 0) > 200;
        const idle = Math.abs(this.impulse) < 1e-5;
        if (pull > 0 && released && idle && Math.abs(this.spin) < 0.004) {
            const g = Math.round(t.s);
            t.s += (g - t.s) * Math.min(1, delta * 3.2); // se pose sur le film
            if (Math.abs(this.spin) < 1e-5 && Math.abs(g - t.s) < 1e-3) {
                t.s = g;
                this.spin = 0;
                t.resting = true;
            }
        } else if (idle && Math.abs(this.spin) < 1e-5) {
            this.spin = 0;
            t.resting = true; // arrêt entre deux films : on reste là, comme avant
        } else t.resting = false;
        const k = Math.floor(t.s);
        const f = t.s - k;
        // Tracé continu (spline de Catmull-Rom sur les arrêts voisins, ramenée sur la sphère) : la vitesse et la
        // direction varient sans coude au passage d'un film ; dans un virage serré, la caméra ralentit puis
        // repart progressivement, au lieu de piler.
        const [a0, a, b, b1] = [-1, 0, 1, 2].map((o) => dir(this.stopAt(k + o)));
        const f2 = f * f;
        const f3 = f2 * f;
        const p = new THREE.Vector3()
            .addScaledVector(a0, -0.5 * f3 + f2 - 0.5 * f)
            .addScaledVector(a, 1.5 * f3 - 2.5 * f2 + 1)
            .addScaledVector(b, -1.5 * f3 + 2 * f2 + 0.5 * f)
            .addScaledVector(b1, 0.5 * f3 - 0.5 * f2);
        if (p.lengthSq() < 1e-6) p.copy(a);
        p.normalize();
        // une légère courbe d'un film à l'autre, à distance constante : le zoom ne bouge pas. En sin², elle part
        // et arrive tangente au trajet, même quand son sens alterne d'un film à l'autre
        const side = new THREE.Vector3().crossVectors(a, b);
        if (side.lengthSq() > 1e-8) side.normalize();
        p.addScaledVector(side, Math.sin(Math.PI * f) ** 2 * 0.12 * (k % 2 ? 1 : -1)).normalize();
        p.y = THREE.MathUtils.clamp(p.y, -0.93, 0.93); // jamais pile au-dessus d'un pôle
        // la caméra suit le tracé avec un lissage exponentiel (≈ 0,1 s) : les changements d'allure et les
        // virages aux films sont arrondis, sans retard perceptible
        t.view.lerp(p, 1 - Math.exp(-delta * 12)).normalize();
        this.camera.position.copy(t.view).multiplyScalar(t.r);
        t.last.copy(this.camera.position);
        if (t.resting && t.view.distanceToSquared(p) < 1e-9) t.live = false;
        const near = Math.round(t.s);
        const focus = Math.abs(t.s - near) < 0.2 ? this.stopAt(near) : null; // la fiche s'ouvre en entrant dans la zone
        if (focus !== t.focus) {
            t.focus = focus;
            this.onTour?.(focus);
        }
    }

    /** Le curseur sur l'océan : position en uv de la texture, vitesse lissée, présence qui monte et retombe. */
    stir(delta) {
        const c = this.currents;
        const p = this.pointer;
        let hit = null;
        if (p.on && document.body.dataset.mode === 'explore') {
            const ray = (this.ray ??= new THREE.Raycaster());
            ray.setFromCamera(p.ndc, this.camera);
            const o = ray.ray.origin;
            const d = ray.ray.direction;
            const b = o.dot(d);
            const disc = b * b - (o.lengthSq() - 1);
            if (disc > 0) {
                const n = o.clone().addScaledVector(d, -b - Math.sqrt(disc)); // point de la sphère (rayon 1)
                const x = (((Math.atan2(n.z, -n.x) / (2 * Math.PI)) % 1) + 1) % 1;
                hit = new THREE.Vector2(x, 1 - Math.acos(THREE.MathUtils.clamp(n.y, -1, 1)) / Math.PI);
            }
        }
        const on = c.uPointerOn.value;
        c.uPointerOn.value = on + ((hit ? 1 : 0) - on) * Math.min(1, delta * 6);
        if (!hit) {
            p.last = null;
            c.uPointerVel.value.multiplyScalar(0.9);
            this.eddy(delta, null);
            return;
        }
        if (p.last && delta > 0) {
            let dx = hit.x - p.last.x;
            dx -= Math.round(dx);
            const cosLat = Math.cos((hit.y - 0.5) * Math.PI);
            const v = new THREE.Vector2((dx * 2 * cosLat) / delta, (hit.y - p.last.y) / delta).clampLength(
                0,
                0.08,
            );
            c.uPointerVel.value.lerp(v, Math.min(1, delta * 10));
        }
        p.last = hit;
        c.uPointer.value.copy(hit);
        this.eddy(delta, hit);
    }

    /**
     * La main dans l'eau. Le tourbillon apparaît dès que le curseur touche le globe, le suit avec un léger
     * retard (l'inertie d'un liquide) et s'enroule dans le sens horaire, vite puis de plus en plus lentement.
     * Le geste entraîne l'eau dans sa direction. Quand le curseur quitte le globe, rien ne se déroule à
     * l'envers : le tourbillon se fond lentement (quelques secondes) dans le dessin d'origine.
     */
    eddy(delta, hit) {
        const c = this.currents;
        const k = (rate) => Math.min(1, delta * rate);
        // un geste rapide n'imprime qu'un effet léger ; c'est le doigt posé, immobile, qui creuse le tourbillon
        const calm = 1 / (1 + (c.uPointerVel.value.length() / 0.02) ** 2);
        const on = c.uEddyOn.value;
        // après le passage du doigt, l'eau met quelques secondes à se remettre : l'empreinte se résorbe lentement
        c.uEddyOn.value = on + ((hit ? 0.55 + 0.45 * calm : 0) - on) * k(hit ? 6 : 0.75);
        // le tourbillon se creuse de plus en plus vite tant que le doigt reste : doux au contact, puis
        // exponentiel (sens horaire seulement, plafonné pour ne jamais devenir illisible)
        this.dwell = hit ? ((this.dwell ?? 0) + delta) * (calm > 0.5 ? 1 : 1 - k(3)) : 0;
        // empreinte résorbée : tout revient à zéro exact, ce qui libère les shaders de la branche du survol
        if (!hit && c.uEddyOn.value < 0.01) {
            this.uTwist.value = 0;
            c.uEddyOn.value = 0;
        } else if (hit && !this.reducedMotion)
            this.uTwist.value = Math.min(
                6,
                this.uTwist.value + delta * 0.34 * calm * Math.exp(this.dwell * 0.6),
            ); // le doigt plonge : vite, puis de plus en plus lentement
        // sillage : la vitesse du geste, lissée comme une eau qui suit puis se repose
        const wake = this.reducedMotion
            ? new THREE.Vector2()
            : c.uPointerVel.value.clone().multiplyScalar(0.32);
        c.uWake.value.lerp(hit ? wake : new THREE.Vector2(), k(hit ? 4 : 0.9));
        if (hit) {
            const e = this.uEddy.value;
            if (on < 0.02) e.copy(hit);
            else {
                e.x = (e.x + (((hit.x - e.x + 1.5) % 1) - 0.5) * k(14) + 1) % 1;
                e.y += (hit.y - e.y) * k(14);
            }
        }
        // Espace : cellules creuses ↔ pleines, en fondu
        const fill = this.fill ? 1 : 0;
        c.uFill.value += (fill - c.uFill.value) * k(6);
        if (Math.abs(fill - c.uFill.value) < 1e-3) c.uFill.value = fill; // fondu achevé : cellules cachées pour de bon
    }

    /** L'utilisateur prend la main : la rotation automatique s'arrête un moment. */
    hold(seconds = 10) {
        if (document.body.dataset.mode !== 'explore') seconds = Math.min(seconds, 1.5); // accueil : il repart vite
        this.controls.autoRotate = false;
        this.flight = null;
        clearTimeout(this.idleTimer);
        if (!this.reducedMotion)
            this.idleTimer = setTimeout(() => (this.controls.autoRotate = true), seconds * 1000);
    }

    /**
     * Qualité adaptative : si l'appareil ne tient pas la cadence (moyenne au-delà de ~42 ms… 24 fps), la
     * définition baisse par paliers de 0,25 jusqu'à 1 ; elle remonte quand la marge revient. Jamais de saut :
     * un palier au plus toutes les 2 s (6 s pour remonter).
     */
    govern(dt) {
        if (dt > 0.25) return; // onglet repris, image isolée : ne compte pas
        const q = (this.quality ??= { avg: 1 / 60, t: 0, max: this.renderer.getPixelRatio() });
        q.avg += (dt - q.avg) * 0.05;
        q.t += dt;
        const dpr = this.renderer.getPixelRatio();
        let next = dpr;
        if (q.t > 2 && q.avg > 1 / 40 && dpr > 1) next = Math.max(1, dpr - 0.25);
        else if (q.t > 6 && q.avg < 1 / 55 && dpr < q.max) next = Math.min(q.max, dpr + 0.25);
        if (next === dpr) return;
        q.t = 0;
        this.renderer.setPixelRatio(next);
        this.resize();
    }

    /** Relance la rotation passive tout de suite (sans attendre la fin d'une pause d'interaction). */
    spinOn() {
        clearTimeout(this.idleTimer);
        if (!this.reducedMotion) this.controls.autoRotate = true;
    }

    /** Vol de caméra vers un lieu (ou simple changement de distance si lat/lng sont omis). */
    flyTo({ lat, lng, distance, duration = 1800 }) {
        this.endTour();
        const from = this.camera.position.clone();
        const fromDir = from.clone().normalize();
        const toDir = lat === undefined ? fromDir.clone() : toVector(lat, lng, 1).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(fromDir, toDir);
        const identity = new THREE.Quaternion();
        const start = performance.now();
        const span = this.reducedMotion ? 1 : duration;
        const target = distance ?? from.length();
        return new Promise((resolve) => {
            this.flight = () => {
                const t = easeInOut(Math.min((performance.now() - start) / span, 1));
                const length = THREE.MathUtils.lerp(from.length(), target, t);
                // simple changement de distance : la direction reste libre, la rotation passive continue
                if (lat === undefined) this.camera.position.setLength(length);
                else
                    this.camera.position
                        .copy(fromDir)
                        .applyQuaternion(identity.clone().slerp(q, t))
                        .multiplyScalar(length);
                if (t >= 1) {
                    this.flight = null;
                    resolve();
                }
            };
        });
    }

    /** Place immédiatement la caméra face à un lieu. */
    face(lat, lng, distance) {
        this.endTour();
        this.camera.position.copy(toVector(lat, lng, distance));
        this.camera.lookAt(0, 0, 0);
    }

    /** Décale le globe horizontalement, en fraction de la largeur de l'écran (0 : centré). */
    setShift(value, instant = false) {
        this.shift.target = value;
        if (instant) {
            this.shift.current = value;
            this.applyShift(true);
        }
    }

    setCurrents(visible) {
        this.uCurrents.value = visible ? 1 : 0;
    }

    resize() {
        const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.fov = w / h < 0.8 ? 46 : 32;
        this.size = { w, h };
        // étiquettes remesurées (police fluide, mobile)
        this.markers.forEach((m) => {
            m.width = undefined;
            m.fit = undefined;
            if (m.label) m.label.style.maxWidth = '';
        });
        this.applyShift(true);
    }

    applyShift(force = false) {
        const s = this.shift;
        const next = s.current + (s.target - s.current) * 0.05;
        if (!force && Math.abs(next - s.current) < 1e-5) return;
        s.current = Math.abs(s.target - next) < 1e-4 ? s.target : next;
        const { w, h } = this.size;
        if (s.current === 0) this.camera.clearViewOffset();
        else this.camera.setViewOffset(w, h, -w * s.current, 0, w, h);
        this.camera.updateProjectionMatrix();
    }

    frame() {
        if (document.hidden) return;
        this.clock.update();
        const raw = this.clock.getDelta();
        const delta = Math.min(raw, 1 / 20); // retour sur un onglet caché : pas de saut
        this.govern(raw);
        if (this.flight) this.flight();
        this.tourStep(delta);
        // accueil : rotation horizontale continue, plus franche, que la molette accélère ; le globe en mode
        // exploration reprend la rotation lente
        const intro = document.body.dataset.mode !== 'explore';
        this.boost *= Math.exp(-delta * 1.4);
        // vitesse de base lissée : en passant à « Explorer », la rotation ralentit en douceur, sans s'arrêter
        this.base =
            (this.base ?? 0.6) + ((intro ? 0.6 : 0.3) - (this.base ?? 0.6)) * Math.min(1, delta * 1.5);
        this.controls.autoRotateSpeed = -this.base * (1 + this.boost); // sens horaire, vu du pôle Nord
        if (intro && this.boost > 0.05 && !this.reducedMotion) this.controls.autoRotate = true;
        this.applyShift();
        this.controls.update(delta);
        if (this.tour?.live) this.tour.last.copy(this.camera.position); // l'amorti des contrôles n'est pas un geste
        this.uSun.value.set(-0.4, 0.5, 0.75).normalize().applyQuaternion(this.camera.quaternion);
        this.stir(delta);
        // respiration des fleuves : une seule valeur pour tout le réseau, deux houles lentes superposées
        const now = this.clock.getElapsed();
        const beat = 0.6 * Math.sin(now * 0.9) + 0.4 * Math.sin(now * 0.37 + 1.3);
        const b = Math.min(1, Math.max(0, (beat + 0.9) / 1.8));
        this.currents.uRiverBeat.value = this.reducedMotion ? 0.8 : b * b * (3 - 2 * b);
        this.currents.step(this.renderer, this.reducedMotion ? delta * 0.3 : delta);
        this.renderer.render(this.scene, this.camera);
        this.placeMarkers();
    }

    /** Recale les marqueurs HTML ; masqués derrière le globe, étiquettes qui se chevauchent effacées. */
    placeMarkers() {
        const v = (this.mv ??= new THREE.Vector3());
        const n = (this.mn ??= new THREE.Vector3());
        const cam = this.camera.position;
        const placed = [];
        // lectures avant écritures : les largeurs d'étiquettes (après un redimensionnement) se mesurent en une
        // seule mise en page, au lieu d'une par marqueur entre deux écritures de style
        for (const m of this.markers) {
            m.label ??= m.element.querySelector('.marker-label');
            m.width ??= m.label?.offsetWidth ?? 120;
        }
        const order = (this.order ??= this.markers.map((m) => ({ m })));
        for (const o of order) {
            toVector(o.m.lat, o.m.lng, 1.005, v);
            o.facing = n.subVectors(cam, v).normalize().dot(v) / v.length(); // normale · direction de la caméra
            v.project(this.camera);
            o.x = (v.x * 0.5 + 0.5) * this.size.w;
            o.y = (-v.y * 0.5 + 0.5) * this.size.h;
        }
        order.sort((a, b) => b.facing - a.facing);
        for (const { m, facing, x, y } of order) {
            const transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            if (transform !== m.transform) m.element.style.transform = m.transform = transform; // immobile : rien à recalculer
            const visible = facing > 0.12;
            if (visible !== m.visible) {
                m.visible = visible;
                m.element.classList.toggle('is-hidden', !visible);
                m.element.tabIndex = visible ? 0 : -1;
            }
            // près du bord droit, l'étiquette se resserre (le titre passe à la ligne) au lieu de sortir de l'écran
            const room = Math.floor((this.size.w - 10 - (x + 22)) / 8) * 8; // par pas de 8 px : pas de reflow à chaque image
            const fit = room < m.width ? Math.max(96, room) : 0;
            if (visible && fit !== m.fit) {
                m.fit = fit;
                m.label.style.maxWidth = fit ? `${fit}px` : '';
            }
            const box = { x0: x, x1: x + Math.min(m.width, fit || m.width) + 30, y0: y - 16, y1: y + 16 }; // étiquette toujours à droite
            const overlaps =
                visible &&
                placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
            m.element.classList.toggle('is-crowded', overlaps);
            if (visible && !overlaps) placed.push(box);
        }
    }
}
