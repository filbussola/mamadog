/* ============================================================================
   tools/servi.mjs — server statico per provare il gioco sul computer.
   Serve un `http://` vero: con `file://` i moduli e il service worker non
   partono. `npm run servi`, poi http://localhost:8080
   ========================================================================== */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = fileURLToPath(new URL('..', import.meta.url));
const PORTA = Number(process.env.PORTA) || 8080;

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

createServer(async (req, res) => {
  const percorso = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const relativo = normalize(percorso === '/' ? '/index.html' : percorso).replace(/^[\\/]+/, '');
  const file = join(RADICE, relativo);

  if (!file.startsWith(RADICE)) { res.writeHead(403).end('No'); return; }

  try {
    const contenuto = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TIPI[extname(file).toLowerCase()] || 'application/octet-stream',
      /* Niente cache durante lo sviluppo: si ricarica e si vede la modifica. */
      'Cache-Control': 'no-store',
    });
    res.end(contenuto);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Non trovato');
  }
}).listen(PORTA, () => console.log(`In ascolto su http://localhost:${PORTA}`));
