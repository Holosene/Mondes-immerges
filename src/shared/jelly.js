/**
 * Le loader « jelly », dessiné hors du fil principal : un canevas confié à un worker (OffscreenCanvas).
 * Le chargement du globe (modules, textures, compilation des shaders) occupe le fil principal par à-coups ;
 * une animation CSS à filtres (flou + contraste) peut alors attendre une image. Dans un worker, le dessin ne
 * dépend plus de rien : il garde sa cadence quoi qu'il arrive sur la page.
 *
 * Même dessin que la version CSS (qui reste en repli et sert de point de départ) : deux boules floutées puis
 * contrastées (effet « goo »), qui s'écartent et se rejoignent en 0,9 s ; l'axe tourne d'un quart de tour à
 * chaque cycle. La reprise se fait sur la phase de l'animation CSS : aucun saut au passage de l'un à l'autre.
 */
const WORKER = `
const SIZE = 120;
let ctx, img, px, start, scale, running = true;
// courbe « ease » de CSS (cubic-bezier(0.25, 0.1, 0.25, 1)), résolue par Newton
const bez = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
const ease = (x) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
        const d = 3 * 0.25 * (1 - t) ** 2 + 6 * (0.25 - 0.25) * t * (1 - t) + 3 * (1 - 0.25) * t * t;
        t -= (bez(0.25, 0.25, t) - x) / Math.max(d, 1e-4);
        t = Math.min(1, Math.max(0, t));
    }
    return bez(0.1, 1, t);
};
// disque de rayon r flouté (écart type s) : 0,5·erfc((d − r)/(s√2)), approximation d'Abramowitz-Stegun
const erfc = (x) => {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
};
const disc = (d, r) => 0.5 * erfc((d - r) / (6 * Math.SQRT2));
function frame(now) {
    if (!running) return;
    const t = (now + performance.timeOrigin - start) / 1000;
    const cycle = (t % 0.9) / 0.9;
    // 0 → 50 % : les boules s'écartent ; 50 → 100 % : elles reviennent (chaque moitié en « ease »)
    const k = cycle < 0.5 ? ease(cycle * 2) : 1 - ease((cycle - 0.5) * 2);
    const s = 1 - 0.35 * k;
    const off = 22.5 * k * s; // translateX(75 %) d'une boule de 30 px, sous scale(0,65)
    const r = 15 * s;
    const turned = t % 1.8 >= 0.9; // quart de tour une fois sur deux (au moment où les boules se rejoignent)
    const [ax, ay] = turned ? [0, 1] : [1, 0];
    const n = img.width;
    for (let j = 0; j < n; j++) {
        const y = (j + 0.5) / scale - SIZE / 2;
        for (let i = 0; i < n; i++) {
            const x = (i + 0.5) / scale - SIZE / 2;
            const a = disc(Math.hypot(x + ax * off, y + ay * off), r);
            const b = disc(Math.hypot(x - ax * off, y - ay * off), r);
            const v = a + b - a * b; // union des deux boules
            const alpha = Math.min(1, Math.max(0, (v - 0.5) * 24 + 0.5)); // contraste ×24 autour du gris moyen
            px[j * n + i] = (Math.round(alpha * 255) << 24) | 0x00ccff; // jaune #ffcc00 (ABGR)
        }
    }
    ctx.putImageData(img, 0, 0);
    requestAnimationFrame(frame);
}
onmessage = ({ data }) => {
    if (data.stop) return (running = false);
    ({ start, scale } = data);
    ctx = data.canvas.getContext('2d');
    img = ctx.createImageData(data.canvas.width, data.canvas.height);
    px = new Uint32Array(img.data.buffer);
    requestAnimationFrame(frame);
    postMessage('ready');
};
`;

let worker = null;

export function startJelly() {
    const host = document.querySelector('.jelly');
    const css = host?.querySelector('.jelly-turn span');
    if (!css || !('OffscreenCanvas' in window) || !HTMLCanvasElement.prototype.transferControlToOffscreen)
        return;
    try {
        const scale = Math.min(2, devicePixelRatio || 1);
        const canvas = document.createElement('canvas');
        canvas.className = 'jelly-canvas';
        canvas.width = canvas.height = Math.round(120 * scale);
        // phase de l'animation CSS en cours : le worker reprend exactement là où elle en est
        const phase = css.getAnimations?.()[0]?.currentTime ?? 0;
        const start = performance.timeOrigin + performance.now() - phase;
        const url = URL.createObjectURL(new Blob([WORKER], { type: 'text/javascript' }));
        worker = new Worker(url);
        URL.revokeObjectURL(url);
        const offscreen = canvas.transferControlToOffscreen();
        worker.onmessage = () => host.classList.add('is-offscreen'); // la version CSS s'efface, sans saut
        worker.onerror = () => {
            canvas.remove();
            host.classList.remove('is-offscreen');
        };
        host.append(canvas);
        worker.postMessage({ canvas: offscreen, start, scale }, [offscreen]);
    } catch {
        /* navigateur sans worker de dessin : l'animation CSS reste */
    }
}

/** Le loader a disparu : le worker s'arrête. */
export function stopJelly() {
    worker?.postMessage({ stop: true });
    worker?.terminate();
    worker = null;
}
