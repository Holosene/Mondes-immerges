import { FILMS, image } from '../data/films.js';
import { header } from '../shared/logo.js';
import { loaded } from '../shared/loader.js';
import { bind, enter, leave } from '../shared/transition.js';

const BASE = import.meta.env.BASE_URL;
const $ = (id) => document.getElementById(id);
const body = document.body;
const filmUrl = (film) => `${BASE}documentaire/?film=${film.slug}`;
const mobile = matchMedia('(max-width: 760px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

$('bar').innerHTML = header(BASE);
enter();
bind();

// Liste des films : seul affichage si le navigateur ne peut pas dessiner le globe
$('index-list').innerHTML = FILMS.map(
    (film, i) => `
    <li>
        <a href="${filmUrl(film)}" data-transition>
            <span class="index-n">${String(i + 1).padStart(2, '0')}</span>
            <img src="${image(film.poster, 160)}" alt="" loading="lazy" width="54" height="80" />
            <span class="index-text"><strong>${film.title}</strong><span>${film.world} · ${film.place}</span></span>
        </a>
    </li>`,
).join('');
const index = $('index');
$('index-close').addEventListener('click', () => index.close());
index.addEventListener('click', (e) => e.target === index && index.close());

// Un cadre jaune par film (portrait 2:3, comme l'affiche), son titre toujours à droite, immobile. Au survol, d'un seul
// geste : le cadre bascule de 90° comme s'il tombait sur le côté et, en même temps, grandit vers la gauche (à l'opposé
// du titre), autant vers le haut que vers le bas, jusqu'à la taille de l'affiche. L'affiche reste droite et se
// précise. Tout suit un ressort : on peut entrer, sortir et revenir à toute vitesse, le geste repart toujours de
// l'état où il est, sans saut ni retour à la petite taille.
const POSTER = mobile ? 132 : 196; // largeur de l'affiche ouverte (hauteur : ×1,5)
const M = 16; // marge à l'écran
const OPEN = 10; // raideur du ressort (rad/s) : ≈ 0,5 s pour s'ouvrir
const CLOSE = 13; // un peu plus vif pour se refermer
const REST_W = 16;
const REST_H = 24;
const lerp = (a, b, t) => a + (b - a) * t;
const step = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
const moving = new Set();

/** Taille de l'affiche ouverte : la place vers la gauche, et symétrique en hauteur autour du titre. */
function measure(element, st) {
    const img = st.img;
    const { left: x, top: y } = element.getBoundingClientRect();
    const ratio = img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1.5;
    const top = $('bar').offsetHeight || 64;
    const half = Math.min(y - (top + M), innerHeight - M - y);
    st.w = Math.round(Math.max(64, Math.min(POSTER, x + 12 - M, (2 * half) / ratio)));
    st.h = Math.round(st.w * ratio);
}

/** Dessine le cadre à l'avancement p (0 : petit portrait debout, 1 : affiche ouverte). */
function draw(st) {
    const p = Math.min(1, Math.max(0, st.p));
    const turn = step(0, 0.8, p); // la bascule mène, l'agrandissement suit aussitôt
    const grow = step(0.08, 1, p);
    const angle = turn * (Math.PI / 2);
    const border = lerp(3, mobile ? 4 : 5, grow);
    // le cadre non tourné mesure W × H ; une fois couché (90°), il occupe H en largeur et W en hauteur à l'écran
    const W = lerp(REST_W, st.h, grow);
    const H = lerp(REST_H, st.w, grow);
    const cx = lerp(0, 12 - H / 2, turn); // bord droit gardé contre le titre une fois couché
    Object.assign(st.frame.style, {
        translate: `${cx - W / 2}px ${-H / 2}px`, // position par transform : seule la taille relance la mise en page
        width: `${W}px`,
        height: `${H}px`,
        rotate: `${angle}rad`,
    });
    st.frame.style.setProperty('--bw', `${border}px`);
    // L'affiche, droite à l'écran, couvre la boîte englobante de la fenêtre inclinée (inset : demi-liseré),
    // avec un débord de 3 px de chaque côté : arrondis et flou du repos ne découvrent jamais le fond.
    const iw = W - border;
    const ih = H - border;
    const c = Math.abs(Math.cos(angle));
    const sn = Math.abs(Math.sin(angle));
    const pad = lerp(6, 4, grow);
    Object.assign(st.img.style, {
        width: `${c * iw + sn * ih + pad}px`,
        height: `${sn * iw + c * ih + pad}px`,
        rotate: `${-angle}rad`,
    });
    st.element.classList.toggle('is-landed', st.target === 1 && grow > 0.55);
}

function tick(now) {
    for (const st of moving) {
        const dt = Math.min(1 / 30, (now - (st.last ?? now - 16)) / 1000);
        st.last = now;
        const k = st.target ? OPEN : CLOSE;
        // ressort amorti critique : pas de rebond, vitesse continue quand la cible change en cours de route
        st.v += (k * k * (st.target - st.p) - 2 * k * st.v) * dt;
        st.p += st.v * dt;
        const done = Math.abs(st.target - st.p) < 0.002 && Math.abs(st.v) < 0.02;
        if (done) st.p = st.target;
        draw(st);
        if (done) settle(st);
    }
    if (moving.size) requestAnimationFrame(tick);
}

function settle(st) {
    moving.delete(st);
    st.last = undefined;
    st.v = 0;
    if (st.target === 0) {
        // revenu au repos : le CSS reprend la main
        st.frame.removeAttribute('style');
        st.img.removeAttribute('style');
        st.element.style.zIndex = '';
    }
    st.waiting.splice(0).forEach((resolve) => resolve());
}

function animate(st, target) {
    st.target = target;
    if (reducedMotion) {
        st.p = target;
        st.v = 0;
        draw(st);
        settle(st);
        return;
    }
    if (!moving.size) requestAnimationFrame(tick);
    moving.add(st);
}

const state = (element) =>
    (element.st ??= {
        element,
        frame: element.querySelector('.marker-frame'),
        img: element.querySelector('.marker-frame img'),
        p: 0,
        v: 0,
        target: 0,
        waiting: [],
    });

function open(element) {
    const st = state(element);
    if (st.p < 0.02 || !st.w) measure(element, st); // en cours de fermeture : on garde la taille visée
    $('markers').classList.add('has-open');
    globe?.hold(8);
    element.classList.add('is-open');
    element.style.zIndex = '3';
    const settled = new Promise((resolve) => st.waiting.push(resolve));
    if (st.target !== 1 || moving.has(st) || st.p !== 1) animate(st, 1);
    else st.waiting.splice(0).forEach((resolve) => resolve());
    return settled;
}

function close(element) {
    const st = state(element);
    if (st.target === 0) return;
    element.classList.remove('is-open', 'is-landed');
    if (!document.querySelector('.marker.is-open')) $('markers').classList.remove('has-open');
    st.waiting.splice(0).forEach((resolve) => resolve());
    animate(st, 0);
}

const markers = FILMS.map((film) => {
    const element = document.createElement('a');
    element.className = 'marker is-hidden';
    element.href = filmUrl(film);
    element.tabIndex = -1;
    element.innerHTML = `
        <span class="marker-frame"><span class="marker-photo"><img src="${image(film.poster, 420)}" alt="" decoding="async" /></span></span>
        <span class="marker-label"><strong>${film.title}</strong><span>${film.world} · ${film.place}</span></span>`;
    let going = false;
    element.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && open(element));
    element.addEventListener('pointerleave', () => !going && close(element));
    element.addEventListener('focus', () => open(element));
    element.addEventListener('blur', () => !going && close(element));
    element.addEventListener('click', async (e) => {
        e.preventDefault();
        going = true;
        globe?.hold(10);
        await open(element); // au doigt : la fenêtre s'ouvre d'abord, puis on part
        await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 250));
        leave(element.href);
    });
    $('markers').append(element);
    return { element, lat: film.lat, lng: film.lng };
});

