/* ============================================================================
   art.js — tutto il disegno del gioco, in SVG scritto a mano.
   Niente immagini da scaricare: resta nitido su qualsiasi schermo, pesa nulla
   e ogni pezzo può essere animato dal CSS.
   ========================================================================== */

let contatoreId = 0;
const nuovoId = (p) => `${p}${++contatoreId}`;

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
    <path d="${corpoD}" fill="${o.pelo}"/>
    <g clip-path="url(#${clip})">
      <ellipse cx="${(bx0 + bx1) / 2}" cy="${by1 + 4}" rx="${o.lungo / 2 - 4}" ry="20" fill="${o.pancia}"/>
      ${macchie.join('')}
    </g>
  </g>

  ${accessorio}

  <!-- zampe vicine -->
  ${zampa(bx0 + 10, o.pelo)}
  ${zampa(bx1 - 24, o.pelo)}

  <!-- testa -->
  <g class="w-testa" style="transform-origin:${bx1}px ${by1 - 10}px">
    <ellipse cx="${tx}" cy="${ty}" rx="31" ry="29" fill="${o.pelo}"/>
    <ellipse cx="${mx}" cy="${my}" rx="23" ry="16" fill="${o.muso}"/>
    <ellipse cx="${nx}" cy="${ny}" rx="8" ry="7" fill="#3b2b24"/>
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
  const c = `var(--p${tipo})`, s = `var(--p${tipo}-s)`;
  const linea = `fill="${c}" stroke="${s}" stroke-width="4" stroke-linejoin="round"`;

  switch (tipo) {
    case 0: // osso
      return `<g ${linea}>
        <rect x="26" y="38" width="48" height="24" rx="12"/>
        <circle cx="28" cy="36" r="14"/><circle cx="28" cy="64" r="14"/>
        <circle cx="72" cy="36" r="14"/><circle cx="72" cy="64" r="14"/>
      </g>
      <rect x="26" y="42" width="48" height="16" rx="8" fill="${c}"/>`;

    case 1: // impronta
      return `<g ${linea}>
        <ellipse cx="50" cy="67" rx="24" ry="19"/>
        <ellipse cx="26" cy="42" rx="10" ry="12.5"/>
        <ellipse cx="42" cy="31" rx="10.5" ry="13.5"/>
        <ellipse cx="60" cy="31" rx="10.5" ry="13.5"/>
        <ellipse cx="76" cy="42" rx="10" ry="12.5"/>
      </g>`;

    case 2: // pallina da tennis
      return `<circle cx="50" cy="50" r="31" ${linea}/>
        <path d="M22 30 q16 20 0 40 M78 30 q-16 20 0 40"
              fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;

    case 3: // ciotola
      return `<g ${linea}>
        <path d="M19 45 H81 L71 76 Q50 87 29 76 Z"/>
        <ellipse cx="50" cy="45" rx="31" ry="9"/>
      </g>
      <ellipse cx="50" cy="45" rx="24" ry="5.5" fill="${s}" opacity=".55"/>`;

    case 4: // cuore
      return `<path ${linea}
        d="M50 82 C18 60 14 37 29 26 C40 18 50 27 50 35 C50 27 60 18 71 26 C86 37 82 60 50 82 Z"/>`;

    default: // stella
      return `<path ${linea}
        d="M50 17 L61 40 L86 43 L68 61 L72 86 L50 74 L28 86 L32 61 L14 43 L39 40 Z"/>`;
  }
}

/* Il riflesso in alto a sinistra: è quello che fa sembrare i pezzi oggetti
   veri e non figure piatte. */
const RIFLESSO = `<ellipse cx="36" cy="27" rx="13" ry="8"
  fill="#fff" opacity=".3" transform="rotate(-24 36 27)"/>`;

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
   I BISCOTTI DEI BARATTOLI
   ========================================================================== */

export const COLORI_BISCOTTO = [
  '#ff6b6b', '#5cc0f2', '#9ad84f', '#ffd34d', '#b98ff0', '#ff8fa3',
  '#4ecdc4', '#ff9f45', '#7d92f0', '#e0e0e0', '#c96f9e', '#8ec07c',
];

export function biscottoSvg(colore) {
  const c = COLORI_BISCOTTO[colore % COLORI_BISCOTTO.length];
  return `<svg viewBox="0 0 100 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g fill="${c}" stroke="rgb(0 0 0 / .28)" stroke-width="3" stroke-linejoin="round">
      <rect x="20" y="12" width="60" height="24" rx="12"/>
      <circle cx="22" cy="14" r="12"/><circle cx="22" cy="34" r="12"/>
      <circle cx="78" cy="14" r="12"/><circle cx="78" cy="34" r="12"/>
    </g>
    <rect x="24" y="16" width="52" height="8" rx="4" fill="#fff" opacity=".28"/>
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
