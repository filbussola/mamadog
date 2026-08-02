/* ============================================================================
   hub.js — la casa: da qui si sceglie il gioco, si guarda la cuccia degli
   amici e si cambiano le due sole impostazioni che contano.
   ========================================================================== */

import { $, mostraPannello, applicaTema } from './ui.js';
import { stato, azzeraTutto, livelliAlProssimoAmico } from './store.js';
import { impostaAudio, suoni } from './audio.js';
import { arteMatch3, arteBarattoli, caneSvg } from './art.js';
import { creaMascotte, frase } from './wurstel.js';
import { amico, svgAmico } from './amici.js';

let mascotte = null;
let mascotteCuccia = null;
let pronto = false;

/* ========================================================================== */
/*  Casa                                                                       */
/* ========================================================================== */

function inizializza() {
  $('#arte-match3').innerHTML = arteMatch3();
  $('#arte-barattoli').innerHTML = arteBarattoli();

  mascotte = creaMascotte($('#hub-wurstel'), { fumetto: $('#hub-fumetto') });
  mascotteCuccia = creaMascotte($('#cu-wurstel'), { dorme: false });

  $('#apri-impostazioni').addEventListener('click', apriImpostazioni);
  document.addEventListener('pointerdown', () => mascotte?.sveglia(), { passive: true });

  pronto = true;
}

export function entra() {
  if (!pronto) inizializza();

  $('#sotto-match3').textContent    = `Livello ${stato.match3.livello || 1}`;
  $('#sotto-barattoli').textContent = `Livello ${stato.barattoli.livello || 1}`;
  $('#conto-amici').textContent     = stato.amici.length;

  mascotte.sveglia();
  mascotte.dici(frase('benvenuto'), 2800);
}

/* ========================================================================== */
/*  Cuccia                                                                     */
/* ========================================================================== */

export function entraCuccia() {
  if (!pronto) inizializza();

  const mancano = livelliAlProssimoAmico();
  $('#cuccia-prossimo').textContent = stato.amici.length
    ? `Un altro amico fra ${mancano} ${mancano === 1 ? 'livello' : 'livelli'}`
    : `Il primo amico arriva fra ${mancano} ${mancano === 1 ? 'livello' : 'livelli'}`;

  const zona = $('#cuccia-amici');
  zona.innerHTML = '';

  if (!stato.amici.length) {
    zona.innerHTML = `
      <p class="cuccia-vuota">
        Qui arriveranno i cagnolini che incontri giocando.<br>
        Uno ogni cinque livelli 🐾
      </p>`;
    return;
  }

  /* Prima i più recenti: l'ultimo arrivato è quello che si vuole rivedere. */
  for (const i of [...stato.amici].reverse()) {
    const a = amico(i);
    const carta = document.createElement('button');
    carta.type = 'button';
    carta.className = 'amico';
    carta.innerHTML = `
      <span class="amico__cane">${svgAmico(i)}</span>
      <span class="amico__nome">${a.nome}</span>
      <span class="amico__razza">${a.razza}</span>`;
    carta.addEventListener('click', () => {
      suoni.tocco();
      mostraPannello({
        titolo: a.nome,
        testo: `Un ${a.razza}. ${a.frase}`,
        cane: svgAmico(i),
        azioni: [{ testo: 'Ciao! 🐾' }],
      });
    });
    zona.append(carta);
  }
}

/* ========================================================================== */
/*  Impostazioni                                                               */
/* ========================================================================== */

function apriImpostazioni() {
  suoni.tocco();

  const pannello = mostraPannello({
    titolo: 'Impostazioni',
    contenuto: `
      <div class="riga-opzione">
        <span class="riga-opzione__nome">Colori della sera
          <span class="riga-opzione__nota">Sfondo scuro, più riposante al buio</span>
        </span>
        <button class="interruttore" type="button" id="op-tema"
                aria-pressed="${stato.impostazioni.tema !== 'giorno'}" aria-label="Colori della sera"></button>
      </div>
      <div class="riga-opzione">
        <span class="riga-opzione__nome">Suoni
          <span class="riga-opzione__nota">Piccoli suoni morbidi, niente musica</span>
        </span>
        <button class="interruttore" type="button" id="op-audio"
                aria-pressed="${stato.impostazioni.audio}" aria-label="Suoni"></button>
      </div>
      <p class="pannello__nota">Biscotti raccolti: <b>${stato.biscotti}</b></p>`,
    azioni: [
      { testo: 'Fatto' },
      { testo: 'Ricomincia da capo', tenue: true, azione: chiediConferma },
    ],
  });

  const tema = $('#op-tema', pannello);
  tema.addEventListener('click', () => {
    const sera = tema.getAttribute('aria-pressed') === 'true';
    tema.setAttribute('aria-pressed', String(!sera));
    applicaTema(sera ? 'giorno' : 'sera');
    suoni.tocco();
  });

  const audio = $('#op-audio', pannello);
  audio.addEventListener('click', () => {
    const acceso = audio.getAttribute('aria-pressed') === 'true';
    audio.setAttribute('aria-pressed', String(!acceso));
    impostaAudio(!acceso);
  });
}

function chiediConferma() {
  mostraPannello({
    titolo: 'Ricominciare da capo?',
    testo: 'Si perdono i livelli raggiunti e tutti gli amici della cuccia. ' +
           'Non si può tornare indietro.',
    cane: caneSvg({ accessorio: 'bandana' }),
    azioni: [
      { testo: 'No, lascia stare' },
      {
        testo: 'Sì, ricomincia', tenue: true,
        azione: () => { azzeraTutto(); location.reload(); },
      },
    ],
  });
}
