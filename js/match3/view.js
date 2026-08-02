/* ============================================================================
   match3/view.js — quello che si vede e si tocca.
   La vista tiene un proprio specchio della griglia (`vista`) e lo aggiorna
   passo per passo, esattamente come ha fatto il motore: così può animare la
   cascata un gradino alla volta invece di saltare al risultato finale.
   ========================================================================== */

import { $, attendi, coriandoli, mostraPannello, vaiA, quandoCambiaLoSpazio } from '../ui.js';
import { stato, salva, salvaSubito, registraLivelloFinito } from '../store.js';
import { suoni } from '../audio.js';
import { creaMascotte, frase } from '../wurstel.js';
import { pezzoSvg, caneSvg, arteMatch3 } from '../art.js';
import { presentaNuoviAmici } from '../amici.js';
import * as motore from './engine.js';
import { livelloMatch3, avanzamento, biscottiDelLivello } from './levels.js';

const COLONNE = 8, RIGHE = 8;
const MS_SUGGERIMENTO = 8000;

let tavolo, griglia, mascotte;
let g = null;             // la griglia del motore (verità delle regole)
let vista = [];           // lo specchio della vista (verità di ciò che si vede)
let livello = null;
let progresso = 0;
let lato = 0;
let bloccato = true;
let scelta = null;
let trascina = null;
let timerSuggerimento = 0;
let pronto = false;
let attesaProssimo = false;   // livello finito: la partita salvata non vale più
let rimisura = () => {};      // rimisura il tavolo (e tiene vivo l'osservatore)

const perId = new Map();  // id della cella -> elemento nel DOM

/* ========================================================================== */
/*  Misure                                                                     */
/* ========================================================================== */

function misura() {
  if (!g || !tavolo.clientWidth) return;
  const largo = tavolo.clientWidth - 16;
  const alto  = tavolo.clientHeight - 16;
  /* Tessere grandi: meglio poche e ben visibili che tante e minuscole. */
  const nuovo = Math.max(26, Math.min(112, Math.floor(Math.min(largo / COLONNE, alto / RIGHE))));
  if (nuovo === lato) return;
  lato = nuovo;
  griglia.style.setProperty('--lato', lato + 'px');
  griglia.style.setProperty('--colonne', COLONNE);
  griglia.style.setProperty('--righe', RIGHE);
  senzaMoto(collocaTutte);
}

/* Esegue una modifica di posizione senza che il CSS la animi. */
function senzaMoto(azione) {
  griglia.classList.add('senza-moto');
  azione();
  void griglia.offsetWidth;         // forza il ricalcolo: da qui parte la transizione
  griglia.classList.remove('senza-moto');
}

const trasforma = (el, c, r) => { el.style.transform = `translate(${c * lato}px, ${r * lato}px)`; };

function collocaTutte() {
  for (let i = 0; i < vista.length; i++) {
    const cella = vista[i];
    if (!cella) continue;
    const el = perId.get(cella.id);
    if (el) trasforma(el, motore.colonnaDi(g, i), motore.rigaDi(g, i));
  }
}

/* ========================================================================== */
/*  Disegno                                                                    */
/* ========================================================================== */

function creaTessera(cella) {
  const el = document.createElement('div');
  el.className = 'tessera';
  el.innerHTML = `<span class="figura">${pezzoSvg(cella.tipo, cella.speciale)}</span>`;
  return el;
}

/**
 * Allinea il DOM allo specchio: crea ciò che manca, toglie ciò che non c'è
 * più, e sposta tutto al posto giusto.
 * `nuovi` dice da quale riga (fuori dal tavolo) devono entrare i pezzi appena
 * comparsi, così sembrano caduti dall'alto e non spuntati dal nulla.
 */
function sincronizza({ nuovi = null, anima = true } = {}) {
  const vivi = new Set();
  const daPiazzare = [];

  for (let i = 0; i < vista.length; i++) {
    const cella = vista[i];
    if (!cella) continue;
    vivi.add(cella.id);
    if (!perId.has(cella.id)) {
      const el = creaTessera(cella);
      perId.set(cella.id, el);
      griglia.append(el);
      const partenza = nuovi?.get(i);
      daPiazzare.push([el, motore.colonnaDi(g, i), partenza ?? motore.rigaDi(g, i)]);
    }
  }

  for (const [id, el] of perId) {
    if (!vivi.has(id)) { el.remove(); perId.delete(id); }
  }

  senzaMoto(() => { for (const [el, c, r] of daPiazzare) trasforma(el, c, r); });

  if (anima) collocaTutte();
  else senzaMoto(collocaTutte);
}

