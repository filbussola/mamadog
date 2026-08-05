/* ============================================================================
   frecce/view.js — "Via libera", quello che si vede e si tocca.
   Un tocco, una regola sola: se la strada è libera il cucciolo corre a casa,
   altrimenti resta e aspetta il suo turno. Nessuna mossa può mai chiudere la
   strada a un altro — l'ha già garantito il motore — quindi qui non c'è
   nessun rimescolo da gestire: un cortile risolvibile lo è sempre, in
   qualunque ordine lo si tocchi.
   ========================================================================== */

import { $, attendi, coriandoli, mostraPannello, vaiA, quandoCambiaLoSpazio } from '../ui.js';
import { stato, salva, salvaSubito, registraLivelloFinito } from '../store.js';
import { suoni } from '../audio.js';
import { creaMascotte, frase } from '../wurstel.js';
import { cuccioloSvg, caneSvg } from '../art.js';
import { presentaNuoviAmici } from '../amici.js';
import * as motore from './engine.js';
import { generaLivello } from './generator.js';

const MS_SUGGERIMENTO = 8000;
const OLTRE_BORDO = 3;   // caselle oltre il bordo: garantisce che l'uscita esca dallo schermo

let tavolo, cortile, mascotte;
let g = null;
let iniziali = 0;
let numeroLivello = 1;
let lato = 0;
let bloccato = true;
let pronto = false;
let attesaProssimo = false;
let rimisura = () => {};
let timerSuggerimento = 0;

const perId = new Map();   // id del cucciolo -> elemento nel DOM

/* ========================================================================== */
/*  Misure                                                                     */
/* ========================================================================== */

function misura() {
  if (!g || !tavolo.clientWidth) return;
  const largo = tavolo.clientWidth - 16, alto = tavolo.clientHeight - 16;
  const nuovo = Math.max(30, Math.min(118, Math.floor(Math.min(largo / g.colonne, alto / g.righe))));
  if (nuovo === lato) return;
  lato = nuovo;
  cortile.style.setProperty('--lato', lato + 'px');
  cortile.style.setProperty('--colonne', g.colonne);
  cortile.style.setProperty('--righe', g.righe);
  senzaMoto(collocaTutte);
}

function senzaMoto(azione) {
  cortile.classList.add('senza-moto');
  azione();
  void cortile.offsetWidth;
  cortile.classList.remove('senza-moto');
}

const trasforma = (el, c, r) => { el.style.transform = `translate(${c * lato}px, ${r * lato}px)`; };

function collocaTutte() {
  for (let i = 0; i < g.celle.length; i++) {
    const cella = g.celle[i];
    if (!cella) continue;
    const el = perId.get(cella.id);
    if (el) trasforma(el, motore.colonnaDi(g, i), motore.rigaDi(g, i));
  }
}

/* ========================================================================== */
/*  Disegno                                                                    */
/* ========================================================================== */

function creaCucciolo(cella) {
  const el = document.createElement('div');
  el.className = 'cucciolo';
  el.innerHTML = `<span class="cucciolo__figura">${cuccioloSvg(cella.id, cella.direzione)}</span>`;
  return el;
}

function disegnaTutti() {
  cortile.innerHTML = '';
  perId.clear();
  for (let i = 0; i < g.celle.length; i++) {
    const cella = g.celle[i];
    if (!cella) continue;
    const el = creaCucciolo(cella);
    perId.set(cella.id, el);
    cortile.append(el);
  }
  senzaMoto(collocaTutte);
}

/** Dove finisce, fuori dal cortile, un cucciolo che corre in `direzione`. */
function fuoriBordo(i, direzione) {
  const c = motore.colonnaDi(g, i), r = motore.rigaDi(g, i);
  if (direzione === 'su')  return [c, -OLTRE_BORDO];
  if (direzione === 'giu') return [c, g.righe - 1 + OLTRE_BORDO];
  if (direzione === 'sx')  return [-OLTRE_BORDO, r];
  return [g.colonne - 1 + OLTRE_BORDO, r];
}

function aggiornaObiettivo() {
  const rimasti = g.celle.filter(Boolean).length;
  const fatti = Math.max(0, iniziali - rimasti);
  const quota = iniziali ? (fatti / iniziali) * 100 : 100;
  $('#fr-obiettivo-riempi').style.width = quota + '%';
  $('#fr-obiettivo-conto').textContent = `${fatti}/${iniziali}`;
  return rimasti;
}

function aggiornaTesta() {
  $('#fr-livello').textContent = numeroLivello;
  $('#fr-obiettivo-icona').innerHTML = cuccioloSvg(1, 'su');
  aggiornaObiettivo();
}

/* ========================================================================== */
/*  Tocco                                                                      */
/* ========================================================================== */

