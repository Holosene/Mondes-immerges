import * as THREE from 'three/webgpu';
import {
    Fn,
    If,
    PI,
    TWO_PI,
    abs,
    asin,
    atomicAdd,
    atomicStore,
    cameraPosition,
    cos,
    exp,
    float,
    fract,
    hash,
    instanceIndex,
    instancedArray,
    length,
    max,
    min,
    mix,
    mx_noise_float,
    sin,
    smoothstep,
    storage,
    texture,
    time,
    uint,
    uniform,
    uv,
    vec2,
    vec3,
    vec4,
    varying,
} from 'three/tsl';

const LIMIT = 1.6; // m/s : plage d'encodage du champ (voir scripts/textures.py)
const RIVER = 0.12; // vitesse des splats fluviaux, dans la même unité
const RIVER_SHARE = 0.32; // part des particules qui naissent sur les fleuves
const SEAM = 4096; // places réservées aux traînées à cheval sur le méridien 180° (quelques centaines en pratique)
const SWIRL_BANDS = 4; // la micro-turbulence est recalculée en quatre bandes, une par pas : aucune image plus lourde

/**
 * Les courants de surface, à partir des mesures satellite NASA OSCAR.
 *
 * Direction : de l'encre filmée au microscope. Des centaines de milliers de particules sont advectées sur le GPU
 * (compute shader) par le champ de vitesse réel, auquel s'ajoutent :
 * - une micro-turbulence (bruit de curl, deux échelles) qui fait vriller et effiler le flux en filaments ;
 * - une agitation brownienne, le frémissement des micro-éléments en suspension.
 * 1. Chaque particule dépose de l'encre dans une texture équirectangulaire. À chaque image, cette encre est
 *    transportée par le courant, diffuse légèrement et s'efface : des nuages qui s'étalent autour de filaments nets
 *    (canal R : encre diffusée · canal G : cœur des courants rapides, transporté sans diffusion).
 * 2. Les particules sont aussi dessinées en micro-éléments posés sur la surface : surtout des grains,
 *    et quelques cellules en anneau, plus grandes, comme des organismes sous la lentille.
 */
/**
 * Couleur des fleuves selon leur respiration (0 : sourds, 1 : éclatants), la même pour les splats et pour le lit.
 * La respiration passe par la couleur et non par l'opacité : là où les splats s'empilent, l'opacité sature et la
 * respiration ne s'y voyait plus. Tous les fleuves, denses ou fins, virent ainsi au jaune ensemble.
 */
export const riverColor = (beat) => mix(vec3(1, 0.86, 0.36), vec3(1, 0.84, 0.04), beat);