function applicaPasso(passo) {
  if (passo.tipo === 'rimozione') {
    for (const i of passo.indici) vista[i] = null;
    for (const c of passo.creati) {
      if (vista[c.indice]) vista[c.indice] = { ...vista[c.indice], tipo: c.tipo, speciale: c.speciale };
    }
  } else {
    /* Stesso ordine del motore: replicare le mosse una a una dà lo stesso
       risultato senza doverci ragionare sopra. */
    for (const m of passo.movimenti) { vista[m.a] = vista[m.da]; vista[m.da] = null; }
    for (const n of passo.nuovi) vista[n.a] = { ...n.cella };
  }
}

function specchiaDalMotore() {
  vista = g.celle.map((c) => (c ? { id: c.id, tipo: c.tipo, speciale: c.speciale } : null));
}

/* ========================================================================== */
/*  Effetti                                                                    */
/* ========================================================================== */

function lampo() {
  const el = document.createElement('div');
  el.className = 'lampo';
  griglia.append(el);
  setTimeout(() => el.remove(), 380);
}

function puntiVolanti(passo) {
  if (!passo.indici.length) return;
  let sc = 0, sr = 0;
  for (const i of passo.indici) { sc += motore.colonnaDi(g, i); sr += motore.rigaDi(g, i); }
  const c = sc / passo.indici.length, r = sr / passo.indici.length;

  const el = document.createElement('span');
  el.className = 'punti-volanti';
  el.textContent = `+${passo.punti}`;
  el.style.left = (c + 0.5) * lato + 'px';
  el.style.top  = (r * lato) + 'px';
  griglia.append(el);
  setTimeout(() => el.remove(), 1000);
}

/* ========================================================================== */
/*  Riproduzione dei passi                                                     */
/* ========================================================================== */

async function animaRimozione(passo) {
  suoni.match(passo.gradino, passo.indici.length);
  if (passo.esplosi.length) { suoni.esplosione(); lampo(); }
  if (passo.creati.some((c) => c.speciale === motore.SPECIALI.ARCOBALENO)) suoni.arcobaleno();
  else if (passo.creati.length) suoni.speciale();

  /* Gli elementi vanno presi PRIMA di aggiornare lo specchio. */
  const condannati = passo.indici
    .map((i) => vista[i] && perId.get(vista[i].id))
    .filter(Boolean);
  for (const el of condannati) el.classList.add('tessera--esplode');

  puntiVolanti(passo);
  await attendi(passo.esplosi.length ? 330 : 285);

  applicaPasso(passo);
  sincronizza({ anima: false });

  for (const c of passo.creati) {
    const cella = vista[c.indice];
    const el = cella && perId.get(cella.id);
    if (!el) continue;
    el.querySelector('.figura').innerHTML = pezzoSvg(c.tipo, c.speciale);
    el.classList.add('tessera--nasce');
    setTimeout(() => el.classList.remove('tessera--nasce'), 540);
  }
}

async function animaCaduta(passo) {
  applicaPasso(passo);
  const nuovi = new Map(passo.nuovi.map((n) => [n.a, n.daRiga]));
  sincronizza({ nuovi, anima: true });
  await attendi(310);
}

async function riproduci(passi) {
  for (const passo of passi) {
    if (passo.tipo === 'rimozione') await animaRimozione(passo);
    else await animaCaduta(passo);
  }
}

/* ========================================================================== */
/*  Selezione e mosse                                                          */
/* ========================================================================== */

function elementoA(i) {
  const cella = vista[i];
  return cella ? perId.get(cella.id) : null;
}

function seleziona(i) {
  deseleziona();
  scelta = i;
  elementoA(i)?.classList.add('tessera--scelta');
}

function deseleziona() {
  if (scelta !== null) elementoA(scelta)?.classList.remove('tessera--scelta');
  scelta = null;
}

async function scambioRifiutato(a, b) {
  const ea = elementoA(a), eb = elementoA(b);
  if (!ea || !eb) return;
  trasforma(ea, motore.colonnaDi(g, b), motore.rigaDi(g, b));
  trasforma(eb, motore.colonnaDi(g, a), motore.rigaDi(g, a));
  await attendi(200);
  trasforma(ea, motore.colonnaDi(g, a), motore.rigaDi(g, a));
  trasforma(eb, motore.colonnaDi(g, b), motore.rigaDi(g, b));
  ea.classList.add('tessera--rifiuta'); eb.classList.add('tessera--rifiuta');
  await attendi(280);
  ea.classList.remove('tessera--rifiuta'); eb.classList.remove('tessera--rifiuta');
}

