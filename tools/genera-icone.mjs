/* ============================================================================
   tools/genera-icone.mjs — le icone dell'app, disegnate qui dentro.
   Nessuna libreria: un piccolo rasterizzatore di ellissi con antialiasing e
   un encoder PNG scritto a mano (zlib è già dentro Node). Si lancia una volta
   sola, i PNG finiscono in icons/ e si versionano insieme al resto.

       npm run icone
   ========================================================================== */

import { deflateSync } from 'node:zlib';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const CARTELLA = fileURLToPath(new URL('../icons/', import.meta.url));

/* --------------------------------------------------------------- PNG ------ */

const FIRMA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const TAVOLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TAVOLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function blocco(tipo, dati) {
  const testa = Buffer.alloc(4);
  testa.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const coda = Buffer.alloc(4);
  coda.writeUInt32BE(crc32(corpo));
  return Buffer.concat([testa, corpo, coda]);
}

function inPng(lato, rgba) {
  /* Ogni riga è preceduta dal byte del filtro: 0 = nessun filtro. */
  const righe = Buffer.alloc((lato * 4 + 1) * lato);
  for (let y = 0; y < lato; y++) {
    righe[y * (lato * 4 + 1)] = 0;
    rgba.copy(righe, y * (lato * 4 + 1) + 1, y * lato * 4, (y + 1) * lato * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8;   // 8 bit per canale
  ihdr[9] = 6;   // RGBA
  return Buffer.concat([
    FIRMA,
    blocco('IHDR', ihdr),
    blocco('IDAT', deflateSync(righe, { level: 9 })),
    blocco('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------ disegno ----- */

const tinta = (esa) => [
  parseInt(esa.slice(1, 3), 16),
  parseInt(esa.slice(3, 5), 16),
  parseInt(esa.slice(5, 7), 16),
];

const CAMPIONI = 4;   // 4x4 campioni per pixel: bordi morbidi senza sforzo

/** Una tela RGBA con le sole operazioni che servono a un musetto di cane. */
function tela(lato) {
  const dati = Buffer.alloc(lato * lato * 4);

  function posa(x, y, [r, g, b], copertura) {
    if (copertura <= 0) return;
    const i = (y * lato + x) * 4;
    const a = Math.min(1, copertura);
    dati[i]     = Math.round(r * a + dati[i]     * (1 - a));
    dati[i + 1] = Math.round(g * a + dati[i + 1] * (1 - a));
    dati[i + 2] = Math.round(b * a + dati[i + 2] * (1 - a));
    dati[i + 3] = Math.round(255 * a + dati[i + 3] * (1 - a));
  }

  return {
    lato, dati,

    /* Sfondo pieno con sfumatura verticale: l'icona non ha angoli tondi
       perché a smussarla ci pensano iOS e Android, ognuno a modo suo. */
    sfondo(alto, basso) {
      const a = tinta(alto), b = tinta(basso);
      for (let y = 0; y < lato; y++) {
        const q = y / (lato - 1);
        const c = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * q);
        for (let x = 0; x < lato; x++) posa(x, y, c, 1);
      }
    },

    ellisse(cx, cy, rx, ry, gradi, esa) {
      const c = tinta(esa);
      const rad = (gradi * Math.PI) / 180;
      const cs = Math.cos(rad), sn = Math.sin(rad);
      const raggio = Math.max(rx, ry) + 2;

      const x0 = Math.max(0, Math.floor(cx - raggio)), x1 = Math.min(lato - 1, Math.ceil(cx + raggio));
      const y0 = Math.max(0, Math.floor(cy - raggio)), y1 = Math.min(lato - 1, Math.ceil(cy + raggio));

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          let dentro = 0;
          for (let sy = 0; sy < CAMPIONI; sy++) {
            for (let sx = 0; sx < CAMPIONI; sx++) {
              const px = x + (sx + 0.5) / CAMPIONI - cx;
              const py = y + (sy + 0.5) / CAMPIONI - cy;
              const u = (px * cs + py * sn) / rx;
              const v = (-px * sn + py * cs) / ry;
              if (u * u + v * v <= 1) dentro++;
            }
          }
          posa(x, y, c, dentro / (CAMPIONI * CAMPIONI));
        }
      }
    },

    /** Una curva si disegna timbrando cerchietti lungo il percorso. */
    curva(a, b, c, spessore, esa) {
      const passi = 90;
      for (let i = 0; i <= passi; i++) {
        const q = i / passi, r = 1 - q;
        this.ellisse(
          r * r * a[0] + 2 * r * q * b[0] + q * q * c[0],
          r * r * a[1] + 2 * r * q * b[1] + q * q * c[1],
          spessore, spessore, 0, esa,
        );
      }
    },
  };
}

/**
 * Il musetto di Wurstel, pensato su una tela di 512 e poi scalato.
 * `scala` rimpicciolisce il disegno, `sposta` lo ricentra: serve alla versione
 * "maskable", che Android ritaglia in tondo e vuole margine attorno.
 */
function disegnaWurstel(t, scala, sposta) {
  const S = (v) => v * scala + sposta;
  const R = (v) => v * scala;
  const e = (cx, cy, rx, ry, gradi, esa) => t.ellisse(S(cx), S(cy), R(rx), R(ry), gradi, esa);

  e(146, 306,  64, 136, -13, '#7a4a26');   // orecchio sinistro
  e(366, 306,  64, 136,  13, '#7a4a26');   // orecchio destro
  e(256, 256, 134, 126,   0, '#b5763f');   // testa
  e(198, 206,  30,  20,  -8, '#e3ab6d');   // sopracciglia focate, da bassotto
  e(314, 206,  30,  20,   8, '#e3ab6d');
  e(256, 334,  96,  64,   0, '#f4dcbb');   // muso
  e(199, 240,  23,  25,   0, '#2f231e');   // occhi
  e(313, 240,  23,  25,   0, '#2f231e');
  e(206, 231,   8,   8,   0, '#ffffff');   // e la lucina che li rende vivi
  e(320, 231,   8,   8,   0, '#ffffff');
  e(256, 308,  36,  27,   0, '#3b2b24');   // naso

  t.curva([S(256), S(336)], [S(232), S(366)], [S(206), S(348)], R(7), '#3b2b24');
  t.curva([S(256), S(336)], [S(280), S(366)], [S(306), S(348)], R(7), '#3b2b24');
}

function crea(lato, margine) {
  const t = tela(lato);
  t.sfondo('#ffc46b', '#dd8420');
  const scala = (lato / 512) * margine;
  disegnaWurstel(t, scala, (lato - 512 * scala) / 2);
  return inPng(lato, t.dati);
}

/* --------------------------------------------------------------- uscita --- */

await mkdir(CARTELLA, { recursive: true });

const daFare = [
  ['icon-180.png', 180, 1],       // apple-touch-icon: quella che finisce in Home
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.78],
];

for (const [nome, lato, margine] of daFare) {
  await writeFile(join(CARTELLA, nome), crea(lato, margine));
  console.log(`  ${nome}  (${lato}px)`);
}
console.log('\nIcone pronte in icons/\n');
