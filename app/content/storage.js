/**
 * Registro locale delle sessioni di SPID Helper in chrome.storage.local.
 * Questo blocco è il contratto letto anche dal popup (dashboard).
 *
 * ── PRIVACY ────────────────────────────────────────────────────────────
 * NON viene MAI salvato il contenuto dei campi digitati dall'utente:
 * niente nome utente, password, codici o testo di qualsiasi casella.
 * Si salvano solo id degli step, tempi (timestamp in ms) e contatori.
 * Il content script controlla soltanto SE una casella non è vuota, senza
 * conservarne il testo. Nessun dato lascia il dispositivo (zero rete).
 *
 * ── CHIAVI (tutte con prefisso "shp_") ────────────────────────────────
 * shp_schemaVersion    number          Versione dello schema. Attuale: 1.
 * shp_sessions         Session[]       Sessioni in ordine di apertura (la più
 *                                      vecchia per prima). Al massimo
 *                                      MAX_SESSIONS (50): oltre, si eliminano
 *                                      le più vecchie, mai quella attiva.
 * shp_activeSessionId  string | null   id della sessione con outcome
 *                                      "in_progress", oppure null.
 *
 * ── Session ───────────────────────────────────────────────────────────
 * {
 *   id: string,                  es. "s_lx3k2a_1abcd"
 *   startedAt: number,           ms epoch, apertura
 *   endedAt: number | null,      ms epoch, null finché outcome è "in_progress"
 *   durationMs: number | null,   endedAt - startedAt, null finché aperta
 *   lastActivityAt: number,      ms epoch dell'ultimo aggiornamento registrato
 *   providerId: string | null,   chiave di SPID_HELPER_STEPS.providers
 *                                (es. "posteid"); null finché non si arriva a
 *                                una pagina del gestore. Se l'utente cambia
 *                                gestore, vale l'ultimo riconosciuto.
 *   outcome: "in_progress" | "completed" | "abandoned",
 *   abandonReason: null | "inactivity" | "restart_from_home",
 *   blocksDetected: number,      step distinti in cui è scaduto il timer di
 *                                blocco (al massimo 1 per stepId per sessione)
 *   blockedStepIds: string[],    quegli stepId, in ordine di primo blocco
 *   stepsCompleted: number,      uguale a steps.length
 *   stepsCompletedWithoutHint: number,  step completati senza aver visto l'aiuto
 *   steps: StepRecord[],         step completati, in ordine di completamento
 *   current: CurrentStep | null, step attivo. Nelle sessioni "abandoned" resta
 *                                l'ultimo step raggiunto e non completato
 *                                (utile per vedere dove ci si è fermati);
 *                                nelle "completed" è null.
 *   providerProgress: { [providerId: string]: number }
 *                                uso interno: indice dell'ultimo step
 *                                completato per ciascun gestore.
 * }
 *
 * StepRecord {
 *   stepId: string,              id dello step in steps.js
 *   block: "home" | "selectProvider" | "provider",
 *   providerId: string | null,   solo per block "provider"
 *   stepIndex: number | null,    indice nell'array del gestore, solo "provider"
 *   startedAt: number, completedAt: number, durationMs: number,
 *   hintShown: boolean,          true se per questo step è comparso l'aiuto
 *   completion: "auto" | "manual"  "manual" = pulsante "Ho fatto questo
 *                                passaggio"; "auto" = rilevato dalla pagina
 * }
 * Lo step di arrivo (block "success") non è mai un StepRecord: l'arrivo
 * chiude la sessione con outcome "completed".
 *
 * CurrentStep {
 *   stepId, block, providerId, stepIndex, startedAt,
 *   hintShown: boolean, blockCounted: boolean
 * }
 *
 * ── REGOLE DI APERTURA E CHIUSURA (applicate da content.js) ───────────
 * Apertura: quando la pagina è riconosciuta come "home" o "selectProvider"
 *   e non c'è una sessione attiva. Le pagine del gestore e di arrivo non
 *   aprono sessioni: se l'utente ci arriva direttamente, la guida si vede
 *   ma non si registra nulla.
 * Chiusura "completed": all'arrivo sulla pagina "success".
 * Chiusura "abandoned":
 *   - "inactivity": la sessione attiva non ha aggiornamenti da più di
 *     INACTIVITY_ABANDON_MS (30 minuti). Si controlla all'avvio del content
 *     script e a ogni ricalcolo della pagina. endedAt = lastActivityAt,
 *     così la durata non include il tempo di inattività.
 *   - "restart_from_home": l'utente torna sulla pagina "home" dopo che un
 *     gestore era già stato riconosciuto, senza essere arrivato a "success".
 *     Subito dopo si apre una sessione nuova.
 *   Tornare alla "home" prima di aver raggiunto un gestore NON chiude la
 *   sessione: è normale andare avanti e indietro tra le prime due pagine.
 *
 * ── SCRITTURE ─────────────────────────────────────────────────────────
 * Ogni modifica è una funzione "mutatore" applicata subito alla copia in
 * memoria e poi messa in una coda di promesse: ogni passo della coda rilegge
 * lo storage, applica il mutatore e riscrive. Così eventi ravvicinati non si
 * sovrascrivono a vicenda e le modifiche fatte da un'altra scheda non vanno
 * perse. Se chrome.storage non è disponibile (pagina aperta fuori
 * dall'estensione o estensione ricaricata), si continua con uno stato solo in
 * memoria e si avvisa una volta in console.
 */