async function tenta(a, b) {
  if (bloccato || !g) return;
  bloccato = true;
  deseleziona();
  fermaSuggerimento();
  mascotte.sveglia();

  const risultato = motore.eseguiMossa(g, a, b);

  if (!risultato) {
    suoni.niente();
    await scambioRifiutato(a, b);
    bloccato = false;
    programmaSuggerimento();
    return;
  }

  /* Il motore ha già portato la griglia allo stato finale: la vista rifà lo
     stesso percorso, un passo alla volta, partendo dallo scambio. */
  suoni.scambio();
  const t = vista[a]; vista[a] = vista[b]; vista[b] = t;
  sincronizza({ anima: true });
  await attendi(190);

  await riproduci(risultato.passi);

  progresso = Math.min(livello.quantita, progresso + avanzamento(livello, risultato));
  stato.biscotti += Math.round(risultato.punti / 40);
  aggiornaObiettivo();

  if (risultato.cascate >= 3 || risultato.colpo) mascotte.festeggia('combo');
  else if (progresso >= livello.quantita * 0.8 && progresso < livello.quantita) {
    mascotte.dici(frase('vicino'), 1800);
  }

  if (progresso >= livello.quantita) { await completa(); return; }

  if (!motore.trovaMossaValida(g)) await rimescolaTavolo();

  salvaPartita();
  bloccato = false;
  programmaSuggerimento();
}

async function rimescolaTavolo() {
  mascotte.imposta('sorpreso', 1600);
  mascotte.dici(frase('nienteMosse'), 2400);
  suoni.rimescola();
  await attendi(500);
  motore.rimescola(g);
  specchiaDalMotore();
  sincronizza({ anima: true });
  await attendi(440);
}

/* ========================================================================== */
/*  Obiettivo e fine livello                                                   */
/* ========================================================================== */

function aggiornaTesta() {
  $('#m3-livello').textContent = livello.numero;
  const icona = $('#m3-obiettivo-icona');
  icona.innerHTML =
    livello.genere === 'tipo'      ? pezzoSvg(livello.tipo)
    : livello.genere === 'qualsiasi' ? arteMatch3()
    : pezzoSvg(5, 'bomba');
  icona.title = livello.descrizione;
  aggiornaObiettivo();
}

function aggiornaObiettivo() {
  const quota = Math.min(1, progresso / livello.quantita);
  $('#m3-obiettivo-riempi').style.width = quota * 100 + '%';
  $('#m3-obiettivo-conto').textContent = `${progresso}/${livello.quantita}`;
}

async function completa() {
  suoni.livello();
  coriandoli();
  mascotte.festeggia('livello');

  const biscotti = biscottiDelLivello(livello.numero);
  const prossimo = livello.numero + 1;

  /* Si registra subito: se chiude l'app durante la festa, il livello resta
     comunque fatto e l'amico comunque arrivato. */
  attesaProssimo = true;
  stato.match3.livello = prossimo;
  stato.match3.partita = null;
  const nuoviAmici = registraLivelloFinito(biscotti);
  salvaSubito();

  await attendi(850);
  await presentaNuoviAmici(nuoviAmici);

  mostraPannello({
    titolo: `Livello ${livello.numero} fatto!`,
    testo: `+${biscotti} biscotti · ne hai ${stato.biscotti}`,
    cane: caneSvg(),
    azioni: [
      { testo: 'Un altro! 🦴', azione: () => nuovoLivello(prossimo) },
      { testo: 'Torna alla cuccia', tenue: true, azione: () => { g = null; vaiA('hub'); } },
    ],
  });
}

/* ========================================================================== */
/*  Partita                                                                    */
/* ========================================================================== */

function salvaPartita() {
  stato.match3.livello = livello.numero;
  stato.match3.partita = { griglia: motore.serializza(g), progresso };
  salva();
}

function nuovoLivello(n) {
  attesaProssimo = false;
  livello = livelloMatch3(n);
  g = motore.creaGriglia({ colonne: COLONNE, righe: RIGHE, nTipi: livello.nTipi });
  progresso = 0;
  avviaTavolo();
  salvaPartita();
}

