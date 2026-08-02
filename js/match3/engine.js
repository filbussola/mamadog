/* ============================================================================
   match3/engine.js — le regole del gioco, e nient'altro.
   Qui dentro non si tocca il DOM: il motore riceve una griglia e restituisce
   una lista di PASSI ("ho tolto queste caselle", "queste sono cadute così"),
   che la vista poi anima con i suoi tempi. Separare le due cose è ciò che
   permette di curare le animazioni senza mai rompere le regole.
   ========================================================================== */

export const SPECIALI = { RIGA: 'riga', COLONNA: 'colonna', BOMBA: 'bomba', ARCOBALENO: 'arcobaleno' };
const ARCO = -1;   // il tipo di un pezzo arcobaleno: non fa coppia con nessuno

/* --- Accesso alla griglia -------------------------------------------------- */
export const ind = (g, c, r) => r * g.colonne + c;
export const colonnaDi = (g, i) => i % g.colonne;
export const rigaDi    = (g, i) => Math.floor(i / g.colonne);

function nuovaCella(g, tipo, speciale = null) {
  return { id: g.prossimoId++, tipo, speciale };
}

const tipoACaso = (g) => Math.floor(Math.random() * g.nTipi);

/* --- Creazione ------------------------------------------------------------- */

export function creaGriglia({ colonne = 8, righe = 8, nTipi = 5 } = {}) {
  const g = { colonne, righe, nTipi, celle: new Array(colonne * righe).fill(null), prossimoId: 1 };

  /* Si riempie evitando di chiudere subito un tris: il tavolo iniziale deve
     essere pulito, altrimenti il gioco "esplode" da solo appena si apre. */
  do {
    g.prossimoId = 1;
    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < colonne; c++) {
        const vietati = new Set();
        if (c >= 2 && g.celle[ind(g, c - 1, r)].tipo === g.celle[ind(g, c - 2, r)].tipo) {
          vietati.add(g.celle[ind(g, c - 1, r)].tipo);
        }
        if (r >= 2 && g.celle[ind(g, c, r - 1)].tipo === g.celle[ind(g, c, r - 2)].tipo) {
          vietati.add(g.celle[ind(g, c, r - 1)].tipo);
        }
        const possibili = [];
        for (let t = 0; t < nTipi; t++) if (!vietati.has(t)) possibili.push(t);
        g.celle[ind(g, c, r)] = nuovaCella(g, possibili[Math.floor(Math.random() * possibili.length)]);
      }
    }
  } while (!trovaMossaValida(g));   // e deve esistere almeno una mossa

  return g;
}

/* --- Riconoscimento delle file --------------------------------------------- */

/** Tutte le file di 3 o più pezzi uguali, orizzontali e verticali. */
function corse(g) {
  const trovate = [];

  const scorri = (lunghezza, cellaA, orizzontale) => {
    let inizio = 0;
    for (let k = 1; k <= lunghezza; k++) {
      const prec = cellaA(k - 1);
      const cur  = k < lunghezza ? cellaA(k) : null;
      const continua = cur && prec && prec.tipo === cur.tipo && prec.tipo !== ARCO;
      if (!continua) {
        const quanti = k - inizio;
        if (quanti >= 3 && prec && prec.tipo !== ARCO) {
          const indici = [];
          for (let m = inizio; m < k; m++) indici.push(cellaA.indice(m));
          trovate.push({ indici, orizzontale, tipo: prec.tipo });
        }
        inizio = k;
      }
    }
  };

  for (let r = 0; r < g.righe; r++) {
    const f = (c) => g.celle[ind(g, c, r)];
    f.indice = (c) => ind(g, c, r);
    scorri(g.colonne, f, true);
  }
  for (let c = 0; c < g.colonne; c++) {
    const f = (r) => g.celle[ind(g, c, r)];
    f.indice = (r) => ind(g, c, r);
    scorri(g.righe, f, false);
  }
  return trovate;
}

/**
 * File che si toccano = un gruppo solo (le forme a L e a T).
 * Per ogni gruppo si decide quale pezzo speciale nasce e dove.
 */
