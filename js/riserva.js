/* ============================================================================
   riserva.js — il salvataggio di riserva.

   La memoria del browser non è per sempre: basta un ripristino dell'iPad, un
   "cancella dati siti" dato per sbaglio, un cambio di tablet, e mesi di
   cagnolini spariscono senza rimedio. Questo file trasforma i progressi in un
   codice corto, da copiare e tenere da parte.

   La scelta che rende tutto semplice: nel codice NON finisce la partita in
   corso, ma solo quello a cui si è affezionati — a che livello si è arrivate,
   in ognuno dei giochi, quanti amici sono in cuccia, quanti biscotti. Una
   griglia a metà non vale niente; il risultato è un codice corto, che si
   copia in un messaggio e all'occorrenza si ridigita a mano.
   ========================================================================== */

import { stato, salvaSubito, LIVELLI_PER_AMICO } from './store.js';

const MARCHIO = 'WURSTEL';

/* Versione 1: nessun campo per "Via libera" (il gioco non esisteva ancora).
   Versione 2: con quel campo. Un codice vecchio, copiato prima di questo
   aggiornamento, deve continuare a funzionare — è il motivo per cui non si
   può alzare il numero e basta, va anche letto quello di prima. */
const VERSIONE = 2;

/* Due caratteri di controllo: se il codice viene troncato o storpiato durante
   un copia-incolla, ce ne accorgiamo prima di sovrascrivere qualcosa. */
export function controllo(testo) {
  let n = 7;
  for (const c of testo) n = (n * 31 + c.charCodeAt(0)) % 1296;
  return n.toString(36).toUpperCase().padStart(2, '0');
}

const bandiere = () =>
  (stato.impostazioni.tema === 'giorno' ? 1 : 0) + (stato.impostazioni.audio ? 2 : 0);

export function creaCodice() {
  const campi = [
    VERSIONE,
    Math.max(1, stato.match3.livello || 1),
    Math.max(1, stato.barattoli.livello || 1),
    Math.max(1, stato.frecce?.livello || 1),
    Math.max(0, Math.round(stato.biscotti || 0)),
    Math.max(0, stato.livelliCompletati || 0),
    bandiere(),
  ];
  const corpo = campi.join('-');
  return `${MARCHIO}-${corpo}-${controllo(corpo)}`;
}

export function leggiCodice(testo) {
  const pulito = String(testo || '').toUpperCase().replace(/[\s–—]/g, (c) => (c === ' ' ? '' : '-'));
  const pezzi = pulito.trim().split('-').filter((p) => p !== '');

  /* Controlli distinti, perché sbagliano per motivi diversi e chi legge deve
     capire quale dei due è: dire "non comincia con WURSTEL" a un codice che
     comincia con WURSTEL manda solo fuori strada. */
  if (pezzi[0] !== MARCHIO) {
    return { valido: false, motivo: 'Non sembra un codice di Wurstel: deve cominciare con WURSTEL.' };
  }

  /* 8 pezzi = un codice della prima versione (senza Via libera).
     9 pezzi = uno di adesso. Qualsiasi altra lunghezza è un pezzo perso. */
  const lunghezzaCorpo = pezzi.length - 2;   // tolti il marchio e il controllo
  if (lunghezzaCorpo !== 6 && lunghezzaCorpo !== 7) {
    return { valido: false, motivo: 'Il codice è incompleto: manca un pezzo. Ricopialo tutto.' };
  }

  const corpo = pezzi.slice(1, 1 + lunghezzaCorpo).join('-');
  if (controllo(corpo) !== pezzi[pezzi.length - 1]) {
    return { valido: false, motivo: 'Il codice risulta incompleto o copiato male: controlla che non manchi un pezzo.' };
  }

  const numeri = pezzi.slice(1, 1 + lunghezzaCorpo).map(Number);
  if (numeri.some((n) => !Number.isInteger(n) || n < 0)) {
    return { valido: false, motivo: 'Il codice contiene qualcosa che non è un numero.' };
  }

  const [versione] = numeri;
  if (versione !== 1 && versione !== 2) {
    return { valido: false, motivo: 'Questo codice viene da una versione diversa del gioco.' };
  }
  if ((versione === 1 && lunghezzaCorpo !== 6) || (versione === 2 && lunghezzaCorpo !== 7)) {
    return { valido: false, motivo: 'Il codice è incompleto: manca un pezzo. Ricopialo tutto.' };
  }

  /* I codici vecchi non parlavano di "Via libera": si legge livello 1, che è
     esattamente dove si troverebbe chi non l'aveva ancora giocato. */
  const [, m3, ba, fr, biscotti, completati, flag] = versione === 1
    ? [null, numeri[1], numeri[2], 1, numeri[3], numeri[4], numeri[5]]
    : numeri;

  return { valido: true, dati: { m3, ba, fr, biscotti, completati, flag } };
}

export const amiciDi = (completati) => Math.floor(completati / LIVELLI_PER_AMICO);

/** Che cosa si sta per ripristinare, in italiano, prima di confermare. */
export function riassunto(d) {
  const amici = amiciDi(d.completati);
  return `Livello ${d.m3} negli ossi, ${d.ba} nei barattoli e ${d.fr} in Via libera, ` +
         `${amici === 1 ? 'un amico' : amici + ' amici'} in cuccia, ${d.biscotti} biscotti.`;
}

export function applicaCodice(d) {
  /* La partita in corso non c'è nel codice: si riparte dall'inizio del livello
     raggiunto. È la sola cosa che si perde, e non vale niente. */
  stato.match3 = { livello: Math.max(1, d.m3), partita: null };
  stato.barattoli = { livello: Math.max(1, d.ba), partita: null };
  stato.frecce = { livello: Math.max(1, d.fr), partita: null };
  stato.biscotti = d.biscotti;
  stato.livelliCompletati = d.completati;

  /* Gli amici non stanno nel codice perché sono ricavabili: uno ogni cinque
     livelli, sempre gli stessi e sempre nello stesso ordine. */
  stato.amici = [];
  for (let i = 0; i < amiciDi(d.completati); i++) stato.amici.push(i);

  stato.impostazioni.tema = (d.flag & 1) ? 'giorno' : 'sera';
  stato.impostazioni.audio = !!(d.flag & 2);

  salvaSubito();
}
