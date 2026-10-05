---
name: spid-flow-mapper
description: Guida passo-passo per aggiungere un nuovo gestore SPID al progetto SPID Helper — schema dei campi in app/data/steps.js, come trovare i selettori data-shp-* nella pagina demo del gestore, e checklist di coerenza tra step dichiarati e markup realmente presente. Usare questa skill ogni volta che si aggiunge o modifica il percorso di un gestore SPID.
---

# SPID Flow Mapper — aggiungere un nuovo gestore SPID

Questa skill spiega **come mappare il percorso di login di un gestore
SPID** nel progetto, rispettando il vincolo architetturale di
[agents/instructions/CLAUDE.md](../../instructions/CLAUDE.md) (sezione 4):
tutto il percorso è dati statici in `app/data/steps.js`, nessuna logica di
adattamento scoperta o dedotta a runtime.

Usarla ogni volta che si aggiunge un nuovo gestore (es. Poste ID, Aruba,
InfoCert, TIM, Sielte...) o si aggiorna il percorso di uno già presente
perché la pagina demo corrispondente è cambiata.

## 1. Schema dei campi di uno step in `app/data/steps.js`

Ogni gestore è un array ordinato di **step**. Ogni step è un oggetto con
questi campi, tutti obbligatori salvo indicazione contraria:

| Campo           | Tipo              | Significato |
|-----------------|-------------------|-------------|
| `id`            | string            | Identificativo univoco dello step all'interno del gestore (es. `"poste-select-provider"`). Stabile nel tempo: non rinominare uno step esistente senza motivo, perché `chrome.storage.local` può riferirsi a `id` salvati per riprendere il progresso. |
| `title`         | string            | Titolo breve dello step, mostrato nell'overlay. Deve rispettare le regole della skill [easy-read-it](../easy-read-it/SKILL.md) (frase unica, imperativo diretto, sotto le 20 parole). |
| `text`          | string            | Testo guida esteso dello step. Stesse regole Easy Read di `title`: un'istruzione per frase, niente gergo tecnico non spiegato, un'unica azione fisica. |
| `icon`          | string            | Riferimento a un'icona statica locale (es. nome file in `app/assets/icons/`), mai una URL remota. Icona semplice e stilizzata, coerente con la skill easy-read-it. |
| `targetSelector`| string            | Selettore CSS **`data-shp-*`** (vedi sezione 2) che identifica nel DOM della pagina demo l'elemento su cui l'utente deve agire in questo step (es. `'[data-shp-el="provider-list-item"][data-shp-provider="poste"]'`). Usato dal content script per: (a) posizionare l'overlay vicino all'elemento giusto, (b) verificare che l'elemento esista prima di mostrare lo step. |
| `expectedAction`| string (enum)     | L'azione che il sistema si aspetta che l'utente compia su `targetSelector` per considerare lo step completato. Valori ammessi nel progetto: `"click"`, `"input"`, `"navigation"` (cambio URL/pagina), `"visible"` (comparsa di un elemento, usato per step di sola attesa/lettura). Deve corrispondere a un evento osservabile via DOM, mai dedotto. |
| `waitSeconds`   | number             | Soglia in secondi oltre la quale, se `expectedAction` non si è verificata, lo step è considerato "bloccato" (vedi `hintOnBlock`). Deve essere un numero realistico per un utente 65+ alla prima esperienza (preferire soglie generose: meglio un hint in ritardo che uno troppo ansiogeno). |
| `hintOnBlock`   | string             | Testo mostrato **solo** quando `waitSeconds` è superato senza `expectedAction`. Stesse regole Easy Read di `text`, ma mirato alla causa di blocco più probabile per questo step specifico (non un messaggio generico "qualcosa è andato storto"). |

Esempio di uno step completo:

```js
// app/data/steps.js (estratto)
export const steps = {
  posteid: [
    {
      id: "posteid-select-provider",
      title: "Tocca Poste ID nell'elenco.",
      text: "Guarda l'elenco dei gestori SPID. Tocca il nome Poste ID.",
      icon: "tap-list-item.svg",
      targetSelector: '[data-shp-el="provider-list-item"][data-shp-provider="posteid"]',
      expectedAction: "click",
      waitSeconds: 45,
      hintOnBlock: "Non trovi Poste ID? Scorri l'elenco verso il basso.",
    },
    {
      id: "posteid-enter-password",
      title: "Scrivi la tua password.",
      text: "Scrivi la password di Poste ID nella casella. Poi tocca Accedi.",
      icon: "write-password.svg",
      targetSelector: '[data-shp-el="password-input"]',
      expectedAction: "input",
      waitSeconds: 90,
      hintOnBlock: "Hai dimenticato la password? Tocca \"Password dimenticata\" sotto la casella.",
    },
    // ...altri step
  ],
};
```

## 2. Come trovare i selettori `data-shp-*` nella pagina demo

Ogni pagina demo (il sito simulato che riproduce il flusso di un gestore,
usato per sviluppo/demo senza toccare siti reali) espone **attributi
`data-shp-*`** dedicati, pensati apposta per essere letti dal content
script. `shp` = "SPID Helper": un prefisso dedicato, per non collidere mai
con attributi `data-*` già usati dal markup del sito reale o della demo
stessa, e per restare stabile anche se classi/id del markup cambiano per
motivi di stile.

