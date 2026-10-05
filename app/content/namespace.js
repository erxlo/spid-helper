/**
 * Namespace condiviso del content script di SPID Helper.
 *
 * I file di app/content/ sono script classici (non moduli ES), caricati in
 * ordine dal manifest nello stesso content_scripts entry: condividono lo
 * stesso "mondo isolato" e quindi lo stesso `window`. Ogni file aggiunge il
 * proprio pezzo a `window.SPID_HELPER` dentro un IIFE, senza variabili
 * globali sciolte. La pagina ospite non vede questo oggetto.
 *
 * Ordine di caricamento atteso:
 *   app/data/steps.js, namespace.js, icons.js, storage.js, page-match.js,
 *   overlay.js, detector.js, content.js
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});

  NS.CONST = Object.freeze({
    /** id univoco del nodo host dell'overlay in document.body. */
    ROOT_ID: "spid-helper-root",
    /** Prefisso di tutte le chiavi in chrome.storage.local. */
    KEY_PREFIX: "shp_",
    SCHEMA_VERSION: 1,
    /** Numero massimo di sessioni conservate in storage. */
    MAX_SESSIONS: 50,
    /** Oltre questa inattività una sessione aperta è considerata abbandonata. */
    INACTIVITY_ABANDON_MS: 30 * 60 * 1000,
    /** Finestra in cui si raggruppano le mutazioni del DOM prima di ricalcolare. */
    MUTATION_DEBOUNCE_MS: 250,
    /** Spazio tra il bordo del target e l'anello di evidenziazione. */
    RING_PADDING_PX: 6,
    /** Distanza del pannello dai bordi della finestra. */
    PANEL_MARGIN_PX: 16,
  });

  var warned = Object.create(null);

  NS.log = {
    /** Avviso in console una sola volta per chiave, per non riempire la console. */
    warnOnce: function (key, message, detail) {
      if (warned[key]) return;
      warned[key] = true;
      try {
        console.warn("[SPID Helper] " + message, detail === undefined ? "" : detail);
      } catch (e) {
        /* console non disponibile: nessuna azione */
      }
    },
  };
})();
