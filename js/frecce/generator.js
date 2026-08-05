/* ============================================================================
   frecce/generator.js — livelli infiniti, costruiti al contrario.
   Si parte dal cortile vuoto e si posiziona un cucciolo alla volta, scegliendo
   per ognuno una direzione libera rispetto a chi è già stato posizionato lì.
   Capovolgendo l'ordine di posizionamento si ottiene un ordine di uscita
   valido — è la stessa idea usata per i barattoli, applicata qui senza
   bisogno di un risolutore, perché il gioco stesso garantisce che l'ordine
   con cui si liberano i cuccioli non conta mai (vedi engine.js).

   Se per una casella non resta nessuna direzione libera, si lascia vuota
   invece di forzarla: il cortile può uscire un po' meno pieno del bersaglio,
   mai meno che risolvibile.
   ========================================================================== */

import { rng } from '../art.js';
import { DIREZIONI, percorsoLibero } from './engine.js';

const limite = (v, min, max) => Math.max(min, Math.min(max, v));

/** La griglia cresce piano fino a 7x7 e lì si ferma; la densità pure. */
export function livelloFrecce(n) {
  const lato = limite(5 + Math.floor(n / 15), 5, 7);
  const celle = lato * lato;
  const quota = limite(0.4 + n * 0.006, 0.4, 0.72);
  return { numero: n, colonne: lato, righe: lato, pezzi: Math.round(celle * quota) };
}

export function generaLivello(n) {
  const { colonne, righe, pezzi } = livelloFrecce(n);
  const casuale = rng(n * 1299721 + 53);
  const totale = colonne * righe;

  const g = { colonne, righe, celle: new Array(totale).fill(null), prossimoId: 1 };

  /* L'ordine in cui si POSIZIONA è, capovolto, un ordine valido con cui il
     cortile si può SVUOTARE: l'ultimo messo è il primo che potrà uscire. */
  const ordine = [...Array(totale).keys()];
  for (let i = ordine.length - 1; i > 0; i--) {
    const j = Math.floor(casuale() * (i + 1));
    [ordine[i], ordine[j]] = [ordine[j], ordine[i]];
  }

  let posizionati = 0;
  for (const i of ordine) {
    if (posizionati >= pezzi) break;

    const direzioni = [...DIREZIONI];
    for (let k = direzioni.length - 1; k > 0; k--) {
      const j = Math.floor(casuale() * (k + 1));
      [direzioni[k], direzioni[j]] = [direzioni[j], direzioni[k]];
    }

    const libera = direzioni.find((d) => percorsoLibero(g, i, d));
    if (!libera) continue;   // qui non c'è verso: la casella resta vuota

    g.celle[i] = { id: g.prossimoId++, direzione: libera };
    posizionati++;
  }

  return g;
}
