/**
 * Lève l'écran de chargement (loader jelly, dans le HTML) : html.is-loaded libère les animations d'entrée.
 * Sécurité : au plus tard après `max` ms, même si la ressource attendue traîne.
 */
const MIN = 2000; // le loader reste au moins 2 s (depuis l'ouverture de la page)

export function loaded(ready = Promise.resolve(), max = 6000) {
    const done = () => {
        document.documentElement.classList.add('is-loaded');
        // une fois fondu, le loader quitte la page : ses animations infinies ne tournent plus pour rien
        const el = document.getElementById('loader');
        setTimeout(() => el?.remove(), 900);
    };
    const wait = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
    Promise.all([
        Promise.race([Promise.allSettled([ready, document.fonts?.ready]), wait(max)]),
        wait(MIN - performance.now()),
    ]).then(() => (document.hidden ? done() : requestAnimationFrame(done))); // onglet caché : pas d'image à attendre
}
