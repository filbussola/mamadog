/* ============================================================================
   wurstel.js — la mascotte come piccolo personaggio con stati d'animo.
   Wurstel non giudica mai e non mette fretta: incoraggia, si stupisce, fa
   festa e, se nessuno lo tocca per un po', si addormenta. Il sonno è anche
   un modo gentile di dire "è tardi, puoi posare l'iPad".
   ========================================================================== */

import { caneSvg } from './art.js';

const FRASI = {
  benvenuto: [
    'Bentornata!', 'Ti aspettavo 🐾', 'Che bello, sei qui!',
    'Ho tenuto il posto caldo.', 'Pronta a giocare?',
  ],
  combo: [
    'Che bella mossa!', 'Uau!', 'Ancora! Ancora!', 'Che occhio!',
    'Questa era da campioni.', 'Hai visto che roba?',
  ],
  vicino: [
    'Ci siamo quasi!', 'Ne manca poco!', 'Un altro sforzetto…', 'Ci sei quasi!',
  ],
  livello: [
    'Bravissima!', 'Che soddisfazione!', 'Uno tira l’altro 🦴',
    'Meriti un biscotto.', 'Fatto! Andiamo avanti?',
  ],
  nienteMosse: [
    'Rimescolo io, aspetta…', 'Qui non si muove niente: ci penso io.',
    'Dammi un secondo, sistemo tutto.',
  ],
  aiuto: [
    'Guarda qui…', 'Proverei di là 🐾', 'Che ne dici di questa?',
  ],
  amico: [
    'Guarda chi è arrivato!', 'Abbiamo un ospite!', 'Un amico nuovo in cuccia!',
  ],
  sonno: [
    'Buonanotte 🌙', 'Io faccio un pisolino…', 'Che sonno…',
  ],
};

let ultima = '';
export function frase(gruppo) {
  const lista = FRASI[gruppo] || FRASI.combo;
  let scelta = lista[Math.floor(Math.random() * lista.length)];
  if (lista.length > 1 && scelta === ultima) {
    scelta = lista[(lista.indexOf(scelta) + 1) % lista.length];
  }
  ultima = scelta;
  return scelta;
}

const MS_PRIMA_DI_DORMIRE = 75000;

export function creaMascotte(elemento, { fumetto = null, aspetto = {}, dorme = true } = {}) {
  elemento.innerHTML = caneSvg(aspetto);

  let statoAttuale = 'calmo';
  let timerStato = 0;
  let timerFumetto = 0;
  let timerSonno = 0;
  let timerOcchi = 0;

  function classe(nome) {
    elemento.classList.remove('mascotte--felice', 'mascotte--sorpreso', 'mascotte--dorme');
    if (nome !== 'calmo') elemento.classList.add(`mascotte--${nome}`);
    statoAttuale = nome;
  }

  /* Un battito di ciglia ogni tanto: costa nulla e rende il cane vivo. */
  function programmaOcchi() {
    clearTimeout(timerOcchi);
    timerOcchi = setTimeout(() => {
      if (statoAttuale !== 'dorme') {
        elemento.classList.add('mascotte--sbatte');
        setTimeout(() => elemento.classList.remove('mascotte--sbatte'), 150);
      }
      programmaOcchi();
    }, 2600 + Math.random() * 4200);
  }
  programmaOcchi();

  function programmaSonno() {
    if (!dorme) return;
    clearTimeout(timerSonno);
    timerSonno = setTimeout(() => {
      classe('dorme');
      api.dici(frase('sonno'), 3200);
    }, MS_PRIMA_DI_DORMIRE);
  }
  programmaSonno();

  const api = {
    elemento,

    /* Stato momentaneo: dopo `durata` torna da solo alla calma. */
    imposta(nome, durata = 1400) {
      clearTimeout(timerStato);
      classe(nome);
      if (nome !== 'calmo' && nome !== 'dorme') {
        timerStato = setTimeout(() => classe('calmo'), durata);
      }
    },

    dici(testo, durata = 2200) {
      if (!fumetto) return;
      clearTimeout(timerFumetto);
      fumetto.textContent = testo;
      fumetto.hidden = false;
      /* Riavvia l'animazione di entrata anche se il fumetto era già visibile */
      fumetto.style.animation = 'none';
      void fumetto.offsetWidth;
      fumetto.style.animation = '';
      timerFumetto = setTimeout(() => { fumetto.hidden = true; }, durata);
    },

    /* Da chiamare a ogni tocco dell'utente: rimanda il pisolino. */
    sveglia() {
      if (statoAttuale === 'dorme') api.imposta('calmo');
      programmaSonno();
    },

    festeggia(gruppo = 'combo') {
      api.sveglia();
      api.imposta('felice', 1400);
      api.dici(frase(gruppo));
    },

    distruggi() {
      [timerStato, timerFumetto, timerSonno, timerOcchi].forEach(clearTimeout);
    },
  };

  return api;
}
