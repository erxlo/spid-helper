---
name: mv3-zero-network
description: Pattern tecnici obbligatori per l'estensione Chrome Manifest V3 di SPID Helper — content script a dati statici, chrome.storage.local, zero chiamate di rete esterne, overlay in Shadow DOM, permessi minimi nel manifest. Usare questa skill ogni volta che si scrive o modifica codice in app/ (content script, background, manifest.json).
---

# MV3 Zero Network — pattern architetturali per l'estensione

Questa skill documenta **come implementare** il vincolo architetturale non
negoziabile definito in [agents/instructions/CLAUDE.md](../../instructions/CLAUDE.md)
(sezione 4): l'estensione a runtime non deve mai fare chiamate a modelli
linguistici o API esterne. Qui sono i pattern tecnici concreti, per Chrome
Manifest V3, che rendono vero questo vincolo nel codice.

Si applica a tutto il codice in `app/` (content script, service worker di
background se presente, `manifest.json`). Va consultata prima di scrivere
qualunque file nuovo in `app/` e prima di ogni modifica che tocchi
permessi, storage o comunicazione di rete.

## Pattern obbligatori

### 1. Content script: solo dati locali da `app/data/steps.js`

Il content script legge **esclusivamente** la struttura dati statica
esportata da `app/data/steps.js` per decidere step, testi e soglie. Non
deve:

- importare o chiamare SDK di modelli linguistici;
- costruire URL verso endpoint remoti per ottenere testi, step o decisioni
  di adattamento;
- dipendere da risposte di rete per determinare il comportamento
  dell'overlay.

```js
// ✅ corretto — import statico, nessuna rete coinvolta
import { steps, providers, thresholds } from "../data/steps.js";

function getStepFor(providerId, stepIndex) {
  return steps[providerId]?.[stepIndex] ?? steps.default[stepIndex];
}
```

```js
// ❌ vietato — qualunque chiamata esterna per decidere cosa mostrare
const res = await fetch("https://api.esempio.com/suggerisci-step");
```

Se un dato sembra "mancante" in `steps.js` (es. un nuovo gestore SPID, un
nuovo messaggio di errore), la soluzione è **aggiungere il dato statico**,
mai aggiungere una chiamata di rete per recuperarlo a runtime.

### 2. Persistenza dei progressi: `chrome.storage.local`, mai `localStorage`