let globe = null;
const VIEW = {
    intro: { shift: mobile ? 0 : 0.22, distance: mobile ? 5.8 : 4.7 }, // accueil : globe plus proche
    explore: { shift: 0, distance: mobile ? 4.7 : 3.7 }, // « Explorer » : la caméra s'avance vers le globe, plus gros
};

function setMode(mode, { push = false, instant = false } = {}) {
    body.dataset.mode = mode;
    if (push) history.pushState({ mode }, '', mode === 'explore' ? `${BASE}globe/` : BASE);
    if (!globe) return;
    globe.setShift(VIEW[mode].shift, instant);
    if (!instant) globe.flyTo({ distance: VIEW[mode].distance, duration: mode === 'explore' ? 2200 : 1700 });
    globe.spinOn(); // la rotation passive continue sans pause, avant comme après « Explorer »
}

$('enter').addEventListener('click', () => setMode('explore', { push: true }));
addEventListener('popstate', () => setMode(location.pathname.endsWith('/globe/') ? 'explore' : 'intro'));

const supported = () => {
    if ('gpu' in navigator) return true;
    try {
        return Boolean(document.createElement('canvas').getContext('webgl2'));
    } catch {
        return false;
    }
};

function fallback() {
    body.classList.add('no-globe', 'is-ready');
    index.show();
    loaded();
}

if (supported()) {
    try {
        const { Globe } = await import('../globe/Globe.js');
        globe = await Globe.create({ canvas: $('globe'), markers, base: BASE, mobile });
        const from = FILMS.find((f) => f.slug === new URLSearchParams(location.search).get('from'));
        const mode = body.dataset.mode;
        globe.face(from?.lat ?? 22, from?.lng ?? (mode === 'intro' ? -25 : 10), VIEW[mode].distance);
        setMode(mode, { instant: true });
        if (from) globe.hold(6);
        // parcours (molette, Espace, flèches) : le film où la caméra arrive ouvre sa fenêtre, comme au survol
        let toured = null;
        globe.onTour = (marker) => {
            if (toured && toured !== marker?.element) close(toured);
            toured = marker && body.dataset.mode === 'explore' ? marker.element : null;
            if (toured) open(toured);
        };
        if (import.meta.env.DEV) window.__globe = globe; // inspection en développement
        if (import.meta.env.DEV) window.__frame = { state, draw, open, close }; // capture image par image
        requestAnimationFrame(() => {
            body.classList.add('is-ready');
            loaded(globe.warm); // le loader se lève une fois les courants dessinés
        });
    } catch (error) {
        console.error('Globe indisponible :', error);
        fallback();
    }
} else {
    fallback();
}
