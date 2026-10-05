# CLAUDE.md — Istruzioni persistenti di progetto

Queste istruzioni valgono per ogni sessione di Claude Code su questo repository.
Vanno rispettate anche quando non vengono ripetute esplicitamente nel prompt.

## 1. Contesto della sfida

Progetto sviluppato per **Hagenthon — Tema 03 "Educazione Digitale Inclusiva"**.

L'obiettivo della sfida è progettare un sistema di supporto adattivo che aiuti
persone con bassa confidenza digitale a completare un percorso online reale,
riducendo frustrazione e abbandono, senza sostituirsi a consulenza professionale
e senza raccogliere o esporre dati sensibili reali.

La valutazione della sfida premia soluzioni che dimostrino **adattamento reale
all'utente** (non uno script lineare uguale per tutti) e che rendano visibile
e verificabile *come* e *perché* il sistema si adatta.

## 2. Profilo utente target

- Persona **anziana (65+)**.
- **Bassa confidenza digitale**: poca familiarità con form, popup, redirect tra
  siti, gestione di app di terze parti sullo smartphone.
- **Alla prima esperienza di login SPID**: non conosce la differenza tra
  Identity Provider (IdP), non sa cosa sia un "gestore", può confondere
  SPID/CIE/CNS, si blocca davanti a schermate inattese o tempi di attesa.
- Possibili difficoltà aggiuntive: ansia da errore ("ho sbagliato qualcosa?"),
  tendenza ad abbandonare dopo un blocco prolungato, difficoltà a interpretare
  messaggi di errore tecnici.

Ogni funzionalità progettata deve essere pensata **per questo profilo**, non
per un utente medio o esperto. In caso di dubbio tra una soluzione "elegante
ma implicita" e una "esplicita e ridondante ma rassicurante", preferire la
seconda.

## 3. Scenario concreto

Flusso di riferimento: **accesso tramite SPID al Cassetto Fiscale
dell'Agenzia delle Entrate**.

Il percorso simulato/assistito copre (almeno) le fasi tipiche:

1. Arrivo sulla pagina di login SPID del servizio (Agenzia Entrate).
2. Selezione del proprio **gestore di Identità (IdP)** tra quelli disponibili.
3. Redirect/apertura del flusso di autenticazione del gestore scelto.
4. Inserimento credenziali e, se previsto, secondo fattore (OTP, app, notifica
   push) — simulati, mai reali.
5. Eventuale blocco, errore, attesa prolungata o schermata inattesa.
6. Ritorno al servizio e accesso all'area personale (Cassetto Fiscale).

Il supporto deve essere **specifico per gestore SPID** selezionato (passaggi,
tempi e interfacce differiscono tra provider) e deve saper riconoscere quando
l'utente è **bloccato** in una fase, offrendo un feedback mirato a quella fase
specifica — non un messaggio generico.

## 4. Vincolo architetturale non negoziabile

**L'estensione/applicazione a runtime NON deve effettuare alcuna chiamata a
modelli linguistici (LLM) o API esterne di alcun tipo.**

Questo vale per tutto ciò che gira lato utente finale durante l'uso reale
dell'app:

- Nessuna chiamata a OpenAI/Anthropic/altri provider LLM.
- Nessuna chiamata di rete verso servizi esterni per decidere il
  comportamento adattivo.
- Tutta la logica di adattamento deve essere **deterministica**:
  - **Percorso personalizzato per gestore SPID**: definito da dati statici,
    non generato dinamicamente da un modello.
  - **Rilevamento del blocco**: basato su euristiche verificabili (timer,
    assenza di transizioni di stato, pattern DOM attesi non trovati, tentativi
    ripetuti sulla stessa fase), mai su inferenza probabilistica di un LLM.
  - **Feedback mirato**: testo e suggerimenti pre-scritti, selezionati da
    regole esplicite (if/switch su stato corrente, gestore selezionato,
    tempo trascorso, numero di tentativi), non generati al volo.

I dati che guidano questa logica (step del percorso, testi di aiuto, soglie
di timeout, varianti per gestore) vivono in **`app/data/steps.js`** come
struttura dati statica, letta a runtime dall'app/estensione.

Claude Code **non deve introdurre** dipendenze da SDK di modelli linguistici,
chiavi API, chiamate `fetch`/`axios` verso endpoint di inferenza AI, o
qualunque meccanismo che renda il comportamento a runtime dipendente da una
risposta di un LLM. Strumenti di IA possono essere usati in fase di
**sviluppo** (es. per scrivere i testi di `steps.js`), ma il codice che gira
nell'estensione a runtime deve restare puramente deterministico.

