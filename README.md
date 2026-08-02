# La cuccia di Wurstel 🐕

Due giochi tranquilli per iPad, con un bassotto di nome Wurstel che fa da
padrone di casa. **Niente pubblicità, niente account, niente costi, niente
timer, niente vite.** Si apre, si gioca, si chiude quando si vuole.

- **Ossi e impronte** — un match-3 alla Candy Crush, ma senza limiti di mosse
  e senza "livello fallito": si va avanti finché l'obiettivo è raggiunto.
  In certi livelli il tavolo è coperto di **foglie** da liberare facendo le
  mosse sopra di esse: è l'unico ostacolo, e non blocca né incastra mai nulla.
- **I barattoli** — biscotti colorati da ordinare travasandoli. Ogni livello è
  verificato risolvibile prima di comparire, e si annulla quante volte si vuole.

Un nuovo amico arriva nella cuccia ogni cinque livelli. Livelli e amici sono
generati: non finiscono mai.

## Il salvataggio di riserva

La memoria del browser non è per sempre: un ripristino del tablet, un "cancella
dati siti" dato per sbaglio, un cambio di iPad, e mesi di cagnolini sparirebbero
senza rimedio. In **Impostazioni** c'è un codice corto — tipo
`WURSTEL-1-14-9-512-23-2-2G` — da copiare e tenere in una nota o in un
messaggio: rimette livelli, amici, biscotti e preferenze com'erano.

Nel codice non finisce la partita in corso, ma solo quello a cui ci si
affeziona. È la scelta che lo tiene lungo venti caratteri invece che mille,
abbastanza corto da poterlo perfino ridigitare a mano. Ripristinando, la
partita a metà ricomincia dall'inizio del suo livello: è l'unica cosa che si
perde, e non vale niente.

## Le cinque regole di design

Sono la ragione per cui questo gioco esiste; ogni scelta tecnica ci si piega.

1. **Non si può perdere.** Nessun timer, nessuna vita, nessuna energia. Se nel
   match-3 finiscono le mosse, il tavolo si rimescola da solo.
2. **Si riprende sempre da dove si era.** Salvataggio a ogni mossa.
3. **Zero attrito.** Nessun login, nessun tutorial, nessun popup.
4. **Occhi e dita di chi gioca la sera.** Testo grande, bottoni da 60px, pezzi
   distinguibili per forma oltre che per colore, tema scuro caldo.
5. **Una zampa d'aiuto, mai un rimprovero.** Dopo 8 secondi di calma una mossa
   valida pulsa piano. Wurstel incoraggia e non sgrida mai.

## Provarlo sul computer

Serve un `http://` vero: con `file://` i moduli e il service worker non partono.

```bash
npm run servi
```

Poi si apre <http://localhost:8080>.

Altri due comandi:

```bash
npm run prova
```

Controlla i due motori: pezzi speciali, cascate, stallo e rimescolo del
match-3, e **mille livelli dei barattoli generati e risolti** da un risolutore
vero. Nessuna dipendenza, gira in un paio di secondi.

```bash
npm run icone
```

Ridisegna le icone PNG (`icons/`) partendo dal codice in `tools/genera-icone.mjs`.
Va rilanciato solo se si cambia il musetto.

## Metterlo sull'iPad

### 1. Pubblicare (una volta sola)

Serve un repository **pubblico** su GitHub — Pages è gratis solo così. Nel
codice non c'è niente di personale.

```bash
git remote add origin https://github.com/TUO-UTENTE/mamadog.git
git branch -M main
git push -u origin main
```

Poi su GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Dopo un paio di minuti il gioco è su `https://TUO-UTENTE.github.io/mamadog/`.

### 2. Installare (una volta sola, meglio farlo tu)

Sull'iPad, **con Safari** (solo Safari sa aggiungere alla schermata Home):

1. aprire il link
2. toccare **Condividi** (il quadrato con la freccia)
3. **Aggiungi a Home**

Compare l'icona col musetto di Wurstel, accanto agli altri giochi. Da lì il
gioco si apre a schermo intero, senza barra di Safari, **e funziona anche
senza internet**.

### 3. Aggiornarlo, dopo

Basta cambiare il numero di versione in `sw.js`:

```js
const VERSIONE = 'wurstel-v2';
```

e fare `git push`. Alla riapertura successiva il gioco si aggiorna da solo,
in silenzio, senza chiedere niente a nessuno. **Se ci si dimentica di cambiare
quel numero, l'aggiornamento non arriva mai**: è l'unica cosa da ricordare.

## Come è fatto

HTML, CSS e JavaScript a moduli. **Nessun framework, nessuna dipendenza,
nessuna compilazione**: si serve come file statici e fra tre anni funzionerà
identico. Tutta la grafica è SVG scritto a mano e tutti i suoni sono
sintetizzati dal vivo con la Web Audio API, quindi non c'è nemmeno un'immagine
o un mp3 da scaricare.

```
index.html            unica pagina: le schermate stanno tutte qui
manifest.webmanifest  ciò che rende l'icona un'app
sw.js                 service worker: è lui a farla funzionare offline
css/                  base (tema, tipografia) + una per schermata
js/
  main.js             accensione, stranezze di Safari, schermo sempre acceso
  store.js            salvataggio in localStorage, versionato
  art.js              tutto il disegno: Wurstel, i pezzi, i biscotti
  wurstel.js          gli stati d'animo della mascotte
  audio.js            i suoni, sintetizzati
  ui.js               router delle schermate, pannelli, coriandoli
  hub.js              casa, cuccia degli amici, impostazioni
  amici.js            la collezione: cagnolini generati all'infinito
  match3/  engine.js (regole) · levels.js (obiettivi) · view.js (ciò che si tocca)
  barattoli/  engine.js · generator.js (con risolutore) · view.js
tools/                prove, server locale, generatore di icone
```

Il motore e la vista sono separati con cura: `engine.js` non tocca mai il DOM
e restituisce una lista di *passi* ("ho tolto queste caselle", "queste sono
cadute così") che la vista anima con i suoi tempi. È ciò che permette di
curare le cascate senza rischiare di rompere le regole.

## Cosa manca di proposito

Niente classifiche, niente condivisione, niente statistiche, niente notifiche,
niente monete da comprare. Ognuna di queste cose aggiungerebbe pressione a un
gioco il cui unico scopo è toglierla.