Convenzione minima da seguire quando si marca una pagina demo (o quando si
cerca un selettore già marcato):

- `data-shp-el="<ruolo-elemento>"` — identifica il **ruolo** dell'elemento
  nel flusso (es. `provider-list-item`, `password-input`, `submit-button`,
  `otp-input`, `push-notification-banner`). Valore stabile e descrittivo,
  non un nome tecnico interno del sito.
- `data-shp-provider="<provider-id>"` — presente quando l'elemento è
  specifico di un gestore (es. una voce nell'elenco gestori), con lo
  stesso `provider-id` usato come chiave in `steps.js`.
- `data-shp-step="<step-id>"` (opzionale, utile su pagine complesse) —
  collega direttamente l'elemento allo `id` dello step in `steps.js`, per
  verifiche incrociate automatiche (vedi checklist, punto 4).

Procedura per individuare/assegnare i selettori su una nuova pagina demo:

1. Aprire la pagina demo del gestore nel browser e aprire gli strumenti
   per sviluppatori (DevTools → Elements).
2. Per ogni azione che l'utente deve compiere (clic, digitazione, attesa
   di un elemento), individuare l'elemento HTML corrispondente.
3. Verificare se l'elemento ha già un attributo `data-shp-*`. Se non ce
   l'ha, aggiungerlo direttamente nell'HTML della pagina demo (la pagina
   demo è codice del progetto, non un sito esterno: può e deve essere
   marcata).
4. Scrivere il selettore CSS completo usando l'attributo (es.
   `[data-shp-el="submit-button"]`), aggiungendo `data-shp-provider` se
   più gestori condividono la stessa struttura di pagina.
5. Copiare il selettore esatto in `targetSelector` dello step
   corrispondente in `steps.js`.
6. Non usare mai, come `targetSelector`, classi CSS di stile (`.btn-blue`,
   `#login-form-2`) o selettori posizionali (`div > div:nth-child(3)`):
   sono fragili e rompono il collegamento al primo refactor di stile della
   demo. Solo `data-shp-*` è un contratto stabile tra demo e content
   script.

## 3. Coerenza con gli altri vincoli di progetto

- I testi (`title`, `text`, `hintOnBlock`) seguono sempre la skill
  [easy-read-it](../easy-read-it/SKILL.md).
- Il content script legge `targetSelector` e osserva il DOM **solo** con
  le tecniche descritte nella skill
  [mv3-zero-network](../mv3-zero-network/SKILL.md) (`MutationObserver`,
  timer locali): mai una chiamata di rete per "scoprire" se l'elemento
  esiste o se l'azione è avvenuta.
- Nessun campo di uno step può contenere codice eseguibile, URL remoti, o
  riferimenti a servizi esterni: sono tutti dati statici.

## 4. Checklist di coerenza step ↔ selettori reali

Prima di considerare completo un nuovo gestore (o un aggiornamento), per
**ogni step** dichiarato in `steps.js` verificare quanto segue sulla
pagina demo corrispondente:

- [ ] `targetSelector` usa solo attributi `data-shp-*` (nessuna classe di
      stile, nessun selettore posizionale).
- [ ] Il selettore `targetSelector` individua **esattamente un elemento**
      nella pagina demo in quello step del flusso (non zero, non più di
      uno — un selettore ambiguo rompe il posizionamento dell'overlay).
- [ ] L'elemento trovato è effettivamente visibile/interagibile nel
      momento in cui lo step è attivo (non nascosto da CSS, non dentro un
      pannello non ancora aperto).
- [ ] `expectedAction` corrisponde a un evento che l'elemento può
      realmente generare (`input` solo su campi editabili, `click` solo
      su elementi cliccabili, `navigation` solo se lo step termina con un
      cambio pagina reale nella demo, `visible` solo se l'elemento compare
      dinamicamente dopo un'azione precedente).
- [ ] `waitSeconds` è coerente con la complessità reale dello step nella
      demo (uno step di attesa notifica push ha una soglia più lunga di
      uno step di semplice clic).
- [ ] `hintOnBlock` descrive la causa di blocco plausibile **per quello
      specifico step** (non un messaggio riciclato da un altro step).
- [ ] Se è presente `data-shp-step`, il suo valore corrisponde esattamente
      all'`id` dello step in `steps.js` (nessun refuso, nessun
      disallineamento dopo un rename).
- [ ] L'intero percorso del gestore, eseguito manualmente sulla pagina
      demo seguendo solo `title`/`text` degli step (senza guardare il
      codice), è completabile da capo a fine senza step "orfani" (uno
      step il cui `targetSelector` non esiste mai nella pagina) o "muti"
      (un'azione utente richiesta nella demo che non corrisponde a nessuno
      step dichiarato).

Se anche una sola casella non è verificata, il gestore non è pronto per
essere integrato: va corretto lo step, il selettore nella demo, o
entrambi, finché dichiarazione in `steps.js` e markup reale coincidono.
