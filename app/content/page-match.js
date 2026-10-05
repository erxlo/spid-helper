/**
 * Riconoscimento deterministico della pagina e piccole funzioni sul percorso.
 * Nessun accesso a storage o timer: tutto dipende solo dai parametri, così
 * le funzioni si possono provare con un DOM finto.
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});

  // Ordine dei blocchi lungo il percorso: serve a capire se l'utente è
  // andato avanti (step precedente completato) o indietro (nessun completamento).
  var RANK = { home: 0, selectProvider: 1, provider: 2, success: 3 };

  /**
   * Un elemento conta come "presente" se esiste nel DOM ed è disegnato
   * (getClientRects non vuoto). Il controllo di visibilità evita che un
   * elenco o un avviso già nel DOM ma nascosto (display:none, hidden) faccia
   * riconoscere una pagina che l'utente non vede ancora.
   */
  function isPresent(doc, selector) {
    if (!selector || !doc || typeof doc.querySelector !== "function") return false;
    var el;
    try {
      el = doc.querySelector(selector);
    } catch (e) {
      return false;
    }
    if (!el) return false;
    if (typeof el.getClientRects !== "function") return true;
    return el.getClientRects().length > 0;
  }

  function lastCompletedIndex(state, providerId, length) {
    var map = state && state.providerProgress;
    var v = map && typeof map[providerId] === "number" ? Math.floor(map[providerId]) : -1;
    if (v < -1) v = -1;
    if (v > length - 1) v = length - 1;
    return v;
  }

  function providerMatch(providerId, list, index, completed) {
    return {
      block: "provider",
      providerId: providerId,
      stepIndex: index,
      stepId: list[index].id,
      completed: completed,
    };
  }

  /**
   * Indica quale blocco di steps.js corrisponde alla pagina corrente.
   *
   * Regola: un blocco corrisponde se il targetSelector di (almeno) un suo step
   * è presente. Se più blocchi corrispondono vince il primo in quest'ordine:
   *   1. success        — l'arrivo prevale su tutto: se si vede, il percorso è finito;
   *   2. provider       — i gestori nell'ordine di dichiarazione in steps.providers;
   *   3. selectProvider — l'elenco dei gestori può comparire sopra la home;
   *   4. home.
   * L'ordine va dal blocco più avanzato al meno avanzato, così una pagina con
   * marcatori di più blocchi dà sempre lo stesso risultato.
   *
   * Per un gestore lo step si sceglie combinando lo stato salvato con il DOM:
   *   - il primo step dopo l'ultimo completato il cui target è presente;
   *   - se nessuno di quelli è presente (ma il gestore è riconosciuto da un
   *     qualunque suo target), il primo step non completato;
   *   - se sono tutti completati, l'ultimo step con completed: true.
   *
   * @param {Document|{querySelector: Function}} doc
   * @param {object} steps  window.SPID_HELPER_STEPS
   * @param {{providerProgress?: Object<string, number>}} [state]
   *        indice dell'ultimo step completato per gestore (-1 o assente = nessuno)
   * @param {{isPresent?: function(string): boolean}} [opts]  per i test
   * @returns {null | {block: string, stepId: string, providerId?: string,
   *           stepIndex?: number, completed?: boolean}}
   */
  function pageMatch(doc, steps, state, opts) {
    if (!steps || typeof steps !== "object") return null;
    var present =
      opts && typeof opts.isPresent === "function"
        ? opts.isPresent
        : function (selector) {
            return isPresent(doc, selector);
          };

    if (steps.success && present(steps.success.targetSelector)) {
      return { block: "success", stepId: steps.success.id };
    }

    var providers = steps.providers || {};
    var ids = Object.keys(providers);
    for (var p = 0; p < ids.length; p++) {
      var pid = ids[p];
      var list = providers[pid];
      if (!Array.isArray(list) || list.length === 0) continue;
      var presence = list.map(function (s) {
        return !!(s && present(s.targetSelector));
      });
      if (presence.indexOf(true) === -1) continue;

      var last = lastCompletedIndex(state, pid, list.length);
      for (var i = last + 1; i < list.length; i++) {
        if (presence[i]) return providerMatch(pid, list, i, false);
      }
      if (last + 1 < list.length) return providerMatch(pid, list, last + 1, false);
      return providerMatch(pid, list, list.length - 1, true);
    }

    if (steps.selectProvider && present(steps.selectProvider.targetSelector)) {
      return { block: "selectProvider", stepId: steps.selectProvider.id };
    }
    if (steps.home && present(steps.home.targetSelector)) {
      return { block: "home", stepId: steps.home.id };
    }
    return null;
  }

  /** Chiave testuale stabile di un risultato di pageMatch, per capire se è cambiato. */
  function keyOf(m) {
    if (!m) return "none";
    return [m.block, m.providerId || "", m.stepIndex == null ? "" : m.stepIndex, m.completed ? "done" : ""].join("|");
  }

  /** true se la posizione `a` viene dopo `b` lungo il percorso. */
  function isAhead(a, b) {
    if (!a || !b) return false;
    var ra = RANK[a.block];
    var rb = RANK[b.block];
    if (ra == null || rb == null) return false;
    if (a.block === "provider" && b.block === "provider") {
      return a.providerId === b.providerId && a.stepIndex > b.stepIndex;
    }
    return ra > rb;
  }

  function getStep(steps, pos) {
    if (!steps || !pos) return null;
    if (pos.block === "provider") {
      var list = steps.providers && steps.providers[pos.providerId];
      return (Array.isArray(list) && list[pos.stepIndex]) || null;
    }
    return steps[pos.block] || null;
  }

  /** Step successivi dello stesso gestore, con indice e selettore. */
  function laterTargets(steps, pos) {
    if (!pos || pos.block !== "provider") return [];
    var list = steps.providers && steps.providers[pos.providerId];
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = pos.stepIndex + 1; i < list.length; i++) {
      out.push({ index: i, selector: list[i].targetSelector, action: list[i].expectedAction });
    }
    return out;
  }

  /**
   * Numero del passo lungo tutto il percorso: home = 1, elenco gestori = 2,
   * poi gli step del gestore. Il totale si conosce solo quando il gestore è
   * noto; prima si mostra solo il numero. Per "success" restituisce null.
   */
  function progressFor(steps, pos, knownProviderId) {
    if (!pos || pos.block === "success") return null;
    var providerId = pos.providerId || knownProviderId || null;
    var list = providerId && steps.providers ? steps.providers[providerId] : null;
    var total = Array.isArray(list) ? 2 + list.length : null;
    var current;
    if (pos.block === "home") current = 1;
    else if (pos.block === "selectProvider") current = 2;
    else if (pos.block === "provider") current = 3 + pos.stepIndex;
    else return null;
    return { current: current, total: total };
  }

  function splitLines(text) {
    if (typeof text !== "string") return [];
    return text
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(function (l) {
        return l.length > 0;
      });
  }

  NS.pageMatch = pageMatch;
  NS.flow = {
    RANK: RANK,
    isPresent: isPresent,
    keyOf: keyOf,
    isAhead: isAhead,
    getStep: getStep,
    laterTargets: laterTargets,
    progressFor: progressFor,
    splitLines: splitLines,
  };
})();
