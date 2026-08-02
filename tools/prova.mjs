/* ============================================================================
   tools/prova.mjs — controlli automatici sui due motori.
   Non serve nessuna libreria: `npm run prova`.

   Quello che conta davvero è l'ultima prova: mille livelli dei barattoli
   generati e tutti risolti da un risolutore vero. È la promessa che nessuna
   serata finirà davanti a un rompicapo impossibile.
   ========================================================================== */

import * as m3 from '../js/match3/engine.js';
import { livelloMatch3, avanzamento, foglieDelLivello } from '../js/match3/levels.js';
import { generaLivello, risolvibile, livelloBarattoli } from '../js/barattoli/generator.js';
import { CAPIENZA, vinto } from '../js/barattoli/engine.js';

let falliti = 0;
function prova(nome, condizione, dettaglio = '') {
  if (condizione) {
    console.log(`  ok   ${nome}`);
  } else {
    falliti++;
    console.log(`  NO   ${nome}${dettaglio ? '  →  ' + dettaglio : ''}`);
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nMATCH-3');

{
  let senzaMatch = true, conMossa = true;
  for (let i = 0; i < 120; i++) {
    const g = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5 });
    if (m3.risolviTavolo(structuredClone(g)).passi.length) senzaMatch = false;
    if (!m3.trovaMossaValida(g)) conMossa = false;
  }
  prova('la griglia iniziale non ha mai file già fatte', senzaMatch);
  prova('la griglia iniziale ha sempre almeno una mossa', conMossa);
}

{
  /* Mille mosse a caso: il tavolo deve restare pieno, coerente e giocabile. */
  const g = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5 });
  let mosse = 0, buche = 0, bloccatoMai = 0, punti = 0;

  for (let giro = 0; giro < 1000; giro++) {
    const mossa = m3.trovaMossaValida(g);
    if (!mossa) { bloccatoMai++; m3.rimescola(g); continue; }
    const esito = m3.eseguiMossa(g, mossa.a, mossa.b);
    if (esito) { mosse++; punti += esito.punti; }
    if (g.celle.some((c) => !c)) buche++;
    if (!m3.trovaMossaValida(g)) m3.rimescola(g);
  }

  prova('mille mosse valide vanno tutte a segno', mosse === 1000, `a segno: ${mosse}`);
  prova('dopo ogni mossa il tavolo resta pieno', buche === 0, `buchi: ${buche}`);
  prova('il rimescolo riporta sempre una mossa possibile', !!m3.trovaMossaValida(g));
  prova('le mosse fruttano punti', punti > 0);
  prova('gli identificativi delle celle sono unici',
        new Set(g.celle.map((c) => c.id)).size === g.celle.length);
}

{
  /* Un fondo a scacchi di quattro tipi non contiene mai tre in fila: sopra ci
     si può appoggiare qualsiasi figura e sapere che si sta misurando quella. */
  const fondo = () => {
    const g = { colonne: 8, righe: 8, nTipi: 6, celle: [],
                foglie: new Array(64).fill(0), prossimoId: 1 };
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
      g.celle[r * 8 + c] = { id: g.prossimoId++, tipo: (c + 2 * r) % 4, speciale: null };
    }
    return g;
  };
  const posa = (g, celle, tipo) => { for (const [c, r] of celle) g.celle[r * 8 + c].tipo = tipo; };
  const primaRimozione = (g) => m3.risolviTavolo(g).passi.find((p) => p.tipo === 'rimozione');

  prova('il fondo di prova non ha file', !primaRimozione(fondo()));

  const quattro = fondo();
  posa(quattro, [[1, 2], [2, 2], [3, 2], [4, 2]], 4);
  prova('quattro in fila orizzontale creano l\'osso lungo di riga',
        primaRimozione(quattro)?.creati[0]?.speciale === 'riga');

  const quattroSu = fondo();
  posa(quattroSu, [[1, 1], [1, 2], [1, 3], [1, 4]], 4);
  prova('quattro in fila verticale creano l\'osso lungo di colonna',
        primaRimozione(quattroSu)?.creati[0]?.speciale === 'colonna');

  const elle = fondo();
  posa(elle, [[1, 2], [2, 2], [3, 2], [1, 3], [1, 4]], 4);
  prova('la forma a L crea la pallina esplosiva',
        primaRimozione(elle)?.creati[0]?.speciale === 'bomba');

  const cinque = fondo();
  posa(cinque, [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2]], 4);
  prova('cinque in fila creano il Wurstel d\'oro',
        primaRimozione(cinque)?.creati[0]?.speciale === 'arcobaleno');

  /* Riga + colonna scambiati: deve saltare tutta la croce, 15 caselle. */
  const croce = fondo();
  croce.celle[3 * 8 + 3].speciale = 'riga';
  croce.celle[3 * 8 + 4].speciale = 'colonna';
  const esito = m3.eseguiMossa(croce, 3 * 8 + 3, 3 * 8 + 4);
  const saltate = esito?.passi[0]?.indici.length ?? 0;
  prova('scambiare riga e colonna spazza la croce intera', saltate >= 15, `caselle: ${saltate}`);

  /* L'arcobaleno porta via tutti i pezzi del colore che tocca. */
  const arco = fondo();
  arco.celle[4 * 8 + 4].speciale = 'arcobaleno';
  arco.celle[4 * 8 + 4].tipo = -1;
  const bersaglio = arco.celle[4 * 8 + 5].tipo;
  const quanti = arco.celle.filter((c) => c.tipo === bersaglio).length;
  const esitoArco = m3.eseguiMossa(arco, 4 * 8 + 4, 4 * 8 + 5);
  prova('il Wurstel d\'oro porta via tutto un colore',
        (esitoArco?.passi[0]?.indici.length ?? 0) >= quanti + 1);
}

