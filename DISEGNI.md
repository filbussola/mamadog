# Che cosa disegnare

Guida per produrre la grafica del gioco. Serve a te che la fai (o a chi la
commissioni, o al generatore di immagini che usi) per consegnare pezzi che
entrano nel gioco senza rilavorazioni.

Leggi prima le **tre regole** e i **due nodi**: sono le uniche cose che, se
sbagliate, costringono a rifare tutto.

## Le tre regole

1. **Leggibilità prima di bellezza.** Chi gioca ha sessant'anni, uno schermo a
   un braccio di distanza e la luce bassa. Ogni pezzo deve distinguersi per
   **forma**, non solo per colore: se stampassi il gioco in bianco e nero,
   i sei pezzi devono restare riconoscibili. È il requisito che ha la
   precedenza su tutti gli altri.
2. **Sfondo trasparente, sempre.** Niente riquadri, niente ombre incollate
   sotto, niente cornici. L'ombra la mette il gioco, e cambia col tema.
3. **Due temi.** Il gioco ha una modalità sera (scura) e una giorno (chiara).
   I disegni devono reggere su entrambi: niente contorni neri che spariscono
   di sera, niente bianchi che spariscono di giorno. Un contorno leggermente
   più scuro della tinta interna funziona sempre.

## I due nodi da sciogliere prima di cominciare

### 1. Wurstel si muove

Oggi la mascotte scodinzola, sbatte gli occhi, salta quando fai una combo e
**si addormenta** dopo un minuto che non la tocchi. Un'immagine piatta non può
farlo. Tre modi, in ordine di resa:

| Come | Cosa consegni | Resa |
|---|---|---|
| **A pezzi** (migliore) | Un SVG con corpo, testa, orecchie, coda e occhi su livelli separati e nominati | Tutte le animazioni di adesso, e meglio |
| **A pose** (consigliato se usi un generatore) | 4 immagini: *tranquillo*, *contento*, *sorpreso*, *addormentato* | Il cane cambia espressione, non si muove di continuo. Va benissimo |
| **Immagine sola** | Una sola figura | Wurstel diventa un quadro. Si perde la parte che lo rende vivo |

**Consiglio:** le quattro pose. Sono facili da ottenere anche da un generatore
e coprono tutto quello che il gioco racconta.

### 2. La collezione è infinita

I cagnolini della cuccia oggi sono **generati**: uno ogni cinque livelli, per
sempre, combinando lunghezze, orecchie, colori e accessori. Disegnandoli a mano
diventano per forza un numero finito. Tre strade:

- **Un insieme finito di 24–30 cani.** Arrivata in fondo, la collezione si
  ferma e diventa un traguardo invece che una corsa infinita. Onesto e
  semplice — è quello che consiglio.
- **A pezzi ricombinabili**: 6 corpi × 5 teste × 4 code, e restano migliaia di
  combinazioni. Più lavoro e serve coerenza di stile fra i pezzi.
- **Solo Wurstel disegnato**, la collezione resta generata. Costa zero e il
  contrasto di stile si nota poco, perché i due non stanno mai vicini.

## La lista, in ordine di quanto rende

### Vale moltissimo

| Cosa | Quanti | Misura | Note |
|---|---|---|---|
| Pezzi del match-3 | 6 | 256×256 | osso, impronta, pallina da tennis, ciotola, cuore, stella |
| Wurstel | 4 pose | 1000×700 | vedi il nodo 1 |
| Foglie | 2 | 256×256 | la macchia d'erba da liberare: strato singolo e strato doppio |

I sei pezzi sono la cosa che lei guarda per un'ora di fila: se ne fai solo una
parte, fai questi.

### Vale molto

| Cosa | Quanti | Misura | Note |
|---|---|---|---|
| Cani della collezione | 24–30 | 600×420 | vedi il nodo 2 |
| Icona dell'app | 1 | 1024×1024 | il musetto, senza angoli arrotondati: li mette il sistema |

### Lascerei stare (e ti spiego perché)

- **Barattoli e biscotti** — sono vetro e riflessi: il codice li fa già bene e
  soprattutto li fa *reagire* (si sollevano, si versano, si illuminano). Un
  disegno fisso qui peggiorerebbe.
- **Pezzi speciali** — sono i sei pezzi con sopra bagliori e frecce animate.
  Vanno costruiti sopra i tuoi disegni, non disegnati.