async function tocca(i) {
  if (bloccato || !g || !lato) return;
  const cella = g.celle[i];
  if (!cella) return;   // casella vuota: nessun cucciolo da mandare a casa

  mascotte.sveglia();
  fermaSuggerimento();

  const el = perId.get(cella.id);
  const esito = motore.fai(g, i);

  if (!esito) {
    suoni.niente();
    el?.classList.add('cucciolo--bloccato');
    setTimeout(() => el?.classList.remove('cucciolo--bloccato'), 380);
    programmaSuggerimento();
    return;
  }

  bloccato = true;
  suoni.scappa();

  if (el) {
    const [cx, cy] = fuoriBordo(i, esito.direzione);
    trasforma(el, cx, cy);
    el.classList.add('cucciolo--scappa');
  }
  perId.delete(cella.id);
  setTimeout(() => el?.remove(), 420);

  await attendi(130);

  const rimasti = aggiornaObiettivo();

  if (rimasti === 0) { await completa(); return; }
  if (rimasti <= Math.max(1, Math.ceil(iniziali * 0.15))) mascotte.dici(frase('vicino'), 1700);

  salvaPartita();
  bloccato = false;
  programmaSuggerimento();
}

/* ========================================================================== */
/*  Fine livello                                                               */
/* ========================================================================== */

async function completa() {
  suoni.livello();
  coriandoli();
  mascotte.festeggia('livello');

  const biscotti = 9 + Math.floor(numeroLivello / 2);
  const prossimo = numeroLivello + 1;

  attesaProssimo = true;
  stato.frecce.livello = prossimo;
  stato.frecce.partita = null;
  const nuoviAmici = registraLivelloFinito(biscotti);
  salvaSubito();

  await attendi(850);
  await presentaNuoviAmici(nuoviAmici);

  mostraPannello({
    titolo: `Livello ${numeroLivello} fatto!`,
    testo: `Tutti a casa! +${biscotti} biscotti · ne hai ${stato.biscotti}`,
    cane: caneSvg(),
    azioni: [
      { testo: 'Un altro! 🏠', azione: () => nuovoLivello(prossimo) },
      { testo: 'Torna alla cuccia', tenue: true, azione: () => { g = null; vaiA('hub'); } },
    ],
  });
}

/* ========================================================================== */
/*  Partita                                                                    */
/* ========================================================================== */

function salvaPartita() {
  stato.frecce.livello = numeroLivello;
  stato.frecce.partita = { griglia: motore.serializza(g), iniziali };
  salva();
}

function nuovoLivello(n) {
  attesaProssimo = false;
  numeroLivello = n;
  g = generaLivello(n);
  iniziali = g.celle.filter(Boolean).length;
  avviaTavolo();
  salvaPartita();
}

function riprendiOppureNuovo() {
  const salvata = stato.frecce.partita;
  const n = stato.frecce.livello || 1;

  if (salvata?.griglia) {
    const ripresa = motore.deserializza(salvata.griglia);
    if (ripresa) {
      g = ripresa;
      numeroLivello = n;
      iniziali = salvata.iniziali || g.celle.filter(Boolean).length;
      avviaTavolo();
      return;
    }
  }
  nuovoLivello(n);
}

function avviaTavolo() {
  attesaProssimo = false;
  lato = 0;               // forza il ricalcolo della misura
  disegnaTutti();
  misura();
  aggiornaTesta();
  bloccato = false;
  programmaSuggerimento();
}

/* ========================================================================== */
/*  La zampa d'aiuto                                                           */
/* ========================================================================== */

function programmaSuggerimento() {
  fermaSuggerimento();
  timerSuggerimento = setTimeout(() => {
    if (bloccato || !g) return;
    const i = motore.trovaMossaValida(g);
    if (i === null) return;   // non dovrebbe mai succedere a cortile non vuoto
    perId.get(g.celle[i].id)?.classList.add('cucciolo--suggerito');
    mascotte.dici(frase('aiuto'), 2000);
  }, MS_SUGGERIMENTO);
}

function fermaSuggerimento() {
  clearTimeout(timerSuggerimento);
  for (const el of cortile.querySelectorAll('.cucciolo--suggerito')) {
    el.classList.remove('cucciolo--suggerito');
  }
}

/* ========================================================================== */
/*  Ciclo di vita della schermata                                              */
/* ========================================================================== */

function indiceDaEvento(e) {
  const r = cortile.getBoundingClientRect();
  const c = Math.floor((e.clientX - r.left) / lato);
  const y = Math.floor((e.clientY - r.top) / lato);
  if (c < 0 || y < 0 || c >= g.colonne || y >= g.righe) return null;
  return motore.ind(g, c, y);
}

function ditoGiu(e) {
  if (bloccato || !g || !lato) return;
  const i = indiceDaEvento(e);
  if (i === null) return;
  suoni.tocco();
  tocca(i);
}

function inizializza() {
  tavolo = $('#fr-tavolo');
  cortile = $('#fr-cortile');
  mascotte = creaMascotte($('#fr-wurstel'), { fumetto: $('#fr-fumetto') });

  cortile.addEventListener('pointerdown', ditoGiu);
  rimisura = quandoCambiaLoSpazio(tavolo, misura);
  pronto = true;
}

export function entra() {
  if (!pronto) inizializza();
  if (!g) riprendiOppureNuovo();
  rimisura();
  mascotte.sveglia();
  mascotte.dici('Aiutali a tornare a casa!', 2600);
  if (!bloccato) programmaSuggerimento();
}

export function esci() {
  fermaSuggerimento();
  if (g && !attesaProssimo) salvaPartita();
  salvaSubito();
}