function gruppi(g, origine = null) {
  const tutte = corse(g);
  if (!tutte.length) return [];

  /* Unione delle file che condividono almeno una casella */
  const padre = new Map();
  const radice = (x) => { while (padre.get(x) !== x) { padre.set(x, padre.get(padre.get(x))); x = padre.get(x); } return x; };
  const unisci = (a, b) => { const ra = radice(a), rb = radice(b); if (ra !== rb) padre.set(ra, rb); };

  tutte.forEach((_, i) => padre.set(i, i));
  const proprietario = new Map();     // indice di casella -> prima fila che la contiene
  tutte.forEach((corsa, i) => {
    for (const cella of corsa.indici) {
      if (proprietario.has(cella)) unisci(i, proprietario.get(cella));
      else proprietario.set(cella, i);
    }
  });

  const perRadice = new Map();
  tutte.forEach((corsa, i) => {
    const r = radice(i);
    if (!perRadice.has(r)) perRadice.set(r, []);
    perRadice.get(r).push(corsa);
  });

  return [...perRadice.values()].map((corseDelGruppo) => {
    const indici = [...new Set(corseDelGruppo.flatMap((c) => c.indici))];
    const piuLunga = corseDelGruppo.reduce((a, b) => (b.indici.length > a.indici.length ? b : a));
    const haOrizz = corseDelGruppo.some((c) => c.orizzontale);
    const haVert  = corseDelGruppo.some((c) => !c.orizzontale);

    let speciale = null;
    if (piuLunga.indici.length >= 5)      speciale = SPECIALI.ARCOBALENO;
    else if (haOrizz && haVert)           speciale = SPECIALI.BOMBA;
    else if (piuLunga.indici.length === 4) speciale = piuLunga.orizzontale ? SPECIALI.RIGA : SPECIALI.COLONNA;

    /* Il pezzo speciale nasce dove ha appena toccato il dito: è lì che
       l'occhio sta guardando. Altrimenti, in mezzo alla fila più lunga. */
    let dove = null;
    if (speciale) {
      if (origine !== null && indici.includes(origine)) dove = origine;
      else if (haOrizz && haVert) {
        const oriz = corseDelGruppo.find((c) => c.orizzontale).indici;
        const vert = corseDelGruppo.find((c) => !c.orizzontale).indici;
        dove = oriz.find((i) => vert.includes(i)) ?? piuLunga.indici[1];
      } else {
        dove = piuLunga.indici[Math.floor(piuLunga.indici.length / 2)];
      }
    }

    return { indici, tipo: piuLunga.tipo, speciale, dove };
  });
}

/* --- Che cosa colpisce un pezzo speciale ----------------------------------- */

function celleColpite(g, i, cella, tipoBersaglio) {
  const c = colonnaDi(g, i), r = rigaDi(g, i);
  const fuori = [];

  if (cella.speciale === SPECIALI.RIGA) {
    for (let x = 0; x < g.colonne; x++) fuori.push(ind(g, x, r));
  } else if (cella.speciale === SPECIALI.COLONNA) {
    for (let y = 0; y < g.righe; y++) fuori.push(ind(g, c, y));
  } else if (cella.speciale === SPECIALI.BOMBA) {
    /* Un quadrato 3x3 più le quattro punte: generoso, come dev'essere. */
    for (let y = r - 2; y <= r + 2; y++) {
      for (let x = c - 2; x <= c + 2; x++) {
        if (x < 0 || y < 0 || x >= g.colonne || y >= g.righe) continue;
        const dc = Math.abs(x - c), dr = Math.abs(y - r);
        if ((dc <= 1 && dr <= 1) || dc + dr <= 2) fuori.push(ind(g, x, y));
      }
    }
  } else if (cella.speciale === SPECIALI.ARCOBALENO) {
    const bersaglio = tipoBersaglio ?? tipoPiuPresente(g);
    g.celle.forEach((cel, k) => { if (cel && cel.tipo === bersaglio) fuori.push(k); });
  }
  return fuori;
}

function tipoPiuPresente(g) {
  const conto = new Array(g.nTipi).fill(0);
  for (const cel of g.celle) if (cel && cel.tipo >= 0) conto[cel.tipo]++;
  return conto.indexOf(Math.max(...conto));
}