- **Sfondo** — oggi è luce calda che cambia col tema. Un'immagine fissa
  aumenterebbe il peso e romperebbe il tema chiaro.
- **Interfaccia** — bottoni e pannelli sono già materia e luce in CSS,
  e si adattano a ogni schermo.

## Formato

**SVG se puoi, PNG se non puoi.**

- **SVG**: tracciati, non immagini incorporate. Nessun testo, nessun font.
  `viewBox` che parte da `0 0`. È la scelta migliore: pesa pochi KB, resta
  nitido a qualsiasi ingrandimento e posso animarlo.
- **PNG**: trasparenza vera (niente bianco dietro), alla misura indicata,
  che è già il doppio di come si vede — gli schermi Apple sono a doppia
  densità.

**Peso**: tutto insieme sotto i **2 MB**. Il gioco deve restare installabile e
funzionare offline; oggi pesa 150 KB in tutto, quindi c'è margine, ma non è
infinito. Le PNG vanno passate in un compressore (TinyPNG o simile) prima di
consegnarle.

**Nomi dei file**: minuscoli, senza spazi e senza accenti — `osso.svg`,
`wurstel-contento.png`, `cane-01.png`. I server di GitHub distinguono
maiuscole e minuscole, il tuo computer no: è la causa numero uno di "in locale
funziona, online no".

## Stile

Il gioco è **caldo, morbido e serale**. Nessuno spigolo, nessun tratto
nervoso, niente di aggressivo.

- **Forme piene e arrotondate**, contorni morbidi, angoli generosi.
- **Volume, non piattezza**: luce da sinistra in alto, ombra raccolta in basso
  a destra, un riflesso lucido in alto. È ciò che fa sembrare i pezzi oggetti
  veri.
- **Contorno** leggermente più scuro della tinta interna, spesso e uniforme.
- **Niente testo dentro i disegni**: le scritte le mette il gioco, in italiano.

Palette in uso (puoi scostartene, ma resta in questa famiglia):

| | Tinta | Chiara | Scura |
|---|---|---|---|
| osso | `#f2e2c4` | `#fff8ea` | `#c39f6c` |
| impronta | `#ff8fa3` | `#ffc6d1` | `#cb5068` |
| pallina | `#9ad84f` | `#cbf28c` | `#629d25` |
| ciotola | `#5cc0f2` | `#a9e4ff` | `#2884b8` |
| cuore | `#ff6b6b` | `#ffadad` | `#c2373f` |
| stella | `#b98ff0` | `#dfc4ff` | `#7f50be` |
| Wurstel | `#b5763f` | pancia `#e8bd88` | orecchie `#8a5228` |
| ambra (accento) | `#ffb454` | | `#ff9130` |

## Se usi un generatore di immagini

Funziona, a due condizioni: **chiedere lo sfondo trasparente** e **generare i
sei pezzi in una richiesta sola**, altrimenti escono in sei stili diversi.

Una traccia che dà risultati coerenti:

> Set of 6 mobile game icons in a single consistent style: a dog bone, a paw
> print, a tennis ball, a dog food bowl, a heart, a star. Chunky rounded
> shapes, thick soft outline slightly darker than the fill, glossy highlight
> top-left, soft shadow bottom-right, warm friendly palette, flat vector
> illustration, casual puzzle game art, transparent background, centered,
> no text.

Per la mascotte:

> Cute cartoon dachshund, long body, short legs, long floppy ears, warm brown
> fur with lighter belly, red collar with a golden tag, friendly and calm
> expression, side view facing right, thick soft outline, flat vector
> illustration, transparent background, no text.

E poi la stessa richiesta cambiando solo il finale: *happy and jumping*,
*surprised with ears up*, *sleeping curled up with eyes closed*.

**Attenzione al punto debole dei generatori**: quattro immagini generate
separatamente sono quattro cani diversi. Se puoi, genera la posa *tranquillo*,
e poi chiedi le altre tre **partendo da quella immagine** (funzione di
modifica o riferimento), non da zero.

## Come me li passi

Mettili in una cartella `disegni/` dentro il progetto e dimmelo: li integro io,
sistemo misure e allineamenti e verifico che reggano su entrambi i temi e su
tutte le dimensioni di schermo.

Non serve che siano tutti insieme. **Comincia dai sei pezzi**: appena ci sono,
li monto e vediamo subito l'effetto sul tavolo, che è dove si gioca davvero.
