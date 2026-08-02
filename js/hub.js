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
import { creaCodice, leggiCodice, riassunto, applicaCodice } from './riserva.js';

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
      <div class="riserva">
        <p class="riserva__titolo">Salvataggio di riserva</p>
        <p class="riserva__nota">
          Copia questo codice e tienilo da parte, in un messaggio o in una nota.
          Se un giorno il gioco dimenticasse tutto, rimette i livelli e gli amici com'erano.
        </p>
        <output class="codice" id="codice-riserva">${creaCodice()}</output>
        <div class="riserva__azioni">
          <button class="bottone-largo" type="button" id="copia-codice">Copia il codice</button>
          <button class="bottone-largo bottone-largo--tenue" type="button" id="apri-ripristino">Ho un codice…</button>
        </div>
      </div>

      <p class="pannello__nota">Biscotti raccolti: <b>${stato.biscotti}</b></p>`,
    azioni: [
      { testo: 'Fatto' },
      { testo: 'Ricomincia da capo', tenue: true, azione: chiediConferma },
    ],
  });

  const bottoneCopia = $('#copia-codice', pannello);
  bottoneCopia.addEventListener('click', async () => {
    const codice = $('#codice-riserva', pannello).textContent.trim();
    suoni.tocco();
    try {
      await navigator.clipboard.writeText(codice);
      bottoneCopia.textContent = 'Copiato ✓';
    } catch {
      /* Se gli appunti sono negati, si seleziona il codice: resta il
         classico tieni-premuto → Copia, che su iPad funziona sempre. */
      const testo = $('#codice-riserva', pannello);
      const scelta = document.createRange();
      scelta.selectNodeContents(testo);
      getSelection().removeAllRanges();
      getSelection().addRange(scelta);
      bottoneCopia.textContent = 'Tieni premuto e copia';
    }
    setTimeout(() => { bottoneCopia.textContent = 'Copia il codice'; }, 2600);
  });

  $('#apri-ripristino', pannello).addEventListener('click', () => {
    suoni.tocco();
    apriRipristino();
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

/* ========================================================================== */
/*  Ripristino da un codice                                                    */
/* ========================================================================== */

function apriRipristino() {
  const pannello = mostraPannello({
    titolo: 'Ho un codice',
    testo: 'Incollalo qui sotto. Prima di cambiare qualcosa ti dico che cosa contiene.',
    contenuto: `
      <input class="campo" id="campo-codice" type="text" enterkeyhint="go"
             autocapitalize="characters" autocomplete="off" spellcheck="false"
             placeholder="WURSTEL-1-…" aria-label="Codice di riserva">
      <p class="campo__esito" id="esito-codice"></p>
      <button class="bottone-largo" type="button" id="controlla-codice">Controlla il codice</button>`,
    azioni: [{ testo: 'Lascia stare', tenue: true }],
  });

  const campo = $('#campo-codice', pannello);
  const esito = $('#esito-codice', pannello);
  campo.focus();

  const controlla = () => {
    const letto = leggiCodice(campo.value);
    if (!letto.valido) {
      suoni.niente();
      esito.textContent = letto.motivo;
      esito.classList.add('campo__esito--male');
      return;
    }
    suoni.tocco();
    confermaRipristino(letto.dati);
  };

  $('#controlla-codice', pannello).addEventListener('click', controlla);
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') controlla(); });
}

function confermaRipristino(dati) {
  mostraPannello({
    titolo: 'Ripristinare questo?',
    testo: `${riassunto(dati)} I progressi di adesso vengono sostituiti, ` +
           'e la partita che hai in corso ricomincia dall\'inizio del livello.',
    cane: caneSvg({ accessorio: 'papillon' }),
    azioni: [
      {
        testo: 'Sì, ripristina',
        azione: () => { applicaCodice(dati); location.reload(); },
      },
      { testo: 'No, lascia stare', tenue: true },
    ],
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
