# SPID Helper

Estensione Chrome (Manifest V3) che guida passo dopo passo una persona
anziana al **primo accesso SPID**, nel percorso verso il **Cassetto Fiscale
dell'Agenzia delle Entrate**.

Progetto per **Hagenthon — Tema 03 "Educazione Digitale Inclusiva"**.

## Scopo del progetto

Molte persone con poca confidenza digitale abbandonano il login SPID al
primo ostacolo: una schermata inattesa, un'attesa sul telefono, un pulsante
che non trovano. SPID Helper affianca l'utente sulla pagina, senza
sostituirsi a lui:

- mostra **un solo passaggio alla volta**, con frasi brevi e un'icona;
- **evidenzia** sulla pagina l'elemento da usare;
- segue un **percorso specifico per il gestore SPID** scelto (Poste ID,
  Sielte ID), perché passaggi, tempi e app sono diversi;
- si accorge quando l'utente è **bloccato** su una fase e mostra un aiuto
  mirato a quella fase, non un messaggio generico;
- registra in locale i progressi, che l'utente vede nel popup
  dell'estensione.

SPID Helper offre solo **supporto procedurale all'uso dell'interfaccia**.
Non dà consulenza fiscale, legale o di sicurezza informatica e non chiede,
legge o salva dati personali reali.

## Profilo utente (Learner Profile Statement)

- Persona **anziana (65+)**.
- **Bassa confidenza digitale**: poca familiarità con form, popup, redirect
  tra siti e app di terze parti sullo smartphone.
- **Prima esperienza di login SPID**: non sa cosa sia un "gestore di
  identità", può confondere SPID, CIE e CNS, si blocca davanti a schermate
  inattese o tempi di attesa.
- Possibile **ansia da errore** ("ho sbagliato qualcosa?") e tendenza ad
  abbandonare dopo un blocco prolungato.

Per questo i testi seguono le regole Easy Read
([agents/skills/easy-read-it/SKILL.md](agents/skills/easy-read-it/SKILL.md)):
una istruzione per frase, frasi brevi, imperativo diretto, nessun gergo.

## Scenario

Accesso con SPID al Cassetto Fiscale (riprodotto dal sito demo in
`app/demo-site/`):

1. Pagina di accesso del servizio → pulsante **Entra con SPID**.
2. Elenco dei gestori → scelta del proprio gestore.
3. Pagina di login del gestore: nome utente, password, pulsante Accedi.
4. Secondo fattore, diverso per gestore (simulato, mai reale):
   - **Poste ID**: notifica sull'app e conferma con impronta o viso;
   - **Sielte ID**: QR code da inquadrare, codice OTP da leggere e
     scrivere.
5. Ritorno al servizio e arrivo nel **Cassetto Fiscale**.

## Come si adatta (Adaptive Evidence)

Tutte le decisioni sono regole esplicite su dati statici
([app/data/steps.js](app/data/steps.js)), sul DOM della pagina e su timer.

| Segnale osservato | Regola | Effetto visibile |
|---|---|---|
| Elementi `data-shp="…"` presenti e visibili nella pagina | Si riconosce in quale fase e per quale gestore si trova l'utente | Pannello con il passaggio giusto e numero del passo |
| Gestore scelto | Si usa il blocco `providers.<gestore>` di `steps.js` | Percorso diverso per Poste ID (5 passi) e Sielte ID (6 passi) |
| Clic sul target, campo compilato, comparsa di un target successivo, cambio pagina | Lo step attivo si considera completato | Si passa da soli allo step successivo |
| Tempo sullo step oltre `waitSeconds` (es. 120 s per la notifica Poste ID, 110 s per il QR Sielte ID) | L'utente è considerato bloccato; il blocco si conta una sola volta per step | Compare l'aiuto `hintOnBlock` specifico della fase e l'anello di evidenziazione |
| Ritorno alla home dopo aver raggiunto un gestore | Nuovo tentativo | Il percorso del gestore riparte dall'inizio |
| Pulsante "Ho fatto questo passaggio" | Completamento manuale | Si va avanti anche se la pagina non lo rileva |

Il popup dell'estensione mostra i dati raccolti in `chrome.storage.local`:
sessioni completate, tempo per sessione, blocchi rilevati, passi fatti da
solo.