(function () {
  "use strict";

  var NS = (window.SPID_HELPER = window.SPID_HELPER || {});
  var C = NS.CONST;

  var KEYS = Object.freeze({
    VERSION: C.KEY_PREFIX + "schemaVersion",
    SESSIONS: C.KEY_PREFIX + "sessions",
    ACTIVE: C.KEY_PREFIX + "activeSessionId",
  });

  var useMemory = false;
  var memory = emptyState();
  var cache = emptyState();
  var pending = [];
  var queue = Promise.resolve();
  var idCounter = 0;

  function emptyState() {
    return { sessions: [], activeSessionId: null };
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function fallBackToMemory(reason) {
    if (!useMemory) {
      useMemory = true;
      memory = clone(cache);
    }
    NS.log.warnOnce(
      "storage-unavailable",
      "chrome.storage.local non disponibile: i progressi restano solo in memoria per questa pagina.",
      reason
    );
  }

  function storageArea() {
    if (useMemory) return null;
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome &&
        chrome.storage &&
        chrome.storage.local &&
        chrome.runtime &&
        chrome.runtime.id
      ) {
        return chrome.storage.local;
      }
    } catch (e) {
      fallBackToMemory(e);
      return null;
    }
    fallBackToMemory();
    return null;
  }

  function lastError() {
    try {
      return chrome.runtime && chrome.runtime.lastError;
    } catch (e) {
      return e;
    }
  }

  function normalize(raw) {
    var s = emptyState();
    if (raw && Array.isArray(raw.sessions)) {
      s.sessions = raw.sessions.filter(function (x) {
        return x && typeof x === "object" && typeof x.id === "string";
      });
    }
    var id = raw && typeof raw.activeSessionId === "string" ? raw.activeSessionId : null;
    s.activeSessionId = id;
    if (!activeOf(s)) s.activeSessionId = null;
    return s;
  }

  function readState() {
    var area = storageArea();
    if (!area) return Promise.resolve(normalize(clone(memory)));
    return new Promise(function (resolve) {
      try {
        area.get([KEYS.SESSIONS, KEYS.ACTIVE], function (res) {
          var err = lastError();
          if (err || !res) {
            fallBackToMemory(err);
            resolve(normalize(clone(memory)));
            return;
          }
          resolve(normalize({ sessions: res[KEYS.SESSIONS], activeSessionId: res[KEYS.ACTIVE] }));
        });
      } catch (e) {
        fallBackToMemory(e);
        resolve(normalize(clone(memory)));
      }
    });
  }

  function writeState(s) {
    var area = storageArea();
    if (!area) {
      memory = clone(s);
      return Promise.resolve();
    }
    var payload = {};
    payload[KEYS.VERSION] = C.SCHEMA_VERSION;
    payload[KEYS.SESSIONS] = s.sessions;
    payload[KEYS.ACTIVE] = s.activeSessionId;
    return new Promise(function (resolve) {
      try {
        area.set(payload, function () {
          var err = lastError();
          if (err) {
            fallBackToMemory(err);
            memory = clone(s);
          }
          resolve();
        });
      } catch (e) {
        fallBackToMemory(e);
        memory = clone(s);
        resolve();
      }
    });
  }

  function prune(s) {
    while (s.sessions.length > C.MAX_SESSIONS) {
      var idx = 0;
      if (s.sessions[0].id === s.activeSessionId) idx = 1;
      s.sessions.splice(idx, 1);
    }
  }

  function activeOf(s) {
    if (!s.activeSessionId) return null;
    for (var i = 0; i < s.sessions.length; i++) {
      var x = s.sessions[i];
      if (x.id === s.activeSessionId && x.outcome === "in_progress") return x;
    }
    return null;
  }

  /**
   * Applica `fn` subito alla cache e poi, in coda, allo stato riletto dallo
   * storage. Dopo ogni scrittura la cache = stato salvato + mutatori ancora
   * in coda, così riflette sia le altre schede sia le modifiche non ancora
   * scritte. I mutatori devono quindi ricontrollare le proprie condizioni
   * sullo stato che ricevono.
   */
  function mutate(fn) {
    fn(cache);
    prune(cache);
    pending.push(fn);
    queue = queue
      .then(function () {
        return readState().then(function (fresh) {
          fn(fresh);
          prune(fresh);
          return writeState(fresh).then(function () {
            return fresh;
          });
        });
      })
      .then(
        function (fresh) {
          pending.shift();
          var next = clone(fresh);
          for (var i = 0; i < pending.length; i++) pending[i](next);
          prune(next);
          cache = next;
        },
        function (err) {
          pending.shift();
          NS.log.warnOnce("storage-write", "Scrittura dello storage non riuscita.", err);
        }
      );
    return queue;
  }

  function withActive(now, fn) {
    if (!activeOf(cache)) return Promise.resolve();
    return mutate(function (s) {
      var x = activeOf(s);
      if (!x) return;
      fn(x, s);
      x.lastActivityAt = Math.max(x.lastActivityAt || 0, now);
    });
  }

  function endSession(s, x, outcome, reason, at) {
    x.outcome = outcome;
    x.abandonReason = outcome === "abandoned" ? reason : null;
    x.endedAt = at;
    x.durationMs = Math.max(0, at - x.startedAt);
    if (outcome === "completed") x.current = null;
    if (s.activeSessionId === x.id) s.activeSessionId = null;
  }

  function newSession(id, now) {
    return {
      id: id,
      startedAt: now,
      endedAt: null,
      durationMs: null,
      lastActivityAt: now,
      providerId: null,
      outcome: "in_progress",
      abandonReason: null,
      blocksDetected: 0,
      blockedStepIds: [],
      stepsCompleted: 0,
      stepsCompletedWithoutHint: 0,
      steps: [],
      current: null,
      providerProgress: {},
    };
  }

  function bump(map, providerId, index) {
    var prev = typeof map[providerId] === "number" ? map[providerId] : -1;
    map[providerId] = Math.max(prev, index);
  }

  NS.storage = {
    KEYS: KEYS,

    /** Carica lo stato e chiude come "abandoned" una sessione inattiva da troppo. */
    init: function (now) {
      return readState().then(function (s) {
        cache = s;
        NS.storage.closeIfStale(now);
      });
    },

    /** Sessione attiva dalla cache (sola lettura), oppure null. */
    getActiveSession: function () {
      return activeOf(cache);
    },

    isPersistent: function () {
      return !useMemory;
    },

    /** Promessa risolta quando tutte le scritture in coda sono finite. */
    flush: function () {
      return queue;
    },

    closeIfStale: function (now) {
      var a = activeOf(cache);
      if (!a || now - (a.lastActivityAt || a.startedAt) <= C.INACTIVITY_ABANDON_MS) return null;
      return mutate(function (s) {
        var x = activeOf(s);
        var last = x && (x.lastActivityAt || x.startedAt);
        if (x && now - last > C.INACTIVITY_ABANDON_MS) endSession(s, x, "abandoned", "inactivity", last);
      });
    },

    /** Apre una sessione se non ce n'è già una attiva; restituisce la sessione attiva. */
    openSession: function (now) {
      var id = "s_" + now.toString(36) + "_" + (++idCounter).toString(36) + Math.random().toString(36).slice(2, 7);
      mutate(function (s) {
        if (activeOf(s)) return;
        s.sessions.push(newSession(id, now));
        s.activeSessionId = id;
      });
      return activeOf(cache);
    },

    closeActive: function (outcome, reason, now) {
      if (!activeOf(cache)) return Promise.resolve();
      return mutate(function (s) {
        var x = activeOf(s);
        if (x) endSession(s, x, outcome, reason || null, now);
      });
    },

    setProvider: function (providerId, now) {
      return withActive(now, function (x) {
        x.providerId = providerId;
      });
    },

    resetProviderProgress: function (now) {
      var a = activeOf(cache);
      if (!a || !a.providerProgress || Object.keys(a.providerProgress).length === 0) return Promise.resolve();
      return withActive(now, function (x) {
        x.providerProgress = {};
      });
    },

    bumpProviderProgress: function (providerId, index, now) {
      return withActive(now, function (x) {
        if (!x.providerProgress) x.providerProgress = {};
        bump(x.providerProgress, providerId, index);
      });
    },

    setCurrent: function (current, now) {
      var a = activeOf(cache);
      if (!a) return Promise.resolve();
      var value = current ? clone(current) : null;
      if (JSON.stringify(a.current || null) === JSON.stringify(value)) return Promise.resolve();
      return withActive(now, function (x) {
        x.current = clone(value);
      });
    },

    recordStepCompleted: function (record, now) {
      var rec = clone(record);
      return withActive(now, function (x) {
        var dup = x.steps.some(function (r) {
          return r.stepId === rec.stepId && r.startedAt === rec.startedAt;
        });
        if (dup) return;
        x.steps.push(rec);
        x.stepsCompleted = x.steps.length;
        if (!rec.hintShown) x.stepsCompletedWithoutHint += 1;
        if (rec.block === "provider" && rec.providerId && typeof rec.stepIndex === "number") {
          if (!x.providerProgress) x.providerProgress = {};
          bump(x.providerProgress, rec.providerId, rec.stepIndex);
        }
        if (x.current && x.current.stepId === rec.stepId) x.current = null;
      });
    },

    /** Segna l'aiuto come mostrato; conta il blocco una sola volta per stepId. */
    markBlocked: function (stepId, now) {
      return withActive(now, function (x) {
        if (x.current && x.current.stepId === stepId) {
          x.current.hintShown = true;
          x.current.blockCounted = true;
        }
        if (!Array.isArray(x.blockedStepIds)) x.blockedStepIds = [];
        if (x.blockedStepIds.indexOf(stepId) === -1) {
          x.blockedStepIds.push(stepId);
          x.blocksDetected = x.blockedStepIds.length;
        }
      });
    },
  };
})();
