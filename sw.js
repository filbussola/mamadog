/* ============================================================================
   sw.js — il service worker.
   È lui che rende il gioco un'app vera: dopo la prima apertura tutto sta sul
   tablet, si gioca in aereo, in montagna e senza wi-fi, e non passerà mai
   una pubblicità perché non c'è più niente da scaricare.

   Per pubblicare un aggiornamento basta cambiare VERSIONE: alla riapertura
   successiva il gioco si aggiorna da solo, senza chiedere niente a nessuno.
   ========================================================================== */

const VERSIONE = 'wurstel-v1';

/* Senza questi il gioco non parte: o ci sono tutti, o l'installazione fallisce
   e si riprova la volta dopo. Meglio nessuna promessa che una promessa a metà. */
const NUCLEO = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/wurstel.css',
  './css/hub.css',
  './css/match3.css',
  './css/barattoli.css',
  './js/main.js',
  './js/store.js',
  './js/audio.js',
  './js/art.js',
  './js/wurstel.js',
  './js/ui.js',
  './js/hub.js',
  './js/amici.js',
  './js/match3/engine.js',
  './js/match3/levels.js',
  './js/match3/view.js',
  './js/barattoli/engine.js',
  './js/barattoli/generator.js',
  './js/barattoli/view.js',
];

/* Belle da avere, ma se una manca il gioco funziona lo stesso. */
const CONTORNO = [
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSIONE);
    await cache.addAll(NUCLEO);
    await Promise.allSettled(CONTORNO.map((u) => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const richiesta = e.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const salvata = await caches.match(richiesta, { ignoreSearch: true });
    if (salvata) return salvata;

    try {
      const risposta = await fetch(richiesta);
      /* Si tiene da parte tutto ciò che arriva bene: alla seconda apertura
         c'è già tutto anche se l'elenco qui sopra dimenticava qualcosa. */
      if (risposta.ok && risposta.type === 'basic') {
        const cache = await caches.open(VERSIONE);
        cache.put(richiesta, risposta.clone());
      }
      return risposta;
    } catch {
      /* Offline e non in cache: se è una pagina, si serve comunque il gioco. */
      if (richiesta.mode === 'navigate') {
        const casa = await caches.match('./index.html');
        if (casa) return casa;
      }
      return new Response('', { status: 504, statusText: 'Non raggiungibile' });
    }
  })());
});