/**
 * A catena: se fra le caselle da togliere c'è un pezzo speciale, quello ne
 * trascina altre, che a loro volta possono essere speciali. Si continua
 * finché non si aggiunge più nulla.
 */
function espandi(g, iniziali, { risparmia = new Set(), tipoBersaglio = null } = {}) {
  const daFare = [...iniziali];
  const rimossi = new Set();
  const esplosi = [];

  while (daFare.length) {
    const i = daFare.pop();
    if (rimossi.has(i) || risparmia.has(i)) continue;
    const cella = g.celle[i];
    if (!cella) continue;
    rimossi.add(i);
    if (cella.speciale) {
      esplosi.push({ indice: i, speciale: cella.speciale });
      for (const j of celleColpite(g, i, cella, tipoBersaglio)) {
        if (!rimossi.has(j)) daFare.push(j);
      }
    }
  }
  return { rimossi, esplosi };
}

/* --- Gravità e riempimento ------------------------------------------------- */

function applicaGravita(g) {
  const movimenti = [], nuovi = [];

  for (let c = 0; c < g.colonne; c++) {
    let scrivi = g.righe - 1;
    for (let r = g.righe - 1; r >= 0; r--) {
      const i = ind(g, c, r);
      if (!g.celle[i]) continue;
      if (r !== scrivi) {
        const j = ind(g, c, scrivi);
        g.celle[j] = g.celle[i];
        g.celle[i] = null;
        movimenti.push({ da: i, a: j });
      }
      scrivi--;
    }
    /* Le caselle rimaste vuote in cima si riempiono di pezzi nuovi, che la
       vista farà entrare dall'alto come se cadessero da fuori schermo. */
    for (let r = scrivi; r >= 0; r--) {
      const i = ind(g, c, r);
      const cella = nuovaCella(g, tipoACaso(g));
      g.celle[i] = cella;
      nuovi.push({ a: i, daRiga: -(scrivi - r + 1), cella: { ...cella } });
    }
  }
  return { tipo: 'caduta', movimenti, nuovi };
}

/* --- Il ciclo delle cascate ------------------------------------------------ */

function passoRimozione(g, rimossi, esplosi, creati, gradino) {
  const conteggioTipi = {};
  for (const i of rimossi) {
    const cella = g.celle[i];
    if (cella && cella.tipo >= 0) conteggioTipi[cella.tipo] = (conteggioTipi[cella.tipo] || 0) + 1;
  }

  const indici = [...rimossi];
  for (const i of indici) g.celle[i] = null;

  for (const c of creati) {
    /* Il pezzo speciale prende il posto (e l'identità) del pezzo che c'era:
       così la vista lo vede trasformarsi, non sparire e ricomparire. */
    const vecchia = c.cella;
    vecchia.speciale = c.speciale;
    if (c.speciale === SPECIALI.ARCOBALENO) vecchia.tipo = ARCO;
    g.celle[c.indice] = vecchia;
  }

  const punti = indici.length * 10 * (gradino + 1) + esplosi.length * 40;

  return {
    tipo: 'rimozione',
    indici,
    esplosi,
    /* La vista deve poter ricostruire il pezzo nuovo senza rileggere la
       griglia: il tipo va letto DOPO la trasformazione in arcobaleno. */
    creati: creati.map((c) => ({
      indice: c.indice, speciale: c.speciale, tipo: g.celle[c.indice].tipo,
    })),
    conteggioTipi,
    gradino,
    punti,
  };
}

/**
 * Risolve tutto quello che c'è da risolvere, partendo da un insieme di
 * caselle già condannate (una mossa) oppure dalle file presenti sul tavolo.
 */