function riprendiOppureNuovo() {
  const salvata = stato.match3.partita;
  const n = stato.match3.livello || 1;

  if (salvata?.griglia) {
    const ripresa = motore.deserializza(salvata.griglia);
    if (ripresa) {
      g = ripresa;
      livello = livelloMatch3(n);
      progresso = Math.min(livello.quantita, salvata.progresso || 0);
      avviaTavolo();
      return;
    }
  }
  nuovoLivello(n);
}

function avviaTavolo() {
  attesaProssimo = false;
  perId.clear();
  griglia.innerHTML = '';
  specchiaDalMotore();
  lato = 0;                 // forza il ricalcolo della misura
  misura();
  sincronizza({ anima: false });
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
    const mossa = motore.trovaMossaValida(g);
    if (!mossa) return;
    for (const i of [mossa.a, mossa.b]) elementoA(i)?.classList.add('tessera--suggerita');
    mascotte.dici(frase('aiuto'), 2000);
  }, MS_SUGGERIMENTO);
}

function fermaSuggerimento() {
  clearTimeout(timerSuggerimento);
  for (const el of griglia.querySelectorAll('.tessera--suggerita')) {
    el.classList.remove('tessera--suggerita');
  }
}

/* ========================================================================== */
/*  Tocco                                                                      */
/* ========================================================================== */

/* Si legge la posizione del dito, non l'elemento sotto: così funziona anche
   quando il tocco cade nello spazio fra due tessere. */
function indiceDaEvento(e) {
  const r = griglia.getBoundingClientRect();
  const c = Math.floor((e.clientX - r.left) / lato);
  const y = Math.floor((e.clientY - r.top) / lato);
  if (c < 0 || y < 0 || c >= COLONNE || y >= RIGHE) return null;
  return motore.ind(g, c, y);
}

function ditoGiu(e) {
  if (bloccato || !g || !lato) return;
  const i = indiceDaEvento(e);
  if (i === null) return;

  griglia.setPointerCapture?.(e.pointerId);
  suoni.tocco();
  mascotte.sveglia();
  fermaSuggerimento();

  if (scelta !== null && scelta !== i && motore.adiacenti(g, scelta, i)) {
    const a = scelta;
    trascina = null;
    tenta(a, i);
    return;
  }
  if (scelta === i) { deseleziona(); trascina = null; return; }

  seleziona(i);
  trascina = { indice: i, x: e.clientX, y: e.clientY };
}

function ditoMuove(e) {
  if (!trascina || bloccato) return;
  const dx = e.clientX - trascina.x;
  const dy = e.clientY - trascina.y;
  const soglia = Math.max(14, lato * 0.3);
  if (Math.hypot(dx, dy) < soglia) return;

  const origine = trascina.indice;
  trascina = null;

  let c = motore.colonnaDi(g, origine);
  let r = motore.rigaDi(g, origine);
  if (Math.abs(dx) > Math.abs(dy)) c += dx > 0 ? 1 : -1;
  else                             r += dy > 0 ? 1 : -1;

  deseleziona();
  if (c < 0 || r < 0 || c >= COLONNE || r >= RIGHE) return;
  tenta(origine, motore.ind(g, c, r));
}

const ditoSu = () => { trascina = null; };

/* ========================================================================== */
/*  Ciclo di vita della schermata                                              */
/* ========================================================================== */

function inizializza() {
  tavolo  = $('#m3-tavolo');
  griglia = $('#m3-griglia');
  mascotte = creaMascotte($('#m3-wurstel'), { fumetto: $('#m3-fumetto') });

  griglia.addEventListener('pointerdown', ditoGiu);
  griglia.addEventListener('pointermove', ditoMuove);
  griglia.addEventListener('pointerup', ditoSu);
  griglia.addEventListener('pointercancel', ditoSu);

  rimisura = quandoCambiaLoSpazio(tavolo, misura);
  pronto = true;
}

export function entra() {
  if (!pronto) inizializza();
  if (!g) riprendiOppureNuovo();
  rimisura();
  mascotte.sveglia();
  mascotte.dici(livello.descrizione, 2600);
  if (!bloccato) programmaSuggerimento();
}

export function esci() {
  fermaSuggerimento();
  deseleziona();
  trascina = null;
  /* Se il livello è appena finito il tavolo non va risalvato: il prossimo
     è già registrato e questa griglia non serve più a nessuno. */
  if (g && livello && !attesaProssimo) salvaPartita();
  salvaSubito();
}
