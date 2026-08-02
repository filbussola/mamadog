/* ============================================================================
   barattoli/engine.js — le regole del travaso.
   Uno stato è un semplice elenco di barattoli; ogni barattolo è un elenco di
   colori dal fondo verso l'alto. Niente di più: così è banale da salvare,
   da copiare e da dare in pasto al risolutore.
   ========================================================================== */

export const CAPIENZA = 4;

export const cima = (b) => (b.length ? b[b.length - 1] : null);

/** Quanti biscotti dello stesso colore stanno in cima, uno sull'altro. */
export function corsaInCima(b) {
  if (!b.length) return 0;
  const c = cima(b);
  let n = 0;
  for (let i = b.length - 1; i >= 0 && b[i] === c; i--) n++;
  return n;
}

/** Un barattolo è "a posto" se è vuoto o pieno di un colore solo. */
export const aPosto = (b) =>
  b.length === 0 || (b.length === CAPIENZA && b.every((c) => c === b[0]));

export const vinto = (s) => s.every(aPosto);

export function puoVersare(s, i, j) {
  if (i === j) return false;
  const da = s[i], a = s[j];
  if (!da.length || a.length >= CAPIENZA) return false;
  return a.length === 0 || cima(a) === cima(da);
}

export function quantoVersa(s, i, j) {
  if (!puoVersare(s, i, j)) return 0;
  return Math.min(corsaInCima(s[i]), CAPIENZA - s[j].length);
}

export function versa(s, i, j) {
  const quanti = quantoVersa(s, i, j);
  if (!quanti) return null;
  const nuovo = s.map((b) => b.slice());
  const colore = cima(nuovo[i]);
  for (let k = 0; k < quanti; k++) { nuovo[i].pop(); nuovo[j].push(colore); }
  return { stato: nuovo, quanti, colore };
}

/**
 * Mosse che vale la pena considerare.
 * Le due potature qui sotto tagliano via i travasi inutili — spostare un
 * barattolo già ordinato dentro uno vuoto, o svuotarne uno per intero in un
 * altro vuoto — e da sole rendono il risolutore rapidissimo.
 */
export function mosseUtili(s) {
  const fuori = [];
  for (let i = 0; i < s.length; i++) {
    if (!s[i].length) continue;
    const corsa = corsaInCima(s[i]);
    const tuttoUguale = corsa === s[i].length;
    for (let j = 0; j < s.length; j++) {
      if (!puoVersare(s, i, j)) continue;
      if (!s[j].length && tuttoUguale) continue;   // spostare un barattolo già in ordine: inutile
      fuori.push([i, j]);
    }
  }
  return fuori;
}

export const chiave = (s) => s.map((b) => b.join(',')).sort().join('|');
