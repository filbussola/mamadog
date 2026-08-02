/* ============================================================================
   amici.js — la collezione della cuccia.
   Un amico ogni cinque livelli, per sempre. I cagnolini non sono disegnati
   a mano uno per uno: si generano combinando lunghezza, zampe, orecchie,
   colori e accessorio, sempre dallo stesso seme, così l'amico numero 37
   sarà identico oggi e fra due anni.
   ========================================================================== */

import { rng, caneSvg } from './art.js';
import { mostraPannello } from './ui.js';
import { suoni } from './audio.js';

const NOMI = [
  'Pepe', 'Nina', 'Otto', 'Lilla', 'Bruno', 'Zoe', 'Gigi', 'Mora',
  'Tobia', 'Perla', 'Ciccio', 'Bea', 'Rocco', 'Stella', 'Milo', 'Dora',
  'Nuvola', 'Bacio', 'Trilly', 'Pippo', 'Cocco', 'Grillo', 'Fiocco', 'Cannella',
  'Rufus', 'Briciola', 'Pallino', 'Zucchero', 'Olivia', 'Gastone', 'Musetta', 'Ercole',
  'Amaretto', 'Tosca', 'Bibi', 'Furbetto', 'Gnocco', 'Ninetta', 'Baffo', 'Regina',
];

const RAZZE = [
  'bassotto', 'barboncino', 'beagle', 'carlino', 'jack russell', 'labrador',
  'chihuahua', 'bulldog', 'volpino', 'cocker', 'corgi', 'maltese',
  'dalmata', 'shiba', 'terrier', 'segugio', 'setter', 'pastore',
  'spinone', 'levriero',
];

const FRASI = [
  'Dorme sul divano, sempre.',
  'Ruba i calzini e li nasconde.',
  'Abbaia solo al citofono.',
  'Corre in tondo per la felicità.',
  'Ha paura dell’aspirapolvere.',
  'Mangia e poi chiede ancora.',
  'Si tuffa in ogni pozzanghera.',
  'Aspetta alla porta ogni sera.',
  'Russa più di quanto sembri.',
  'Va matto per le carote.',
  'Dorme con la pancia all’aria.',
  'Sa fare la festa a chiunque.',
  'Non ha mai riportato una palla.',
  'Se lo chiami, fa finta di niente.',
  'Ama il sole del pomeriggio.',
  'Ha il cuscino preferito e guai a spostarlo.',
  'Segue sempre chi va in cucina.',
  'Sbadiglia quando ti annoi tu.',
  'Ha imparato a dare la zampa in un giorno.',
  'Preferisce le coperte pulite.',
  'Piange se lo lasci in un’altra stanza.',
  'Fa amicizia con tutti al parco.',
  'Sotterra i biscotti in giardino.',
  'Ti guarda finché non gli dai retta.',
];

const PELI = [
  ['#b5763f', '#8a5228', '#e8bd88'],   // marrone caldo
  ['#3c3336', '#221d1f', '#b7a49b'],   // nero focato
  ['#e8d3ae', '#c0a276', '#f7ecd8'],   // crema
  ['#d97b4a', '#a8532a', '#f2c193'],   // rosso volpino
  ['#8e8f96', '#63656d', '#d2d4da'],   // grigio
  ['#f2efe9', '#cfc7bb', '#ffffff'],   // bianco
  ['#6b4a35', '#4a3223', '#c39d76'],   // cioccolato
  ['#c9a227', '#9a7a16', '#eddc9a'],   // dorato
];

const COLLARI = ['#e05c5c', '#4bb3d8', '#7bc043', '#f2a03d', '#b07fe0', '#e87fae'];
const ORECCHIE = ['lunghe', 'corte', 'ritte'];
const ACCESSORI = [null, 'papillon', 'bandana'];

const ROMANI = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];

/** L'amico numero `i` (0 è il primo che arriva in cuccia). */
export function amico(i) {
  const casuale = rng(i * 2654435761 + 101);
  const pelo = PELI[Math.floor(casuale() * PELI.length)];
  const giro = Math.floor(i / NOMI.length);

  return {
    indice: i,
    nome: NOMI[i % NOMI.length] + (ROMANI[giro] ?? ` ${giro + 1}`),
    razza: RAZZE[Math.floor(casuale() * RAZZE.length)],
    frase: FRASI[Math.floor(casuale() * FRASI.length)],
    aspetto: {
      lungo: Math.round(84 + casuale() * 52),
      altoZampe: Math.round(18 + casuale() * 30),
      orecchie: ORECCHIE[Math.floor(casuale() * ORECCHIE.length)],
      pelo: pelo[0], peloScuro: pelo[1], pancia: pelo[2],
      muso: '#f4dcbb',
      collare: COLLARI[Math.floor(casuale() * COLLARI.length)],
      accessorio: ACCESSORI[Math.floor(casuale() * ACCESSORI.length)],
      macchie: Math.floor(casuale() * 4),
      seme: i + 3,
    },
  };
}

export function svgAmico(i) {
  return caneSvg(amico(i).aspetto);
}

/** Presenta un amico nuovo e si mette in pausa finché lei non tocca il bottone. */
function presenta(i) {
  return new Promise((finito) => {
    const a = amico(i);
    suoni.amico();
    mostraPannello({
      titolo: `È arrivato ${a.nome}!`,
      testo: `Un ${a.razza}. ${a.frase}`,
      cane: caneSvg(a.aspetto),
      azioni: [{ testo: 'Benvenuto! 🐾', azione: finito }],
    });
  });
}

/** Uno alla volta, con calma: se ne arrivano due si vedono entrambi. */
export async function presentaNuoviAmici(indici) {
  for (const i of indici) await presenta(i);
}
