// Mondes Immergés : site multi-pages publié sur GitHub Pages (johann-ar.github.io/Mondes-immerges/),
// servi à https://holosene.fr/portfolio/mondes-immerges/ par le Worker Cloudflare de holosene.fr (dépôt Portfolio).
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/** Dossier où le site est servi (holosene.fr) ; scripts/check-links.mjs lit la même valeur. */
export const BASE = '/portfolio/mondes-immerges/';

/** Anciennes adresses johann-ar.github.io/Mondes-immerges/… : renvoyées vers la même page sous holosene.fr. */
const oldAddress = () => ({
    name: 'old-address',
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n        <script>if(location.hostname==='johann-ar.github.io')location.replace('https://holosene.fr${BASE}'+location.pathname.replace(/^\\/Mondes-immerges\\//,'')+location.search+location.hash)</script>`),
});

const page = (path) => resolve(import.meta.dirname, path);

export default defineConfig(({ command }) => ({
    base: command === 'build' ? BASE : '/',
    plugins: command === 'build' ? [oldAddress()] : [],

    server: { port: 3000, open: true },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2022', // await au premier niveau (chargement différé du globe)
        chunkSizeWarningLimit: 1400, // three.js (WebGPU + TSL) pèse ~1,2 Mo minifié
        rollupOptions: {
            input: {
                accueil: page('index.html'),
                globe: page('globe/index.html'),
                documentaire: page('documentaire/index.html'),
            },
            output: {
                manualChunks: { three: ['three', 'three/webgpu', 'three/tsl'] },
            },
        },
    },
}));
