/* ============================================================================
   frecce/engine.js — le regole di "Via libera".
   Ogni cucciolo occupa una casella e ha UNA direzione fissa, quella verso cui
   corre quando lo tocchi. Se la strada fino al bordo è libera, parte e
   sparisce; se trova un altro cucciolo in mezzo, resta lì — non è bloccato
   per sempre, solo finché quello davanti non se ne va.

   Una proprietà silenziosa rende questo gioco impossibile da incastrare:
   liberare un cucciolo non chiude MAI la strada a un altro, la apre soltanto.
   Quindi l'ORDINE in cui si toccano i cuccioli non conta mai per la
   risolvibilità: se il cortile è risolvibile, lo è toccandoli in QUALSIASI
   sequenza valida passo per passo. Bastano queste regole — nessuna ricerca
   complicata — per garantire che non ci si blocchi mai, ed è anche ciò che
   rende banale generare livelli sempre giocabili (vedi generator.js).
   ========================================================================== */

export const DIREZIONI = ['su', 'giu', 'sx', 'dx'];

export const ind = (g, c, r) => r * g.colonne + c;
export const colonnaDi = (g, i) => i % g.colonne;
export const rigaDi = (g, i) => Math.floor(i / g.colonne);

function celleSulPercorso(g, i, direzione) {
  const c = colonnaDi(g, i), r = rigaDi(g, i);
  const cellule = [];
  if (direzione === 'su')       for (let y = r - 1; y >= 0; y--) cellule.push(ind(g, c, y));
  else if (direzione === 'giu') for (let y = r + 1; y < g.righe; y++) cellule.push(ind(g, c, y));
  else if (direzione === 'sx')  for (let x = c - 1; x >= 0; x--) cellule.push(ind(g, x, r));
  else                           for (let x = c + 1; x < g.colonne; x++) cellule.push(ind(g, x, r));
  return cellule;
}

export function percorsoLibero(g, i, direzione) {
  return celleSulPercorso(g, i, direzione).every((j) => !g.celle[j]);
}

export function puoUscire(g, i) {
  const cella = g.celle[i];
  return !!cella && percorsoLibero(g, i, cella.direzione);
}

/** Quante caselle libere ci sono da qui fino al primo ostacolo — o fino al
    bordo, se la strada è tutta sgombra. Serve alla vista per disegnare la
    riga guida di ogni cucciolo: piena fino al muro se può partire, più corta
    se si ferma contro un altro. */
export function percorsoAperto(g, i, direzione) {
  const cellule = celleSulPercorso(g, i, direzione);
  let n = 0;
  for (const j of cellule) {
    if (g.celle[j]) break;
    n++;
  }
  return n;
}

/** Toglie il cucciolo se può uscire; altrimenti non fa nulla e torna null. */
export function fai(g, i) {
  if (!puoUscire(g, i)) return null;
  const cella = g.celle[i];
  g.celle[i] = null;
  return { indice: i, direzione: cella.direzione, id: cella.id };
}

export const vinto = (g) => g.celle.every((c) => !c);

/** Il primo cucciolo pronto a partire: serve al suggerimento, e alle prove
    che verificano che il cortile abbia sempre un'uscita finché non è vuoto. */
export function trovaMossaValida(g) {
  for (let i = 0; i < g.celle.length; i++) if (puoUscire(g, i)) return i;
  return null;
}

/* --- Salvataggio ------------------------------------------------------- */

export function serializza(g) {
  return {
    colonne: g.colonne, righe: g.righe, prossimoId: g.prossimoId,
    celle: g.celle.map((c) => (c ? [c.id, DIREZIONI.indexOf(c.direzione)] : 0)),
  };
}

export function deserializza(d) {
  if (!d || !Array.isArray(d.celle) || d.celle.length !== d.colonne * d.righe) return null;
  return {
    colonne: d.colonne, righe: d.righe, prossimoId: d.prossimoId,
    celle: d.celle.map((c) => (c ? { id: c[0], direzione: DIREZIONI[c[1]] } : null)),
  };
}