Se una richiesta futura sembra implicare l'uso di un LLM a runtime (es.
"genera dinamicamente il messaggio di aiuto", "fai capire all'AI se l'utente
è bloccato"), segnalarlo esplicitamente come conflitto con questo vincolo
prima di implementarlo.

## 5. Struttura di cartelle obbligatoria del repo finale

```
spid-helper/
├── app/            # Codice dell'estensione/applicazione (runtime)
│   └── data/
│       └── steps.js   # Dati statici del percorso, testi, soglie, euristiche
├── agents/         # Istruzioni e materiali per Claude Code / agenti IA
│   ├── instructions/
│   │   └── CLAUDE.md  # Questo file
│   ├── skills/
│   │   ├── easy-read-it/
│   │   │   └── SKILL.md  # Regole di scrittura Easy Read per i testi utente
│   │   ├── mv3-zero-network/
│   │   │   └── SKILL.md  # Pattern tecnici MV3 a zero chiamate di rete
│   │   └── spid-flow-mapper/
│   │       └── SKILL.md  # Guida per aggiungere/mappare un gestore SPID
│   ├── agents/
│   │   ├── content-script-agent.md  # Perimetro: app/content/*, app/data/steps.js
│   │   ├── demo-site-agent.md       # Perimetro: app/demo-site/*
│   │   ├── popup-agent.md           # Perimetro: app/popup/*
│   │   └── qa-compliance-agent.md   # Sola lettura: CLAUDE.md + tutto app/
│   └── commands/
│       ├── add-provider.md            # /add-provider <nome-gestore>
│       ├── check-theme-compliance.md  # /check-theme-compliance
│       └── pack-deliverable.md        # /pack-deliverable
├── presentation/   # Materiali di presentazione della sfida (slide, demo, note)
└── README.md       # Descrizione del progetto, setup, come provarlo
```

Non spostare né duplicare questa struttura. Nuovi file vanno collocati nella
cartella coerente con il loro ruolo (codice runtime → `app/`, materiali per
agenti/IA → `agents/`, materiali di presentazione → `presentation/`).

## 6. Scrittura dei testi utente — skill Easy Read

Ogni testo rivolto all'utente finale (titoli di step, istruzioni, messaggi
di blocco/errore, suggerimenti in `app/data/steps.js` e simili) **deve**
seguire le regole definite in
[agents/skills/easy-read-it/SKILL.md](../skills/easy-read-it/SKILL.md).

Prima di scrivere o modificare un testo visibile all'utente, invocare questa
skill e applicarne le regole (una istruzione per frase, frasi sotto le 20
parole, niente gergo tecnico non spiegato, imperativo diretto, un'unica
azione fisica per passo, icone semplici e stilizzate dove opportuno). Non
inserire un testo in `steps.js` senza aver verificato la checklist della
skill.

## 7. Implementazione tecnica — skill MV3 Zero Network

Ogni file scritto o modificato in `app/` (content script, eventuale
background/service worker, `manifest.json`) **deve** seguire i pattern
definiti in
[agents/skills/mv3-zero-network/SKILL.md](../skills/mv3-zero-network/SKILL.md).

Questa skill traduce in pattern tecnici concreti il vincolo architetturale
della sezione 4: content script che legge solo `app/data/steps.js`,
`chrome.storage.local` per i progressi (mai `localStorage`), nessun
`fetch`/`XMLHttpRequest` verso domini esterni, overlay iniettato via Shadow
DOM per isolare lo stile dalla pagina ospite, permessi minimi nel manifest.
Invocarla prima di scrivere o modificare codice in `app/`, e verificarne la
checklist prima di ogni commit.

## 8. Aggiunta di un nuovo gestore SPID — skill SPID Flow Mapper

Ogni volta che si aggiunge un nuovo gestore SPID al percorso, o si
aggiorna il percorso di uno già presente, seguire la guida definita in
[agents/skills/spid-flow-mapper/SKILL.md](../skills/spid-flow-mapper/SKILL.md).

Questa skill documenta lo schema dei campi di uno step in
`app/data/steps.js` (`id`, `title`, `text`, `icon`, `targetSelector`,
`expectedAction`, `waitSeconds`, `hintOnBlock`), la convenzione dei
selettori `data-shp-*` usati per individuare gli elementi nella pagina
demo del gestore, e la checklist di coerenza tra step dichiarati e markup
realmente presente. Non considerare un nuovo gestore completo senza aver
verificato questa checklist.

## 9. Subagent di progetto e loro perimetro

Per tenere basso il consumo di contesto/token, il lavoro su `app/` va
delegato ai subagent definiti in `agents/agents/`, ciascuno con un
perimetro di file preciso. Usare il subagent corrispondente per ogni task
nelle fasi successive, invece di caricare l'intero albero `app/` in una
sessione unica:

