---
description: Aggiunge un nuovo gestore SPID al percorso — dati in steps.js, pagina demo di login, verifica di coerenza.
argument-hint: <nome-gestore>
---

# /add-provider <nome-gestore>

Orchestra l'aggiunta di un nuovo gestore SPID al progetto, delegando ogni
fase al subagent di competenza definito in `agents/agents/`, secondo il
perimetro di file dichiarato in ciascun file e lo schema definito in
[agents/skills/spid-flow-mapper/SKILL.md](../skills/spid-flow-mapper/SKILL.md).

Argomento: `$1` (o `$ARGUMENTS`) = nome/id del gestore da aggiungere (es.
`posteid`, `aruba`, `infocert`). Se l'argomento manca, chiedere il nome
del gestore prima di procedere: non inventarlo.

## Procedura

### Fase 1 — Blocco dati in `steps.js`

Lanciare un agente che segua **esclusivamente** il ruolo e il perimetro
descritti in
[agents/agents/content-script-agent.md](../agents/content-script-agent.md),
con il compito:

> Aggiungi in `app/data/steps.js` il blocco dati per il nuovo gestore
> `$1`: un array di step, ciascuno con tutti i campi richiesti dallo
> schema di `spid-flow-mapper` (`id`, `title`, `text`, `icon`,
> `targetSelector`, `expectedAction`, `waitSeconds`, `hintOnBlock`). I
> testi (`title`, `text`, `hintOnBlock`) devono rispettare la skill
> `easy-read-it`. Per `targetSelector`, usare selettori `data-shp-*`
> plausibili per il nuovo gestore, coerenti con la convenzione già in uso
> per gli altri gestori (stesso `data-shp-el` per ruoli equivalenti,
> `data-shp-provider="$1"`), anche se la pagina demo corrispondente non
> esiste ancora: verrà creata nella fase successiva.

Non toccare `app/demo-site/**`, `app/popup/**` in questa fase.

### Fase 2 — Pagina di login demo

Lanciare un agente che segua **esclusivamente** il ruolo e il perimetro
descritti in
[agents/agents/demo-site-agent.md](../agents/demo-site-agent.md), con il
compito:

> Crea in `app/demo-site/**` la pagina (o le pagine) di login per il
> gestore `$1`, leggendo da `app/data/steps.js` la sequenza di step appena
> aggiunta nella Fase 1. Marca ogni elemento interattivo con gli
> attributi `data-shp-*` **esattamente uguali** ai `targetSelector`
> dichiarati per `$1` in `steps.js`. Collega la nuova pagina dal punto di
> scelta gestore già esistente nel demo-site. Testi realistici in stile
> sito istituzionale, non Easy Read (vedi nota nel file dell'agente).

Non toccare `app/content/**`, `app/data/steps.js`, `app/popup/**` in
questa fase.

### Fase 3 — Verifica di coerenza

Lanciare un agente che segua **esclusivamente** il ruolo descritto in
[agents/agents/qa-compliance-agent.md](../agents/qa-compliance-agent.md)
(sola lettura, nessuna modifica), con il compito:

> Esegui il controllo B (coerenza step↔selettori) di
> `qa-compliance-agent.md` limitatamente al gestore `$1`: per ogni step
> dichiarato in `app/data/steps.js` per `$1`, verifica che
> `targetSelector` trovi riscontro in un attributo `data-shp-*` realmente
> presente in `app/demo-site/**`, che il selettore individui un elemento
> univoco, e che nessun campo obbligatorio sia vuoto. Riporta ogni
> discrepanza con file e riga precisi.

### Fase 4 — Esito

- Se la Fase 3 non segnala discrepanze: riportare all'utente che il
  gestore `$1` è stato aggiunto con successo, elencando i file creati o
  modificati in Fase 1 e Fase 2.
- Se la Fase 3 segnala discrepanze: non considerare il task concluso.
  Tornare alla Fase 1 o alla Fase 2 (a seconda di dove si trova il
  disallineamento) per correggere, poi ripetere la Fase 3. Riportare
  all'utente solo l'esito finale dopo la correzione, con un riepilogo di
  cosa è stato sistemato.

## Output atteso

Un riepilogo per l'utente con: nome del gestore aggiunto, elenco file
toccati per fase, esito della verifica di coerenza (conforme / corretto
dopo N iterazioni), ed eventuali note su permessi del manifest o nuovi
asset (icone) da aggiungere manualmente se non già presenti.