{
  /* Righe alternate a coppie: nessuno scambio produce un tris. È il vicolo
     cieco che nel gioco vero non si deve mai vedere. */
  const g = { colonne: 8, righe: 8, nTipi: 4, celle: [],
              foglie: new Array(64).fill(0), prossimoId: 1 };
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    g.celle[r * 8 + c] = { id: g.prossimoId++, tipo: (r % 2) * 2 + (c % 2), speciale: null };
  }
  prova('lo stallo viene riconosciuto', m3.trovaMossaValida(g) === null);
  m3.rimescola(g);
  prova('dopo il rimescolo si può rigiocare', m3.trovaMossaValida(g) !== null);
  prova('il rimescolo non lascia file già fatte', m3.risolviTavolo(g).passi.length === 0);
}

{
  const andata = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5 });
  const ritorno = m3.deserializza(m3.serializza(andata));
  prova('salvataggio e ripristino della griglia coincidono',
        JSON.stringify(m3.serializza(andata)) === JSON.stringify(m3.serializza(ritorno)));
}

{
  let ok = true;
  for (let n = 1; n <= 400; n++) {
    const a = livelloMatch3(n), b = livelloMatch3(n);
    if (JSON.stringify(a) !== JSON.stringify(b)) ok = false;
    if (a.quantita < 1 || !a.descrizione) ok = false;
  }
  prova('lo stesso livello dà sempre lo stesso obiettivo', ok);
  prova('l\'obiettivo "combo" conta le cascate',
        avanzamento({ genere: 'combo' }, { combo: 3, conteggioTipi: {} }) === 3);
}

/* -------------------------------------------------------------------------- */
console.log('\nFOGLIE');