function risolvi(g, primoColpo = null, origine = null) {
  const passi = [];
  let gradino = 0;
  let punti = 0;
  const conteggioTipi = {};
  let combo = 0;

  for (;;) {
    let rimossi, esplosi, creati = [];

    if (gradino === 0 && primoColpo) {
      ({ rimossi, esplosi } = espandi(g, primoColpo.indici, {
        tipoBersaglio: primoColpo.tipoBersaglio ?? null,
      }));
    } else {
      /* Al primo giro il pezzo speciale nasce sotto il dito: `origine` è la
         casella dove la mossa si è conclusa. */
      const trovati = gruppi(g, gradino === 0 ? origine : null);
      if (!trovati.length) break;

      /* I pezzi speciali appena nati non devono essere distrutti dalla stessa
         mossa che li ha creati. */
      const risparmia = new Set(trovati.filter((t) => t.speciale).map((t) => t.dove));
      const base = trovati.flatMap((t) => t.indici);
      ({ rimossi, esplosi } = espandi(g, base, { risparmia }));

      creati = trovati
        .filter((t) => t.speciale)
        .map((t) => ({ indice: t.dove, speciale: t.speciale, cella: g.celle[t.dove] }));
    }

    if (!rimossi.size) break;
    if (gradino > 0) combo++;

    const passo = passoRimozione(g, rimossi, esplosi, creati, gradino);
    for (const [t, n] of Object.entries(passo.conteggioTipi)) {
      conteggioTipi[t] = (conteggioTipi[t] || 0) + n;
    }
    punti += passo.punti;
    passi.push(passo);
    passi.push(applicaGravita(g));

    gradino++;
    if (gradino > 60) break;   // rete di sicurezza, non dovrebbe mai servire
  }

  return { passi, punti, conteggioTipi, combo, cascate: gradino };
}

/* --- Mosse ----------------------------------------------------------------- */

export function adiacenti(g, a, b) {
  const dc = Math.abs(colonnaDi(g, a) - colonnaDi(g, b));
  const dr = Math.abs(rigaDi(g, a) - rigaDi(g, b));
  return dc + dr === 1;
}

function scambia(g, a, b) {
  const t = g.celle[a]; g.celle[a] = g.celle[b]; g.celle[b] = t;
}

/** Lo scambio di due pezzi speciali fa cose che nessun tris può fare. */
function colpoSpeciale(g, a, b) {
  const ca = g.celle[a], cb = g.celle[b];
  const sa = ca.speciale, sb = cb.speciale;
  if (!sa && !sb) return null;

  const arcoA = sa === SPECIALI.ARCOBALENO, arcoB = sb === SPECIALI.ARCOBALENO;

  if (arcoA && arcoB) {
    return { indici: g.celle.map((_, i) => i), tipoBersaglio: null, nome: 'tutto' };
  }

  if (arcoA || arcoB) {
    const arco  = arcoA ? a : b;
    const altro = arcoA ? b : a;
    const cellaAltro = g.celle[altro];

    /* Arcobaleno + pezzo speciale: tutti i pezzi di quel colore diventano
       speciali e scoppiano insieme. È l'effettone del gioco. */
    if (cellaAltro.speciale) {
      const bersaglio = cellaAltro.tipo;
      const indici = [arco, altro];
      g.celle.forEach((cel, i) => {
        if (cel && cel.tipo === bersaglio && i !== altro) {
          cel.speciale = cellaAltro.speciale;
          indici.push(i);
        }
      });
      return { indici, tipoBersaglio: bersaglio, nome: 'arcobaleno-speciale' };
    }
    return { indici: [arco, altro], tipoBersaglio: cellaAltro.tipo, nome: 'arcobaleno' };
  }

  const righe = new Set(), colonne = new Set();
  const cr = rigaDi(g, b), cc = colonnaDi(g, b);
  const lineari = [sa, sb].filter((s) => s === SPECIALI.RIGA || s === SPECIALI.COLONNA).length;
  const bombe   = [sa, sb].filter((s) => s === SPECIALI.BOMBA).length;

  if (lineari === 2) { righe.add(cr); colonne.add(cc); }
  else if (bombe === 2) {
    const indici = [];
    for (let y = cr - 2; y <= cr + 2; y++) {
      for (let x = cc - 2; x <= cc + 2; x++) {
        if (x >= 0 && y >= 0 && x < g.colonne && y < g.righe) indici.push(ind(g, x, y));
      }
    }
    return { indici, nome: 'bomba-doppia' };
  }
  else if (bombe === 1 && lineari === 1) {
    [-1, 0, 1].forEach((d) => { righe.add(cr + d); colonne.add(cc + d); });
  }
  else return null;   // uno speciale solo: lo gestisce il tris normale

  const indici = [a, b];
  for (const r of righe) for (let x = 0; x < g.colonne; x++) if (r >= 0 && r < g.righe) indici.push(ind(g, x, r));
  for (const c of colonne) for (let y = 0; y < g.righe; y++) if (c >= 0 && c < g.colonne) indici.push(ind(g, c, y));
  return { indici, nome: 'incrocio' };
}

