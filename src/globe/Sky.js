import * as THREE from 'three/webgpu';
import {
    Fn,
    PI,
    TWO_PI,
    asin,
    atan,
    cameraPosition,
    cos,
    dot,
    exp,
    float,
    hash,
    instanceIndex,
    instancedBufferAttribute,
    max,
    mix,
    mx_fractal_noise_float,
    normalize,
    positionWorld,
    pow,
    sin,
    smoothstep,
    texture,
    uniform,
    uv,
    vec2,
    vec3,
    vec4,
} from 'three/tsl';
import { dither } from './dither.js';

// Pôle de la Voie lactée : la bande traverse le ciel en biais
const POLE = new THREE.Vector3(-0.35, 0.8, 0.48).normalize();

/**
 * Le ciel : des étoiles de tailles, d'éclats et de teintes variés, plus nombreuses le long d'une Voie lactée
 * à peine visible. Tout reste très sombre pour laisser la lumière aux courants.
 * `bake(renderer)` précalcule la Voie lactée ; à appeler une fois avant la première image.
 */
export function createSky({ count = 5000 } = {}) {
    const group = new THREE.Group();

    // Voie lactée : une bande diffuse traversée de poussières sombres. Fixe dans le monde, elle est calculée une
    // seule fois (sept octaves de bruit par texel) dans une carte équirectangulaire, au lieu de chaque pixel de
    // chaque image : la sphère n'y fait plus qu'une lecture. La carte (≈ 15 texels par cellule du bruit le plus
    // fin) restitue le même dégradé, à bien moins d'un niveau de gris près.
    const glowAt = (dir) => {
        const b = dot(dir, vec3(POLE.x, POLE.y, POLE.z));
        const band = exp(b.mul(b).mul(-34));
        const cloud = mx_fractal_noise_float(dir.mul(2.6), 4).mul(0.5).add(0.5);
        const dust = smoothstep(0.25, 0.85, mx_fractal_noise_float(dir.mul(6.5), 3).mul(0.5).add(0.5));
        return band.mul(cloud).mul(float(1).sub(dust.mul(0.45)));
    };
    const map = new THREE.RenderTarget(2048, 1024, {
        type: THREE.HalfFloatType,
        format: THREE.RedFormat,
        depthBuffer: false,
    });
    Object.assign(map.texture, { wrapS: THREE.RepeatWrapping, generateMipmaps: false });
    const bakeMaterial = new THREE.MeshBasicNodeMaterial();
    bakeMaterial.colorNode = Fn(() => {
        const lon = uv().x.sub(0.5).mul(TWO_PI);
        const lat = uv().y.sub(0.5).mul(PI);
        return vec4(glowAt(vec3(cos(lat).mul(cos(lon)), sin(lat), cos(lat).mul(sin(lon)))), 0, 0, 1);
    })();
    group.userData.bake = (renderer) => {
        renderer.setRenderTarget(map);
        new THREE.QuadMesh(bakeMaterial).render(renderer);
        renderer.setRenderTarget(null);
        bakeMaterial.dispose();
    };
    // une sphère vue de l'intérieur
    // Essais de fonds (touche C, voir Globe) : intensité et teinte de la Voie lactée, étoiles, fond uni, lueur
    // derrière le globe (au centre de l'écran, quel que soit le point de vue)
    const look = {
        milky: uniform(1),
        tint: uniform(new THREE.Color(0.82, 0.8, 0.76)),
        stars: uniform(1),
        base: uniform(new THREE.Color(0, 0, 0)),
        halo: uniform(new THREE.Color(0, 0, 0)),
        haloPow: uniform(4),
    };
    group.userData.look = look;
    const milky = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
    milky.colorNode = Fn(() => {
        const dir = normalize(positionWorld);
        const at = vec2(atan(dir.z, dir.x).div(TWO_PI).add(0.5), asin(dir.y.clamp(-1, 1)).div(PI).add(0.5));
        const glow = texture(map.texture, at).level(0).r;
        // linéaire : ≈ 4 % de gris une fois affiché, tramé pour un fondu sans paliers
        const center = max(dot(dir, normalize(cameraPosition).negate()), 0);
        const color = vec3(look.base)
            .add(vec3(look.tint).mul(glow.mul(0.0065).mul(look.milky)))
            .add(vec3(look.halo).mul(pow(center, look.haloPow)));
        return vec4(dither(color), 1);
    })();
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(80, 64, 32), milky);
    backdrop.renderOrder = -2;
    group.add(backdrop);

    // Étoiles : beaucoup de faibles, quelques brillantes ; 45 % rassemblées près de la bande
    const data = new Float32Array(count * 4);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
        v.randomDirection();
        if (Math.random() < 0.45) v.addScaledVector(POLE, -v.dot(POLE) * 0.85).normalize();
        v.multiplyScalar(60);
        data.set([v.x, v.y, v.z, Math.random() ** 7], i * 4);
    }
    const star = instancedBufferAttribute(new THREE.InstancedBufferAttribute(data, 4));
    const material = new THREE.SpriteNodeMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    material.positionNode = star.xyz;
    // beaucoup d'étoiles minuscules, quelques-unes plus grandes
    material.scaleNode = vec2(
        float(0.028)
            .add(star.w.mul(0.17))
            .mul(hash(instanceIndex.add(7)).mul(0.6).add(0.55)),
    );
    const d = uv().sub(0.5).mul(2);
    // teintes : bleutées, chaudes, et un tiers dorées (le jaune du projet)
    const h = hash(instanceIndex);
    const tint = h.lessThan(0.34).select(vec3(1, 0.78, 0.28), mix(vec3(0.72, 0.8, 1), vec3(1, 0.88, 0.7), h));
    material.colorNode = vec4(mix(vec3(1), tint, 0.75), 1);
    material.opacityNode = exp(d.dot(d).mul(-5))
        .mul(float(0.18).add(star.w.mul(0.8)))
        .mul(look.stars);
    const stars = new THREE.Sprite(material);
    stars.count = count;
    stars.frustumCulled = false;
    stars.renderOrder = -1;
    group.add(stars);

    return group;
}
