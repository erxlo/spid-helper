/**
 * Avvio e coordinamento del content script di SPID Helper.
 *
 * Legge il percorso statico (window.SPID_HELPER_STEPS), riconosce la pagina
 * con pageMatch, tiene lo step attivo, il timer di blocco, l'overlay e il
 * registro delle sessioni. Tutte le decisioni sono regole fisse su dati
 * statici, DOM e timer: nessuna rete, nessuna inferenza.
 *
 * Quando uno step attivo si considera completato (oltre alle regole in
 * detector.js):
 *  - la pagina passa a una posizione più avanti del percorso (pageMatch dopo
 *    una mutazione o al caricamento di una nuova pagina): lo step attivo
 *    prima del cambio è completato in automatico;
 *  - per uno step di un gestore ("click" o "wait"): compare il target di uno
 *    step successivo dello stesso gestore che quando lo step è iniziato non
 *    c'era (o è sparito e poi ricomparso);
 *  - pulsante "Ho fatto questo passaggio": sempre, completamento "manuale".
 * Gli step "none" (arrivo) non si completano e non hanno timer.
 */
(function () {
  "use strict";

  var NS = window.SPID_HELPER;
  if (!NS || !NS.storage || !NS.overlay || !NS.detector || !NS.flow || !NS.pageMatch) return;
  if (NS.booted) return; // evita un secondo avvio se lo script viene iniettato due volte
  NS.booted = true;

  var steps = window.SPID_HELPER_STEPS;
  var store = NS.storage;
  var flow = NS.flow;
  var overlay = NS.overlay;
  var detector = NS.detector;

  // Vista mostrata quando lo step è fatto ma la pagina non è ancora cambiata.
  var WAITING_VIEW = Object.freeze({
    icon: "check",
    title: "Hai fatto questo passaggio.",
    lines: ["Aspetta qualche secondo.", "La pagina cambia da sola."],
  });

  var lastKey = null; // chiave dell'ultimo risultato di pageMatch
  var active = null; // step attivo: CurrentStep + { step, snapshot }
  var parked = null; // step attivo quando la pagina è diventata non riconosciuta
  var memProgress = {}; // avanzamento per gestore quando non c'è una sessione

  function toRef(a) {
    return {
      stepId: a.stepId,
      block: a.block,
      providerId: a.providerId,
      stepIndex: a.stepIndex,
      startedAt: a.startedAt,
      hintShown: !!a.hintShown,
      blockCounted: !!a.blockCounted,
    };
  }

  function progressMap() {
    var s = store.getActiveSession();
    return s ? s.providerProgress || {} : memProgress;
  }

  function bumpMem(providerId, index) {
    var prev = typeof memProgress[providerId] === "number" ? memProgress[providerId] : -1;
    memProgress[providerId] = Math.max(prev, index);
  }

  function formatProgress(p) {
    if (!p) return null;
    return p.total ? "Passo " + p.current + " di " + p.total : "Passo " + p.current;
  }

  function stopActive() {
    detector.unwatch();
    detector.clearTimer();
    active = null;
  }

  function recordCompletion(ref, mode, now) {
    if (ref.block === "provider" && ref.providerId) bumpMem(ref.providerId, ref.stepIndex);
    store.recordStepCompleted(
      {
        stepId: ref.stepId,
        block: ref.block,
        providerId: ref.providerId || null,
        stepIndex: typeof ref.stepIndex === "number" ? ref.stepIndex : null,
        startedAt: ref.startedAt,
        completedAt: now,
        durationMs: Math.max(0, now - ref.startedAt),
        hintShown: !!ref.hintShown,
        completion: mode,
      },
      now
    );
  }

  function snapshotLater(pos) {
    var snap = {};
    flow.laterTargets(steps, pos).forEach(function (l) {
      snap[l.index] = flow.isPresent(document, l.selector);
    });
    return snap;
  }

  function onBlocked() {
    var a = active;
    if (!a) return;
    a.hintShown = true;
    overlay.setHint(flow.splitLines(a.step.hintOnBlock));
    overlay.setRing(true);
    if (!a.blockCounted) {
      a.blockCounted = true;
      store.markBlocked(a.stepId, Date.now());
    }
  }

  function showWaiting() {
    overlay.show({
      icon: WAITING_VIEW.icon,
      title: WAITING_VIEW.title,
      lines: WAITING_VIEW.lines.slice(),
      progressText: null,
      showDone: false,
      onDone: null,
      targetSelector: null,
    });
  }

  function activate(pos, now) {
    var step = flow.getStep(steps, pos);
    if (!step) {
      stopActive();
      overlay.unmount();
      return;
    }
    var session = store.getActiveSession();

    // Stesso step di prima (ricalcolo o ricaricamento della pagina): si
    // riprendono inizio, aiuto e conteggio, così il timer non riparte da zero
    // e il blocco non si conta due volte.
    var base = null;
    if (active && active.stepId === step.id) base = active;
    else if (parked && parked.stepId === step.id) base = parked;
    else if (session && session.current && session.current.stepId === step.id) base = session.current;

    stopActive();
    parked = null;
    active = {
      stepId: step.id,
      block: pos.block,
      providerId: pos.providerId || null,
      stepIndex: typeof pos.stepIndex === "number" ? pos.stepIndex : null,
      startedAt: base ? base.startedAt : now,
      hintShown: base ? !!base.hintShown : false,
      blockCounted: base ? !!base.blockCounted : false,
      step: step,
      snapshot: snapshotLater(pos),
    };
    if (step.expectedAction !== "none") store.setCurrent(toRef(active), now);

    overlay.show({
      icon: step.icon,
      title: step.title,
      lines: flow.splitLines(step.text),
      progressText: formatProgress(flow.progressFor(steps, pos, session && session.providerId)),
      showDone: step.expectedAction !== "none",
      onDone: onManualDone,
      targetSelector: step.targetSelector,
    });

    if (step.expectedAction === "none") return;

    detector.watch({
      selector: step.targetSelector,
      action: step.expectedAction,
      later: flow.laterTargets(steps, pos),
      onDone: function () {
        completeActive("auto");
      },
      onLater: onLaterTarget,
    });

    if (active.hintShown) {
      onBlocked();
      return;
    }
    var waitMs = Number(step.waitSeconds) * 1000;
    if (waitMs > 0) detector.startTimer(waitMs - (now - active.startedAt), onBlocked);
  }

  function completeActive(mode) {
    var a = active;
    if (!a || a.step.expectedAction === "none") return;
    var now = Date.now();
    stopActive();
    recordCompletion(toRef(a), mode, now);

    if (a.block === "provider") {
      // L'avanzamento salvato è cambiato: pageMatch sceglie lo step successivo.
      evaluate(true);
      return;
    }
    // Dopo la home lo step successivo è sempre l'elenco dei gestori, anche
    // se la pagina non è ancora cambiata. Dopo l'elenco il gestore non è
    // ancora noto: si mostra l'attesa finché la pagina non cambia.
    if (a.block === "home" && steps.selectProvider) {
      activate({ block: "selectProvider", stepId: steps.selectProvider.id }, now);
      return;
    }
    showWaiting();
  }

  function onManualDone() {
    completeActive("manual");
  }

  /**
   * L'utente ha già raggiunto lo step `index` dello stesso gestore: lo step
   * attivo è completato e quelli in mezzo si considerano superati.
   */
  function jumpTo(index, viaClick) {
    var a = active;
    if (!a || a.block !== "provider") return;
    var now = Date.now();
    stopActive();
    recordCompletion(toRef(a), "auto", now);
    bumpMem(a.providerId, index - 1);
    store.bumpProviderProgress(a.providerId, index - 1, now);
    evaluate(true);
    // Se il gesto era un clic proprio sul target di uno step "click", anche
    // quello step è già fatto.
    if (
      viaClick &&
      active &&
      active.block === "provider" &&
      active.stepIndex === index &&
      active.step.expectedAction === "click"
    ) {
      completeActive("auto");
    }
  }

  function onLaterTarget(index, viaClick) {
    jumpTo(index, viaClick);
  }

  // Regola (b) per gli step "wait" e "click" di un gestore: un target
  // successivo passa da assente a presente mentre lo step è attivo.
  function checkNewLaterTargets() {
    var a = active;
    if (!a || a.block !== "provider" || a.step.expectedAction === "none") return;
    var later = flow.laterTargets(steps, a);
    for (var k = 0; k < later.length; k++) {
      var l = later[k];
      var present = flow.isPresent(document, l.selector);
      if (!present) {
        a.snapshot[l.index] = false;
      } else if (!a.snapshot[l.index]) {
        jumpTo(l.index, false);
        return;
      }
    }
  }

  /**
   * Ricalcola la posizione della pagina e applica le regole di sessione.
   * @param {boolean} force  ricalcola anche se pageMatch non è cambiato
   */
  function evaluate(force) {
    var now = Date.now();
    store.closeIfStale(now);

    var m = NS.pageMatch(document, steps, { providerProgress: progressMap() });
    var key = flow.keyOf(m);
    if (!force && key === lastKey) {
      checkNewLaterTargets();
      overlay.refresh();
      return;
    }
    lastKey = key;

    if (!m) {
      // Pagina non riconosciuta: niente overlay e niente timer. Lo step
      // attivo resta "parcheggiato" per il confronto con la prossima pagina.
      if (active) parked = toRef(active);
      stopActive();
      overlay.unmount();
      return;
    }

    var session = store.getActiveSession();
    if (m.block === "home" || m.block === "selectProvider") {
      if (session && m.block === "home" && session.providerId) {
        // Ripartire dalla home dopo aver raggiunto un gestore = nuovo tentativo.
        stopActive();
        parked = null;
        store.closeActive("abandoned", "restart_from_home", now);
        session = null;
      }
      if (!session) session = store.openSession(now);
      // Tornando alle prime pagine il percorso del gestore riparte dall'inizio.
      store.resetProviderProgress(now);
      memProgress = {};
    } else if (m.block === "provider" && session && session.providerId !== m.providerId) {
      store.setProvider(m.providerId, now);
    }

    var prev = active ? toRef(active) : parked || (session && session.current) || null;
    if (prev && prev.stepId !== m.stepId && flow.isAhead(m, prev)) {
      recordCompletion(prev, "auto", now);
      if (active && active.stepId === prev.stepId) stopActive();
      parked = null;
    }

    if (m.block === "success") {
      if (store.getActiveSession()) store.closeActive("completed", null, now);
      activate(m, now);
      return;
    }
    if (m.completed) {
      stopActive();
      parked = null;
      store.setCurrent(null, now);
      showWaiting();
      return;
    }
    activate(m, now);
  }

  function start() {
    if (!steps || typeof steps !== "object") {
      NS.log.warnOnce(
        "no-steps",
        "Percorso non trovato: app/data/steps.js deve essere caricato prima del content script."
      );
      return;
    }
    store
      .init(Date.now())
      .catch(function (err) {
        NS.log.warnOnce("init", "Avvio dello storage non riuscito.", err);
      })
      .then(function () {
        evaluate(true);
        detector.start(function () {
          evaluate(false);
        });
      });

    // Pagina lasciata: nessun timer resta attivo. Se torna dalla cache del
    // browser (pulsante Indietro), si ricalcola da capo.
    window.addEventListener("pagehide", function () {
      detector.clearTimer();
    });
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) evaluate(true);
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
})();
