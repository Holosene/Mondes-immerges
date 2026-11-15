/**
 * Galerie qui se range toute seule. Les photos arrivent en pile, penchées, puis volent à leur place :
 * - mosaïque : rangées justifiées selon les vraies proportions des images ;
 * - grille : cases carrées régulières.
 * Au redimensionnement ou au changement de disposition, chaque photo glisse vers sa nouvelle place.
 *
 * Animation en FLIP, sur le compositeur uniquement : chaque case prend aussitôt sa taille d'arrivée, et une
 * transformation (Web Animations) la fait partir de sa forme précédente. L'affiche à l'intérieur reçoit une
 * contre-échelle : elle reste recadrée comme un object-fit: cover à chaque instant, jamais étirée. Le conteneur
 * prend sa hauteur d'un coup, et la suite de la page glisse en translation : aucune mise en page par image.
 */
const GAP = 12;
const DURATION = 900; // déplacement des photos (ms)
const HEIGHT = 800; // hauteur de la galerie (ms)
const STAGGER = 70; // décalage d'une photo à la suivante à l'arrivée (ms)
const PILE_TILT_SCALE = 0.92; // la pile : photos un peu plus petites
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; // --ease
const STEPS = 24; // images clés : la contre-échelle n'est pas linéaire, on l'échantillonne