- [agents/agents/content-script-agent.md](../agents/content-script-agent.md)
  — content script: rilevamento pagina, stato del percorso, rilevamento
  blocco, overlay UI. Perimetro: `app/content/**` e `app/data/steps.js`.
- [agents/agents/demo-site-agent.md](../agents/demo-site-agent.md) —
  pagine statiche del sito demo (home → scelta gestore → login gestore →
  Cassetto Fiscale) con i selettori `data-shp-*`. Perimetro:
  `app/demo-site/**` (lettura sola di `app/data/steps.js`).
- [agents/agents/popup-agent.md](../agents/popup-agent.md) — dashboard dei
  progressi (tempo per sessione, blocchi rilevati, completamenti,
  confronto prima/dopo). Perimetro: `app/popup/**` (lettura sola di
  `app/content/**` e `app/data/steps.js`).
- [agents/agents/qa-compliance-agent.md](../agents/qa-compliance-agent.md)
  — verifica di conformità, **sola lettura**, mai scrittura di codice
  applicativo: zero chiamate di rete, coerenza step↔selettori, rispetto dei
  vincoli del Tema 03. Perimetro: `agents/instructions/CLAUDE.md` e
  l'intero albero `app/` in lettura.

Ogni subagent dichiara nel proprio file gli strumenti consentiti e il
perimetro di file leggibile/modificabile. Un task che ricade chiaramente
nel perimetro di uno di questi subagent va assegnato a quello, non gestito
genericamente.

## 10. Comandi di progetto

Per i task ricorrenti usare i comandi definiti in `agents/commands/`,
che orchestrano i subagent della sezione 9:

- [agents/commands/add-provider.md](../commands/add-provider.md) —
  `/add-provider <nome-gestore>`: aggiunge un nuovo gestore SPID
  delegando a `content-script-agent` (blocco dati in `steps.js`),
  `demo-site-agent` (pagina di login demo) e `qa-compliance-agent`
  (verifica di coerenza finale, con eventuale ciclo di correzione).
- [agents/commands/check-theme-compliance.md](../commands/check-theme-compliance.md)
  — `/check-theme-compliance`: invoca `qa-compliance-agent` per un report
  puntuale, con riferimenti `file:riga`, sul rispetto dei vincoli
  specifici e del "cosa evitare" del Tema 03 (Learner Profile Statement,
  scenario concreto, Adaptive Evidence, Learning Outcome Note, divieto di
  consulenza professionale, divieto di dati sensibili reali, zero
  chiamate a modelli linguistici/API esterne).
- [agents/commands/pack-deliverable.md](../commands/pack-deliverable.md)
  — `/pack-deliverable`: verifica che il repo abbia esattamente la
  struttura `app/`, `agents/`, `presentation/`, `README.md` richiesta
  dalla sezione 5, segnalando ogni file o cartella fuori posto prima di
  impacchettare la consegna.

## 11. Criteri di valutazione da rispettare sempre

Ogni consegna (codice, documentazione, presentazione) deve poter mostrare
esplicitamente questi tre elementi, e Claude Code deve contribuire a
mantenerli aggiornati e coerenti man mano che il progetto evolve:

- **Learner Profile Statement**: una descrizione chiara ed esplicita di chi è
  l'utente per cui il sistema è progettato (vedi sezione 2), riportata nella
  documentazione/presentazione, non solo implicita nel codice.

- **Adaptive Evidence**: evidenza concreta e verificabile di *come* il
  sistema si adatta — quali segnali osserva (gestore scelto, fase corrente,
  tempo trascorso, tentativi falliti), quali regole applica, e quali output
  diversi produce in scenari diversi. Deve essere dimostrabile (es. con
  esempi, log, o percorsi alternativi mostrabili a demo), non solo asserita.

- **Learning Outcome Note**: una nota su cosa l'utente impara/acquisisce
  usando il sistema (es. maggiore autonomia nel riconoscere il proprio
  gestore SPID, minore ansia da errore, capacità di completare da solo un
  login SPID la volta successiva).

**Vincolo trasversale non negoziabile**: il sistema non deve mai presentare
contenuti relativi a dati fiscali, identità digitale o simili come
**consulenza professionale**. Ogni testo di aiuto deve restare nell'ambito di
supporto *procedurale/orientativo* all'uso dell'interfaccia (es. "come
selezionare il tuo gestore", "cosa fare se la pagina non risponde"), e mai
nell'ambito di consulenza fiscale, legale o di sicurezza informatica. In caso
di dubbio su un testo, riformulare in termini di assistenza all'uso dello
strumento, non di consiglio sul merito.
