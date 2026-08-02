/* ============================================================================
   barattoli/view.js — il gioco dei barattoli, quello che si tocca.
   Regole d'oro: si annulla quante volte si vuole, non si perde mai, e il
   livello è garantito risolvibile prima ancora di comparire sullo schermo.
   ========================================================================== */

import { $, attendi, coriandoli, mostraPannello, vaiA } from '../ui.js';
import { stato, salva, salvaSubito, registraLivelloFinito } from '../store.js';
import { suoni } from '../audio.js';
import { creaMascotte } from '../wurstel.js';
import { biscottoSvg, caneSvg } from '../art.js';
import { presentaNuoviAmici } from '../amici.js';
import { CAPIENZA, quantoVersa, corsaInCima, aPosto, vinto } from './engine.js';
import { generaLivello, livelloBarattoli } from './generator.js';

let tavolo, scaffale, mascotte;
let barattoli = [];        // lo stato: elenco di barattoli, dal fondo in su
let iniziale = [];         // com'era all'inizio, per il bottone "Ricomincia"
let storia = [];           // le mosse fatte, per annullare
let numeroLivello = 1;
let scelto = null;
let bloccato = false;
let pronto = false;
let attesaProssimo = false;

const elementi = [];       // un div per barattolo
const biscottiDi = [];     // gli elementi dei biscotti, dal fondo in su

/* ========================================================================== */
/*  Misure                                                                     */
/* ========================================================================== */

function misura() {
  if (!barattoli.length || !tavolo.clientWidth) return;
  const quanti = barattoli.length;
  const righe = quanti <= 6 ? 1 : 2;
  const perRiga = Math.ceil(quanti / righe);

  const largo = Math.max(34, Math.min(120, Math.floor(Math.min(
    (tavolo.clientWidth  - 20) / (perRiga * 1.3),
    (tavolo.clientHeight - 20) / (righe * 2.35),
  ))));
  scaffale.style.setProperty('--largo', largo + 'px');
}

/* ========================================================================== */
/*  Disegno                                                                    */
/* ========================================================================== */

function creaBiscotto(colore, indice) {
  const el = document.createElement('span');
  el.className = 'biscotto';
  el.style.setProperty('--indice', indice);
  el.innerHTML = biscottoSvg(colore);
  return el;
}

function disegna() {
  scaffale.innerHTML = '';
  elementi.length = 0;
  biscottiDi.length = 0;

  barattoli.forEach((barattolo, i) => {
    const el = document.createElement('div');
    el.className = 'barattolo';
    el.dataset.i = i;
    el.innerHTML = '<span class="barattolo__vetro"></span>';

    const pila = barattolo.map((colore, k) => {
      const b = creaBiscotto(colore, k);
      el.append(b);
      return b;
    });

    scaffale.append(el);
    elementi.push(el);
    biscottiDi.push(pila);
  });

  misura();
}

/* ========================================================================== */
/*  Travaso                                                                    */
/* ========================================================================== */

/** Sposta `quanti` biscotti da i a j senza chiedersi se è lecito: le regole
    le controlla chi chiama. Serve anche per l'annulla, che lecito non è. */
async function sposta(i, j, quanti) {
  const presi = biscottiDi[i].splice(biscottiDi[i].length - quanti, quanti);
  const base = barattoli[j].length;

  for (let k = 0; k < quanti; k++) barattoli[j].push(barattoli[i].pop());
  biscottiDi[j].push(...presi);

  /* Parte per primo quello in cima: è il gesto che l'occhio si aspetta. */
  const inOrdineDiPartenza = [...presi].reverse();
  inOrdineDiPartenza.forEach((el, n) => {
    const nuovoIndice = base + (quanti - 1 - n);
    setTimeout(() => volaVerso(el, elementi[j], nuovoIndice), n * 75);
  });

  await attendi(75 * (quanti - 1) + 330);
}

/* Tecnica FLIP: si misura dov'era, si sposta, si misura dov'è finito e si
   parte dal vecchio posto. Il browser fa il resto in una transizione sola. */
function volaVerso(el, contenitore, nuovoIndice) {
  const prima = el.getBoundingClientRect();
  contenitore.append(el);
  el.style.setProperty('--indice', nuovoIndice);
  const dopo = el.getBoundingClientRect();

  el.style.transition = 'none';
  el.style.transform = `translate(${prima.left - dopo.left}px, ${prima.top - dopo.top}px)`;
  void el.offsetWidth;
  el.style.transition = '';
  el.style.transform = '';
}

function segnaPronti(i, acceso) {
  const pila = biscottiDi[i];
  const corsa = corsaInCima(barattoli[i]);
  for (let k = pila.length - corsa; k < pila.length; k++) {
    pila[k]?.classList.toggle('biscotto--pronto', acceso);
  }
}

function deseleziona() {
  if (scelto === null) return;
  elementi[scelto]?.classList.remove('barattolo--scelto');
  segnaPronti(scelto, false);
  scelto = null;
}

function seleziona(i) {
  deseleziona();
  if (!barattoli[i].length || aPosto(barattoli[i])) return;   // niente da versare
  scelto = i;
  elementi[i].classList.add('barattolo--scelto');
  segnaPronti(i, true);
  suoni.prendi();
}

