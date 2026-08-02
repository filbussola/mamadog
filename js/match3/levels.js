/* ============================================================================
   match3/levels.js — livelli infiniti.
   Un solo obiettivo alla volta, mostrato come barra che si riempie. Nessun
   limite di mosse: si va avanti finché è fatto. La difficoltà cresce solo
   allungando l'obiettivo, mai stringendo il tempo.
   ========================================================================== */

import { rng, PEZZI_AL_PLURALE } from '../art.js';

const limite = (v, min, max) => Math.max(min, Math.min(max, v));

/** Il sesto colore arriva tardi: meno colori significa più combo e più calma. */
export function tipiDelLivello(n) {
  return n < 40 ? 5 : 6;
}

/**
 * Lo stesso numero di livello dà sempre lo stesso obiettivo: se lei chiude
 * l'app e riapre, ritrova esattamente quello che aveva lasciato.
 */
export function livelloMatch3(n) {
  const casuale = rng(n * 7919 + 17);
  const tipi = tipiDelLivello(n);

  let genere;
  if (n <= 3) genere = 'tipo';                 // i primi livelli insegnano da soli
  else {
    const d = casuale();
    genere = d < 0.5 ? 'tipo' : d < 0.8 ? 'qualsiasi' : 'combo';
  }

  if (genere === 'tipo') {
    const tipo = Math.floor(casuale() * tipi);
    return {
      numero: n, nTipi: tipi, genere, tipo,
      quantita: limite(Math.round(16 + n * 1.7), 16, 95),
      descrizione: `Raccogli ${PEZZI_AL_PLURALE[tipo]}`,
    };
  }

  if (genere === 'qualsiasi') {
    return {
      numero: n, nTipi: tipi, genere, tipo: null,
      quantita: limite(Math.round(65 + n * 5.5), 65, 330),
      descrizione: 'Raccogli i pezzi',
    };
  }

  return {
    numero: n, nTipi: tipi, genere, tipo: null,
    quantita: limite(3 + Math.floor(n / 3), 3, 20),
    descrizione: 'Fai le combo',
  };
}

/** Quanto avanza l'obiettivo grazie a una mossa appena giocata. */
export function avanzamento(livello, risultato) {
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