/** Uno scambio ha senso se crea un tris oppure coinvolge un arcobaleno. */
export function mossaValida(g, a, b) {
  if (!adiacenti(g, a, b) || !g.celle[a] || !g.celle[b]) return false;
  if (g.celle[a].speciale === SPECIALI.ARCOBALENO || g.celle[b].speciale === SPECIALI.ARCOBALENO) return true;
  if (colpoSpeciale(g, a, b)) return true;

  scambia(g, a, b);
  const c = corse(g).length > 0;
  scambia(g, a, b);
  return c;
}

/** Serve sia per il suggerimento sia per capire quando rimescolare. */
export function trovaMossaValida(g) {
  for (let r = 0; r < g.righe; r++) {
    for (let c = 0; c < g.colonne; c++) {
      const a = ind(g, c, r);
      if (c + 1 < g.colonne) { const b = ind(g, c + 1, r); if (mossaValida(g, a, b)) return { a, b }; }
      if (r + 1 < g.righe)   { const b = ind(g, c, r + 1); if (mossaValida(g, a, b)) return { a, b }; }
    }
  }
  return null;
}

/**
 * Esegue la mossa. Restituisce null se non produce nulla (la vista fa tornare
 * indietro i due pezzi con un'animazione, senza nessun messaggio di errore).
 */
export function eseguiMossa(g, a, b) {
  if (!adiacenti(g, a, b) || !g.celle[a] || !g.celle[b]) return null;

  scambia(g, a, b);

  const speciale = colpoSpeciale(g, a, b);
  if (speciale) return { ...risolvi(g, speciale, b), colpo: speciale.nome };

  if (!corse(g).length) { scambia(g, a, b); return null; }

  return { ...risolvi(g, null, b), colpo: null };
}

/* --- Rimescolo (mai un vicolo cieco) --------------------------------------- */

/** Rimescola i pezzi già presenti, conservandone l'identità: la vista può
    animarli mentre si spostano invece di farli sparire. */
export function rimescola(g) {
  const celle = g.celle.filter(Boolean);
  for (let tentativo = 0; tentativo < 200; tentativo++) {
    for (let i = celle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [celle[i], celle[j]] = [celle[j], celle[i]];
    }
    g.celle = celle.slice();
    if (!corse(g).length && trovaMossaValida(g)) return true;
  }
  /* Caso disperato (praticamente impossibile): si riparte da un tavolo nuovo. */
  const fresca = creaGriglia({ colonne: g.colonne, righe: g.righe, nTipi: g.nTipi });
  g.celle = fresca.celle;
  g.prossimoId = fresca.prossimoId;
  return false;
}

/** Le file già presenti quando si riprende una partita salvata. */
export function risolviTavolo(g) {
  return risolvi(g, null);
}

/* --- Salvataggio ----------------------------------------------------------- */

export function serializza(g) {
  return {
    colonne: g.colonne, righe: g.righe, nTipi: g.nTipi, prossimoId: g.prossimoId,
    celle: g.celle.map((c) => (c ? [c.id, c.tipo, c.speciale || 0] : 0)),
  };
}

export function deserializza(d) {
  if (!d || !Array.isArray(d.celle) || d.celle.length !== d.colonne * d.righe) return null;
  return {
    colonne: d.colonne, righe: d.righe, nTipi: d.nTipi, prossimoId: d.prossimoId,
    celle: d.celle.map((c) => (c ? { id: c[0], tipo: c[1], speciale: c[2] || null } : null)),
  };
}
