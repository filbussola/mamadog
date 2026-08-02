/* ============================================================================
   audio.js — tutti i suoni sono sintetizzati qui, dal vivo.
   Nessun file mp3: l'app resta minuscola e funziona offline dal primo secondo.
   Le note stanno su una scala pentatonica, che non produce mai un accordo
   sgradevole: qualunque combo esca, suona bene.
   ========================================================================== */

import { stato, salva } from './store.js';

let ctx = null;
let bus = null;          // volume generale
let compressore = null;

/* iOS non lascia partire l'audio se non dopo un tocco vero dell'utente. */
export function sbloccaAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    compressore = ctx.createDynamicsCompressor();
    compressore.threshold.value = -18;
    compressore.ratio.value = 6;

    bus = ctx.createGain();
    bus.gain.value = 0.5;        // di sera si tiene basso

    bus.connect(compressore);
    compressore.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function attivo() {
  return ctx && stato.impostazioni.audio;
}

export function impostaAudio(acceso) {
  stato.impostazioni.audio = acceso;
  salva();
  /* Riaccendendo si sente subito una nota: è la conferma che serve. */
  if (acceso) { sbloccaAudio(); nota(880, 0.14, 0.18, 'triangle'); }
}

/* --- Mattone di base: una nota con attacco rapido e coda esponenziale ----- */
function nota(freq, durata = 0.3, volume = 0.25, forma = 'sine', ritardo = 0) {
  if (!attivo()) return;
  const t = ctx.currentTime + ritardo;

  const osc = ctx.createOscillator();
  osc.type = forma;
  osc.frequency.setValueAtTime(freq, t);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durata);

  osc.connect(g); g.connect(bus);
  osc.start(t);
  osc.stop(t + durata + 0.05);
}

/* Timbro "marimba": fondamentale morbida più un'ottava sopra, breve. */
function marimba(freq, volume = 0.28, ritardo = 0, durata = 0.42) {
  nota(freq, durata, volume, 'sine', ritardo);
  nota(freq * 2, durata * 0.45, volume * 0.32, 'triangle', ritardo);
}

/* Fruscio filtrato: serve per versare, spazzare, esplodere. */
function fruscio({ da = 1800, a = 400, durata = 0.35, volume = 0.16, ritardo = 0 } = {}) {
  if (!attivo()) return;
  const t = ctx.currentTime + ritardo;
  const campioni = Math.floor(ctx.sampleRate * durata);
  const buffer = ctx.createBuffer(1, campioni, ctx.sampleRate);
  const dati = buffer.getChannelData(0);
  for (let i = 0; i < campioni; i++) dati[i] = Math.random() * 2 - 1;

  const sorgente = ctx.createBufferSource();
  sorgente.buffer = buffer;

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.Q.value = 1.4;
  filtro.frequency.setValueAtTime(da, t);
  filtro.frequency.exponentialRampToValueAtTime(Math.max(a, 40), t + durata);

  const g = ctx.createGain();
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + durata);

  sorgente.connect(filtro); filtro.connect(g); g.connect(bus);
  sorgente.start(t);
  sorgente.stop(t + durata + 0.02);
}

/* --- Scala pentatonica maggiore di Do, su tre ottave ---------------------- */
const PENTA = [];
for (let ott = 0; ott < 3; ott++) {
  for (const semi of [0, 2, 4, 7, 9]) {
    PENTA.push(261.63 * Math.pow(2, ott + semi / 12));
  }
}

/* --- Il vocabolario sonoro del gioco -------------------------------------- */
export const suoni = {
  tocco()      { nota(660, 0.09, 0.13, 'triangle'); },
  scambio()    { fruscio({ da: 2200, a: 900, durata: 0.14, volume: 0.1 }); },

  /* Mossa che non produce nulla: un tonfo gentile, mai un errore squillante. */
  niente()     { nota(160, 0.16, 0.16, 'sine'); },

  /* Il cuore del match-3: ogni gradino di cascata sale di una nota.
     È la ragione per cui le combo danno soddisfazione. */
  match(gradino = 0, pezzi = 3) {
    const i = Math.min(PENTA.length - 1, 4 + gradino * 2 + Math.max(0, pezzi - 3));
    marimba(PENTA[i], 0.3);
    if (pezzi >= 4) marimba(PENTA[Math.min(PENTA.length - 1, i + 3)], 0.16, 0.06);
  },

  speciale()   { marimba(PENTA[9], 0.3); marimba(PENTA[12], 0.24, 0.07); },
  esplosione() { fruscio({ da: 1400, a: 180, durata: 0.4, volume: 0.2 }); nota(90, 0.3, 0.22); },

  arcobaleno() {
    for (let i = 0; i < 8; i++) marimba(PENTA[5 + i], 0.22, i * 0.045, 0.5);
  },

  rimescola()  { fruscio({ da: 600, a: 2400, durata: 0.5, volume: 0.13 }); },

  /* Fine livello: un arpeggio maggiore, caldo, che si chiude bene. */
  livello() {
    [0, 4, 7, 12, 16].forEach((semi, i) => {
      marimba(261.63 * Math.pow(2, semi / 12) * 2, 0.3, i * 0.09, 0.7);
    });
  },

  amico() {
    [0, 7, 12, 19].forEach((semi, i) => {
      marimba(261.63 * Math.pow(2, semi / 12) * 2, 0.34, i * 0.11, 0.8);
    });
  },

  /* Barattoli */
  prendi()     { nota(520, 0.12, 0.16, 'triangle'); },
  versa(quanti = 1) {
    fruscio({ da: 900, a: 260, durata: 0.14 + quanti * 0.07, volume: 0.14 });
    for (let i = 0; i < quanti; i++) marimba(PENTA[6 + i], 0.14, i * 0.06, 0.3);
  },
  barattoloPieno() { marimba(PENTA[10], 0.26); marimba(PENTA[13], 0.2, 0.08); },
  annulla()    { nota(330, 0.14, 0.14, 'triangle'); nota(247, 0.18, 0.12, 'sine', 0.05); },
};