Tutto lo stato persistente lato utente (step corrente, gestore selezionato,
tentativi falliti, timestamp dell'ultimo blocco) va letto/scritto solo con
l'API asincrona `chrome.storage.local`. `localStorage` e `sessionStorage`
**non vanno usati** in nessun file di `app/`.

Perché: `localStorage` è legato all'origin della pagina ospite (il content
script lo scriverebbe nello storage del sito su cui gira, es. Agenzia delle
Entrate o il sito dell'IdP), è sincrono e blocca il thread, e non è
isolato per estensione. `chrome.storage.local` appartiene all'estensione,
è asincrono, e sopravvive correttamente a reload/redirect tra domini
diversi del flusso SPID.

```js
// ✅ corretto
await chrome.storage.local.set({ currentStep: 3, providerId: "poste" });
const { currentStep } = await chrome.storage.local.get("currentStep");
```

```js
// ❌ vietato in qualunque file di app/
localStorage.setItem("currentStep", "3");
```

### 3. Nessun `fetch`/`XMLHttpRequest` verso domini esterni

Nessun file in `app/` deve contenere chiamate `fetch`, `XMLHttpRequest`,
`navigator.sendBeacon`, `WebSocket` o form submission verso domini che non
siano quelli già visitati dall'utente nel flusso SPID stesso (cioè nessuna
chiamata *avviata dall'estensione*, a prescindere dal dominio).

Questo esclude in particolare:

- telemetria/analytics verso server propri o di terze parti;
- chiamate a servizi di traduzione, text-to-speech, o assistenti IA;
- qualunque "ping" di verifica connessione che non sia una pura euristica
  locale (vedi punto successivo).

Il rilevamento del blocco (sezione 4 di CLAUDE.md) si basa su **timer e
osservazione del DOM della pagina ospite**, non su richieste di rete
proprie:

```js
// ✅ corretto — euristica locale basata su timer e stato del DOM
let lastDomChangeAt = Date.now();
const observer = new MutationObserver(() => { lastDomChangeAt = Date.now(); });
observer.observe(document.body, { childList: true, subtree: true });

setInterval(() => {
  const idleMs = Date.now() - lastDomChangeAt;
  if (idleMs > thresholds.stuckAfterMs) {
    showStuckFeedback(currentProviderId, currentStepIndex);
  }
}, 1000);
```

```js
// ❌ vietato — nessuna richiesta di rete per capire se l'utente è bloccato
const online = await fetch("https://example.com/ping");
```

### 4. Overlay in Shadow DOM, isolato dallo stile della pagina ospite

Ogni elemento UI iniettato dal content script (overlay di aiuto, testi
guida, icone, pulsanti) va montato in un **unico nodo host** attaccato al
`document.body` della pagina ospite, con uno **Shadow DOM in modalità
`closed`** (o `open` se serve debug in sviluppo, ma `closed` in produzione)
che contiene tutto markup e stile dell'estensione.

```js
// ✅ corretto — isolamento totale dallo stile della pagina ospite
const host = document.createElement("div");
host.id = "spid-helper-root";
host.style.all = "initial"; // azzera eredità di stile anche sull'host
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: "closed" });
shadow.innerHTML = `
  <style>${overlayCss}</style>
  <div class="spid-helper-overlay">...</div>
`;
```

Regole correlate:

- Mai iniettare `<style>` o classi direttamente nel `document` della pagina
  ospite: romperebbe l'isolamento e rischia conflitti con lo stile del sito
  (Agenzia delle Entrate, IdP, ecc.) o, viceversa, di essere rotto da esso.
- Mai riusare classi/id generici che potrebbero collidere con quelli della
  pagina ospite (`#app`, `.container`, `.btn`...): tutto vive dentro lo
  Shadow DOM, quindi il rischio collisione sparisce, ma il nodo host in
  `document.body` deve comunque avere un id univoco e prefissato
  (`spid-helper-root`).
- L'overlay non deve mai alterare il DOM della pagina ospite al di fuori
  del proprio nodo host (niente `innerHTML` su elementi esistenti della
  pagina, niente rimozione/modifica di elementi del sito).

### 5. Permessi minimi nel `manifest.json`

Il manifest dichiara **solo** i permessi strettamente necessari a
implementare i pattern sopra. Nessun permesso "per sicurezza" o "per uso
futuro".

Checklist permessi:

- `storage` → sì, serve per `chrome.storage.local`.
- `host_permissions` → limitati ai domini realmente coinvolti nel flusso
  SPID simulato/reale (es. dominio del servizio e degli IdP supportati),
  mai `<all_urls>` salvo necessità dimostrata e documentata.
- `scripting`, `activeTab` → solo se effettivamente usati per iniettare il
  content script; preferire dichiarazione statica di `content_scripts` nel
  manifest quando possibile, più prevedibile di iniezione dinamica.
- Nessun permesso di rete generico (`webRequest`, `proxy`, `background`
  con `fetch` libero) se non è usato da nessun pattern sopra.
- Nessuna `content_security_policy` che apra connect-src verso domini
  esterni non necessari: `connect-src 'self'` (o assente, che in MV3
  default è già restrittivo) va preferito a un'apertura generica.

Prima di aggiungere un permesso, chiedersi: "quale pattern tra 1-4 lo
richiede davvero?". Se la risposta non è immediata, il permesso non va
aggiunto.

## Checklist rapida prima di un commit su `app/`

- [ ] Il content script legge solo da `app/data/steps.js` (nessun dato da
      rete per decidere cosa mostrare)?
- [ ] Ogni lettura/scrittura di stato persistente usa
      `chrome.storage.local` e non `localStorage`/`sessionStorage`?
- [ ] Nessun `fetch`, `XMLHttpRequest`, `sendBeacon` o `WebSocket` verso
      domini esterni in nessun file di `app/`?
- [ ] L'overlay è montato in un host dedicato con Shadow DOM, senza
      toccare stile o DOM della pagina ospite al di fuori di quel nodo?
- [ ] Ogni permesso in `manifest.json` è giustificato da un pattern
      effettivamente implementato?

Se anche una sola risposta è "no", il codice va corretto prima di essere
integrato.
