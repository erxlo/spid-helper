---
description: Verifica che il repo abbia esattamente la struttura di consegna richiesta (app/, agents/, presentation/, README.md) e segnala file fuori posto.
---

# /pack-deliverable

Verifica che il repository rispetti **esattamente** la struttura di
cartelle di primo livello richiesta dalla consegna, definita in
[agents/instructions/CLAUDE.md](../instructions/CLAUDE.md) (sezione 5), e
segnala ogni file o cartella fuori posto. Controllo di sola lettura:
nessuna modifica, nessuno spostamento automatico di file.

## Struttura attesa (primo livello del repo)

```
app/
agents/
presentation/
README.md
```

Nessun altro file o cartella visibile dovrebbe comparire a questo livello,
con le seguenti **eccezioni infrastrutturali ammesse** (non fanno parte
della consegna ma sono normali in un repository):

- `.git/`, `.gitignore`
- file di configurazione di progetto strettamente necessari a far
  funzionare l'estensione/il build (es. `package.json`,
  `package-lock.json`, `node_modules/` se presente, file di config
  dell'editor come `.vscode/`) — da segnalare comunque in elenco separato
  per trasparenza, non come violazione.

Qualunque altro file o cartella a livello radice (es. appunti sparsi,
cartelle di backup, file temporanei, screenshot non in `presentation/`,
bozze fuori posto) va segnalato come **fuori posto**.

## Come procedere

1. Elencare tutti i file e le cartelle di primo livello del repository.
2. Confrontare l'elenco con la struttura attesa sopra.
3. Per ogni voce di primo livello non riconducibile a `app/`, `agents/`,
   `presentation/`, `README.md`, o alle eccezioni infrastrutturali
   elencate, segnalarla come fuori posto, indicando dove andrebbe spostata
   (in base al suo contenuto: codice runtime → `app/`, materiale per
   agenti IA → `agents/`, materiale di presentazione → `presentation/`).
4. Scendere di un livello dentro `agents/` e verificare che contenga solo
   le sottocartelle previste: `instructions/`, `skills/`, `agents/`,
   `commands/` (vedi struttura completa in `CLAUDE.md` sezione 5).
   Segnalare file sparsi direttamente dentro `agents/` non riconducibili a
   queste sottocartelle.
5. Scendere di un livello dentro `app/` e verificare la presenza attesa di
   `app/data/steps.js` e delle cartelle dei subagent applicativi
   (`app/content/`, `app/demo-site/`, `app/popup/`, se già create).
   Segnalare file sparsi direttamente dentro `app/` non riconducibili a
   queste sottocartelle.
6. Verificare che `README.md` esista, sia a livello radice (non dentro
   una sottocartella), e non sia vuoto.

Questo controllo può essere eseguito direttamente, oppure delegato a
[agents/agents/qa-compliance-agent.md](../agents/qa-compliance-agent.md)
se eseguito insieme ad altri controlli di conformità nella stessa
sessione: in entrambi i casi resta un controllo di **sola lettura**.

## Formato dell'output atteso

- **Struttura di primo livello**: conforme / non conforme, con elenco di
  eventuali voci fuori posto e dove andrebbero spostate.
- **Eccezioni infrastrutturali rilevate**: elenco informativo (es.
  `.gitignore`, `package.json`), non trattate come violazioni.
- **Struttura interna di `agents/` e `app/`**: conforme / non conforme,
  con elenco di eventuali file sparsi fuori dalle sottocartelle previste.
- **Esito complessivo**: "pronto per il pacchetto di consegna" oppure
  "da sistemare" con l'elenco puntuale delle azioni correttive necessarie
  prima di impacchettare la consegna.
