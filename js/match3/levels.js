/* ============================================================================
   match3/levels.js — livelli infiniti.
   Un solo obiettivo alla volta, mostrato come barra che si riempie. Nessun
   limite di mosse: si va avanti finché è fatto. La difficoltà cresce solo
   allungando l'obiettivo o mettendo le foglie più in disparte, mai stringendo
   il tempo.
   ========================================================================== */

import { rng, PEZZI_AL_PLURALE } from '../art.js';

const COLONNE = 8, RIGHE = 8;
const limite = (v, min, max) => Math.max(min, Math.min(max, v));

/** Il sesto colore arriva tardi: meno colori significa più combo e più calma. */
export function tipiDelLivello(n) {
  return n < 40 ? 5 : 6;
}

/* ============================================================================
   LE FOGLIE
   Macchie disegnate, non caselle a caso: un prato con una forma si guarda
   volentieri e si capisce a colpo d'occhio quanto manca.
   ========================================================================== */

const FORME = ['centro', 'croce', 'righe', 'cornice', 'angoli', 'sparse'];

function celleDellaForma(forma) {
  const dentro = [];
  for (let r = 0; r < RIGHE; r++) {
    for (let c = 0; c < COLONNE; c++) {
      const dc = Math.abs(c - (COLONNE - 1) / 2);
      const dr = Math.abs(r - (RIGHE - 1) / 2);
      let ci;
      switch (forma) {
        case 'centro':  ci = dc <= 2 && dr <= 2; break;
        case 'croce':   ci = dc <= 1 || dr <= 1; break;
        case 'righe':   ci = r >= 2 && r <= RIGHE - 3; break;
        case 'cornice': ci = c === 0 || r === 0 || c === COLONNE - 1 || r === RIGHE - 1; break;
        case 'angoli':  ci = dc >= 2 && dr >= 2; break;
        default:        ci = true;
      }
      if (ci) dentro.push(r * COLONNE + c);
    }
  }
  return dentro;
}

/**
 * Lo strato di foglie del livello `n`. Sempre lo stesso per lo stesso numero,
 * così riaprendo l'app si ritrova il prato esatto che si era lasciato.
 */
export function foglieDelLivello(n) {
  const casuale = rng(n * 104729 + 7);
  const candidate = celleDellaForma(FORME[Math.floor(casuale() * FORME.length)]);

  for (let i = candidate.length - 1; i > 0; i--) {
    const j = Math.floor(casuale() * (i + 1));
    [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
  }

  const quante = limite(Math.round(6 + n * 0.7), 6, Math.min(30, candidate.length));
  const foglie = new Array(COLONNE * RIGHE).fill(0);
  for (let k = 0; k < quante; k++) foglie[candidate[k]] = 1;

  /* Dal livello 18 qualche macchia è più fitta e vuole due passate. */
  if (n >= 18) {
    const doppie = Math.min(quante, Math.round((n - 17) * 0.5));
    for (let k = 0; k < doppie; k++) foglie[candidate[k]] = 2;
  }
  return foglie;
}

/* ============================================================================
   IL LIVELLO
   ========================================================================== */

/**
 * Lo stesso numero di livello dà sempre lo stesso obiettivo: se lei chiude
 * l'app e riapre, ritrova esattamente quello che aveva lasciato.
 */
export function livelloMatch3(n) {
  const casuale = rng(n * 7919 + 17);
  const tipi = tipiDelLivello(n);

  /* I primi livelli insegnano da soli, uno alla volta e senza spiegazioni. */
  let genere;
  if (n <= 3)      genere = 'tipo';
  else if (n === 4) genere = 'qualsiasi';
  else if (n === 5) genere = 'foglie';     // la prima volta, presentate da sole
  else {
    const d = casuale();
    genere = d < 0.34 ? 'tipo' : d < 0.58 ? 'qualsiasi' : d < 0.82 ? 'foglie' : 'combo';
  }

  const base = { numero: n, nTipi: tipi, genere, tipo: null, foglie: null };

  if (genere === 'foglie') {
    const foglie = foglieDelLivello(n);
    return {
      ...base, foglie,
      quantita: foglie.reduce((a, b) => a + b, 0),
      descrizione: 'Libera il prato',
    };
  }

  if (genere === 'tipo') {
    const tipo = Math.floor(casuale() * tipi);
    return {
      ...base, tipo,
      quantita: limite(Math.round(16 + n * 1.7), 16, 95),
      descrizione: `Raccogli ${PEZZI_AL_PLURALE[tipo]}`,
    };
  }

  if (genere === 'qualsiasi') {
    return {
      ...base,
      quantita: limite(Math.round(65 + n * 5.5), 65, 330),
      descrizione: 'Raccogli i pezzi',
    };
  }

  return {
    ...base,
    quantita: limite(3 + Math.floor(n / 3), 3, 20),
    descrizione: 'Fai le combo',
  };
}

/** Quanto avanza l'obiettivo grazie a una mossa appena giocata. */
export function avanzamento(livello, risultato) {
  if (livello.genere === 'foglie') return risultato.foglie;
  if (livello.genere === 'combo') return risultato.combo;
  if (livello.genere === 'qualsiasi') {
    return Object.values(risultato.conteggioTipi).reduce((a, b) => a + b, 0);
  }
  return risultato.conteggioTipi[livello.tipo] || 0;
}

/** Biscotti guadagnati finendo il livello: crescono piano, senza inseguire. */
export function biscottiDelLivello(n) {
  return 10 + Math.floor(n / 2);
}
