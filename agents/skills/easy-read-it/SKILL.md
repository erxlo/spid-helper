---
name: easy-read-it
description: Regole di scrittura in linguaggio facile da leggere (Easy Read) per i testi guida dell'estensione SPID Helper, rivolti a persone anziane con bassa alfabetizzazione digitale. Usare questa skill ogni volta che si scrive o rivede un testo che l'utente leggerà in app (titoli di step, istruzioni, messaggi di errore/blocco, suggerimenti).
---

# Easy Read IT — linguaggio facile da leggere per anziani

Questa skill definisce **come scrivere ogni testo visibile all'utente**
nell'estensione SPID Helper (step del percorso, messaggi di aiuto, messaggi
di blocco/errore in `app/data/steps.js` e simili). Si applica a tutti i
testi in italiano rivolti all'utente finale, non alla documentazione tecnica
per sviluppatori.

Il destinatario è definito in [agents/instructions/CLAUDE.md](../../instructions/CLAUDE.md)
(sezione "Profilo utente target"): persona 65+, bassa confidenza digitale,
alla prima esperienza di login SPID. Ogni frase va scritta pensando a questa
persona, non a un utente medio.

## Regole obbligatorie

1. **Una sola istruzione per frase.**
   Mai unire due azioni nella stessa frase con "e", virgole o subordinate.
   Se servono due azioni, sono due frasi separate (o due step separati).

2. **Frasi sotto le 20 parole.**
   Meglio molto più corte. Se una frase supera le 20 parole, va spezzata.

3. **Niente gergo tecnico non spiegato.**
   Parole come "autenticazione", "browser", "credenziali", "identity
   provider", "OTP", "redirect", "sessione" non vanno usate da sole. Se il
   concetto è indispensabile, sostituirlo con una parola comune (es.
   "accesso" invece di "autenticazione", "l'app o il sito" invece di
   "browser", "nome utente e password" invece di "credenziali") oppure
   spiegarlo subito con parole semplici nella stessa frase.

4. **Verbi all'imperativo diretto.**
   Scrivere "Apri l'app", non "Si consiglia di aprire l'app" o "È necessario
   aprire l'app". Niente forme impersonali, niente condizionale, niente
   passivo. Il testo dà un comando chiaro, non un suggerimento.

5. **Un'unica azione fisica concreta per ogni passo.**
   Ogni step del percorso descrive una sola azione che l'utente compie con le
   mani/occhi in quel momento (es. "tocca questo pulsante", "digita il
   codice"), non un concetto o uno stato del sistema. Se un passo del sistema
   richiede più azioni dell'utente, va diviso in più step.

### Regole aggiuntive di supporto

- Frasi affermative, non negative quando possibile ("Aspetta qui" invece di
  "Non uscire da questa pagina").
- Un'idea per riga quando il testo ha più righe.
- Numeri scritti in cifre ("2 minuti", non "due minuti") per lettura rapida.
- Nessuna abbreviazione o sigla senza spiegazione ("SPID" va bene perché è
  nel nome del progetto ed è già noto all'utente target, ma "IdP", "CIE",
  "CNS" vanno evitati o sostituiti con "il tuo gestore").
- Tono rassicurante, mai colpevolizzante: se l'utente ha sbagliato, il testo
  descrive cosa fare ora, non cosa ha fatto di sbagliato.

## Immagini semplici e stilizzate

Dove un'icona può sostituire o rinforzare una parola astratta, aggiungerla.
Regole per le immagini:

- Stile **semplice e stilizzato** (icona a linee, tipo pittogramma), mai
  foto o screenshot realistici: un'icona realistica di un'interfaccia che
  cambia spesso disorienta più di un pittogramma stabile.
- Una sola icona per passo, posizionata vicino al verbo d'azione.
- L'icona rinforza l'azione (es. un dito che tocca un pulsante), non decora
  il testo.
- Mai usare un'icona al posto del testo: icona e testo vanno sempre insieme.

## Esempi prima / dopo

### Esempio 1 — selezione del gestore SPID

**Prima (da evitare):**
> Si consiglia di selezionare il proprio Identity Provider SPID dall'elenco
> visualizzato e successivamente di procedere con l'autenticazione tramite
> le proprie credenziali.

**Dopo (Easy Read):**
> Guarda l'elenco dei gestori SPID.
> Tocca il nome del tuo gestore.
>
> 🖐️👉 *(icona: dito che tocca un elemento in un elenco)*

Perché funziona: due frasi, due azioni separate ("guarda" / "tocca"),
niente "Identity Provider" né "autenticazione", imperativo diretto, un'icona
che rinforza l'azione fisica (toccare).

### Esempio 2 — inserimento della password

**Prima (da evitare):**
> Inserire le credenziali di accesso nel browser facendo attenzione a non
> condividerle con nessuno, dopodiché cliccare su "Accedi".

**Dopo (Easy Read):**
> Scrivi la tua password qui sotto.
>
> ✍️🔒 *(icona: matita sopra un lucchetto)*
>
> Tocca il pulsante "Accedi".
>
> 🖐️▶️ *(icona: dito che tocca un pulsante)*

Perché funziona: "credenziali" e "browser" sono spariti, sostituiti da
"password" e "qui sotto"; la raccomandazione sulla sicurezza non viene
infilata nella stessa frase dell'azione; ogni passo è una sola azione fisica
(scrivere, poi toccare).

### Esempio 3 — messaggio di blocco/attesa

**Prima (da evitare):**
> Il sistema sta elaborando la richiesta di autenticazione tramite il
> gestore selezionato: in caso di mancata ricezione della notifica push
> entro 2 minuti si suggerisce di verificare la connessione dati del
> dispositivo mobile.

**Dopo (Easy Read):**
> Aspetta un messaggio sul tuo telefono.
>
> 📱⏳ *(icona: telefono con un orologio/clessidra)*
>
> Se non arriva niente dopo 2 minuti, tocca qui.
>
> 🖐️❓ *(icona: dito che tocca un punto interrogativo)*

Perché funziona: "elaborando la richiesta di autenticazione" e "gestore
selezionato" sono eliminati; la condizione temporale è isolata in una frase
breve e concreta; l'azione richiesta in caso di blocco è un singolo gesto
("tocca qui"), non una diagnosi tecnica da fare da soli.

## Checklist rapida prima di pubblicare un testo

- [ ] Ogni frase ha una sola istruzione?
- [ ] Nessuna frase supera le 20 parole?
- [ ] Nessuna parola tecnica non spiegata?
- [ ] Tutti i verbi sono imperativi diretti?
- [ ] Ogni step descrive un'unica azione fisica?
- [ ] Dove serve, c'è un'icona semplice e stilizzata accanto al testo?

Se anche una sola risposta è "no", riscrivere il testo prima di inserirlo in
`app/data/steps.js`.
