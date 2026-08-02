/* ============================================================================
   art.js — tutto il disegno del gioco, in SVG scritto a mano.
   Niente immagini da scaricare: resta nitido su qualsiasi schermo, pesa nulla
   e ogni pezzo può essere animato dal CSS.
   ========================================================================== */

let contatoreId = 0;
const nuovoId = (p) => `${p}${++contatoreId}`;

/** Schiarisce o scurisce una tinta: serve a ricavare le sfumature del pelo
    da un colore solo, così ogni cane della collezione resta coerente. */
function verso(esa, meta, quanto) {
  const n = parseInt(esa.slice(1), 16);
  const t = meta === 'chiaro' ? 255 : 0;
  const canale = (spostamento) => {
    const v = (n >> spostamento) & 255;
    return Math.round(v + (t - v) * quanto);
  };
  return `rgb(${canale(16)} ${canale(8)} ${canale(0)})`;
}

/* Numeri casuali ripetibili: lo stesso seme dà sempre lo stesso cane. */
export function rng(seme) {
  let s = (seme >>> 0) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ============================================================================
   IL CANE
   Una sola routine parametrica disegna Wurstel e tutti i suoi amici: cambiano
   lunghezza del corpo, altezza delle zampe, orecchie, colori e accessorio.
   Così la collezione può crescere all'infinito senza disegnare nulla a mano.
   ========================================================================== */

export const WURSTEL = {
  lungo: 118, altoZampe: 26, orecchie: 'lunghe',
  pelo: '#b5763f', peloScuro: '#8a5228', pancia: '#e8bd88',
  muso: '#f4dcbb', collare: '#e05c5c', macchie: 0, seme: 7,
};

export function caneSvg(opzioni = {}) {
  const o = { ...WURSTEL, ...opzioni };
  const casuale = rng(o.seme);

  const bx0 = 58, bx1 = 58 + o.lungo;      // corpo: da sinistra a destra
  const by0 = 62, by1 = 114;               // corpo: dall'alto in basso
  const suolo = by1 + o.altoZampe;
  const tx = bx1 + 22, ty = 74;            // centro della testa
  const mx = tx + 24, my = 88;             // centro del muso
  const nx = mx + 16, ny = 84;             // naso
  const W = nx + 18, H = suolo + 12;

  const clip = nuovoId('corpo');
  const gCorpo = nuovoId('pelo');
  const gTesta = nuovoId('testa');
  const corpoD =
    `M ${bx0} ${by0} H ${bx1} A 26 26 0 0 1 ${bx1} ${by1} ` +
    `H ${bx0} A 26 26 0 0 1 ${bx0} ${by0} Z`;

  const zampa = (x, colore) =>
    `<rect class="w-zampa" x="${x}" y="${by1 - 14}" width="18" height="${o.altoZampe + 16}"
           rx="9" fill="${colore}"/>`;

  const orecchio = () => {
    if (o.orecchie === 'ritte') {
      return `<path class="w-orecchio" fill="${o.peloScuro}"
        d="M ${tx - 16} ${ty - 22} L ${tx - 26} ${ty - 58} L ${tx + 4} ${ty - 34} Z"/>`;
    }
    if (o.orecchie === 'corte') {
      return `<path class="w-orecchio" fill="${o.peloScuro}"
        d="M ${tx - 20} ${ty - 20} C ${tx - 40} ${ty - 18} ${tx - 40} ${ty + 12} ${tx - 20} ${ty + 14}
           C ${tx - 10} ${ty + 12} ${tx - 8} ${ty - 16} ${tx - 20} ${ty - 20} Z"/>`;
    }
    /* Le orecchie del bassotto: lunghe, morbide, appese. */
    return `<path class="w-orecchio" fill="${o.peloScuro}"
      d="M ${tx - 18} ${ty - 22} C ${tx - 46} ${ty - 12} ${tx - 44} ${ty + 34} ${tx - 22} ${ty + 40}
         C ${tx - 6} ${ty + 42} ${tx - 4} ${ty + 4} ${tx - 8} ${ty - 20} Z"/>`;
  };

  const macchie = [];
  for (let i = 0; i < o.macchie; i++) {
    const cx = bx0 + 22 + casuale() * (o.lungo - 44);
    const cy = by0 + 12 + casuale() * 32;
    const r = 9 + casuale() * 9;
    macchie.push(`<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.82}"
                   fill="${o.peloScuro}" opacity=".85"/>`);
  }

  const accessorio = o.accessorio === 'papillon'
    ? `<path d="M ${bx1 - 4} ${by1 - 6} l -16 -11 v 22 z M ${bx1 - 4} ${by1 - 6} l 16 -11 v 22 z"
             fill="${o.collare}"/>
       <circle cx="${bx1 - 4}" cy="${by1 - 6}" r="5" fill="${o.collare}" />`
    : o.accessorio === 'bandana'
    ? `<path d="M ${bx1 - 16} ${by0 + 6} h 30 l -15 34 z" fill="${o.collare}"/>`
    : `<rect x="${bx1 - 12}" y="${by0 + 2}" width="15" height="50" rx="7" fill="${o.collare}"/>
       <circle cx="${bx1 - 4}" cy="${by0 + 54}" r="7" fill="#f6c944"/>`;

  return `
<svg class="cane" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="un cagnolino">
  <defs>
    <linearGradient id="${gCorpo}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="${verso(o.pelo, 'chiaro', .20)}"/>
      <stop offset=".52" stop-color="${o.pelo}"/>
      <stop offset="1"   stop-color="${verso(o.pelo, 'scuro', .17)}"/>
    </linearGradient>
    <radialGradient id="${gTesta}" cx="34%" cy="26%" r="80%">
      <stop offset="0"   stop-color="${verso(o.pelo, 'chiaro', .26)}"/>
      <stop offset=".58" stop-color="${o.pelo}"/>
      <stop offset="1"   stop-color="${verso(o.pelo, 'scuro', .16)}"/>
    </radialGradient>
  </defs>

  <!-- l'ombra a terra: senza, il cane galleggia -->
  <ellipse cx="${(bx0 + bx1) / 2 + 10}" cy="${suolo + 3}" rx="${o.lungo / 2 + 26}" ry="8"
           fill="#000" opacity=".17"/>

  <!-- coda -->
  <g class="w-coda" style="transform-origin:${bx0 + 6}px ${by0 + 12}px">
    <path d="M ${bx0 + 8} ${by0 + 14} C ${bx0 - 12} ${by0 + 8} ${bx0 - 26} ${by0 - 4} ${bx0 - 30} ${by0 - 28}"
          stroke="${o.pelo}" stroke-width="13" stroke-linecap="round" fill="none"/>
    <circle cx="${bx0 - 30}" cy="${by0 - 30}" r="9" fill="${o.peloScuro}"/>
  </g>

  <!-- zampe lontane -->
  ${zampa(bx0 + 26, o.peloScuro)}
  ${zampa(bx1 - 40, o.peloScuro)}

  <!-- corpo -->
  <g class="w-corpo">
    <clipPath id="${clip}"><path d="${corpoD}"/></clipPath>
    <path d="${corpoD}" fill="url(#${gCorpo})"/>
    <g clip-path="url(#${clip})">
      <ellipse cx="${(bx0 + bx1) / 2}" cy="${by1 + 4}" rx="${o.lungo / 2 - 4}" ry="20" fill="${o.pancia}"/>
      ${macchie.join('')}
      <!-- il colletto d'ombra dove il corpo sparisce dietro la testa -->
      <ellipse cx="${bx1 + 4}" cy="${(by0 + by1) / 2}" rx="20" ry="34" fill="#000" opacity=".13"/>
    </g>
  </g>

  ${accessorio}

  <!-- zampe vicine -->
  ${zampa(bx0 + 10, o.pelo)}
  ${zampa(bx1 - 24, o.pelo)}

  <!-- testa -->
  <g class="w-testa" style="transform-origin:${bx1}px ${by1 - 10}px">
    <ellipse cx="${tx}" cy="${ty}" rx="31" ry="29" fill="url(#${gTesta})"/>
    <ellipse cx="${tx - 4}" cy="${ty + 13}" rx="12" ry="7" fill="#ff8fa3" opacity=".2"/>
    <ellipse cx="${mx}" cy="${my}" rx="23" ry="16" fill="${o.muso}"/>
    <ellipse cx="${mx}" cy="${my + 6}" rx="20" ry="10" fill="#000" opacity=".07"/>
    <ellipse cx="${nx}" cy="${ny}" rx="8" ry="7" fill="#3b2b24"/>
    <ellipse cx="${nx - 2}" cy="${ny - 2.5}" rx="3" ry="2" fill="#fff" opacity=".33"/>
    <path d="M ${nx - 3} ${ny + 7} q -6 8 -13 3" stroke="#3b2b24" stroke-width="3"
          stroke-linecap="round" fill="none"/>

    <g class="w-occhio">
      <circle cx="${tx + 9}" cy="${ty - 5}" r="6" fill="#2f231e"/>
      <circle cx="${tx + 11}" cy="${ty - 7}" r="2.1" fill="#fff"/>
    </g>
    <path class="w-occhio-chiuso" d="M ${tx + 3} ${ty - 5} q 6 6 12 0"
          stroke="#2f231e" stroke-width="3" stroke-linecap="round" fill="none"/>

    ${orecchio()}
  </g>

  <!-- zzz del sonno -->
  <g class="w-sonno">
    <text x="${tx + 6}" y="${ty - 40}" font-size="20" font-weight="700" fill="var(--inchiostro-tenue)">z</text>
    <text x="${tx + 24}" y="${ty - 54}" font-size="15" font-weight="700" fill="var(--inchiostro-tenue)">z</text>
  </g>
</svg>`;
}

/* ============================================================================
   I PEZZI DEL MATCH-3
   Sei tipi, ognuno con una FORMA propria oltre che un colore: si distinguono
   anche a colpo d'occhio, anche con gli occhi stanchi, anche da lontano.
   ========================================================================== */

/* I sei tipi, nell'ordine, già con l'articolo: servono a scrivere gli
   obiettivi in italiano corrente ("Raccogli gli ossi", "Raccogli le palline"). */
export const PEZZI_AL_PLURALE = ['gli ossi', 'le impronte', 'le palline', 'le ciotole', 'i cuori', 'le stelle'];

function corpoPezzo(tipo) {
  /* Il riempimento è il gradiente condiviso: una sola sorgente di luce per
     tutto il pezzo, non una per ogni cerchietto che lo compone. */
  const c = `url(#g${tipo})`, s = `var(--p${tipo}-s)`;
  const linea = `fill="${c}" stroke="${s}" stroke-width="3.6" stroke-linejoin="round"`;

  switch (tipo) {
    case 0: // osso
      return `<g ${linea}>
        <rect x="26" y="38" width="48" height="24" rx="12"/>
        <circle cx="28" cy="36" r="14"/><circle cx="28" cy="64" r="14"/>
        <circle cx="72" cy="36" r="14"/><circle cx="72" cy="64" r="14"/>
      </g>
      <rect x="26" y="41.5" width="48" height="17" rx="8.5" fill="${c}"/>
      <rect x="30" y="60" width="40" height="14" rx="7" fill="url(#fondoscuro)" opacity=".55"/>`;

    case 1: // impronta
      return `<g ${linea}>
        <ellipse cx="50" cy="67" rx="24" ry="19"/>
        <ellipse cx="26" cy="42" rx="10" ry="12.5"/>
        <ellipse cx="42" cy="31" rx="10.5" ry="13.5"/>
        <ellipse cx="60" cy="31" rx="10.5" ry="13.5"/>
        <ellipse cx="76" cy="42" rx="10" ry="12.5"/>
      </g>
      <ellipse cx="50" cy="72" rx="20" ry="12" fill="url(#fondoscuro)" opacity=".5"/>`;

    case 2: // pallina da tennis
      return `<circle cx="50" cy="50" r="31" ${linea}/>
        <circle cx="50" cy="58" r="27" fill="url(#fondoscuro)" opacity=".55"/>
        <path d="M22 30 q16 20 0 40 M78 30 q-16 20 0 40"
              fill="none" stroke="#fffdf6" stroke-width="4" stroke-linecap="round" opacity=".82"/>`;

    case 3: // ciotola
      return `<g ${linea}>
        <path d="M19 45 H81 L71 76 Q50 87 29 76 Z"/>
        <ellipse cx="50" cy="45" rx="31" ry="9"/>
      </g>
      <ellipse cx="50" cy="45.5" rx="23" ry="5.4" fill="${s}"/>
      <ellipse cx="50" cy="44" rx="23" ry="5.4" fill="#000" opacity=".22"/>
      <path d="M31 70 Q50 80 69 70 L71 76 Q50 87 29 76 Z" fill="url(#fondoscuro)" opacity=".7"/>`;

    case 4: // cuore
      return `<path ${linea}
        d="M50 82 C18 60 14 37 29 26 C40 18 50 27 50 35 C50 27 60 18 71 26 C86 37 82 60 50 82 Z"/>
      <path d="M50 82 C32 70 22 58 19 47 C26 66 36 74 50 82 Z" fill="url(#fondoscuro)" opacity=".45"/>`;

    default: // stella
      return `<path ${linea}
        d="M50 17 L61 40 L86 43 L68 61 L72 86 L50 74 L28 86 L32 61 L14 43 L39 40 Z"/>
      <path d="M50 74 L72 86 L68 61 Z" fill="url(#fondoscuro)" opacity=".5"/>`;
  }
}

/* Il riflesso in alto a sinistra: è quello che fa sembrare i pezzi oggetti
   veri e non figure piatte. Sfumato, non un'ellisse opaca: un riflesso ha un
   bordo morbido, altrimenti sembra una macchia di vernice. */
const RIFLESSO = `
  <ellipse cx="37" cy="27" rx="14.5" ry="8.5" fill="url(#lucido)"
           transform="rotate(-24 37 27)"/>
  <ellipse cx="33" cy="24" rx="5.5" ry="3.2" fill="#fff" opacity=".55"
           transform="rotate(-24 33 24)"/>`;

function decorazioneSpeciale(speciale) {
  if (speciale === 'riga' || speciale === 'colonna') {
    const ruota = speciale === 'colonna' ? ' transform="rotate(90 50 50)"' : '';
    return `<g${ruota}>
      <rect x="0" y="40" width="100" height="20" rx="10" fill="#fff" opacity=".34"/>
      <path d="M20 42 L8 50 L20 58 M80 42 L92 50 L80 58"
            fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`;
  }
  if (speciale === 'bomba') {
    return `<circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-width="5"
              stroke-dasharray="10 8" opacity=".85">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50"
                          dur="6s" repeatCount="indefinite"/>
      </circle>`;
  }
  return '';
}

export function pezzoSvg(tipo, speciale = null) {
  if (speciale === 'arcobaleno') {
    const g = nuovoId('arco');
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stop-color="#ffd34d"/>
          <stop offset=".35" stop-color="#ff8fa3"/>
          <stop offset=".65" stop-color="#8fd1ff"/>
          <stop offset="1"   stop-color="#9ad84f"/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#${g})" opacity=".28"/>
      <g fill="url(#${g})" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">
        <rect x="26" y="38" width="48" height="24" rx="12"/>
        <circle cx="28" cy="36" r="14"/><circle cx="28" cy="64" r="14"/>
        <circle cx="72" cy="36" r="14"/><circle cx="72" cy="64" r="14"/>
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#${g})" stroke-width="4" opacity=".9">
        <animate attributeName="opacity" values=".35;1;.35" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </svg>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${corpoPezzo(tipo)}${RIFLESSO}${decorazioneSpeciale(speciale)}
  </svg>`;
}

/* ============================================================================
   LE FOGLIE
   Stanno sotto le tessere, quindi devono farsi vedere senza rubare la scena:
   verde spento, contorni morbidi, nessun dettaglio che competa con i pezzi.
   Due strati si distinguono per densità, non solo per tinta — anche di sera,
   anche con gli occhi stanchi.
   ========================================================================== */

const FOGLIOLINA = 'M0 -17 C 12 -10 15 5 0 17 C -15 5 -12 -10 0 -17 Z';

export function fogliaSvg(strati = 1) {
  const doppia = strati >= 2;
  const tinta = doppia ? 'var(--foglia-scura)' : 'var(--foglia)';
  const foglia = (x, y, gradi, scala) =>
    `<path d="${FOGLIOLINA}" fill="#fff" opacity="${doppia ? .2 : .16}"
           transform="translate(${x} ${y}) rotate(${gradi}) scale(${scala})"/>`;

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="3" y="3" width="94" height="94" rx="26" fill="${tinta}" opacity="${doppia ? .95 : .8}"/>
    ${foglia(32, 34, -28, 1.05)}
    ${foglia(66, 44, 22, .9)}
    ${foglia(46, 70, -6, .8)}
    ${doppia ? `<rect x="9" y="9" width="82" height="82" rx="21" fill="none"
                      stroke="var(--foglia)" stroke-width="5" opacity=".85"/>` : ''}
  </svg>`;
}

/* ============================================================================
   I BISCOTTI DEI BARATTOLI
   ========================================================================== */

export const COLORI_BISCOTTO = [
  '#ff6b6b', '#5cc0f2', '#9ad84f', '#ffd34d', '#b98ff0', '#ff8fa3',
  '#4ecdc4', '#ff9f45', '#7d92f0', '#e0e0e0', '#c96f9e', '#8ec07c',
];

export function biscottoSvg(colore) {
  const c = COLORI_BISCOTTO[colore % COLORI_BISCOTTO.length];
  return `<svg viewBox="0 0 100 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="${c}" stroke="rgb(0 0 0 / .3)" stroke-width="3" stroke-linejoin="round">
      <rect x="20" y="12" width="60" height="24" rx="12"/>
      <circle cx="22" cy="14" r="12"/><circle cx="22" cy="34" r="12"/>
      <circle cx="78" cy="14" r="12"/><circle cx="78" cy="34" r="12"/>
    </g>
    <!-- fondo in ombra e cresta lucida: due strisce, e il biscotto ha spessore -->
    <rect x="14" y="28" width="72" height="18" rx="9" fill="url(#fondoscuro)" opacity=".6"/>
    <rect x="26" y="13" width="48" height="10" rx="5" fill="url(#lucido)"/>
  </svg>`;
}

/* ============================================================================
   ICONE DELLE CARTE NELL'HUB
   ========================================================================== */

export function arteMatch3() {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(6 6) scale(.52)">${corpoPezzo(1)}</g>
    <g transform="translate(62 6) scale(.52)">${corpoPezzo(0)}</g>
    <g transform="translate(6 62) scale(.52)">${corpoPezzo(3)}</g>
    <g transform="translate(62 62) scale(.52)">${corpoPezzo(2)}</g>
  </svg>`;
}

export function arteBarattoli() {
  const vetro = (x, pieni) => {
    let dentro = '';
    for (let i = 0; i < pieni.length; i++) {
      dentro += `<rect x="${x + 5}" y="${96 - (i + 1) * 18}" width="24" height="16" rx="7"
                       fill="${COLORI_BISCOTTO[pieni[i]]}"/>`;
    }
    return `${dentro}
      <rect x="${x}" y="26" width="34" height="72" rx="14" fill="none"
            stroke="rgb(255 255 255 / .5)" stroke-width="4"/>`;
  };
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${vetro(8, [0, 0, 1])}${vetro(48, [2, 2])}${vetro(88, [1, 3, 3, 0])}
  </svg>`;
}