/** Courbe de Bézier cubique (x1, y1, x2, y2), comme en CSS : t (temps) → avancement. */
function bezier(x1, y1, x2, y2) {
    const a = (p1, p2) => 1 - 3 * p2 + 3 * p1;
    const b = (p1, p2) => 3 * p2 - 6 * p1;
    const c = (p1) => 3 * p1;
    const at = (t, p1, p2) => ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t;
    const slope = (t, p1, p2) => 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1);
    return (x) => {
        if (x <= 0 || x >= 1) return Math.min(1, Math.max(0, x));
        let t = x;
        for (let i = 0; i < 8; i++) {
            const d = at(t, x1, x2) - x;
            const s = slope(t, x1, x2);
            if (Math.abs(d) < 1e-6) break;
            if (Math.abs(s) < 1e-6) break;
            t -= d / s;
        }
        // repli par dichotomie si Newton s'égare
        if (Math.abs(at(t, x1, x2) - x) > 1e-5) {
            let lo = 0;
            let hi = 1;
            t = x;
            for (let i = 0; i < 30; i++) {
                if (at(t, x1, x2) < x) lo = t;
                else hi = t;
                t = (lo + hi) / 2;
            }
        }
        return at(t, y1, y2);
    };
}
const ease = bezier(0.22, 1, 0.36, 1);
const mix = (a, b, t) => a + (b - a) * t;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function gallery(list, tools) {
    const items = [...list.children].map((li) => ({
        li,
        img: li.querySelector('img'),
        caption: li.querySelector('.shot-caption'),
        // forme visible : position, taille, inclinaison (deg) et échelle de la pile
        from: null,
        to: null,
        start: 0,
        delay: 0,
        animations: [],
    }));
    const ratio = items.map(() => 1.5);
    let mode = 'mosaic';
    let shown = false;

    // Pile de départ : chaque photo un peu tournée, au centre
    items.forEach((item, i) => {
        item.tilt = ((i * 47) % 25) - 12;
        const read = () => {
            if (item.img.naturalWidth) ratio[i] = item.img.naturalWidth / item.img.naturalHeight;
            if (shown) layout();
        };
        if (item.img.complete) read();
        else item.img.addEventListener('load', read, { once: true });
    });

    function mosaic(width) {
        const target = width < 640 ? 170 : width < 1000 ? 240 : 300;
        const boxes = [];
        let row = [];
        let y = 0;
        const flush = (last) => {
            const sum = row.reduce((s, i) => s + ratio[i], 0);
            const free = width - GAP * (row.length - 1);
            const h = last ? Math.min(target, free / sum) : free / sum;
            let x = 0;
            for (const i of row) {
                boxes[i] = { x, y, w: ratio[i] * h, h };
                x += ratio[i] * h + GAP;
            }
            y += h + GAP;
            row = [];
        };
        items.forEach((_, i) => {
            row.push(i);
            const sum = row.reduce((s, j) => s + ratio[j], 0);
            if (sum * target + GAP * (row.length - 1) >= width) flush(false);
        });
        if (row.length) flush(true);
        return { boxes, height: y - GAP };
    }

    function grid(width) {
        const cols = width < 640 ? 2 : 3;
        const size = (width - GAP * (cols - 1)) / cols;
        const boxes = items.map((_, i) => ({
            x: (i % cols) * (size + GAP),
            y: Math.floor(i / cols) * (size + GAP),
            w: size,
            h: size,
        }));
        return { boxes, height: Math.ceil(items.length / cols) * (size + GAP) - GAP };
    }

    /** Forme visible d'une photo à l'instant `now` (en cours de vol, ou posée). */
    function current(item, now) {
        if (!item.from) return item.to;
        const t = (now - item.start - item.delay) / item.duration;
        if (t >= 1) return item.to;
        const e = ease(Math.max(0, t));
        const { from: a, to: b } = item;
        return {
            x: mix(a.x, b.x, e),
            y: mix(a.y, b.y, e),
            w: mix(a.w, b.w, e),
            h: mix(a.h, b.h, e),
            r: mix(a.r, b.r, e),
            s: mix(a.s, b.s, e),
        };
    }

    /**
     * La case mesure box (w × h) ; la forme f est obtenue par transformation, origine en haut à gauche.
     * Équivaut à l'ancienne case de taille f.w × f.h décalée de (f.x, f.y), tournée de f.r et mise à l'échelle
     * f.s autour de son centre.
     */
    const transform = (f, box) =>
        `translate(${f.w / 2}px, ${f.h / 2}px) rotate(${f.r}deg) scale(${f.s}) ` +
        `translate(${f.x - f.w / 2}px, ${f.y - f.h / 2}px) scale(${f.w / box.w}, ${f.h / box.h})`;
    // L'affiche (object-fit: cover dans la case box) ramenée à son recadrage dans la forme f, sans étirement
    const cover = (w, h, r) => Math.max(w / r, h);
    const counter = (f, box, r) => {
        const k = cover(f.w, f.h, r) / cover(box.w, box.h, r);
        return `${(k * box.w) / f.w} ${(k * box.h) / f.h}`;
    };
    // la légende garde ses proportions (contre-échelle simple)
    const upright = (f, box) => `${box.w / f.w} ${box.h / f.h}`;

    /** Envoie chaque photo vers sa forme `to` (instantanément si `instant`). */
    function fly(targets, { stagger = false, instant = false } = {}) {
        const now = performance.now();
        const quick = instant || still();
        items.forEach((item, i) => {
            const to = targets[i];
            const from = item.to ? current(item, now) : to;
            for (const a of item.animations) a.cancel();
            item.animations = [];
            item.from = quick ? null : from;
            item.to = to;
            item.start = now;
            item.delay = stagger ? i * STAGGER : 0;
            item.duration = DURATION;
            // l'opacité d'arrivée reste une transition CSS, avec le même décalage
            item.li.style.transitionDelay = `${item.delay}ms`;
            const box = { w: to.w, h: to.h };
            const r = ratio[i];
            Object.assign(item.li.style, {
                width: `${box.w}px`,
                height: `${box.h}px`,
                transform: transform(to, box),
            });
            item.img.style.scale = counter(to, box, r);
            if (item.caption) item.caption.style.scale = upright(to, box);
            if (quick || same(from, to)) {
                item.from = null;
                return;
            }
            const frames = (fn) =>
                Array.from({ length: STEPS + 1 }, (_, k) => {
                    const e = ease(k / STEPS);
                    const f = {};
                    for (const key in to) f[key] = mix(from[key], to[key], e);
                    return { offset: k / STEPS, ...fn(f) };
                });
            const timing = { duration: DURATION, delay: item.delay, fill: 'backwards', easing: 'linear' };
            item.animations = [
                item.li.animate(
                    frames((f) => ({ transform: transform(f, box) })),
                    timing,
                ),
                item.img.animate(
                    frames((f) => ({ scale: counter(f, box, r) })),
                    timing,
                ),
            ];
            if (item.caption)
                item.animations.push(
                    item.caption.animate(
                        frames((f) => ({ scale: upright(f, box) })),
                        timing,
                    ),
                );
        });
    }
    const same = (a, b) => ['x', 'y', 'w', 'h', 'r', 's'].every((k) => Math.abs(a[k] - b[k]) < 0.01);

    // Hauteur de la galerie : posée d'un coup, la suite de la page glisse en translation jusqu'à sa place
    let height = null; // { from, to, start, layout }
    let sliding = [];
    const visibleHeight = (now) => {
        if (!height) return null;
        const t = Math.min(1, (now - height.start) / HEIGHT);
        return mix(height.from, height.to, ease(t));
    };
    /** Les blocs qui suivent la galerie, jusqu'au bas de la page. */
    function rest() {
        const blocks = [];
        for (let el = list; el && el !== document.body; el = el.parentElement)
            for (let next = el.nextElementSibling; next; next = next.nextElementSibling)
                if (getComputedStyle(next).position !== 'fixed') blocks.push(next);
        return blocks;
    }
    function setHeight(to, instant = false) {
        const now = performance.now();
        const from = instant || still() ? to : (visibleHeight(now) ?? to);
        for (const a of sliding) a.cancel();
        sliding = [];
        // en grandissant, la place est prise tout de suite ; en rétrécissant, elle n'est rendue qu'à la fin
        const layout = Math.max(from, to);
        list.style.height = `${layout}px`;
        height = { from, to, start: now };
        if (Math.abs(from - to) < 0.5) {
            list.style.height = `${to}px`;
            return;
        }
        sliding = rest().map((el) =>
            el.animate([{ translate: `0 ${from - layout}px` }, { translate: `0 ${to - layout}px` }], {
                duration: HEIGHT,
                easing: EASE,
                composite: 'add',
            }),
        );
        const mine = sliding;
        mine[0]?.finished
            .then(() => {
                if (sliding !== mine) return;
                list.style.height = `${to}px`; // même image que la fin du glissement : aucun saut
            })
            .catch(() => {});
    }

    function layout(stagger = false) {
        const width = list.clientWidth;
        const { boxes, height: h } = (mode === 'grid' ? grid : mosaic)(width);
        setHeight(h);
        fly(
            boxes.map((b) => ({ ...b, r: 0, s: 1 })),
            { stagger },
        );
    }

    // Avant l'arrivée : la pile, au centre de la zone
    const pile = (instant = true) => {
        const width = list.clientWidth;
        const w = Math.min(320, width * 0.6);
        setHeight(w * 0.9, instant);
        fly(
            items.map((item) => ({
                x: (width - w) / 2,
                y: 0,
                w,
                h: w / 1.5,
                r: item.tilt,
                s: PILE_TILT_SCALE,
            })),
            { instant },
        );
    };
    pile();

    new IntersectionObserver(
        ([e], observer) => {
            if (!e.isIntersecting) return;
            observer.disconnect();
            shown = true;
            list.classList.add('is-arranged');
            layout(true);
        },
        { threshold: 0.25 },
    ).observe(list);

    let frame = 0;
    let width = list.clientWidth;
    new ResizeObserver(() => {
        if (list.clientWidth === width) return; // seule la largeur compte (la hauteur, c'est nous qui la posons)
        width = list.clientWidth;
        // pendant un redimensionnement, les photos suivent la fenêtre sans traîner
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            if (!shown) return pile();
            const { boxes, height: h } = (mode === 'grid' ? grid : mosaic)(width);
            setHeight(h, true);
            fly(
                boxes.map((b) => ({ ...b, r: 0, s: 1 })),
                { instant: true },
            );
        });
    }).observe(list);

    tools.addEventListener('click', (e) => {
        const button = e.target.closest('[data-layout]');
        if (!button || button.dataset.layout === mode) return;
        mode = button.dataset.layout;
        tools.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', b === button));
        list.dataset.layout = mode;
        if (shown) layout(true);
    });
}
