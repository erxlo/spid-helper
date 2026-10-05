/**
 * Osservazione della pagina ospite: MutationObserver, ascoltatori passivi
 * di clic/focus/modifica dei campi e un solo timer di blocco alla volta.
 * Non blocca né modifica gli eventi della pagina: li legge e basta.
 *
 * Regole di completamento automatico dello step attivo (le decide content.js,
 * qui si rilevano solo i fatti):
 *  - "click": un clic (fase di cattura) dentro il targetSelector.
 *  - "wait", campo di testo: il campo (input/textarea) ha un valore non vuoto
 *    quando perde il focus o emette "change". Si guarda solo se è vuoto o no;
 *    il testo non viene mai letto oltre questo controllo né salvato.
 *  - per "click" e "wait": focus o clic sul target di uno step successivo
 *    dello stesso gestore (l'utente è già andato avanti da solo).
 * La regola "compare il target di uno step successivo / cambia la pagina"
 * è gestita in content.js a ogni ricalcolo dopo le mutazioni.
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});
  var C = NS.CONST;

  // Attributi che di solito cambiano quando un elemento compare o scompare.
  var ATTRS = ["hidden", "style", "class", "open", "aria-hidden", "aria-expanded", "data-shp", "disabled"];

  var observer = null;
  var onDomChange = null;
  var batchId = 0;
  var watch = null;
  var timerId = 0;
  var started = false;

  function asElement(node) {
    if (!node) return null;
    if (node.nodeType === 1) return node;
    return node.parentElement || null;
  }

  function safeClosest(node, selector) {
    var el = asElement(node);
    if (!el || !selector || typeof el.closest !== "function") return null;
    try {
      return el.closest(selector);
    } catch (e) {
      return null;
    }
  }

  function isOwn(node) {
    return !!(NS.overlay && NS.overlay.isOwnNode(asElement(node)));
  }

  function isTextField(el) {
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  function hasValue(field) {
    return typeof field.value === "string" && field.value.trim() !== "";
  }

  function checkLater(w, target, viaClick) {
    if (!w.later || !w.later.length) return false;
    for (var i = 0; i < w.later.length; i++) {
      if (safeClosest(target, w.later[i].selector)) {
        w.onLater(w.later[i].index, viaClick);
        return true;
      }
    }
    return false;
  }

  function handleClick(e) {
    var w = watch;
    if (!w || isOwn(e.target)) return;
    if (w.action === "click" && safeClosest(e.target, w.selector)) {
      w.onDone();
      return;
    }
    checkLater(w, e.target, true);
  }

  function handleFocusIn(e) {
    var w = watch;
    if (!w || isOwn(e.target)) return;
    checkLater(w, e.target, false);
  }

  function handleCommit(e) {
    var w = watch;
    if (!w || w.action !== "wait" || isOwn(e.target)) return;
    var el = safeClosest(e.target, w.selector);
    if (!el) return;
    var field = isTextField(e.target) ? e.target : isTextField(el) ? el : null;
    if (field && hasValue(field)) w.onDone();
  }

  function isOwnRecord(r) {
    if (isOwn(r.target)) return true;
    if (r.type !== "childList") return false;
    var i;
    var any = false;
    for (i = 0; i < r.addedNodes.length; i++) {
      any = true;
      if (!isOwn(r.addedNodes[i])) return false;
    }
    for (i = 0; i < r.removedNodes.length; i++) {
      any = true;
      if (!isOwn(r.removedNodes[i])) return false;
    }
    return any;
  }

  // Le mutazioni si raggruppano in finestre fisse: il primo cambiamento
  // avvia un'attesa di MUTATION_DEBOUNCE_MS, poi si ricalcola una volta.
  // Una finestra fissa (invece di rimandare a ogni mutazione) evita che una
  // pagina con animazioni continue impedisca per sempre il ricalcolo.
  function scheduleDomChange() {
    if (batchId) return;
    batchId = setTimeout(function () {
      batchId = 0;
      if (onDomChange) onDomChange();
    }, C.MUTATION_DEBOUNCE_MS);
  }

  NS.detector = {
    /** Avvia osservatore e ascoltatori. `callback` viene chiamata dopo le mutazioni. */
    start: function (callback) {
      onDomChange = callback;
      if (started) return;
      started = true;
      observer = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          if (!isOwnRecord(records[i])) {
            scheduleDomChange();
            return;
          }
        }
      });
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ATTRS,
      });
      document.addEventListener("click", handleClick, { capture: true, passive: true });
      document.addEventListener("focusin", handleFocusIn, { capture: true, passive: true });
      document.addEventListener("change", handleCommit, { capture: true, passive: true });
      document.addEventListener("focusout", handleCommit, { capture: true, passive: true });
    },

    stop: function () {
      if (observer) observer.disconnect();
      observer = null;
      if (batchId) clearTimeout(batchId);
      batchId = 0;
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("focusin", handleFocusIn, { capture: true });
      document.removeEventListener("change", handleCommit, { capture: true });
      document.removeEventListener("focusout", handleCommit, { capture: true });
      started = false;
      watch = null;
      NS.detector.clearTimer();
    },

    /**
     * Imposta lo step da osservare.
     * config = { selector, action: "click"|"wait"|"none",
     *   later: [{index, selector, action}], onDone(), onLater(index, viaClick) }
     */
    watch: function (config) {
      watch = config && config.action !== "none" ? config : null;
    },

    unwatch: function () {
      watch = null;
    },

    /** Un solo timer di blocco alla volta: ogni avvio cancella il precedente. */
    startTimer: function (ms, fn) {
      NS.detector.clearTimer();
      timerId = setTimeout(function () {
        timerId = 0;
        fn();
      }, Math.max(0, ms));
    },

    clearTimer: function () {
      if (timerId) clearTimeout(timerId);
      timerId = 0;
    },
  };
})();