function rifiuta(i) {
  suoni.niente();
  const el = elementi[i];
  el.classList.add('barattolo--no');
  setTimeout(() => el.classList.remove('barattolo--no'), 420);
}

async function tocca(i) {
  if (bloccato || i === null) return;
  mascotte.sveglia();

  if (scelto === null) { seleziona(i); return; }
  if (scelto === i)    { deseleziona(); return; }

  const da = scelto;
  const quanti = quantoVersa(barattoli, da, i);

  if (!quanti) {
    /* Non si può versare lì: invece di sgridare, si prende in mano l'altro. */
    rifiuta(i);
    deseleziona();
    seleziona(i);
    return;
  }

  bloccato = true;
  deseleziona();
  suoni.versa(quanti);

  await sposta(da, i, quanti);
  storia.push({ da, a: i, quanti });
  aggiornaAttrezzi();

  if (aPosto(barattoli[i]) && barattoli[i].length === CAPIENZA) {
    suoni.barattoloPieno();
    elementi[i].classList.add('barattolo--fatto');
    setTimeout(() => elementi[i].classList.remove('barattolo--fatto'), 560);
  }

  if (vinto(barattoli)) { await completa(); return; }

  salvaPartita();
  bloccato = false;
}

async function annulla() {
  if (bloccato || !storia.length) return;
  bloccato = true;
  const ultima = storia.pop();
  suoni.annulla();
  mascotte.sveglia();
  deseleziona();
  await sposta(ultima.a, ultima.da, ultima.quanti);
  aggiornaAttrezzi();
  salvaPartita();
  bloccato = false;
}

function ricomincia() {
  if (bloccato) return;
  suoni.annulla();
  mascotte.sveglia();
  barattoli = iniziale.map((b) => b.slice());
  storia = [];
  scelto = null;
  disegna();
  aggiornaAttrezzi();
  salvaPartita();
}

function aggiornaAttrezzi() {
  $('#ba-annulla').disabled = storia.length === 0;
}

/* ========================================================================== */
/*  Livelli                                                                    */
/* ========================================================================== */

function aggiornaTesta() {
  $('#ba-livello').textContent = numeroLivello;
  const info = livelloBarattoli(numeroLivello);
  $('.barra__aiuto', $('#schermo-barattoli')).textContent =
    `${info.colori} colori · tocca un barattolo, poi un altro`;
}

async function completa() {
  suoni.livello();
  coriandoli();
  mascotte.festeggia('livello');

  const biscotti = 8 + Math.floor(numeroLivello / 2);
  const prossimo = numeroLivello + 1;

  attesaProssimo = true;
  stato.barattoli.livello = prossimo;
  stato.barattoli.partita = null;
  const nuoviAmici = registraLivelloFinito(biscotti);
  salvaSubito();

  await attendi(850);
  await presentaNuoviAmici(nuoviAmici);

  mostraPannello({
    titolo: `Livello ${numeroLivello} sistemato!`,
    testo: `+${biscotti} biscotti · ne hai ${stato.biscotti}`,
    cane: caneSvg(),
    azioni: [
      { testo: 'Un altro! 🫙', azione: () => nuovoLivello(prossimo) },
      { testo: 'Torna alla cuccia', tenue: true, azione: () => { barattoli = []; vaiA('hub'); } },
    ],
  });
}

function nuovoLivello(n) {
  attesaProssimo = false;
  numeroLivello = n;
  barattoli = generaLivello(n);
  iniziale = barattoli.map((b) => b.slice());
  storia = [];
  scelto = null;
  bloccato = false;
  disegna();
  aggiornaTesta();
  aggiornaAttrezzi();
  salvaPartita();
}

function riprendiOppureNuovo() {
  const salvata = stato.barattoli.partita;
  const n = stato.barattoli.livello || 1;

  if (salvata?.barattoli?.length && salvata.iniziale?.length) {
    numeroLivello = n;
    barattoli = salvata.barattoli.map((b) => b.slice());
    iniziale = salvata.iniziale.map((b) => b.slice());
    storia = Array.isArray(salvata.storia) ? salvata.storia : [];
    scelto = null;
    bloccato = false;
    attesaProssimo = false;
    disegna();
    aggiornaTesta();
    aggiornaAttrezzi();
    return;
  }
  nuovoLivello(n);
}

function salvaPartita() {
  stato.barattoli.livello = numeroLivello;
  stato.barattoli.partita = { barattoli, iniziale, storia };
  salva();
}

/* ========================================================================== */
/*  Ciclo di vita                                                              */
/* ========================================================================== */

function inizializza() {
  tavolo = $('#ba-tavolo');
  scaffale = $('#ba-scaffale');
  mascotte = creaMascotte($('#ba-wurstel'), { fumetto: $('#ba-fumetto') });

  scaffale.addEventListener('click', (e) => {
    const el = e.target.closest('.barattolo');
    if (el) tocca(Number(el.dataset.i));
  });
  $('#ba-annulla').addEventListener('click', annulla);
  $('#ba-ricomincia').addEventListener('click', ricomincia);

  new ResizeObserver(misura).observe(tavolo);
  pronto = true;
}

export function entra() {
  if (!pronto) inizializza();
  if (!barattoli.length) riprendiOppureNuovo();
  misura();
  mascotte.sveglia();
}

export function esci() {
  deseleziona();
  if (barattoli.length && !attesaProssimo) salvaPartita();
  salvaSubito();
}
