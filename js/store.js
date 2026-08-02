/* ============================================================================
   store.js — tutto ciò che deve sopravvivere alla chiusura dell'app.
   Una sola chiave in localStorage, con numero di versione e migrazioni, così
   un aggiornamento futuro non cancella mai la collezione di amici.
   ========================================================================== */

const CHIAVE = 'mamadog';
const VERSIONE = 1;

function predefinito() {
  return {
    versione: VERSIONE,
    impostazioni: { tema: 'sera', audio: true },
    biscotti: 0,
    livelliCompletati: 0,   // totale sui due giochi: guida gli sblocchi
    amici: [],              // indici degli amici già arrivati nella cuccia
    match3:    { livello: 1, partita: null },
    barattoli: { livello: 1, partita: null },
  };
}

/* In navigazione privata localStorage lancia un'eccezione a ogni scrittura:
   in quel caso il gioco funziona lo stesso, solo senza ricordarsi nulla. */
let disponibile = true;
try {
  localStorage.setItem(CHIAVE + '.prova', '1');
  localStorage.removeItem(CHIAVE + '.prova');
} catch {
  disponibile = false;
}

function migra(dati) {
  // Nessuna migrazione ancora: la v1 è la prima. Lo scheletro c'è per dopo.
  if (typeof dati.versione !== 'number') return predefinito();
  if (dati.versione > VERSIONE) return predefinito(); // salvataggio di un futuro sconosciuto
  dati.versione = VERSIONE;
  return dati;
}

function carica() {
  if (!disponibile) return predefinito();
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return predefinito();
    // Un campo mancante non deve mai far esplodere l'avvio: si fondono i default.
    return { ...predefinito(), ...migra(JSON.parse(grezzo)) };
  } catch {
    return predefinito();
  }
}

export const stato = carica();

/* Scrittura raggruppata: durante una cascata arrivano decine di richieste di
   salvataggio, ma su disco ci va una volta sola. */
let attesa = 0;
export function salva() {
  if (attesa) return;
  attesa = setTimeout(salvaSubito, 400);
}

export function salvaSubito() {
  clearTimeout(attesa);
  attesa = 0;
  if (!disponibile) return;
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(stato));
  } catch {
    /* spazio esaurito o permessi negati: si continua a giocare senza salvare */
  }
}

/* Chiudere l'app su iPad non genera 'unload': l'unico evento affidabile è
   il passaggio in secondo piano. */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') salvaSubito();
});
window.addEventListener('pagehide', salvaSubito);

export function azzeraTutto() {
  Object.assign(stato, predefinito());
  salvaSubito();
}

/* Un livello finito, in uno qualsiasi dei due giochi. Restituisce quanti
   nuovi amici sono arrivati nella cuccia grazie a questo livello. */
export const LIVELLI_PER_AMICO = 5;

export function registraLivelloFinito(biscottiGuadagnati = 0) {
  stato.livelliCompletati += 1;
  stato.biscotti += biscottiGuadagnati;

  const dovuti = Math.floor(stato.livelliCompletati / LIVELLI_PER_AMICO);
  const nuovi = [];
  while (stato.amici.length < dovuti) {
    nuovi.push(stato.amici.length);
    stato.amici.push(stato.amici.length);
  }
  salvaSubito();
  return nuovi;
}

export function livelliAlProssimoAmico() {
  return LIVELLI_PER_AMICO - (stato.livelliCompletati % LIVELLI_PER_AMICO);
}