export class Currents {
    constructor({ field, rivers, depth, seeds, count, resolution, webgpu = true }) {
        this.count = count;
        this.uDelta = uniform(0);
        this.uSeed = uniform(0);
        this.uSpeed = uniform(0.17);
        this.uFade = uniform(0.012);
        this.uDiffuse = uniform(0.16);
        // le curseur dans l'eau : position (uv), vitesse (uv/s, isotrope) et présence (0 → 1)
        this.uPointer = uniform(new THREE.Vector2(0.5, 0.5));
        this.uPointerVel = uniform(new THREE.Vector2());
        this.uPointerOn = uniform(0);
        // tourbillon du survol (visuel) : centre (uv) et torsion, pilotés par le globe
        this.uEddy = uniform(new THREE.Vector2(0.5, 0.5));
        this.uTwist = uniform(0);
        this.uEddyOn = uniform(0); // présence du tourbillon : il se fond au lieu de se dérouler
        this.uWake = uniform(new THREE.Vector2()); // l'eau entraînée dans le sens du geste (uv isotrope)
        this.uRiverBeat = uniform(1); // respiration commune de tous les fleuves (0 : sourds, 1 : éclatants)
        this.uFill = uniform(0); // touche Espace : les cellules en anneau deviennent pleines

        const state = instancedArray(count, 'vec4'); // x, y : position (uv) · z : âge · w : vitesse (m/s)
        this.state = state;
        // en mer : rebond contre une côte (m/s), amorti en une demi-seconde · sur un fleuve : vitesse moyenne récente
        const kicks = instancedArray(count, 'vec2');
        const sample = (p) => texture(field, p).level(0);
        // Trait de côte fin (bathymétrie ETOPO, 2048 × 1024) : 1 en mer, 0 sur les terres. Le champ OSCAR
        // (1/3°) est trop grossier pour la côte : il laisserait passer les splats sur les isthmes et les rivages
        const ocean = (p) => smoothstep(0.012, 0.045, texture(depth, p).level(0).x);
        this.ocean = ocean;
        const lifeOf = (i) => hash(i).mul(8).add(6);

        // Fleuves (scripts/hydro.py) : R présence de l'eau, G B phase de l'écoulement (sin, cos)
        const bank = (p) => texture(rivers, p).level(1).x; // présence élargie : frôler la rive n'est pas mourir
        // Sens de l'aval : la phase croît en remontant vers la source ; dφ = cos·d(sin) − sin·d(cos)
        const downstream = (p) => {
            const e = 1.5 / 4096;
            const sc = (q) => texture(rivers, q).level(0).yz.mul(2).sub(1);
            const c0 = sc(p);
            const dx = sc(p.add(vec2(e, 0))).sub(sc(p.sub(vec2(e, 0))));
            const dy = sc(p.add(vec2(0, e))).sub(sc(p.sub(vec2(0, e))));
            return vec2(c0.y.mul(dx.x).sub(c0.x.mul(dx.y)), c0.y.mul(dy.x).sub(c0.x.mul(dy.y))).negate();
        };
        const seedList = instancedArray(seeds, 'vec2');
        const fluvial = (i) => hash(i.add(4242)).lessThan(RIVER_SHARE);

        const spawn = (p, seed) => {
            If(fluvial(instanceIndex), () => {
                const s = seedList.element(
                    hash(seed.add(3))
                        .mul(seeds.length / 2)
                        .toUint(),
                );
                p.x.assign(s.x);
                p.y.assign(s.y);
            }).Else(() => {
                p.x.assign(hash(seed));
                p.y.assign(
                    asin(hash(seed.add(1e6)).mul(2).sub(1))
                        .div(PI)
                        .add(0.5),
                ); // uniforme sur la sphère
            });
            p.z.assign(0);
        };

        this.init = Fn(() => {
            const p = state.element(instanceIndex);
            spawn(p, instanceIndex.toFloat().add(12345));
            p.z.assign(hash(instanceIndex.toFloat().add(777)).mul(lifeOf(instanceIndex)));
        })().compute(count);

        // Micro-turbulence : rotationnel d'un bruit 3D, donc sans divergence : ça tourbillonne sans faire d'amas.
        // Grande échelle pour les volutes, petite pour les filaments. Optimisation sans perte : le champ est
        // calculé dans une texture 2048 × 1024 (renouvelée toutes les 4 images, il évolue lentement) au lieu de
        // 6 bruits par particule et par image ; les particules n'y font plus qu'une lecture. Le champ suivant se
        // prépare en arrière-plan, un quart par pas, puis les deux textures s'échangent : un coût égal à chaque
        // image, au lieu d'une image sur quatre bien plus lourde (saccade).
        const curl = (q, e) => {
            const n0 = mx_noise_float(q);
            const nx = mx_noise_float(q.add(vec3(e, 0, 0)));
            const ny = mx_noise_float(q.add(vec3(0, e, 0)));
            return vec2(ny.sub(n0), n0.sub(nx)).div(e);
        };
        const swirlTarget = () => {
            const t = new THREE.RenderTarget(2048, 1024, { type: THREE.HalfFloatType, depthBuffer: false });
            Object.assign(t.texture, { wrapS: THREE.RepeatWrapping, generateMipmaps: false });
            t.scissorTest = true;
            return t;
        };
        this.swirlTargets = [swirlTarget(), swirlTarget()];
        this.swirlNode = texture(this.swirlTargets[0].texture); // le champ en service
        this.uSwirlTime = uniform(0); // figé pendant les quatre bandes d'un même champ
        const swirlMaterial = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
        swirlMaterial.colorNode = Fn(() => {
            // coordonnées cylindriques : le bruit se referme sur lui-même au méridien 180° (aucune couture)
            const a = uv().x.mul(TWO_PI);
            const q = vec3(cos(a).mul(12.7), sin(a).mul(12.7), uv().y.mul(40).add(this.uSwirlTime.mul(0.05)));
            const w = curl(q, 0.02)
                .mul(0.07)
                .add(curl(q.mul(3.1).add(17), 0.02).mul(0.03));
            return vec4(w, 0, 1);
        })();
        this.swirl = new THREE.QuadMesh(swirlMaterial);
        const swirlAt = (p) => this.swirlNode.sample(p).level(0).xy;

        // Influence du curseur à une position (uv) : écart isotrope, et gaussienne de ~6° de rayon
        const near = (xy) => {
            const lat = xy.y.sub(0.5).mul(PI);
            const dx = fract(xy.x.sub(this.uPointer.x).add(0.5)).sub(0.5).mul(cos(lat).mul(2));
            const off = vec2(dx, xy.y.sub(this.uPointer.y));
            const fall = exp(
                off
                    .dot(off)
                    .div(0.032 * 0.032)
                    .negate(),
            ).mul(this.uPointerOn);
            return { off, fall };
        };
        this.near = near;

        const life = (i, h) => smoothstep(0, 0.8, h.z).mul(smoothstep(lifeOf(i), lifeOf(i).sub(1.2), h.z));

        /**
         * Le dépôt d'une particule (i : son indice, h : son état) : R l'encre, G le cœur des courants rapides,
         * B l'eau des fleuves. Calculé par sommet (varying) et non pour chaque pixel du sprite ; le précalculer dans
         * update() coûte davantage (une écriture de plus par particule, mesurée plus lente).
         */
        const deposit = (i, h) => {
            const s = smoothstep(0.02, 0.9, h.w);
            const sea = ocean(h.xy);
            // B : l'eau des fleuves. Chaque splat fluvial mouille la terre là où il passe ; cette trace s'étale et
            // sèche en quelques secondes. Le globe y dessine le lit en noir : un fleuve n'existe que si l'eau y coule
            const wet = life(i, h)
                .mul(fluvial(i).select(float(0.06), float(0)))
                .mul(float(1).sub(sea));
            // sur les terres, l'encre n'est pas emportée par un courant : elle s'accumulerait sur place en un trait
            // plein. Les fleuves n'en déposent qu'un voile, ce sont leurs micro-éléments qui les dessinent
            const amount = life(i, h)
                .mul(float(0.006).add(s.mul(s).mul(0.42)))
                .mul(mix(float(0.06), float(1), sea))
                // les splats des fleuves laissent un filet d'encre jaune bien visible dans le lit noir
                .add(
                    life(i, h)
                        .mul(fluvial(i).select(float(0.05), float(0)))
                        .mul(float(1).sub(sea)),
                );
            return vec4(amount, amount.mul(s), wet, 1);
        };

        // Liste compacte des particules à cheval sur le méridien (WebGPU) : la copie de leur traînée ne parcourt
        // plus les 300 000 particules, seulement ces quelques centaines. Le repli WebGL (sans atomiques) garde
        // une seconde passe complète, réduite à une taille nulle hors du méridien.
        const NONE = 0xffffffff;
        const seamCount = webgpu ? instancedArray(1, 'uint').toAtomic() : null;
        const seamList = webgpu ? instancedArray(SEAM, 'uint') : null;
        this.seamReset =
            webgpu &&
            Fn(() => {
                seamList.element(instanceIndex).assign(uint(NONE));
                If(instanceIndex.equal(0), () => {
                    atomicStore(seamCount.element(0), uint(0));
                });
            })().compute(SEAM);

        this.update = Fn(() => {
            const p = state.element(instanceIndex);
            const f = sample(p.xy);
            const base = f.xy.mul(2).sub(1).mul(LIMIT);
            const speed = length(base);
            const swirl = swirlAt(p.xy);
            // la turbulence suit l'énergie du courant, mais ne s'éteint jamais : l'eau calme frémit aussi
            // le curseur ne touche jamais la simulation : sa réaction est purement visuelle (globe.js)
            const drift = base.add(swirl.mul(speed.mul(0.9).add(0.18)));
            // Les terres sont les parois d'un bocal : les particules de mer y rebondissent (voir plus bas)
            const e = 1.5 / 2048;
            const shore = vec2(
                ocean(p.xy.add(vec2(e, 0))).sub(ocean(p.xy.sub(vec2(e, 0)))),
                ocean(p.xy.add(vec2(0, e))).sub(ocean(p.xy.sub(vec2(0, e)))),
            );
            const coast = smoothstep(0.03, 0.3, length(shore));
            const off = shore.div(max(length(shore), 1e-4)); // vers le large
            const kick = kicks.element(instanceIndex);
            const sea = drift.add(kick);
            // Sur les terres, seuls les fleuves portent : le fil de l'eau vers l'aval, et une attraction en
            // travers du lit (jamais le long : elle créerait des pièges où tout s'entasse)
            const g = downstream(p.xy);
            const along = g.div(max(length(g), 1e-4));
            const r = 1 / 2048;
            const bg = vec2(
                bank(p.xy.add(vec2(r, 0))).sub(bank(p.xy.sub(vec2(r, 0)))),
                bank(p.xy.add(vec2(0, r))).sub(bank(p.xy.sub(vec2(0, r)))),
            );
            const across = bg.sub(along.mul(bg.dot(along))).mul(1.6);
            // sur un fleuve à terre ; ailleurs, la mer
            const wet = ocean(p.xy);
            const land = wet.lessThan(0.5).and(bank(p.xy).greaterThan(0.01));
            const v = land.select(along.mul(RIVER).add(across), sea);
            const lat = p.y.sub(0.5).mul(PI);
            const step = this.uDelta.mul(this.uSpeed);
            const toUv = (w) => vec2(w.x.div(max(cos(lat), 0.12).mul(TWO_PI)), w.y.div(PI)).mul(step);
            // mouvement brownien : un pas aléatoire d'environ un demi-texel à chaque image
            const jitter = vec2(
                hash(instanceIndex.add(this.uSeed.mul(7))),
                hash(instanceIndex.add(this.uSeed.mul(13)).add(5e5)),
            )
                .sub(0.5)
                .mul(vec2(0.00016, 0.00011));
            const move = toUv(v).add(jitter);
            // Rebond : un pas de mer qui entrerait dans une terre est réfléchi sur le rivage. L'élan renvoyé au
            // large (la composante vers la terre, retournée et un peu amplifiée) persiste puis s'amortit ;
            // ce pas-ci glisse le long de la côte. Seuls les splats des fleuves entrent dans les terres.
            const slide = toUv(sea.sub(off.mul(sea.dot(off))).add(off.mul(0.05)));
            const wall = (m) => land.not().and(ocean(vec2(fract(p.x.add(m.x)), p.y.add(m.y))).lessThan(0.5));
            If(land, () => {
                kick.assign(mix(kick, v, 0.04));
            }).Else(() => {
                kick.mulAssign(float(1).sub(this.uDelta.mul(2.5)).max(0));
            });
            If(wall(move), () => {
                kick.addAssign(off.mul(abs(sea.dot(off)).mul(1.5).add(0.04)));
                If(wall(slide).not(), () => {
                    p.x.assign(fract(p.x.add(slide.x)));
                    p.y.addAssign(slide.y);
                });
            }).Else(() => {
                p.x.assign(fract(p.x.add(move.x)));
                p.y.addAssign(move.y);
            });
            p.z.addAssign(this.uDelta);
            p.w.assign(land.select(0.04, speed)); // fleuves : de l'encre aussi, qui dessine le lit
            const dead = p.z
                .greaterThan(lifeOf(instanceIndex))
                .or(wet.lessThan(0.5).and(land.not())) // échouée à terre, hors d'un fleuve
                // contre la côte, une petite chance de renaître au large : aucun amas lumineux sur les rivages
                .or(coast.greaterThan(0.15).and(hash(instanceIndex.add(this.uSeed.mul(3))).lessThan(0.01)))
                .or(land.and(length(g).lessThan(0.06))) // là où le sens du fleuve se perd : pas d'entassement
                // une particule de fleuve qui fait du sur-place (va-et-vient dans un piège) renaît ailleurs
                .or(land.and(p.z.greaterThan(1.5)).and(length(kick).lessThan(RIVER * 0.4)))
                .or(abs(p.y.sub(0.5)).greaterThan(0.44));
            If(dead, () => {
                spawn(p, instanceIndex.toFloat().add(this.uSeed));
                kick.assign(vec2(0));
            });
            // traînée à cheval sur le méridien 180° : la particule s'inscrit pour sa copie (voir trail)
            if (seamCount)
                If(abs(p.x.sub(0.5)).greaterThan(0.499), () => {
                    const slot = atomicAdd(seamCount.element(0), uint(1)).toVar();
                    If(slot.lessThan(SEAM), () => {
                        seamList.element(slot).assign(instanceIndex);
                    });
                });
        })().compute(count);

        // Traînées (texture équirectangulaire)
        const target = () => {
            const t = new THREE.RenderTarget(resolution, resolution / 2, {
                type: THREE.HalfFloatType,
                generateMipmaps: true,
                minFilter: THREE.LinearMipmapLinearFilter,
                magFilter: THREE.LinearFilter,
                depthBuffer: false,
            });
            t.texture.wrapS = THREE.RepeatWrapping;
            return t;
        };
        // Deux textures en alternance : on lit l'encre de l'image précédente, on écrit la nouvelle
        this.targets = [target(), target()];
        this.target = this.targets[0];
        this.trailNode = texture(this.target.texture); // lu par la surface du globe (uv de la sphère)
        this.readers = [this.trailNode]; // toutes les lectures de l'encre suivent l'alternance (reader())

        const head = state.toAttribute();
        const g = (() => {
            const d = uv().sub(0.5).mul(2);
            return exp(d.dot(d).mul(-2.5));
        })();
        const sprite = (color, h, x, scale, n) => {
            const material = new THREE.SpriteNodeMaterial({
                side: THREE.DoubleSide, // la caméra retournée inverse le sens des faces
                transparent: true,
                depthTest: false,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            material.positionNode = vec3(x, h.y, 0);
            material.scaleNode = vec2(1.4 / resolution, 2.8 / resolution).mul(scale);
            material.colorNode = color;
            material.opacityNode = g;
            const mesh = new THREE.Sprite(material);
            mesh.count = n;
            mesh.frustumCulled = false;
            return mesh;
        };
        const across = (h) => h.x.add(h.x.lessThan(0.5).select(1, -1));
        // La traînée, et sa copie de l'autre côté du méridien 180° (aucune couture visible)
        let seam;
        if (seamList) {
            // seules les particules inscrites par update() : une instance par place, taille nulle si vide
            const index = storage(seamList.value, 'uint', SEAM).toReadOnly().element(instanceIndex);
            const used = index.notEqual(uint(NONE));
            const i = used.select(index, uint(0));
            const h = storage(state.value, 'vec4', count).toReadOnly().element(i);
            seam = sprite(varying(deposit(i, h)), h, across(h), used.select(1, 0), SEAM);
        } else {
            // repli WebGL : toutes les particules, taille nulle hors du méridien
            const near = abs(head.x.sub(0.5)).greaterThan(0.499).select(1, 0);
            seam = sprite(varying(deposit(instanceIndex, head)), head, across(head), near, count);
        }
        this.trailScene = new THREE.Scene();
        this.trailScene.add(
            sprite(varying(deposit(instanceIndex, head)), head, head.x, float(1), count),
            seam,
        );
        this.trailCamera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);

        // L'encre vit : transportée par le courant (on va chercher en amont), diffusée, puis effacée doucement
        this.prevNode = texture(this.targets[1].texture);
        const inkMaterial = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
        inkMaterial.colorNode = Fn(() => {
            const at = uv();
            const v = sample(at).xy.mul(2).sub(1).mul(LIMIT);
            const lat = at.y.sub(0.5).mul(PI);
            const step = this.uDelta.mul(this.uSpeed);
            const from = at.sub(vec2(v.x.div(max(cos(lat), 0.12).mul(TWO_PI)), v.y.div(PI)).mul(step));
            const px = vec2(1 / resolution, 2 / resolution);
            const read = (o) => this.prevNode.sample(from.add(o.mul(px))).level(0);
            const c = read(vec2(0, 0));
            const blur = read(vec2(1, 0))
                .add(read(vec2(-1, 0)))
                .add(read(vec2(0, 1)))
                .add(read(vec2(0, -1)))
                .mul(0.25);
            // l'encre ne vit qu'en mer et dans le lit des fleuves : elle ne déborde jamais sur les terres
            const keep = float(1)
                .sub(this.uFade)
                .mul(max(ocean(at), smoothstep(0.01, 0.1, bank(at))));
            // R : l'encre s'étale · G : les cœurs restent nets
            // B : l'eau des fleuves s'étale largement (bords en fondu) et sèche lentement, hors de l'océan
            const dry = float(1)
                .sub(this.uDelta.mul(0.12))
                .mul(float(1).sub(ocean(at)));
            return vec4(
                mix(c.r, blur.r, this.uDiffuse).mul(keep),
                mix(c.g, blur.g, 0.06).mul(keep),
                mix(c.b, blur.b, 0.1).min(1).mul(dry),
                1,
            );
        })();
        this.ink = new THREE.QuadMesh(inkMaterial);

        // Micro-splats : chaque particule des courants rapides est un minuscule point doré posé sur la surface.
        // Ils bougent avec le courant ; la lumière reste sur eux (testés en profondeur, aucun halo en volume).
        // fondu normal (pas additif) : sur les terres blanches, un jaune additif disparaîtrait dans le blanc
        const splatMaterial = new THREE.SpriteNodeMaterial({
            transparent: true,
            depthWrite: false,
        });
        // Profondeur : chaque splat flotte à sa propre hauteur (les courants rapides plus haut), et le tourbillon
        // du survol les entraîne en spirale vers le fond, comme une matière liquide aspirée.
        // Hors survol (uEddyOn = 0), le déplacement est nul : la branche (uniforme, donc sans divergence) évite
        // alors le doigt et ses six sondes du rivage pour chaque sommet.
        const eddy = Fn(() => {
            const at = vec3(head.x, head.y, 0).toVar(); // position (uv) et aspiration vers le fond
            If(this.uEddyOn.greaterThan(0), () => {
                const k = max(cos(head.y.sub(0.5).mul(PI)), 0.05).mul(2);
                const ox = fract(head.x.sub(this.uEddy.x).add(0.5)).sub(0.5).mul(k);
                const oy = head.y.sub(this.uEddy.y);
                const { shift, core } = this.finger(ox, oy, -1);
                // le survol n'agit que sur la mer : les fleuves continuent de couler, intacts
                const stir = smoothstep(0.3, 0.7, ocean(head.xy));
                // les terres sont une paroi : le déplacement s'arrête au rivage, les splats s'y tassent
                const moved = shift.mul(stir).mul(this.wall(head.xy, vec2(shift.x.div(k), shift.y)));
                at.assign(
                    vec3(
                        this.uEddy.x.add(ox.add(moved.x).div(k)),
                        this.uEddy.y.add(oy.add(moved.y)),
                        core.mul(stir),
                    ),
                );
            });
            return at;
        })();
        const ex = eddy.x;
        const ey = eddy.y;
        const pull = eddy.z;
        const lon = ex.mul(TWO_PI);
        const theta = float(1).sub(ey).mul(PI);
        const normal = vec3(lon.cos().negate().mul(sin(theta)), cos(theta), lon.sin().mul(sin(theta)));
        const lift = float(1.0012)
            .add(hash(instanceIndex.add(57)).mul(0.0035))
            .add(smoothstep(0.1, 0.9, head.w).mul(0.003))
            .sub(pull.mul(0.003)); // aspirés vers le fond, sans jamais passer sous l'encre
        splatMaterial.positionNode = normal.mul(max(lift, 1.0004));
        const facing = smoothstep(0.18, 0.45, normal.dot(cameraPosition.normalize()));
        // jamais posé sur une terre, même entraîné par le tourbillon du survol
        const afloat = max(
            smoothstep(0.35, 0.8, ocean(vec2(ex, ey))),
            smoothstep(0.01, 0.1, bank(vec2(ex, ey))),
        );
        const inRiver = fluvial(instanceIndex);
        const fast = smoothstep(0.04, 0.7, head.w);
        const seed = hash(instanceIndex.add(31));
        // scintillement : chaque splat de l'océan a sa propre phase ; ceux des fleuves n'en ont pas, leur respiration
        // commune passe par la couleur (riverColor)
        const twinkle = inRiver.select(
            float(1),
            sin(time.mul(seed.mul(2.5).add(1.5)).add(seed.mul(TWO_PI)))
                .mul(0.35)
                .add(0.65),
        );
        // micro-éléments : 88 % de grains nets, 12 % de cellules en anneau, deux à trois fois plus grandes
        const cell = seed.lessThan(0.12).and(inRiver.not());
        // Tout ce qui ne dépend que de la particule est calculé par sommet ; seule la forme reste par pixel.
        // Opacité propre de la particule : les cellules n'apparaissent que sur la touche Espace, pleines
        const alpha = cell
            .select(this.uFill.mul(0.55), float(1))
            .mul(inRiver.select(0.95, fast.mul(0.75).add(0.25)))
            .mul(facing)
            .mul(afloat)
            .mul(float(1).sub(pull.mul(0.6))) // sous le doigt, l’eau écartée les estompe : la fumée mène
            .mul(life(instanceIndex, head))
            .mul(twinkle)
            .mul(inRiver.select(1.4, 1.75));
        // un splat entièrement transparent (face cachée, à terre, cellule sans Espace) n'est pas tracé du tout
        const size = float(0.0024)
            .add(fast.mul(0.0032))
            .mul(seed.mul(0.7).add(0.6))
            .mul(cell.select(hash(instanceIndex.add(91)).mul(1.2).add(1.8), 1))
            .mul(inRiver.select(0.95, 1)) // les splats des fleuves : fins
            .mul(alpha.greaterThan(0).select(1, 0));
        splatMaterial.scaleNode = vec2(size);
        // jaune #ffcc00 ; sur les fleuves, la couleur de leur respiration (riverColor)
        splatMaterial.colorNode = varying(
            vec4(
                inRiver.select(
                    riverColor(this.uRiverBeat),
                    mix(vec3(1, 0.6, 0), vec3(1, 0.88, 0.4), fast.mul(fast)),
                ),
                1,
            ),
        );
        const d = uv().sub(0.5).mul(2);
        const r = length(d);
        const dot = exp(d.dot(d).mul(-4.5));
        const disc = float(1).sub(smoothstep(0.6, 0.76, r)); // la même cellule, pleine
        const ring = varying(cell.select(float(1), float(0))); // 1 : cellule, 0 : grain
        splatMaterial.opacityNode = mix(dot, disc, ring).mul(varying(alpha));
        this.splats = new THREE.Sprite(splatMaterial);
        this.splats.count = count;
        this.splats.frustumCulled = false;
        this.splats.renderOrder = 2;
    }

    /**
     * Le doigt dans l'eau, partagé par l'encre (s = 1 : où aller lire) et les splats (s = −1 : où les déplacer).
     * (ox, oy) : écart isotrope au centre du tourbillon, en uv. Profil de Lamb-Oseen : la rotation est maximale
     * sous le doigt et retombe vite (en 1/r²), coupée au-delà de quelques degrés : un tourbillon serré, localisé.
     * Le doigt écarte aussi l'eau autour de lui, et le geste l'entraîne sur son passage.
     */
    finger(ox, oy, s) {
        const r2 = ox.mul(ox).add(oy.mul(oy));
        const A = 0.021 * 0.021; // rayon du cœur (~4°)
        const q = r2.div(A);
        const reach = exp(r2.div(0.09 * 0.09).negate()); // portée totale (~16°)
        const swirl = float(1).sub(exp(q.negate())).div(max(q, 1e-4)).mul(reach);
        const core = exp(q.mul(-0.9));
        const on = this.uEddyOn;
        const turn = this.uTwist.mul(swirl).mul(on).mul(s); // sens horaire à l'écran, jamais l'inverse
        const spread = float(1).sub(core.mul(0.24).mul(on).mul(s)); // l'eau écartée par le doigt
        const c = cos(turn);
        const n = sin(turn);
        const wake = this.uWake
            .mul(exp(q.mul(-0.35)))
            .mul(on)
            .mul(s);
        const shift = vec2(
            ox.mul(c).sub(oy.mul(n)).mul(spread).sub(ox).sub(wake.x),
            ox.mul(n).add(oy.mul(c)).mul(spread).sub(oy).sub(wake.y),
        );
        return { shift, core: core.mul(on) };
    }

    /**
     * Paroi du bocal pour le survol : fraction (0 à 1) du déplacement d (uv) qu'on peut parcourir depuis p avant
     * de toucher une terre. Le chemin est sondé en six points ; au premier rivage, le geste s'arrête juste avant.
     * Contre les côtes, l'encre et les splats se tassent au lieu de disparaître sous les continents.
     */
    wall(p, d) {
        let f = float(1);
        for (let i = 1; i <= 6; i++) {
            const t = i / 6;
            const at = vec2(fract(p.x.add(d.x.mul(t))), p.y.add(d.y.mul(t)));
            f = min(f, mix(float(t - 1 / 6), float(1), smoothstep(0.3, 0.7, this.ocean(at))));
        }
        return f;
    }

    /** L'encre lue à une position calculée (uv), tenue à jour à chaque alternance. */
    reader(p) {
        const node = texture(this.target.texture, p);
        this.readers.push(node);
        return node;
    }

    async start(renderer) {
        // Les textures de rendu sont lues origine en haut (WebGPU, et le repli WebGL l'imite) : nord en v = 1
        Object.assign(this.trailCamera, { top: 0, bottom: 1 });
        this.trailCamera.updateProjectionMatrix();
        await renderer.computeAsync(this.init);
        for (const t of this.targets) {
            renderer.setRenderTarget(t);
            renderer.setClearColor(0x000000, 0);
            renderer.clear();
        }
        // premier champ de turbulence, d'un bloc ; les suivants se préparent par bandes (voir swirlBand)
        this.uSwirlTime.value = performance.now() / 1000;
        const [front] = this.swirlTargets;
        front.scissor.set(0, 0, front.width, front.height);
        renderer.setRenderTarget(front);
        this.swirl.render(renderer);
        renderer.setRenderTarget(null);
        this.advance(renderer, 1 / 60); // compile les pipelines avant la première image
    }

    step(renderer, delta) {
        // Au démarrage, plusieurs pas par image : les courants se dessinent en une seconde
        const warm = (this.frames = (this.frames ?? 0) + 1) < 70 ? 4 : 1;
        if (this.frames === 70) this.onWarm?.();
        // seul le dernier pas de l'image est affiché : lui seul régénère les mipmaps de l'encre
        for (let i = 1; i < warm; i++) this.advance(renderer, delta, false);
        this.advance(renderer, delta);
    }

    /** Prépare un quart du prochain champ de turbulence ; au quatrième, il remplace le champ en service. */
    swirlBand(renderer) {
        const band = (this.ticks = (this.ticks ?? -1) + 1) % SWIRL_BANDS;
        const [front, back] = this.swirlTargets;
        if (band === 0) this.uSwirlTime.value = performance.now() / 1000;
        const h = back.height / SWIRL_BANDS;
        back.scissor.set(0, band * h, back.width, h);
        renderer.setRenderTarget(back);
        this.swirl.render(renderer);
        if (band === SWIRL_BANDS - 1) {
            this.swirlTargets = [back, front];
            this.swirlNode.value = back.texture;
        }
    }

    /** Un pas de simulation ; `mips` : régénérer les mipmaps de l'encre (seulement pour l'image affichée). */
    advance(renderer, delta, mips = true) {
        this.uDelta.value = Math.min(delta, 1 / 20);
        this.uSeed.value = Math.floor(Math.random() * 65536);
        const autoClear = renderer.autoClear;
        renderer.autoClear = false;
        this.swirlBand(renderer);
        if (this.seamReset) renderer.compute(this.seamReset);
        renderer.compute(this.update);
        // l'encre de l'image précédente, transportée et diffusée, puis les nouveaux dépôts par-dessus
        const [read, write] =
            this.target === this.targets[0] ? this.targets : [this.targets[1], this.targets[0]];
        this.prevNode.value = read.texture;
        renderer.setRenderTarget(write);
        // les mipmaps ne servent qu'à la surface du globe : une seule régénération, après les dépôts
        write.texture.mipmapsAutoUpdate = false;
        this.ink.render(renderer);
        write.texture.mipmapsAutoUpdate = mips;
        renderer.render(this.trailScene, this.trailCamera);
        this.target = write;
        for (const r of this.readers) r.value = write.texture;
        renderer.setRenderTarget(null);
        renderer.autoClear = autoClear;
    }
}
