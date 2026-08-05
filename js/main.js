/* ============================================================================
   main.js — accensione.
   Mette insieme i pezzi, sistema le stranezze di Safari su iPad e apre la casa.
   ========================================================================== */

import { $, applicaTema, registraSchermo, vaiA, attendi } from './ui.js';
import { stato } from './store.js';
import { sbloccaAudio } from './audio.js';
import { caneSvg } from './art.js';
import * as hub from './hub.js';
import * as match3 from './match3/view.js';
import * as barattoli from './barattoli/view.js';
import * as frecce from './frecce/view.js';

/* --- Le abitudini di Safari da spegnere ----------------------------------- */

/* Il pizzicotto per ingrandire e il doppio tocco per zoomare: in un gioco a
   griglia servono solo a rovinare una mossa. */
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
/* Niente menù contestuale tenendo premuto: si tiene premuto di continuo. */
document.addEventListener('contextmenu', (e) => e.preventDefault());

/* --- Schermo sempre acceso (iOS 16.4 e successivi) ------------------------ */
let blocco = null;
async function tieniAcceso() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      blocco = await navigator.wakeLock.request('screen');
    }
  } catch { /* la batteria bassa o le impostazioni possono rifiutare: pazienza */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tieniAcceso();
});

/* --- Audio: iOS lo lascia partire solo dopo un tocco vero ------------------ */
const primoTocco = () => {
  sbloccaAudio();
  document.removeEventListener('pointerdown', primoTocco);
  document.removeEventListener('touchend', primoTocco);
};
document.addEventListener('pointerdown', primoTocco);
document.addEventListener('touchend', primoTocco);

/* --- Service worker: da qui in poi il gioco funziona anche senza rete ------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* --- Accensione ------------------------------------------------------------ */
async function accendi() {
  applicaTema(stato.impostazioni.tema === 'giorno' ? 'giorno' : 'sera');

  const avvio = $('#avvio');
  $('#avvio-cane').innerHTML = caneSvg();

  registraSchermo('hub',       { entra: hub.entra });
  registraSchermo('cuccia',    { entra: hub.entraCuccia });
  registraSchermo('match3',    { entra: match3.entra, esci: match3.esci });
  registraSchermo('barattoli', { entra: barattoli.entra, esci: barattoli.esci });
  registraSchermo('frecce',    { entra: frecce.entra, esci: frecce.esci });

  $('#app').hidden = false;
  await vaiA('hub');

  /* Un attimo di Wurstel prima di cominciare: dà il tempo ai font e alle
     immagini di essere pronti, e fa sembrare l'apertura curata. */
  await attendi(620);
  avvio.classList.add('avvio--via');
  setTimeout(() => avvio.remove(), 500);

  tieniAcceso();
}

accendi();
