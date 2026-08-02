/* ============================================================================
   barattoli/generator.js — livelli infiniti, e tutti risolvibili.
   Si mescola a caso e poi si VERIFICA con un risolutore vero prima di
   proporre il livello. Una promessa mantenuta: nessuna serata finirà davanti
   a un rompicapo impossibile.
   ========================================================================== */

import { CAPIENZA, vinto, versa, mosseUtili, chiave } from './engine.js';

const limite = (v, min, max) => Math.max(min, Math.min(max, v));

/** La difficoltà sale piano: dieci colori si raggiungono verso il livello 30. */
export function livelloBarattoli(n) {
  return {
    numero: n,
    colori: limite(3 + Math.floor(n / 4), 3, 10),
    vuoti: n <= 5 ? 3 : 2,     // i primi livelli danno una mano in più
  };
}

/** Ricerca in profondità con memoria degli stati già visti. */
export function risolvibile(iniziale, maxNodi = 90000) {
  const visti = new Set([chiave(iniziale)]);
  const pila = [iniziale];
  let nodi = 0;

  while (pila.length) {
    if (++nodi > maxNodi) return false;
    const s = pila.pop();
    if (vinto(s)) return true;

    /* I barattoli sono intercambiabili: due disposizioni uguali a meno
       dell'ordine sono lo stesso problema, e si visitano una volta sola. */
    for (const [i, j] of mosseUtili(s)) {
      const passo = versa(s, i, j);
      if (!passo) continue;
      const k = chiave(passo.stato);
      if (visti.has(k)) continue;
      visti.add(k);
      pila.push(passo.stato);
    }
  }
  return false;
}

function distribuzioneACaso(colori, vuoti) {
  const mazzo = [];
  for (let c = 0; c < colori; c++) for (let k = 0; k < CAPIENZA; k++) mazzo.push(c);
  for (let i = mazzo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mazzo[i], mazzo[j]] = [mazzo[j], mazzo[i]];
  }

  const barattoli = [];
  for (let b = 0; b < colori; b++) barattoli.push(mazzo.slice(b * CAPIENZA, (b + 1) * CAPIENZA));
  for (let v = 0; v < vuoti; v++) barattoli.push([]);
  return barattoli;
}

/** Quanti barattoli sono già a posto in partenza: se troppi, il livello è noioso. */
function giaSistemati(s) {
  return s.filter((b) => b.length === CAPIENZA && b.every((c) => c === b[0])).length;
}

export function generaLivello(n) {
  const { colori, vuoti } = livelloBarattoli(n);

  for (let tentativo = 0; tentativo < 60; tentativo++) {
    const s = distribuzioneACaso(colori, vuoti);
    if (vinto(s)) continue;
    if (giaSistemati(s) > Math.max(0, colori - 3)) continue;
    if (risolvibile(s)) return s;
  }

  return ripiego(colori, vuoti);
}

/**
 * Rete di sicurezza (in pratica non ci si arriva mai): si parte dal livello
 * già risolto e si scambiano fra loro i biscotti in cima a coppie di
 * barattoli. Ogni scambio si disfa in tre travasi usando un barattolo vuoto,
 * e le coppie non si toccano fra loro: quindi è risolvibile per costruzione.
 */
function ripiego(colori, vuoti) {
  const s = [];
  for (let b = 0; b < colori; b++) s.push(new Array(CAPIENZA).fill(b));
  for (let v = 0; v < vuoti; v++) s.push([]);

  for (let b = 0; b + 1 < colori; b += 2) {
    const alto = CAPIENZA - 1;
    [s[b][alto], s[b + 1][alto]] = [s[b + 1][alto], s[b][alto]];
  }
  return s;
}
