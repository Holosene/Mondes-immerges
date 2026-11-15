/**
 * Transitions de page : un fondu au noir, court et sobre.
 * Sortie : la page s'éteint (≈ 0,4 s, accélération douce), puis la navigation part.
 * Arrivée : la nouvelle page sort du noir (≈ 0,6 s, décélération douce), une fois son premier rendu posé.
 * Le script en ligne du <head> pose « is-entering » (écran noir) avant le premier rendu : aucun flash.
 * Mouvement réduit demandé : pas de fondu, la page change directement.
 */
const KEY = 'mi:transition';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function veil() {
    let el = document.querySelector('.veil');
    if (!el) {
        el = document.createElement('div');
        el.className = 'veil';
        el.setAttribute('aria-hidden', 'true');
        document.body.append(el);
    }
    return el;
}

let leaving = false;

/** Quitte la page vers `url`. */
export async function leave(url) {
    if (leaving) return;
    leaving = true;
    try {
        sessionStorage.setItem(KEY, '1');
    } catch {
        /* stockage indisponible : arrivée sans transition */
    }
    if (!still())
        await veil().animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 420,
            easing: 'cubic-bezier(0.4, 0, 1, 1)',
            fill: 'forwards',
        }).finished;
    location.assign(url);
}

/** À l'arrivée : la page sort du noir si la précédente a lancé une transition. */
export function enter() {
    let pending = false;
    try {
        pending = sessionStorage.getItem(KEY) === '1';
        sessionStorage.removeItem(KEY);
    } catch {
        /* rien */
    }
    const root = document.documentElement;
    if (!pending || still()) return root.classList.remove('is-entering');
    const el = veil();
    el.style.opacity = '1';
    root.classList.remove('is-entering');
    // deux images : la page a posé son premier rendu sous le voile avant qu'il ne se lève
    requestAnimationFrame(() =>
        requestAnimationFrame(() =>
            el
                .animate([{ opacity: 1 }, { opacity: 0 }], {
                    duration: 600,
                    easing: 'cubic-bezier(0, 0, 0.2, 1)',
                    fill: 'forwards',
                })
                .finished.then(() => el.remove()),
        ),
    );
}

/** Liens internes marqués data-transition. */
export function bind(root = document) {
    root.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-transition]');
        if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        leave(link.href);
    });
}

// Retour arrière depuis le cache du navigateur : la page doit réapparaître sans voile
addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    document.querySelector('.veil')?.remove();
});