{
  let sempreRaggiungibili = true, sempreCoerenti = true, primoGuasto = '';

  for (let n = 1; n <= 300; n++) {
    const foglie = foglieDelLivello(n);
    if (foglie.length !== 64 || foglie.some((v) => v < 0 || v > 2)) {
      sempreCoerenti = false; primoGuasto = `livello ${n}`; break;
    }
    if (foglie.reduce((a, b) => a + b, 0) < 6) {
      sempreCoerenti = false; primoGuasto = `livello ${n}: troppo poche`; break;
    }
    if (JSON.stringify(foglieDelLivello(n)) !== JSON.stringify(foglie)) {
      sempreCoerenti = false; primoGuasto = `livello ${n}: non ripetibile`; break;
    }
  }
  prova('lo strato di foglie è sempre valido e ripetibile', sempreCoerenti, primoGuasto);

  /* La prova che conta: giocando, il prato si libera sempre fino all'ultima
     foglia. Se una casella restasse irraggiungibile, il livello non finirebbe
     mai — ed è l'unico modo in cui questo gioco potrebbe incastrare qualcuno. */
  for (const n of [5, 12, 25, 60, 150]) {
    const foglie = foglieDelLivello(n);
    const totale = foglie.reduce((a, b) => a + b, 0);
    const g = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5, foglie });

    let liberate = 0, mosse = 0;
    while (m3.foglieRimaste(g) > 0 && mosse < 4000) {
      const mossa = m3.trovaMossaValida(g);
      if (!mossa) { m3.rimescola(g); continue; }
      const esito = m3.eseguiMossa(g, mossa.a, mossa.b);
      if (esito) { liberate += esito.foglie; mosse++; }
    }
    if (m3.foglieRimaste(g) !== 0 || liberate !== totale) {
      sempreRaggiungibili = false;
      primoGuasto = `livello ${n}: ne restavano ${m3.foglieRimaste(g)} dopo ${mosse} mosse`;
      break;
    }
  }
  prova('giocando si arriva sempre a liberare tutto il prato', sempreRaggiungibili, primoGuasto);

  {
    const g = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5, foglie: foglieDelLivello(30) });
    const primaDelGiro = m3.foglieRimaste(g);
    const ritorno = m3.deserializza(m3.serializza(g));
    prova('le foglie sopravvivono al salvataggio',
          m3.foglieRimaste(ritorno) === primaDelGiro);
    prova('una partita salvata prima delle foglie si riapre lo stesso',
          m3.deserializza({ colonne: 8, righe: 8, nTipi: 5, prossimoId: 2,
                            celle: new Array(64).fill([1, 0, 0]) })?.foglie.length === 64);
  }

  {
    const foglie = new Array(64).fill(0);
    foglie[27] = 2;
    const g = m3.creaGriglia({ colonne: 8, righe: 8, nTipi: 5, foglie });
    prova('una foglia doppia vale due passate', m3.foglieRimaste(g) === 2);
    prova('l\'obiettivo "foglie" conta le foglie tolte',
          avanzamento({ genere: 'foglie' }, { foglie: 4, conteggioTipi: {}, combo: 0 }) === 4);
  }

  {
    let conFoglie = 0;
    for (let n = 1; n <= 200; n++) if (livelloMatch3(n).genere === 'foglie') conFoglie++;
    prova('le foglie compaiono spesso ma non sempre',
          conFoglie > 30 && conFoglie < 120, `${conFoglie} livelli su 200`);
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nBARATTOLI');

{
  let tutti = true, primoGuasto = '';
  const inizio = Date.now();

  for (let n = 1; n <= 1000; n++) {
    const s = generaLivello(n);
    const atteso = livelloBarattoli(n);

    const biscotti = s.flat();
    const conto = {};
    for (const c of biscotti) conto[c] = (conto[c] || 0) + 1;
    const quantitaGiuste = Object.values(conto).every((v) => v === CAPIENZA)
                        && Object.keys(conto).length === atteso.colori;

    if (!quantitaGiuste || vinto(s) || !risolvibile(s.map((b) => b.slice()))) {
      tutti = false;
      primoGuasto = `livello ${n}: ${JSON.stringify(s)}`;
      break;
    }
  }

  prova('mille livelli generati sono tutti risolvibili', tutti, primoGuasto);
  console.log(`       (verificati in ${((Date.now() - inizio) / 1000).toFixed(1)} s)`);
}

{
  const facile = livelloBarattoli(1), difficile = livelloBarattoli(200);
  prova('la difficoltà cresce e poi si ferma',
        facile.colori === 3 && difficile.colori === 10 && facile.vuoti > difficile.vuoti);
}

/* -------------------------------------------------------------------------- */
console.log('\nSALVATAGGIO DI RISERVA');

{
  /* store.js si aggancia agli eventi del browser per salvare quando l'app va
     in secondo piano. Qui quel mondo non c'è: gliene diamo uno finto e muto,
     invece di sporcare il codice vero di controlli che servono solo al test.
     (localStorage resta assente apposta: store.js se ne accorge da solo e
     continua a funzionare tenendo tutto in memoria.) */
  globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
  globalThis.window = { addEventListener() {} };

  const { stato } = await import('../js/store.js');
  const { creaCodice, leggiCodice, riassunto, applicaCodice, amiciDi } =
    await import('../js/riserva.js');

  /* Un giro completo: si finge una partita avanzata, si genera il codice, si
     azzera tutto e si vede se torna esattamente com'era. */
  Object.assign(stato, {
    biscotti: 1234, livelliCompletati: 47, amici: [],
    impostazioni: { tema: 'giorno', audio: false },
    match3: { livello: 31, partita: { griglia: 'roba' } },
    barattoli: { livello: 18, partita: { barattoli: [] } },
  });

  const codice = creaCodice();
  prova('il codice comincia con WURSTEL', codice.startsWith('WURSTEL-'), codice);
  prova('il codice sta in una riga sola', codice.length <= 32, `${codice.length} caratteri`);

  Object.assign(stato, {
    biscotti: 0, livelliCompletati: 0, amici: [1, 2, 3],
    impostazioni: { tema: 'sera', audio: true },
    match3: { livello: 1, partita: null }, barattoli: { livello: 1, partita: null },
  });

  const letto = leggiCodice(codice);
  prova('il codice si rilegge', letto.valido, letto.motivo);
  if (letto.valido) applicaCodice(letto.dati);

  prova('torna il livello del match-3', stato.match3.livello === 31);
  prova('torna il livello dei barattoli', stato.barattoli.livello === 18);
  prova('tornano i biscotti', stato.biscotti === 1234);
  prova('tornano i livelli finiti', stato.livelliCompletati === 47);
  prova('tornano gli amici giusti', stato.amici.length === amiciDi(47) && stato.amici[0] === 0,
        `${stato.amici.length} amici`);
  prova('tornano le impostazioni',
        stato.impostazioni.tema === 'giorno' && stato.impostazioni.audio === false);
  prova('la partita in corso viene azzerata',
        stato.match3.partita === null && stato.barattoli.partita === null);
  prova('il riassunto è leggibile', /Livello 31 .* 9 amici .* 1234 biscotti/.test(riassunto(letto.dati)),
        riassunto(letto.dati));

  /* Un codice storpiato non deve MAI passare: sovrascriverebbe i progressi
     con dati sbagliati, che è peggio che non ripristinare niente. */
  prova('rifiuta un codice troncato', !leggiCodice(codice.slice(0, -4)).valido);
  prova('rifiuta una cifra cambiata',
        !leggiCodice(codice.replace('-31-', '-32-')).valido);
  prova('rifiuta testo qualsiasi', !leggiCodice('ciao mamma').valido);

  /* Un messaggio sbagliato è peggio di nessun messaggio: chi ha copiato metà
     codice non deve sentirsi dire che non è un codice di Wurstel. */
  const monco = leggiCodice(codice.split('-').slice(0, 7).join('-'));
  prova('a un codice monco dice che è incompleto, non che è di un altro gioco',
        !monco.valido && /incompleto/i.test(monco.motivo), monco.motivo);
  const estraneo = leggiCodice('PIPPO-1-2-3-4-5-6-AA');
  prova('a un codice estraneo dice che non è di Wurstel',
        !estraneo.valido && /cominciare con WURSTEL/.test(estraneo.motivo), estraneo.motivo);
  prova('rifiuta il vuoto', !leggiCodice('').valido);
  prova('rifiuta un controllo sbagliato', !leggiCodice(codice.slice(0, -2) + 'ZZ').valido);

  /* Perdona invece le cose che succedono davvero copiando e incollando. */
  prova('perdona spazi e minuscole', leggiCodice(`  ${codice.toLowerCase()} `).valido);
  prova('perdona i trattini lunghi del correttore',
        leggiCodice(codice.replace(/-/g, '–')).valido);

  let sempre = true;
  for (let n = 0; n < 500; n++) {
    Object.assign(stato, {
      biscotti: n * 37, livelliCompletati: n,
      match3: { livello: n + 1, partita: null }, barattoli: { livello: n * 2 + 1, partita: null },
      impostazioni: { tema: n % 2 ? 'giorno' : 'sera', audio: n % 3 === 0 },
    });
    const r = leggiCodice(creaCodice());
    if (!r.valido || r.dati.m3 !== n + 1 || r.dati.completati !== n) sempre = false;
  }
  prova('cinquecento partite diverse fanno tutte andata e ritorno', sempre);
}

/* -------------------------------------------------------------------------- */
console.log(falliti ? `\n${falliti} prove non superate\n` : '\nTutto a posto.\n');
process.exit(falliti ? 1 : 0);
