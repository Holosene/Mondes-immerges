/**
 * Lève l'écran de chargement (loader jelly, dans le HTML) : html.is-loaded libère les animations d'entrée.
 * Sécurité : au plus tard après `max` ms, même si la ressource attendue traîne.
 */
import { startJelly, stopJelly } from './jelly.js';

startJelly();

// Pendant le chargement, la page ne réagit à rien : clavier, molette et clics n'atteignent pas ce qui se
// prépare dessous (écouteurs posés en premier, en capture : ils passent avant tous les autres)
const busy = () => !document.documentElement.classList.contains('is-loaded');
for (const type of ['keydown', 'wheel', 'pointerdown', 'click', 'touchstart'])
    addEventListener(
        type,
        (e) => {
            if (!busy()) return;
            // raccourcis du navigateur (recharger, onglets…) laissés libres ; seuls les gestes de la page attendent
            if (
                type === 'keydown' &&
                (e.metaKey || e.ctrlKey || e.altKey || !/^(Space|Arrow|Page)/.test(e.code))
            ) {
                if (!e.metaKey && !e.ctrlKey && !e.altKey) e.stopImmediatePropagation();
                return;
            }
            if (e.cancelable && type !== 'touchstart') e.preventDefault();
            e.stopImmediatePropagation();
        },
        { capture: true, passive: false },
    );

const MIN = 2000; // le loader reste au moins 2 s (depuis l'ouverture de la page)
const OUT = 400; // durée du fondu du jelly, avant que le fond noir ne se lève

export function loaded(ready = Promise.resolve(), max = 6000) {
    // Fin en deux temps : le jelly s'efface d'abord en fondu (0,4 s), puis le fond noir se lève à son tour
    // (0,9 s) et la page entre (html.is-loaded libère les animations d'entrée).
    const root = document.documentElement;
    const done = () => {
        root.classList.add('is-unloading');
        setTimeout(() => root.classList.add('is-loaded'), document.hidden ? 0 : OUT);
        // une fois fondu, le loader quitte la page : ses animations infinies ne tournent plus pour rien
        const el = document.getElementById('loader');
        setTimeout(() => {
            el?.remove();
            stopJelly();
        }, OUT + 1000);
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
    Promise.all([
        Promise.race([Promise.allSettled([ready, document.fonts?.ready]), wait(max)]),
        wait(MIN - performance.now()),
    ]).then(() => (document.hidden ? done() : requestAnimationFrame(done))); // onglet caché : pas d'image à attendre
}
