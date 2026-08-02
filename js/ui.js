/* ============================================================================
   ui.js — passaggio fra schermate, pannelli, coriandoli, tema.
   ========================================================================== */

import { stato, salva } from './store.js';

export const $  = (sel, dove = document) => dove.querySelector(sel);
export const $$ = (sel, dove = document) => [...dove.querySelectorAll(sel)];

export const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/* --- Tema ----------------------------------------------------------------- */
export function applicaTema(tema) {
  stato.impostazioni.tema = tema;
  document.documentElement.dataset.tema = tema;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tema === 'giorno' ? '#fdf3e6' : '#1b1520');
  salva();
}

/* --- Router --------------------------------------------------------------- */
const schermi = new Map();
let schermoAttuale = null;

export function registraSchermo(nome, { entra, esci } = {}) {
  schermi.set(nome, { entra, esci });
}

export async function vaiA(nome) {
  if (schermoAttuale === nome) return;

  const precedente = schermoAttuale;
  if (precedente) {
    const el = $(`[data-schermo="${precedente}"]`);
    schermi.get(precedente)?.esci?.();
    el.classList.add('schermo--esce');
    await attendi(160);
    el.hidden = true;
    el.classList.remove('schermo--esce');
  }

  schermoAttuale = nome;
  const el = $(`[data-schermo="${nome}"]`);
  el.hidden = false;
  el.classList.add('schermo--entra');
  setTimeout(() => el.classList.remove('schermo--entra'), 300);
  schermi.get(nome)?.entra?.();
}

/* I bottoni con data-vai funzionano ovunque, senza registrarli uno per uno. */
document.addEventListener('click', (e) => {
  const bottone = e.target.closest('[data-vai]');
  if (bottone) vaiA(bottone.dataset.vai);
});

/* --- Pannelli sovrapposti -------------------------------------------------- */
const velo = $('#velo');

export function chiudiPannello() {
  velo.hidden = true;
  velo.innerHTML = '';
}

/**
 * mostraPannello({ titolo, testo, cane, azioni:[{testo, tenue, azione}], contenuto })
 * Nessuna X e nessun tocco fuori per chiudere: si esce solo da un bottone
 * grande e chiaro, così non si chiude per sbaglio con il palmo.
 */
export function mostraPannello({ titolo, testo, cane, contenuto, azioni = [] }) {
  velo.innerHTML = `
    <div class="pannello" role="dialog" aria-modal="true" aria-label="${titolo || ''}">
      ${cane ? `<div class="pannello__cane">${cane}</div>` : ''}
      ${titolo ? `<h2 class="pannello__titolo">${titolo}</h2>` : ''}
      ${testo ? `<p class="pannello__testo">${testo}</p>` : ''}
      ${contenuto || ''}
      <div class="pannello__azioni"></div>
    </div>`;

  const zona = $('.pannello__azioni', velo);
  for (const a of azioni) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bottone-largo' + (a.tenue ? ' bottone-largo--tenue' : '');
    b.textContent = a.testo;
    b.addEventListener('click', () => {
      chiudiPannello();
      a.azione?.();
    });
    zona.append(b);
  }

  velo.hidden = false;
  return $('.pannello', velo);
}

/* --- Coriandoli ------------------------------------------------------------ */
const TINTE = ['#ffb454', '#ff8fa3', '#9ad84f', '#5cc0f2', '#b98ff0', '#ffd34d'];

export function coriandoli(quanti = 46) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const scatola = document.createElement('div');
  scatola.className = 'coriandoli';

  for (let i = 0; i < quanti; i++) {
    const c = document.createElement('i');
    c.className = 'coriandolo';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = TINTE[i % TINTE.length];
    c.style.animationDuration = 1.9 + Math.random() * 1.5 + 's';
    c.style.animationDelay = Math.random() * 0.7 + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    scatola.append(c);
  }

  document.body.append(scatola);
  setTimeout(() => scatola.remove(), 4200);
}