## Cosa impara l'utente (Learning Outcome Note)

- Riconoscere il **proprio gestore SPID** e dove sceglierlo.
- Sapere **cosa aspettarsi** sul telefono (notifica, QR code, codice) e
  che un'attesa è normale.
- Meno **ansia da errore**: c'è sempre un'indicazione su cosa fare dopo.
- Con il calo dei blocchi e l'aumento dei "passi fatti da solo" nel popup,
  la capacità di completare il login **in autonomia** la volta successiva.

## Installare l'estensione in Chrome

1. Apri Chrome e vai su `chrome://extensions`.
2. Attiva **Modalità sviluppatore** (interruttore in alto a destra).
3. Clicca **Carica estensione non pacchettizzata**.
4. Seleziona la cartella che contiene `manifest.json`, cioè la **radice del
   repository** (`spid-helper/`). Il manifest punta ai file in `app/`
   (`app/content/…`, `app/data/steps.js`, `app/popup/…`).
5. (Facoltativo) Fissa SPID Helper nella barra degli strumenti per aprire
   il popup "I tuoi progressi".

Dopo ogni modifica al codice, clicca l'icona di ricarica dell'estensione in
`chrome://extensions` e ricarica la pagina demo.

## Provare la demo

Il content script è attivo solo su `localhost` e `127.0.0.1` (permessi
minimi nel manifest). Aprendo `app/demo-site/index.html` con doppio clic
(`file://…`) vedi il sito demo, ma **senza l'assistente**. Per la demo
completa servi la cartella con un server locale.

1. Dalla radice del repository avvia un server statico:

   ```bash
   python -m http.server 5174
   ```

2. Apri in Chrome
   [http://localhost:5174/app/demo-site/index.html](http://localhost:5174/app/demo-site/index.html).
3. Segui il percorso: **Entra con SPID** → scegli **Poste ID** o
   **Sielte ID** → login simulato → Cassetto Fiscale. Nelle pagine dei
   gestori il riquadro "Controlli demo — simula il telefono" sostituisce
   l'app sul telefono.
4. Per vedere il rilevamento del blocco, resta fermo su un passaggio oltre
   il suo `waitSeconds`: compare l'aiuto specifico.
5. Apri il popup dell'estensione per vedere sessioni, tempi e blocchi.

Il sito demo è fittizio: nessun dato viene inviato e qualsiasi valore
inserito nei campi va bene.

## Presentazione

Slide e materiali della sfida:
[presentation/index.html](presentation/index.html) (apribile direttamente
nel browser).

## Efficienza token

Il runtime è **completamente rule-based**: l'estensione non chiama modelli
linguistici né API esterne e non fa alcuna richiesta di rete.

- **0 token consumati durante l'uso**, a qualsiasi numero di utenti e
  sessioni: nessun costo per utente, nessuna latenza di inferenza.
- Funziona anche **offline**; il comportamento è **deterministico** e
  quindi verificabile e ripetibile in demo.
- Testi, soglie e varianti per gestore sono scritti una volta sola in
  `app/data/steps.js`.

L'IA (Claude Code) è usata solo **in sviluppo**. Anche lì il consumo è
contenuto: il lavoro su `app/` è diviso tra subagent con un perimetro di
file preciso (`agents/agents/`), così ogni sessione carica solo i file che
le servono.

## Struttura del repository

```
spid-helper/
├── manifest.json   # Manifest MV3 (cartella da caricare in Chrome)
├── app/            # Codice runtime dell'estensione
│   ├── content/    # Riconoscimento pagina, rilevamento blocco, overlay (Shadow DOM)
│   ├── data/       # steps.js: percorso, testi, soglie per gestore
│   ├── demo-site/  # Sito demo: home → scelta gestore → login → Cassetto Fiscale
│   └── popup/      # Dashboard "I tuoi progressi"
├── agents/         # Istruzioni, skill, subagent e comandi per Claude Code
├── presentation/   # Materiali di presentazione
└── README.md
```

Vincoli e convenzioni di sviluppo:
[agents/instructions/CLAUDE.md](agents/instructions/CLAUDE.md).
