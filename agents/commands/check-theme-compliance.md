---
description: Verifica puntuale del rispetto dei vincoli e del "cosa evitare" del Tema 03 Hagenthon, con riferimenti precisi a file e riga.
---

# /check-theme-compliance

Produce un **report puntuale** sul rispetto dei vincoli specifici del
Tema 03 "Educazione Digitale Inclusiva" e del relativo "cosa evitare",
citando file e riga per ogni punto verificato — sia quando conforme, sia
quando non conforme. Non modifica nessun file.

## Come procedere

Lanciare un agente che segua **esclusivamente** il ruolo descritto in
[agents/agents/qa-compliance-agent.md](../agents/qa-compliance-agent.md)
(sola lettura: `Read`, `Grep`, `Glob`, `Bash` di sola ispezione — mai
`Write`/`Edit`), con il compito di eseguire il **controllo C** (vincoli
del Tema 03) di quel file, verificando puntualmente ciascuno dei seguenti
punti e citando sempre `file:riga` a supporto di ogni esito:

1. **Learner Profile Statement presente e preciso** — la documentazione
   (`agents/instructions/CLAUDE.md` sezione 2, `README.md`,
   `presentation/**`) descrive esplicitamente l'utente target (persona
   65+, bassa confidenza digitale, prima esperienza SPID), non un
   generico "utenti". Citare dove questo statement compare in ciascun
   documento, o segnalarne l'assenza.

2. **Scenario concreto rispettato** — lo scenario implementato in
   `app/data/steps.js` e `app/demo-site/**` è effettivamente "accesso
   SPID al Cassetto Fiscale di Agenzia Entrate" (vedi
   `agents/instructions/CLAUDE.md` sezione 3), non un flusso generico o
   diverso. Citare i file che lo dimostrano (es. pagina demo del Cassetto
   Fiscale, step che vi fanno riferimento).

3. **Adaptive Evidence dimostrabile** — esistono percorsi effettivamente
   diversi per gestore diverso e feedback (`hintOnBlock`) diversi per
   step di blocco diverso, non un unico messaggio riciclato ovunque.
   Citare almeno due gestori con `hintOnBlock` differenti sullo stesso
   tipo di step, come prova, o segnalare se i testi sono identici/troppo
   simili.

4. **Learning Outcome Note presente** — la documentazione indica cosa
   l'utente impara/acquisisce usando il sistema (vedi
   `agents/instructions/CLAUDE.md` sezione 10). Citare dove compare, o
   segnalarne l'assenza.

5. **"Cosa evitare": nessuna consulenza professionale presentata come
   tale** — nessun testo in `app/data/steps.js`, `app/demo-site/**`,
   `app/popup/**`, `presentation/**` presenta i contenuti come consulenza
   fiscale, legale o di sicurezza informatica professionale (vedi
   `agents/instructions/CLAUDE.md` sezione 10, vincolo trasversale).
   Segnalare puntualmente ogni testo che rischia di sconfinare (es.
   affermazioni su importi dovuti, consigli su cosa fare con dati
   fiscali reali, rassicurazioni di sicurezza non procedurali).

6. **"Cosa evitare": nessun dato sensibile reale o verosimile** —
   nessun dato fiscale, identificativo o di accesso reale o
   verosimilmente reale in `app/demo-site/**` (in particolare nella
   pagina Cassetto Fiscale) o in altri file del repo. Citare gli esempi
   trovati e perché sono o non sono accettabili.

7. **"Cosa evitare": zero chiamate a modelli linguistici o API esterne a
   runtime** — riepilogo sintetico del controllo A già descritto in
   `qa-compliance-agent.md` (nessun `fetch`/`XMLHttpRequest`/SDK LLM in
   `app/**`), incluso qui perché è esplicitamente parte del "cosa
   evitare" della sfida, non solo un vincolo tecnico interno.

## Formato del report atteso

Per ciascuno dei 7 punti sopra: **esito** (conforme / non conforme /
parzialmente conforme), **evidenza** (uno o più riferimenti `file:riga`),
e, se non conforme, una **descrizione puntuale** del problema e quale
subagent di competenza (`content-script-agent`, `demo-site-agent`,
`popup-agent`) dovrebbe correggerlo. Chiudere con un esito complessivo
("pronto per la consegna" / "da correggere prima della consegna" con
elenco dei punti bloccanti).
